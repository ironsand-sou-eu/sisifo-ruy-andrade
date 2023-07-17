import insertAdaptedAndamentoNames from "./andamentos"
import compareWithOperator, { REGEX_CNJ_NUMBER } from "../utils/utils"
import { fetchGoogleSheetData, extractValuesFromSheetsPromise, fetchGoogleSheetRowsMatchingExpression } from "../connectors/google-sheets"
import fetchSajInfo, { extractOptionsArray, endPoints, flattenObjectsArray } from "../connectors/projuris"
import { tiposParte, sajTipoEnvolvidoType } from "../enums"
import SajProcessoDataStructure from "../data-structures/SajProcessoDataStructure"
import SajParticipanteDataStructure from "../data-structures/SajParticipanteDataStructure"
import SajAndamentoDataStructure from "../data-structures/SajAndamentoDataStructure"
import SajPedidoDataStructure from "../data-structures/SajPedidoDataStructure"
import cnjClasses from "./cnj-classes"
import cnjAssuntos from "./cnj-assuntos"
import generateErrMsg from "../exceptions/error-message-generator"

class Drafter {
    static #errorMsgFallback = "Ocorreu uma falha, vide mensagens de erro"
    static #filterTemplate = { key: "valor", operator: "insensitiveStrictEquality" }
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
    
        const sajPartes = await this.#getAdaptedPartes()
        //TODO: implement error handling
        
        const tarefasParams = await this.#getTarefasParams(this.#processoInfo.audienciaFutura)
        const sajProcesso = await this.#getAdaptedProcesso(sajPartes.clientRole[0], tarefasParams.allResponsaveisList)
        const sajAndamentos = await this.#getAdaptedAndamentos()
        const sajPedidos = await this.#getAdaptedPedidos(sajPartes.clientRole[0]?.clientName, sajProcesso.dataDistribuicao)
        //TODO: implement error handling inside AdaptedPedidos
        const errors = Drafter.hasErrors([sajProcesso, sajAndamentos, sajPedidos])
        if (errors) return { hasErrors: true, errorMsgs: errors }
        return {
            sajProcesso,
            sajPartes,
            sajAndamentos: sajAndamentos.values,
            sajPedidos: sajPedidos,
            tarefasParams,
            hasErrors: false
        }
    }
    
    static hasErrors(sajEntitiesArray) {
        const allErrors = []
        sajEntitiesArray.forEach(sajEntity => {
            const errorMsgs = sajEntity.errorMsgs
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
            const response = await fetchSajInfo(endPoints.responsaveis)
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
        const sajPartes = {
            partesRequerentes: [],
            partesRequeridas: [],
            terceiros: [],
            magistrado: undefined,
            clientRole: undefined
        }
        const promises = await this.#makeSajPartesFetches()
        const responses = await Promise.all(promises)
        const clientsList = await extractValuesFromSheetsPromise(responses[0])
        this.#tiposParticipacao = await extractOptionsArray(responses[1])
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequerentes, sajPartes.partesRequerentes)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.partesRequeridas, sajPartes.partesRequeridas)
        this.#pushAdaptedPartesIntoPolo(this.#processoInfo.outrosParticipantes, sajPartes.terceiros)
        sajPartes.magistrado = this.#getSajAdaptedMagistrado(this.#processoInfo.juizAtual)
        sajPartes.clientRole = this.#identifyClientes(clientsList, sajPartes)
        return sajPartes
    }
    
    async #makeSajPartesFetches() {
        return [
            fetchGoogleSheetData("clientes", this.#googleToken),
            fetchSajInfo(endPoints.tiposParticipacao)
        ]
    }
    
    #pushAdaptedPartesIntoPolo(partesArray, polo) {
        if (partesArray === undefined) partesArray = []
        partesArray.forEach(async (parte, index) => {
            const sajParte = this.#adaptParteToSaj(parte, index)
            polo.push(sajParte)
            parte.advogados.forEach(async (adv, index) => { //TODO: Quando eu fizer a busca aninhada no Json que retorna, cadastrar os advogados como advogado adverso.
                const sajAdv = this.#adaptParteToSaj(adv, index + 100)
                polo.push(sajAdv)
            })
        })
    }
    
    #adaptParteToSaj(parte, index) {
        const sajParte = new SajParticipanteDataStructure()
        sajParte.nomePessoa = parte.nome
        sajParte.flagSemCpfCnpj = parte.dontHaveCpfCnpj
        sajParte.cpfCnpj = this.#getCpfOrCnpjOnlyNumbers(parte)
        sajParte.justificativaSemCpfCnpj = parte.noCpfCnpjReason
        sajParte.tipoPessoa = parte.cnpj ? "JURIDICA" : "FISICA"
        sajParte.observacaoGeral = parte.endereco
        if (parte.tipoDeParte === tiposParte.advogado) {
            sajParte.classificacao = [{ codigoClassificacao: 1, descricao: "Advogado" }]
            sajParte.observacaoGeral + " - OAB " + parte.oab
        }
        sajParte.telefone = parte.telefone
        sajParte.email = parte.email
        sajParte.habilitado = true
        if (parte.tipoDeParte === tiposParte.advogado) sajParte.profissao = { chave: 616, valor: "Advogado" }
        sajParte.tipoEnvolvido = sajTipoEnvolvidoType[parte.tipoDeParte]
        sajParte.tipoParticipacao = Drafter.#filterSajOptions(this.#tiposParticipacao, { key: "valor", operator: "insensitiveStrictEquality", val: parte.tipoDeParte, flattenOptions: true })[0]
        sajParte.flagPrincipal = (index === 0)
        sajParte.flagCompleto = true
        return sajParte
    }
    
    #getCpfOrCnpjOnlyNumbers(parte) {
        const string = parte.cpf ?? parte.cnpj
        return string?.replaceAll(/\.|-|\//g, "")
    }
    
    #getSajAdaptedMagistrado(name) {
        const sajParte = new SajParticipanteDataStructure()
        sajParte.nomePessoa = name
        sajParte.flagSemCpfCnpj = true
        sajParte.justificativaSemCpfCnpj = "Perfis de magistrado não têm CPF disponibilizado no Projudi"
        sajParte.tipoPessoa = "FISICA"
        sajParte.observacaoGeral = ""
        sajParte.habilitado = true
        sajParte.tipoEnvolvido = sajTipoEnvolvidoType.juiz
        const filter = { key: "valor", operator: "insensitiveStrictEquality", val: "magistrado", flattenOptions: true }
        sajParte.tipoParticipacao = Drafter.#filterSajOptions(this.#tiposParticipacao, filter)[0]
        sajParte.flagPrincipal = false
        sajParte.flagCompleto = true
        sajParte.classificacao = [
            {
                "codigoClassificacao": 10797,
                "descricao": "Ente Público"
            }
        ]
        sajParte.flagCliente = false
        return sajParte
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
        const promises = this.#makeSajTarefasFetches()
        const responses = await Promise.all(promises)
        const [ allResponsaveisList, tiposTarefa ]
            = await Promise.all(responses.map(response => extractOptionsArray(response)))
        return { allResponsaveisList, tiposTarefa, audienciaFutura }
    }
    
    #makeSajTarefasFetches() {
        return [
            fetchSajInfo(endPoints.responsaveis),
            fetchSajInfo(endPoints.tiposTarefa)
        ]
    }
    
    async #getAdaptedProcesso(clientRole, allResponsaveisList) {
        const getProjurisItem = (itemType, list, filter, searchedValue) => {
            searchedValue = searchedValue ?? juizoInfo[itemType]
            filter = filter ?? { ...Drafter.#filterTemplate, val: searchedValue }
            if (!searchedValue) {
                const errorMsg = generateErrMsg.noMatchInGoogle(this.#processoInfo.juizo.nomeOriginalSistemaJustica, itemType)
                sajProcesso.errorMsgs.push(errorMsg)
                return Drafter.#errorMsgFallback
            }
            const matchingItems = Drafter.#filterSajOptions(list, filter)
            if (!matchingItems) {
                const errorMsg = generateErrMsg.noMatchInSaj(searchedValue, itemType)
                sajProcesso.errorMsgs.push(errorMsg)
                return Drafter.#errorMsgFallback
            }
            return matchingItems[0]
        }
        const sajProcesso = new SajProcessoDataStructure()
        
        const codTipoJustica = this.#getCodigoTipoJustica(this.#processoInfo.numero)
        sajProcesso.processoNumeroWs =  [{
            tipoNumeracao: "PADRAO_CNJ",
            numeroDoProcesso: this.#processoInfo.numero,
            principal: true
        }]
        sajProcesso.dataDistribuicao = this.#processoInfo.dataDistribuicao
        sajProcesso.audienciaFutura = this.#processoInfo.audienciaFutura
        sajProcesso.valorAcao = this.#processoInfo.valorDaCausa
        sajProcesso.segredoJustica = this.#processoInfo.segredoJustica
        const googleJuizoInfo = await fetchGoogleSheetRowsMatchingExpression("juizos", this.#processoInfo.juizo.nomeOriginalSistemaJustica, this.#googleToken)
        if (!googleJuizoInfo.found) {
            sajProcesso.errorMsgs.push(generateErrMsg.noMatchInGoogle(this.#processoInfo.juizo.nomeOriginalSistemaJustica, "juizo"))
            return sajProcesso
        }
        const juizoInfo = {
            vara: googleJuizoInfo.value[1],
            tipoVara: googleJuizoInfo.value[2],
            comarca: googleJuizoInfo.value[3],
            instanciaCnj: googleJuizoInfo.value[4],
            tipoInstancia: googleJuizoInfo.value[5],
            orgaoJudicial: googleJuizoInfo.value[6],
        }
        sajProcesso.tipoInstancia = juizoInfo.tipoInstancia
        const promises = this.#makeSajProcessoFetches(codTipoJustica, juizoInfo.comarca)
        const responses = await Promise.all(promises)
        const [varasList, tiposVaraList, isntanciasCnjList, orgaosJudiciaisList, 
            tiposJusticaList, areasList, fasesList, gtsList]
            = await Promise.all(responses.map(response => extractOptionsArray(response)))
        sajProcesso.vara = getProjurisItem("vara", varasList)
        sajProcesso.tipoVara = getProjurisItem("tipoVara", tiposVaraList)
        sajProcesso.instanciaCnj = getProjurisItem("instanciaCnj", isntanciasCnjList)
        sajProcesso.orgaoJudicial = getProjurisItem("orgaoJudicial", orgaosJudiciaisList)
        sajProcesso.tipoJustica = getProjurisItem("tipoJustica", tiposJusticaList, { key: "chave", operator: "insensitiveStrictEquality", val: codTipoJustica }, codTipoJustica)
        sajProcesso.area = getProjurisItem("area", areasList, { ...Drafter.#filterTemplate, val: "CONSUMIDOR" }, "CONSUMIDOR")
        sajProcesso.fase = getProjurisItem("fase", fasesList, { ...Drafter.#filterTemplate, val: "Inicial" }, "Inicial")
        const gts = Drafter.#filterSajOptions(gtsList, { ...Drafter.#filterTemplate, val: clientRole?.gt })
        sajProcesso.gruposDeTrabalho = gts ? gts[0] : undefined
        try {
            const gtCrew = await Drafter.getGtCrew(clientRole?.gt, allResponsaveisList, this.#googleToken)
            sajProcesso.responsaveis = gtCrew?.advs
        } catch (e) {
            sajProcesso.errorMsgs.push(e)
            return sajProcesso
        }
        sajProcesso.classeCnj = this.#fetchCnjItem(this.#processoInfo.tipoDeAcao, "classe")
        sajProcesso.assuntoCnj = this.#fetchCnjItem(this.#processoInfo.causaDePedir, "assunto")    
        return sajProcesso
    }
    
    #getCodigoTipoJustica(numeroProcesso) {
        return REGEX_CNJ_NUMBER.exec(numeroProcesso)[2]
    }
    
    #makeSajProcessoFetches(codTipoJustica, comarca) {
        const endPointInstanciaCnj = endPoints.instanciasCnj + codTipoJustica
        const maxSajEntriesPerPage = 30
        const endPointOrgaoJudicial = endPoints.orgaoJudicial + '(nomeOrgao:' + comarca
            + '$processoJusticaCodigo:' + codTipoJustica
            + '$pagina:0$quantidadeRegistros:' + maxSajEntriesPerPage + ')'
        
        return [
            fetchSajInfo(endPoints.varas),
            fetchSajInfo(endPoints.tiposVara),
            fetchSajInfo(endPointInstanciaCnj),
            fetchSajInfo(endPointOrgaoJudicial),
            fetchSajInfo(endPoints.tiposJustica),
            fetchSajInfo(endPoints.areas),
            fetchSajInfo(endPoints.fases),
            fetchSajInfo(endPoints.gruposTrabalho)
        ]
    }
    
    static #filterSajOptions(rawOptions, filterObject) {
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
            const filteredOptions = Drafter.#filterSajOptions(allResponsaveisList, {...filterTemplate, val: name})
            if (filteredOptions !== undefined) return filteredOptions[0]
            else throw generateErrMsg.noMatchInSaj(name, "usuario")
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

    async #getAdaptedAndamentos() {
        const relevantAndamentos = this.#filterRelevantAndamentos()
        const tiposAndamento = await this.#getAllTiposAndamento()
        const sajAndamentos = { values: [], errorMsgs: [] }
        sajAndamentos.values = relevantAndamentos.map(andamento => this.#adaptAndamentoToProjuris(andamento, tiposAndamento, sajAndamentos))
        return sajAndamentos
    }
    
    #filterRelevantAndamentos() {
        return this.#processoInfo.andamentos
            .filter(andamento => andamento.nomeAdaptadoAoCliente ?? false)
    }
    
    async #getAllTiposAndamento() {
        const maxSajEntriesPerPage = 100
        const endPointTipoAndamento = endPoints.tiposAndamento + 'quan-registros=' + maxSajEntriesPerPage
        const response = await fetchSajInfo(endPointTipoAndamento)
        const options = await extractOptionsArray(response)
        return options
    }
    
    #adaptAndamentoToProjuris(andamento, tiposAndamento, sajAndamentos) {
        const sajAndamento = new SajAndamentoDataStructure()
        sajAndamento.modulos = [{
            modulo: "PROCESSO",
            codigoRegistroVinculo: undefined,
            vinculoPrincipal: true
        }]
        sajAndamento.dataAndamento = andamento.data
        sajAndamento.horaAndamento = andamento.data
        const cabecalhoObs = `Ev./ID ${andamento.id} - ${andamento.nomeOriginalSistemaJustica}. `
        const observacao = andamento.observacao ? ` - ${andamento.observacao}` : ""
        sajAndamento.descricaoAndamento =  cabecalhoObs + observacao
        const tipoAndamento = tiposAndamento
            .filter(tipoAndamento => tipoAndamento.nome.toLowerCase() === andamento.nomeAdaptadoAoCliente.toLowerCase())
        if (Array.isArray(tipoAndamento) && tipoAndamento.length === 0) {
            const errorMsg = generateErrMsg.noMatchInGoogle(andamento.nomeAdaptadoAoCliente, "andamento")
            sajAndamentos.errorMsgs.push(errorMsg)
            return Drafter.#errorMsgFallback
        } else {
            sajAndamento.codigoTipoAndamento = tipoAndamento[0].codigoAndamentoTipo
        }
        return sajAndamento
    }
    
    async #getAdaptedPedidos(clientName, dataDistribuicao, causasDePedir = []) {
        const pedidos = await this.#getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir)
        const pedidosList = await this.#fetchRelevantPedidosSajData(pedidos)
        this.#pushNomeAndCodigoIntoPedidos(pedidos, pedidosList)
        return pedidos
    
        // As linhas abaixo eram para usar os pedidos cadastrados pelo autor (e não da planilha de provisionamento)
        // const cadastradosAutor = this.#processoInfo.pedidos.map(pedido => {
        //     const nomePedido = pedido.split(" « ")[0]
        //     const sajPedido = new SajPedidoDataStructure()
        //     sajPedido.nomePedido = nomePedido
        //     return sajPedido
        // })
    }
    
    async #getStandardPedidosByClientAndCausaPedir(clientName, dataDistribuicao, causasDePedir = []) {
        const clientFilteredProvisionsList = await this.#getAllClientsProvisions(clientName)
        const clientProvisionsByCausasDePedir = this.#filterClientsProvisionsByCausasDePedir(clientFilteredProvisionsList, causasDePedir)
        return clientProvisionsByCausasDePedir.map(pedidoProvision => {
            const sajPedido = new SajPedidoDataStructure()
            sajPedido.nomePedido = pedidoProvision[2].trim()
            sajPedido.dataPedido = dataDistribuicao
            sajPedido.valorProvisionado = pedidoProvision[4]
            sajPedido.estimativaTipo = pedidoProvision[3]
            sajPedido.riscoPorcentagem = pedidoProvision[5]
            return sajPedido
        })
    }
    
    async #fetchRelevantPedidosSajData(pedidos) {
        const promises = pedidos.map(pedido => fetchSajInfo(endPoints.pedidos + pedido.nomePedido))
        const responses = await Promise.all(promises)
        return await Promise.all(responses.map(async response => await extractOptionsArray(response)))
    }
    
    #pushNomeAndCodigoIntoPedidos(pedidos, list) {
        pedidos.forEach((pedido, index) => {
            const relatedTypes = list[index]
            const type = relatedTypes.filter(type => type.valor === pedido.nomePedido)
            pedido.codigoPedido = type[0].chave
            pedido.nomePedido = type[0].valor
        })
    }
    
    async #getAllClientsProvisions(clientName) {
        if (clientName === undefined) return []
        const promises = await this.#makeSajPedidosFetches()
        const responses = await Promise.all(promises)
        const allClientsProvisionsList = await extractValuesFromSheetsPromise(responses[0])
        const filter = {
            key: 0,
            operator: "insensitiveStrictEquality",
            val: clientName
        }
        return Drafter.#filterSajOptions(allClientsProvisionsList, filter)
    }
    
    async #makeSajPedidosFetches() {
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
export default Drafter