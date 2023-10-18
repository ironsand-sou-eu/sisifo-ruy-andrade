import insertAdaptedAndamentoNames from "./andamentos"
import { REGEX_CNJ_NUMBER, hasErrors, operators } from "../utils/utils"
import { tiposParte, projurisTipoEnvolvidoType } from "../utils/enumsAndHardcoded"
import ProjurisProcessoDataStructure from "../data-structures/ProjurisProcessoDataStructure"
import ProjurisParticipanteDataStructure from "../data-structures/ProjurisParticipanteDataStructure"
import ProjurisAndamentoDataStructure from "../data-structures/ProjurisAndamentoDataStructure"
import ProjurisPedidoDataStructure from "../data-structures/ProjurisPedidoDataStructure"
import ProjurisFaturamentoDataStructure from "../data-structures/ProjurisFaturamentoDataStructure"
import cnjClasses from "../utils/cnj-classes"
import cnjAssuntos from "../utils/cnj-assuntos"
import generateErrMsg from "../exceptions/error-message-generator"
import useGoogleSheets from "../react/connectors/useGoogleSheets"
import useProjurisConnector from "../react/connectors/useProjurisConnector"

export default class Drafter {
    #errorMsgFallback = "Ocorreu uma falha, vide mensagens de erro"
    static filterTemplate = { key: "valor", operator: operators.insensitiveStrictEquality }
    static #nomeSistemaProjuris = {
        projuditjba: "PROJUDI",
        pje1gtjba: "PJE"
    }
    #projurisHandler
    #processoInfo
    #googleToken
    #sheetsLists
    #projurisLists

    constructor(processoInfo, googleToken) {
        const { fetchProjurisInfo, extractOptionsArray, endPoints, filterProjurisOptions } = useProjurisConnector()
        this.#projurisHandler = { fetchProjurisInfo, extractOptionsArray, endPoints, filterProjurisOptions }
        this.#processoInfo = processoInfo
        this.#googleToken = googleToken
    }

    async draftProcessoInfo() {
        await insertAdaptedAndamentoNames(this.#processoInfo, this.#googleToken)
        if (hasErrors([this.#processoInfo])) return { hasErrors: true, errorMsgs: this.#processoInfo.errorMsgs }
    
        await this.#loadLists()
        const projurisPartes = await this.#getAdaptedPartes()
        const tarefasParams = await this.#getTarefasParams()
        const projurisProcesso = await this.#getAdaptedProcesso(projurisPartes.clientRole[0])
        const projurisAndamentos = await this.#getAdaptedAndamentos()
        const projurisPedidos = await this.#getAdaptedPedidos(projurisPartes.clientRole[0]?.clientName, projurisProcesso.dataDistribuicao)
        const projurisFaturamentos = await this.#getAdaptedFaturamentos(projurisPartes.clientRole[0]?.clientName)
        const errors = hasErrors( [projurisProcesso, projurisAndamentos, projurisPedidos, projurisFaturamentos ])
        if (errors) return { hasErrors: true, errorMsgs: errors }
        return {
            projurisProcesso,
            projurisPartes,
            projurisAndamentos: projurisAndamentos.values,
            projurisPedidos: projurisPedidos.values,
            projurisFaturamentos: projurisFaturamentos.values,
            tarefasParams,
            bancosList: this.#projurisLists.bancosFormattedList,
            hasErrors: false
        }
    }
    
    async #loadLists() {
        const { fetchGoogleSheetData, extractValuesFromSheetsPromise } = useGoogleSheets()

        const googleSheetsFetchPromises = [
            fetchGoogleSheetData("clientes", this.#googleToken),
            fetchGoogleSheetData("pedidosProvisionamentos", this.#googleToken),
            fetchGoogleSheetData("faturamentos", this.#googleToken),
        ]
        const projurisFetchPromises = [
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.tiposParticipacao),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.varas),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.tiposVara),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.tiposJustica),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.areas),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.fases),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.gruposTrabalho),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.camposDinamicos),   
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.responsaveis),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.tiposTarefa),
            this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.bancos)
        ]

        const googleSheetResponses = await Promise.all(googleSheetsFetchPromises)
        const projurisResponses = await Promise.all(projurisFetchPromises)

        const [
            clientsList, allClientsProvisionsList, allClientsFaturamentosList
        ] = await Promise.all(googleSheetResponses.map(response => extractValuesFromSheetsPromise(response)))
        const [
            tiposParticipacaoList, varasList, tiposVaraList, tiposJusticaList,
            areasList, fasesList, gtsList, camposDinamicosList,
            allResponsaveisList, tiposTarefaList, bancosList
        ] = await Promise.all(projurisResponses.map(response => this.#projurisHandler.extractOptionsArray(response)))

        this.#sheetsLists = {
            clientsList, allClientsProvisionsList, allClientsFaturamentosList
        }
        const bancosFormattedList = bancosList.map(banco => this.#formatBancoToProjuris(banco))
        this.#projurisLists = {
            tiposParticipacaoList, varasList, tiposVaraList, tiposJusticaList,
            areasList, fasesList, gtsList, camposDinamicosList,
            allResponsaveisList, tiposTarefaList, bancosFormattedList
        }
    }

    #formatBancoToProjuris(bancoRawInfo) {
        return {
            chave: bancoRawInfo.codigoConta,
            valor: bancoRawInfo.nomeConta
        }
    }

    async #getAdaptedPartes() {
        const projurisPartes = {
            partesRequerentes: [],
            partesRequeridas: [],
            terceiros: [],
            magistrado: undefined,
            clientRole: undefined
        }
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequerentes, projurisPartes.partesRequerentes)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequeridas, projurisPartes.partesRequeridas)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.outrosParticipantes, projurisPartes.terceiros)
        projurisPartes.magistrado = this.#getProjurisAdaptedMagistrado(this.#processoInfo.juizAtual)
        projurisPartes.clientRole = this.#identifyClientes(projurisPartes)
        return projurisPartes
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
        projurisParte.tipoParticipacao = this.#projurisHandler.filterProjurisOptions(this.#projurisLists.tiposParticipacaoList, { ...Drafter.filterTemplate, val: parte.tipoDeParte, flattenOptions: true })[0]
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
        const filter = { ...Drafter.filterTemplate, val: "magistrado", flattenOptions: true }
        projurisParte.tipoParticipacao = this.#projurisHandler.filterProjurisOptions(this.#projurisLists.tiposParticipacaoList, filter)[0]
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
    
    #identifyClientes(partes) {
        const allPartes = [
            ...partes.partesRequerentes,
            ...partes.partesRequeridas,
            ...partes.terceiros
        ]
        const foundClients = []
        allPartes.forEach (parte => {
            const clientParte = this.#sheetsLists.clientsList.find(client => {
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
    
    async #getTarefasParams() {
        return {
            allResponsaveisList: this.#projurisLists.allResponsaveisList,
            tiposTarefa: this.#projurisLists.tiposTarefaList,
            audienciaFutura: this.#processoInfo.audienciaFutura
        }
    }
    
    async #getAdaptedProcesso(clientRole) {
        const { fetchGoogleSheetRowsMatchingExpression } = useGoogleSheets()
        const { getGtCrew } = useProjurisConnector()
        const getProjurisItem = (itemType, list, filter) => {
            const matchingItems = this.#projurisHandler.filterProjurisOptions(list, filter)
            if (!matchingItems) {
                const errorMsg = generateErrMsg.noMatchInProjuris(filter.val, itemType)
                projurisProcesso.errorMsgs.push(errorMsg)
                return this.#errorMsgFallback
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
        const dependentFetchesResponses = await Promise.all(this.#makeProjurisProcessoFetches(codTipoJustica, juizoInfo.comarca))
        const [ instanciasCnjList, orgaosJudiciaisList ] = await Promise.all(dependentFetchesResponses.map(response => this.#projurisHandler.extractOptionsArray(response)))
        projurisProcesso.vara = getProjurisItem("vara", this.#projurisLists.varasList, { ...Drafter.filterTemplate, val: juizoInfo.vara })
        projurisProcesso.tipoVara = getProjurisItem("tipoVara", this.#projurisLists.tiposVaraList, { ...Drafter.filterTemplate, val: juizoInfo.tipoVara })
        projurisProcesso.tipoJustica = getProjurisItem("tipoJustica", this.#projurisLists.tiposJusticaList, { key: "chave", operator: operators.insensitiveStrictEquality, val: codTipoJustica })
        projurisProcesso.area = getProjurisItem("area", this.#projurisLists.areasList, { ...Drafter.filterTemplate, val: "CONSUMIDOR" })
        projurisProcesso.fase = getProjurisItem("fase", this.#projurisLists.fasesList, { ...Drafter.filterTemplate, val: "Inicial" })
        projurisProcesso.instanciaCnj = getProjurisItem("instanciaCnj", instanciasCnjList, { ...Drafter.filterTemplate, val: juizoInfo.instanciaCnj })
        projurisProcesso.orgaoJudicial = getProjurisItem("orgaoJudicial", orgaosJudiciaisList, { ...Drafter.filterTemplate, val: juizoInfo.orgaoJudicial })
        projurisProcesso.complementoVara = juizoInfo.comarca
        const gts = this.#projurisHandler.filterProjurisOptions(this.#projurisLists.gtsList, { ...Drafter.filterTemplate, val: clientRole?.gt })
        projurisProcesso.gruposDeTrabalho = gts ? gts[0] : undefined
        try {
            const gtCrew = await getGtCrew(clientRole?.gt, this.#projurisLists.allResponsaveisList, this.#googleToken)
            projurisProcesso.responsaveis = gtCrew?.advs
        } catch (e) {
            projurisProcesso.errorMsgs.push(e)
            return projurisProcesso
        }
        projurisProcesso.classeCnj = this.#fetchCnjItem(this.#processoInfo.tipoDeAcao, "classe")
        projurisProcesso.assuntoCnj = this.#fetchCnjItem(this.#processoInfo.causaDePedir, "assunto")
        projurisProcesso.campoDinamicoDadoWs = this.#getCamposDinamicosProjuris()
        return projurisProcesso
    }
    
    #getCodigoTipoJustica(numeroDoProcesso) {
        return REGEX_CNJ_NUMBER.exec(numeroDoProcesso)[2]
    }
    
    #makeProjurisProcessoFetches(codTipoJustica, comarca) {
        const endPointInstanciaCnj = this.#projurisHandler.endPoints.instanciasCnj + codTipoJustica
        const maxProjurisEntriesPerPage = 30
        const endPointOrgaoJudicial = this.#projurisHandler.endPoints.orgaoJudicial + '(nomeOrgao:' + comarca
            + '$processoJusticaCodigo:' + codTipoJustica
            + '$pagina:0$quantidadeRegistros:' + maxProjurisEntriesPerPage + ')'
        
        return [
            this.#projurisHandler.fetchProjurisInfo(endPointInstanciaCnj),
            this.#projurisHandler.fetchProjurisInfo(endPointOrgaoJudicial),
        ]
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

    #getCamposDinamicosProjuris() {
        const numOrgaoSegundoGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1186 }
        const tipoOrgaoSegundoGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1185 }
        const relatorSegundoGrau = { campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO", codigoCampoDinamico: 1189 }
        const numOrgaoTerceiroGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1187 }
        const tipoOrgaoTerceiroGrau = { campoDinamicoTipo: "LISTA_SELECAO_UNICA", codigoCampoDinamico: 1188 }
        const faturamento = this.#getFaturamentoProjuris()
        const sistema = this.#getSistemaProjuris()
        const valorInicialLiquidacao = { campoDinamicoTipo: "TEXTO_LONGO", codigoCampoDinamico: 4330 }
        const temasProcessuais = { campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO", codigoCampoDinamico: 4689 }
        return [ numOrgaoSegundoGrau, tipoOrgaoSegundoGrau, relatorSegundoGrau, numOrgaoTerceiroGrau,
            tipoOrgaoTerceiroGrau, faturamento, sistema, valorInicialLiquidacao, temasProcessuais ]
    }

    #getFaturamentoProjuris() {
        const faturamentosInfo = this.#getItemsList(4138)
        const faturamentoProjurisInfo = this.#getItemsInfo(faturamentosInfo, "Não faturado")
        return {
            campoDinamicoTipo: "LISTA_MULTIPLA_SELECAO",
            codigoCampoDinamico: 4138,
            itensSelecionadosLista: [ faturamentoProjurisInfo.codigo ]
        }
    }

    #getSistemaProjuris() {
        const sistemasInfo = this.#getItemsList(3941)
        const sistemaProjurisInfo = this.#getItemsInfo(sistemasInfo, Drafter.#nomeSistemaProjuris[this.#processoInfo.sistema.toLowerCase()])
        return {
            campoDinamicoTipo: "LISTA_SELECAO_UNICA",
            codigoCampoDinamico: 3941,
            campoDinamicoItemListaSelecionado: sistemaProjurisInfo.codigo
        }
    }

    #getItemsList(codigoCampoDinamico) {
        const itemsInfo = this.#projurisLists.camposDinamicosList.filter(campoDinamico => campoDinamico.codigo === codigoCampoDinamico)
        if (itemsInfo.length == 0) return null
        return itemsInfo[0].campoDinamicoItemLista
    }

    #getItemsInfo(itemsList, itemName) {
        if (!itemsList || itemsList?.length == 0) return null
        const matches = itemsList.filter(item => item.nome.toLowerCase() === itemName.toLowerCase())
        if (!matches || matches.length == 0) return null
        return matches[0]
    }


    // #getSistemaProjurisInfo(sistemasList) {
    //     if (!sistemasList || sistemasList?.length == 0) return null
    //     const nomeSistemaProjuris = Drafter.#nomeSistemaProjuris[this.#processoInfo.sistema]
    //     const sistemaMatches = sistemasList.filter(sistema => sistema.nome.toLowerCase() === nomeSistemaProjuris.toLowerCase())
    //     if (!sistemaMatches || sistemaMatches.length == 0) return null
    //     return sistemaMatches[0]
    // }

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
        const endPointTipoAndamento = this.#projurisHandler.endPoints.tiposAndamento + 'quan-registros=' + maxProjurisEntriesPerPage
        const response = await this.#projurisHandler.fetchProjurisInfo(endPointTipoAndamento)
        const options = await this.#projurisHandler.extractOptionsArray(response)
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
            projurisAndamentos.errorMsgs.push(generateErrMsg.noMatchInGoogle(andamento.nomeAdaptadoAoCliente, "andamento"))
            return this.#errorMsgFallback
        } else {
            projurisAndamento.codigoTipoAndamento = tipoAndamento[0].codigoAndamentoTipo
        }
        return projurisAndamento
    }
    
    async #getAdaptedPedidos(clientName, dataDistribuicao, causasDePedir = []) {
        const projurisPedidos = { values: [], errorMsgs: [] }
        if (clientName) {
            projurisPedidos.values = await this.#getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir)
            const pedidosList = await this.#fetchRelevantPedidosProjurisData(projurisPedidos.values)
            this.#pushNomeAndCodigoIntoPedidos(projurisPedidos, pedidosList)
        }
        return projurisPedidos
    }
    
    async #getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir = []) {
        const clientFilteredProvisionsList = this.#projurisHandler.filterProjurisOptions(this.#sheetsLists.allClientsProvisionsList, { key: 0, operator: operators.insensitiveStrictEquality, val: clientName })
        const clientProvisionsByCausasDePedir = this.#filterClientsProvisionsByCausasDePedir(clientFilteredProvisionsList, causasDePedir)
        return clientProvisionsByCausasDePedir.map(pedidoProvision => {
            const projurisPedido = new ProjurisPedidoDataStructure()
            projurisPedido.nomePedido = pedidoProvision[2].trim()
            projurisPedido.dataPedido = dataDistribuicao
            const valor = pedidoProvision[4].replace(/[^\d,]/g,'')
            projurisPedido.valorProvisionado = valor
            projurisPedido.estimativaTipo = pedidoProvision[3]
            projurisPedido.riscoPorcentagem = pedidoProvision[5]
            return projurisPedido
        })
    }
    
    async #fetchRelevantPedidosProjurisData(pedidos) {
        const promises = pedidos.map(pedido => this.#projurisHandler.fetchProjurisInfo(this.#projurisHandler.endPoints.pedidos + pedido.nomePedido))
        const responses = await Promise.all(promises)
        return await Promise.all(responses.map(async response => await this.#projurisHandler.extractOptionsArray(response)))
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

    async #getAdaptedFaturamentos(clientName, audienciaFutura) {
        const projurisFaturamentos = { values: [], errorMsgs: [] }
        if (clientName) {
            projurisFaturamentos.values = await this.#getStandardFaturamentosByClient(clientName, audienciaFutura)
        }
        return projurisFaturamentos
    }

    async #getStandardFaturamentosByClient(clientName) {
        const clientFilteredFaturamentosList = this.#projurisHandler.filterProjurisOptions(this.#sheetsLists.allClientsFaturamentosList, { key: 0, operator: operators.insensitiveStrictEquality, val: clientName })
        const clientFaturamentosAfterConditions = this.#filterClientsFaturamentosByConditions(clientFilteredFaturamentosList)
        return clientFaturamentosAfterConditions.map(faturamento => {
            const [ , descricaoRawStr, , valorRawStr, vencimentoCalculationUnitsRawStr, unitsToVencimentoRawStr, bancoRawStr ] = faturamento
            const descricao = descricaoRawStr.trim()
            const valor = parseFloat(valorRawStr)
            const vencimento = this.#calculateVencimento(vencimentoCalculationUnitsRawStr, unitsToVencimentoRawStr)
            const banco = this.#projurisHandler.filterProjurisOptions(this.#projurisLists.bancosFormattedList, { key: "valor", operator: operators.insensitiveStrictEquality, val: bancoRawStr })[0]
            return new ProjurisFaturamentoDataStructure(clientName, valor, new Date(), vencimento, banco, descricao)
        })
    }

    #calculateVencimento(calculationUnit, unitsToVencimento) {
        const vencimentoCalc = {
            meses: monthsToAdd => {
                const dueDay = 27
                const today = new Date()
                const month = today.getMonth()
                const year = today.getFullYear()
                const decemberFromIndexZero = 11
                
                let yearsToAdd = Math.floor(monthsToAdd / 12)
                monthsToAdd -= yearsToAdd % 12
                if (month + monthsToAdd > decemberFromIndexZero) {
                    yearsToAdd += 1
                    monthsToAdd -= 12
                }
                const dueMonth = month + monthsToAdd
                const dueYear = year + yearsToAdd
                return new Date(dueYear, dueMonth, dueDay)
            },
            dias: days => new Date(new Date().getTime() + (parseInt(days) * 24 * 60 * 60 * 1000))
        }
        return vencimentoCalc[calculationUnit.toLowerCase()](unitsToVencimento)
    }

    #filterClientsFaturamentosByConditions(list) {
        return list.filter(faturamento => {
            const condicao = faturamento[2]
            if (condicao.toLowerCase() === "audiencia" || condicao.toLowerCase() === "audiência" && !this.#processoInfo.audienciaFutura) return false
            return true
        })
    }
}