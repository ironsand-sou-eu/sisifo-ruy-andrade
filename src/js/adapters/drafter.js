import insertAdaptedAndamentoNames from "./andamentos"
import compareWithOperator, { REGEX_CNJ_NUMBER, operators } from "../utils/utils"
import { fetchGoogleSheetData, extractValuesFromSheetsPromise, fetchGoogleSheetRowsMatchingExpression } from "../connectors/google-sheets"
import fetchProjurisInfo, { extractOptionsArray, endPoints, flattenObjectsArray } from "../connectors/projuris"
import { tiposParte, projurisTipoEnvolvidoType } from "../utils/enumsAndHardcoded"
import ProjurisProcessoDataStructure from "../data-structures/ProjurisProcessoDataStructure"
import ProjurisParticipanteDataStructure from "../data-structures/ProjurisParticipanteDataStructure"
import ProjurisAndamentoDataStructure from "../data-structures/ProjurisAndamentoDataStructure"
import ProjurisPedidoDataStructure from "../data-structures/ProjurisPedidoDataStructure"
import cnjClasses from "./cnj-classes"
import cnjAssuntos from "./cnj-assuntos"
import generateErrMsg from "../exceptions/error-message-generator"

export default class Drafter {
    static #errorMsgFallback = "Ocorreu uma falha, vide mensagens de erro"
    static #filterTemplate = { key: "valor", operator: operators.insensitiveStrictEquality }
    static #nomeSistemaProjuris = {
        projuditjba: "PROJUDI",
        pje1gtjba: "PJE"
    }
    #tiposParticipacao
    #processoInfo
    #googleToken
    
    constructor(processoInfo, googleToken) {
        this.#processoInfo = processoInfo
        this.#googleToken = googleToken
    }

    async draftProcessoInfo() {
        await insertAdaptedAndamentoNames(this.#processoInfo, this.#googleToken)
        if (Drafter.hasErrors([this.#processoInfo])) return { hasErrors: true, errorMsgs: this.#processoInfo.errorMsgs }
    
        const projurisPartes = await this.#getAdaptedPartes()
        
        const tarefasParams = await this.#getTarefasParams(this.#processoInfo.audienciaFutura)
        const projurisProcesso = await this.#getAdaptedProcesso(projurisPartes.clientRole[0], tarefasParams.allResponsaveisList)
        const projurisAndamentos = await this.#getAdaptedAndamentos()
        const projurisPedidos = await this.#getAdaptedPedidos(projurisPartes.clientRole[0]?.clientName, projurisProcesso.dataDistribuicao)
        const errors = Drafter.hasErrors([projurisProcesso, projurisAndamentos, projurisPedidos])
        if (errors) return { hasErrors: true, errorMsgs: errors }
        return {
            projurisProcesso,
            projurisPartes,
            projurisAndamentos: projurisAndamentos.values,
            projurisPedidos: projurisPedidos.values,
            tarefasParams,
            hasErrors: false
        }
    }
    
    static hasErrors(projurisEntitiesArray) {
        const allErrors = []
        projurisEntitiesArray.forEach(projurisEntity => {
            const errorMsgs = projurisEntity.errorMsgs
            if (errorMsgs && Array.isArray(errorMsgs) && errorMsgs.length > 0) {
                allErrors.push(...errorMsgs)
            }
        })
        if (allErrors.length === 0) return false
        return allErrors
    }
    
    static async getGtCrew(grupoDeTrabalhoName, allResponsaveisList, token = undefined) {
        if (grupoDeTrabalhoName === undefined) return undefined
        if (!allResponsaveisList) {
            const response = await fetchProjurisInfo(endPoints.responsaveis)
            allResponsaveisList = await extractOptionsArray(response)
        }
        const fetchedValues = await fetchGoogleSheetRowsMatchingExpression("gts", grupoDeTrabalhoName, token)
        if (!fetchedValues.found) throw fetchedValues.value
        const [ , , advsNames, coordenadoresNames, estagiariosNames, controladoriaNames ] = fetchedValues.value
        const namesArrays = [ advsNames, coordenadoresNames, estagiariosNames, controladoriaNames ]
            .map(commaSeparatedNames => commaSeparatedNames.split(",")
            .map(name => name.trim()))
        const [ coordenadores, advs, estagiarios, controladoria ] = namesArrays
            .map(nameArray => Drafter.#getGtEntities(nameArray, allResponsaveisList))
        return { coordenadores, advs, estagiarios, controladoria }
    }
    
    async #getAdaptedPartes() {
        const projurisPartes = {
            partesRequerentes: [],
            partesRequeridas: [],
            terceiros: [],
            magistrado: undefined,
            clientRole: undefined
        }
        const promises = await this.#makeprojurisPartesFetches()
        const responses = await Promise.all(promises)
        const clientsList = await extractValuesFromSheetsPromise(responses[0])
        this.#tiposParticipacao = await extractOptionsArray(responses[1])
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequerentes, projurisPartes.partesRequerentes)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequeridas, projurisPartes.partesRequeridas)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.outrosParticipantes, projurisPartes.terceiros)
        projurisPartes.magistrado = this.#getProjurisAdaptedMagistrado(this.#processoInfo.juizAtual)
        projurisPartes.clientRole = this.#identifyClientes(clientsList, projurisPartes)
        return projurisPartes
    }
    
    async #makeprojurisPartesFetches() {
        return [
            fetchGoogleSheetData("clientes", this.#googleToken),
            fetchProjurisInfo(endPoints.tiposParticipacao)
        ]
    }
    
    #pushAdaptedPartesIntoPolo(partesArray, polo) {
        if (partesArray === undefined) partesArray = []
        partesArray.forEach(async (parte, index) => {
            const projurisParte = this.#adaptParteToProjuris(parte, index)
            polo.push(projurisParte)
            parte.advogados.forEach(async (adv, index) => { //TODO: Quando eu fizer a busca aninhada no Json que retorna, cadastrar os advogados como advogado adverso.
                const projurisAdv = this.#adaptParteToProjuris(adv, index + 100)
                polo.push(projurisAdv)
            })
        })
    }
    
    #adaptParteToProjuris(parte, index) {
        const projurisParte = new ProjurisParticipanteDataStructure()
        projurisParte.nomePessoa = parte.nome
        projurisParte.flagSemCpfCnpj = parte.dontHaveCpfCnpj
        projurisParte.cpfCnpj = this.#getCpfOrCnpjOnlyNumbers(parte)
        projurisParte.justificativaSemCpfCnpj = parte.noCpfCnpjReason
        projurisParte.tipoPessoa = parte.cnpj ? "JURIDICA" : "FISICA"
        projurisParte.observacaoGeral = parte.endereco
        if (parte.tipoDeParte === tiposParte.advogado) {
            projurisParte.classificacao = [{ codigoClassificacao: 1, descricao: "Advogado" }]
            projurisParte.observacaoGeral + " - OAB " + parte.oab
        }
        projurisParte.telefone = parte.telefone
        projurisParte.email = parte.email
        projurisParte.habilitado = true
        if (parte.tipoDeParte === tiposParte.advogado) projurisParte.profissao = { chave: 616, valor: "Advogado" }
        projurisParte.tipoEnvolvido = projurisTipoEnvolvidoType[parte.tipoDeParte]
        projurisParte.tipoParticipacao = Drafter.#filterProjurisOptions(this.#tiposParticipacao, { key: "valor", operator: operators.insensitiveStrictEquality, val: parte.tipoDeParte, flattenOptions: true })[0]
        projurisParte.flagPrincipal = (index === 0)
        projurisParte.flagCompleto = true
        return projurisParte
    }
    
    #getCpfOrCnpjOnlyNumbers(parte) {
        const string = parte.cpf ?? parte.cnpj
        return string?.replaceAll(/\.|-|\//g, "")
    }
    
    #getProjurisAdaptedMagistrado(name) {
        const projurisParte = new ProjurisParticipanteDataStructure()
        projurisParte.nomePessoa = name
        projurisParte.flagSemCpfCnpj = true
        projurisParte.justificativaSemCpfCnpj = "Perfis de magistrado não têm CPF disponibilizado no Projudi"
        projurisParte.tipoPessoa = "FISICA"
        projurisParte.observacaoGeral = ""
        projurisParte.habilitado = true
        projurisParte.tipoEnvolvido = projurisTipoEnvolvidoType.juiz
        const filter = { key: "valor", operator: operators.insensitiveStrictEquality, val: "magistrado", flattenOptions: true }
        projurisParte.tipoParticipacao = Drafter.#filterProjurisOptions(this.#tiposParticipacao, filter)[0]
        projurisParte.flagPrincipal = false
        projurisParte.flagCompleto = true
        projurisParte.classificacao = [
            {
                "codigoClassificacao": 10797,
                "descricao": "Ente Público"
            }
        ]
        projurisParte.flagCliente = false
        return projurisParte
    }
    
    #identifyClientes(clientsList, partes) {
        const allPartes = [
            ...partes.partesRequerentes,
            ...partes.partesRequeridas,
            ...partes.terceiros
        ]
        const foundClients = []
        allPartes.forEach (parte => {
            const clientParte = clientsList.find(client => {
                return client[0].toLowerCase().trim() === parte.nomePessoa.toLowerCase().trim()
            })
           if (clientParte) {
                foundClients.push({
                    clientName: clientParte[1],
                    gt: clientParte[2],
                })
                parte.nomePessoa = clientParte[1]
                parte.flagCliente = true
            } else {
                parte.flagCliente = false
            }
        })
        return foundClients
    }
    
    async #getTarefasParams(audienciaFutura) {
        const promises = this.#makeProjurisTarefasFetches()
        const responses = await Promise.all(promises)
        const [ allResponsaveisList, tiposTarefa ]
            = await Promise.all(responses.map(response => extractOptionsArray(response)))
        return { allResponsaveisList, tiposTarefa, audienciaFutura }
    }
    
    #makeProjurisTarefasFetches() {
        return [
            fetchProjurisInfo(endPoints.responsaveis),
            fetchProjurisInfo(endPoints.tiposTarefa)
        ]
    }
    
    async #getAdaptedProcesso(clientRole, allResponsaveisList) {
        const getProjurisItem = (itemType, list, filter, searchedValue) => {
            searchedValue = searchedValue ?? juizoInfo[itemType]
            filter = filter ?? { ...Drafter.#filterTemplate, val: searchedValue }
            if (!searchedValue) {
                const errorMsg = generateErrMsg.noMatchInGoogle(this.#processoInfo.juizo.nomeOriginalSistemaJustica, itemType)
                projurisProcesso.errorMsgs.push(errorMsg)
                return Drafter.#errorMsgFallback
            }
            const matchingItems = Drafter.#filterProjurisOptions(list, filter)
            if (!matchingItems) {
                const errorMsg = generateErrMsg.noMatchInProjuris(searchedValue, itemType)
                projurisProcesso.errorMsgs.push(errorMsg)
                return Drafter.#errorMsgFallback
            }
            return matchingItems[0]
        }
        const projurisProcesso = new ProjurisProcessoDataStructure()
        
        const codTipoJustica = this.#getCodigoTipoJustica(this.#processoInfo.numero)
        projurisProcesso.processoNumeroWs =  [{
            tipoNumeracao: "PADRAO_CNJ",
            numeroDoProcesso: this.#processoInfo.numero,
            principal: true
        }]
        projurisProcesso.dataDistribuicao = this.#processoInfo.dataDistribuicao
        projurisProcesso.audienciaFutura = this.#processoInfo.audienciaFutura
        projurisProcesso.valorAcao = this.#processoInfo.valorDaCausa
        projurisProcesso.segredoJustica = this.#processoInfo.segredoJustica
        const googleJuizoInfo = await fetchGoogleSheetRowsMatchingExpression("juizos", this.#processoInfo.juizo.nomeOriginalSistemaJustica, this.#googleToken)
        if (!googleJuizoInfo.found) {
            projurisProcesso.errorMsgs.push(generateErrMsg.noMatchInGoogle(this.#processoInfo.juizo.nomeOriginalSistemaJustica, "juizo"))
            return projurisProcesso
        }
        const juizoInfo = {
            vara: googleJuizoInfo.value[1],
            tipoVara: googleJuizoInfo.value[2],
            comarca: googleJuizoInfo.value[3],
            instanciaCnj: googleJuizoInfo.value[4],
            tipoInstancia: googleJuizoInfo.value[5],
            orgaoJudicial: googleJuizoInfo.value[6],
        }
        projurisProcesso.tipoInstancia = juizoInfo.tipoInstancia
        const promises = this.#makeprojurisProcessoFetches(codTipoJustica, juizoInfo.comarca)
        const responses = await Promise.all(promises)
        const [ varasList, tiposVaraList, isntanciasCnjList, orgaosJudiciaisList, 
            tiposJusticaList, areasList, fasesList, gtsList, camposDinamicosList ]
            = await Promise.all(responses.map(response => extractOptionsArray(response)))
        projurisProcesso.vara = getProjurisItem("vara", varasList)
        projurisProcesso.tipoVara = getProjurisItem("tipoVara", tiposVaraList)
        projurisProcesso.complementoVara = juizoInfo.comarca
        projurisProcesso.instanciaCnj = getProjurisItem("instanciaCnj", isntanciasCnjList)
        projurisProcesso.orgaoJudicial = getProjurisItem("orgaoJudicial", orgaosJudiciaisList)
        projurisProcesso.tipoJustica = getProjurisItem("tipoJustica", tiposJusticaList, { key: "chave", operator: operators.insensitiveStrictEquality, val: codTipoJustica }, codTipoJustica)
        projurisProcesso.area = getProjurisItem("area", areasList, { ...Drafter.#filterTemplate, val: "CONSUMIDOR" }, "CONSUMIDOR")
        projurisProcesso.fase = getProjurisItem("fase", fasesList, { ...Drafter.#filterTemplate, val: "Inicial" }, "Inicial")
        const gts = Drafter.#filterProjurisOptions(gtsList, { ...Drafter.#filterTemplate, val: clientRole?.gt })
        projurisProcesso.gruposDeTrabalho = gts ? gts[0] : undefined
        try {
            const gtCrew = await Drafter.getGtCrew(clientRole?.gt, allResponsaveisList, this.#googleToken)
            projurisProcesso.responsaveis = gtCrew?.advs
        } catch (e) {
            projurisProcesso.errorMsgs.push(e)
            return projurisProcesso
        }
        projurisProcesso.classeCnj = this.#fetchCnjItem(this.#processoInfo.tipoDeAcao, "classe")
        projurisProcesso.assuntoCnj = this.#fetchCnjItem(this.#processoInfo.causaDePedir, "assunto")
        projurisProcesso.campoDinamicoDadoWs = this.#getCamposDinamicosProjuris(camposDinamicosList)
        return projurisProcesso
    }
    
    #getCodigoTipoJustica(numeroProcesso) {
        return REGEX_CNJ_NUMBER.exec(numeroProcesso)[2]
    }
    
    #makeprojurisProcessoFetches(codTipoJustica, comarca) {
        const endPointInstanciaCnj = endPoints.instanciasCnj + codTipoJustica
        const maxProjurisEntriesPerPage = 30
        const endPointOrgaoJudicial = endPoints.orgaoJudicial + '(nomeOrgao:' + comarca
            + '$processoJusticaCodigo:' + codTipoJustica
            + '$pagina:0$quantidadeRegistros:' + maxProjurisEntriesPerPage + ')'
        
        return [
            fetchProjurisInfo(endPoints.varas),
            fetchProjurisInfo(endPoints.tiposVara),
            fetchProjurisInfo(endPointInstanciaCnj),
            fetchProjurisInfo(endPointOrgaoJudicial),
            fetchProjurisInfo(endPoints.tiposJustica),
            fetchProjurisInfo(endPoints.areas),
            fetchProjurisInfo(endPoints.fases),
            fetchProjurisInfo(endPoints.gruposTrabalho),
            fetchProjurisInfo(endPoints.camposDinamicos)
        ]
    }
    
    static #filterProjurisOptions(rawOptions, filterObject) {
        let flattenedOptions
        if (filterObject.flattenOptions) {
            flattenedOptions = flattenObjectsArray(rawOptions)
        }
        const options = flattenedOptions ?? rawOptions
        const filtered = options
            .filter(option => compareWithOperator(
                option[filterObject.key],
                filterObject.operator,
                filterObject.val)
            )
        return (filtered.length !== 0) ? filtered : undefined
    }
    
    static #getGtEntities(names, allResponsaveisList, filterTemplate = Drafter.#filterTemplate) {
        if (!Array.isArray(names)) names = [ names ]
        const onlyOneEmptyString = names.length === 1 && (names[0] == "" || names[0] == undefined)
        if (names.length === 0 || onlyOneEmptyString) return undefined
        return names.map(name => {
            const filteredOptions = Drafter.#filterProjurisOptions(allResponsaveisList, {...filterTemplate, val: name})
            if (filteredOptions !== undefined) return filteredOptions[0]
            else throw generateErrMsg.noMatchInProjuris(name, "usuario")
        })
    }

    #fetchCnjItem(itemPath, itemType) {
        const allItems = {
            assunto: cnjAssuntos,
            classe: cnjClasses
        }
        const itemsUniverse = allItems[itemType]
        const foundItem = this.#recursivelyGetMenuItem(itemsUniverse, structuredClone(itemPath))
        delete foundItem.filhos
        return foundItem
    }
    
    #recursivelyGetMenuItem (menuItemsArray, itemPath) {
        if (!itemPath) return
        const searchTermsPath = structuredClone(Array.isArray(itemPath) ? itemPath : [ itemPath ])
        const firstItemInPath = searchTermsPath[0]
        const foundItem = menuItemsArray.filter(menuItem => menuItem.chave === firstItemInPath.id || menuItem.valor.toLowerCase() === firstItemInPath.valor.toLowerCase())
        if (foundItem.length > 0) return this.#handleFoundSomething(foundItem[0], searchTermsPath)
        else return this.#handleFoundNothing(menuItemsArray, searchTermsPath)
    }
    
    #handleFoundSomething(foundItem, searchTermsPath) {
        searchTermsPath.shift()
        if (searchTermsPath.length === 0) return foundItem
        else return this.#recursivelyGetMenuItem(foundItem.filhos, searchTermsPath)
    }

    #handleFoundNothing(menuItemsArray, searchTermsPath) {
        if (searchTermsPath.length === 1) {
            return this.#flatAndSeekAgain(menuItemsArray, searchTermsPath)
        } else {
            searchTermsPath.shift()
            return this.#recursivelyGetMenuItem(menuItemsArray, searchTermsPath)
        }
    }

    #flatAndSeekAgain(menuItemsArray, searchTermsPath) {
        const oneLevelChildrenArray = menuItemsArray.flatMap(item => {
            if (item.filhos == undefined) return []
            else return item.filhos
        })
        if (oneLevelChildrenArray.length === 0) return []
        else return this.#recursivelyGetMenuItem(oneLevelChildrenArray, searchTermsPath)
    }

    #getCamposDinamicosProjuris(camposDinamicosList) {
        const numOrgaoSegundoGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1186 }
        const tipoOrgaoSegundoGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1185 }
        const relatorSegundoGrau = { campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO", codigoCampoDinamico: 1189 }
        const numOrgaoTerceiroGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1187 }
        const tipoOrgaoTerceiroGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1188 }
        const faturamento = this.#getFaturamentoProjuris(camposDinamicosList)
        const sistema = this.#getSistemaProjuris(camposDinamicosList)
        const valorInicialLiquidacao = { campoDinamicoTipo: "TEXTO_LONGO", codigoCampoDinamico: 4330 }
        const temasProcessuais = { campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO", codigoCampoDinamico: 4689 }
        return [ numOrgaoSegundoGrau, tipoOrgaoSegundoGrau, relatorSegundoGrau, numOrgaoTerceiroGrau,
            tipoOrgaoTerceiroGrau, faturamento, sistema, valorInicialLiquidacao, temasProcessuais ]
    }

    #getFaturamentoProjuris(camposDinamicosList) {
        const faturamentosInfo = this.#getItemsList(camposDinamicosList, 4138)
        const faturamentoProjurisInfo = this.#getItemsInfo(faturamentosInfo, "Não faturado")
        return {
            campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO",
            codigoCampoDinamico: 4138,
            itensSelecionadosLista: [ faturamentoProjurisInfo.codigo ]
        }
    }

    #getSistemaProjuris(camposDinamicosList) {
        const sistemasInfo = this.#getItemsList(camposDinamicosList, 3941)
        const sistemaProjurisInfo = this.#getItemsInfo(sistemasInfo, Drafter.#nomeSistemaProjuris[this.#processoInfo.sistema.toLowerCase()])
        return {
            campoDinamicoTipo: "LISTA_SELECAO_UNICA",
            codigoCampoDinamico: 3941,
            campoDinamicoItemListaSelecionado: sistemaProjurisInfo.codigo
        }
    }

    #getItemsList(camposDinamicosList, codigoCampoDinamico) {
        const itemsInfo = camposDinamicosList.filter(campoDinamico => campoDinamico.codigo === codigoCampoDinamico)
        if (itemsInfo.length == 0) return null
        return itemsInfo[0].campoDinamicoItemLista
    }

    #getItemsInfo(itemsList, itemName) {
        if (!itemsList || itemsList?.length == 0) return null
        const matches = itemsList.filter(item => item.nome.toLowerCase() === itemName.toLowerCase())
        if (!matches || matches.length == 0) return null
        return matches[0]
    }


    #getSistemaProjurisInfo(sistemasList) {
        if (!sistemasList || sistemasList?.length == 0) return null
        const nomeSistemaProjuris = Drafter.#nomeSistemaProjuris[this.#processoInfo.sistema]
        const sistemaMatches = sistemasList.filter(sistema => sistema.nome.toLowerCase() === nomeSistemaProjuris.toLowerCase())
        if (!sistemaMatches || sistemaMatches.length == 0) return null
        return sistemaMatches[0]
    }

    async #getAdaptedAndamentos() {
        const relevantAndamentos = this.#filterRelevantAndamentos()
        const tiposAndamento = await this.#getAllTiposAndamento()
        const projurisAndamentos = { values: [], errorMsgs: [] }
        projurisAndamentos.values = relevantAndamentos.map(andamento => this.#adaptAndamentoToProjuris(andamento, tiposAndamento, projurisAndamentos))
        return projurisAndamentos
    }
    
    #filterRelevantAndamentos() {
        return this.#processoInfo.andamentos
            .filter(andamento => andamento.nomeAdaptadoAoCliente ?? false)
    }
    
    async #getAllTiposAndamento() {
        const maxProjurisEntriesPerPage = 100
        const endPointTipoAndamento = endPoints.tiposAndamento + 'quan-registros=' + maxProjurisEntriesPerPage
        const response = await fetchProjurisInfo(endPointTipoAndamento)
        const options = await extractOptionsArray(response)
        return options
    }
    
    #adaptAndamentoToProjuris(andamento, tiposAndamento, projurisAndamentos) {
        const projurisAndamento = new ProjurisAndamentoDataStructure()
        projurisAndamento.modulos = [{
            modulo: "PROCESSO",
            codigoRegistroVinculo: undefined,
            vinculoPrincipal: true
        }]
        projurisAndamento.dataAndamento = andamento.data
        projurisAndamento.horaAndamento = andamento.data
        const cabecalhoObs = `Ev./ID ${andamento.id} - ${andamento.nomeOriginalSistemaJustica}. `
        const observacao = andamento.observacao ? ` - ${andamento.observacao}` : ""
        projurisAndamento.descricaoAndamento =  cabecalhoObs + observacao
        const tipoAndamento = tiposAndamento
            .filter(tipoAndamento => tipoAndamento.nome.toLowerCase() === andamento.nomeAdaptadoAoCliente.toLowerCase())
        if (Array.isArray(tipoAndamento) && tipoAndamento.length === 0) {
            const errorMsg = generateErrMsg.noMatchInGoogle(andamento.nomeAdaptadoAoCliente, "andamento")
            projurisAndamentos.errorMsgs.push(errorMsg)
            return Drafter.#errorMsgFallback
        } else {
            projurisAndamento.codigoTipoAndamento = tipoAndamento[0].codigoAndamentoTipo
        }
        return projurisAndamento
    }
    
    async #getAdaptedPedidos(clientName, dataDistribuicao, causasDePedir = []) {
        const projurisPedidos = { values: [], errorMsgs: [] }
        projurisPedidos.values = await this.#getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir)
        const pedidosList = await this.#fetchRelevantPedidosProjurisData(projurisPedidos.values)
        this.#pushNomeAndCodigoIntoPedidos(projurisPedidos, pedidosList)
        return projurisPedidos
    
        // As linhas abaixo eram para usar os pedidos cadastrados pelo autor (e não da planilha de provisionamento)
        // const cadastradosAutor = this.#processoInfo.pedidos.map(pedido => {
        //     const nomePedido = pedido.split(" « ")[0]
        //     const projurisPedido = new ProjurisPedidoDataStructure()
        //     projurisPedido.nomePedido = nomePedido
        //     return projurisPedido
        // })
    }
    
    async #getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir = []) {
        const clientFilteredProvisionsList = await this.#getAllClientsProvisions(clientName)
        const clientProvisionsByCausasDePedir = this.#filterClientsProvisionsByCausasDePedir(clientFilteredProvisionsList, causasDePedir)
        return clientProvisionsByCausasDePedir.map(pedidoProvision => {
            const projurisPedido = new ProjurisPedidoDataStructure()
            projurisPedido.nomePedido = pedidoProvision[2].trim()
            projurisPedido.dataPedido = dataDistribuicao
            projurisPedido.valorProvisionado = pedidoProvision[4]
            projurisPedido.estimativaTipo = pedidoProvision[3]
            projurisPedido.riscoPorcentagem = pedidoProvision[5]
            return projurisPedido
        })
    }
    
    async #fetchRelevantPedidosProjurisData(pedidos) {
        const promises = pedidos.map(pedido => fetchProjurisInfo(endPoints.pedidos + pedido.nomePedido))
        const responses = await Promise.all(promises)
        return await Promise.all(responses.map(async response => await extractOptionsArray(response)))
    }
    
    #pushNomeAndCodigoIntoPedidos(projurisPedidos, list) {
        projurisPedidos.values.forEach((pedido, index) => {
            const relatedTypes = list[index]
            if (relatedTypes === "no content") {
                projurisPedidos.errorMsgs.push(generateErrMsg.noMatchInProjuris(pedido.nomePedido, "pedido"))
                return
            }
            const type = relatedTypes.filter(type => type.valor === pedido.nomePedido)
            pedido.codigoPedido = type[0].chave
            pedido.nomePedido = type[0].valor
        })
    }
    
    async #getAllClientsProvisions(clientName) {
        if (clientName === undefined) return []
        const promises = await this.#makeprojurisPedidosFetches()
        const responses = await Promise.all(promises)
        const allClientsProvisionsList = await extractValuesFromSheetsPromise(responses[0])
        const filter = {
            key: 0,
            operator: operators.insensitiveStrictEquality,
            val: clientName
        }
        return Drafter.#filterProjurisOptions(allClientsProvisionsList, filter)
    }
    
    async #makeprojurisPedidosFetches() {
        return [ fetchGoogleSheetData("pedidosProvisionamentos", this.#googleToken) ]
    }
    
    #filterClientsProvisionsByCausasDePedir(provisionsList, causasDePedir) {
        if (causasDePedir.length === 0) {
            const fallbackValue = "geral"
            return provisionsList
                .filter(clientProvision => clientProvision[1].trim().toLowerCase() === fallbackValue)
        } else {
            return provisionsList
                .filter(clientProvision => causasDePedir.includes(clientProvision[1]))
        }
    }    
}