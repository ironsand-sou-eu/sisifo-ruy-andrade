import fetchSajInfo, { endPoints, extractOptionsArray, makeProjurisPost } from "../connectors/projuris";
import SajParteDataStructure from "../data-structures/SajPessoaDataStructure";
import ProcessoAlreadyExistsException from "../exceptions/ProcessoAlreadyExistsException";

let msgSetter

async function createAll({ sajProcesso, sajPartes, sajTarefas, sajAndamentos, sajPedidos }, resultSetter) {
    msgSetter = resultSetter
    msgSetter.setSingleProcessingMsg("Verificando se o processo já está cadastrado..." )
    const numeroProcesso = sajProcesso.processoNumeroWs[0].numeroDoProcesso
    const codigoProcessoIfExists = await checkIfProcessoAlreadyExists(numeroProcesso)
    if (codigoProcessoIfExists) {
        throw new ProcessoAlreadyExistsException(codigoProcessoIfExists, numeroProcesso, msgSetter)
    }
    const envolvidos = await ensurePeopleExists(sajPartes)
    const codigoProcesso = await createProcesso(sajProcesso)
    await attachPessoasToProcesso(envolvidos, codigoProcesso)
    await adjustAndAttachTarefasToProcesso(sajTarefas, codigoProcesso)
    await adjustAndAttachAndamentosToProcesso(sajAndamentos, codigoProcesso)
    await attachPedidosToProcesso(sajPedidos, codigoProcesso)
    msgSetter.clear({ type: "processing" })
}

async function checkIfProcessoAlreadyExists(numeroProcesso) {
    const response = await fetchSajInfo(endPoints.buscarProcessoPorNumero + numeroProcesso)
    const result = await extractOptionsArray(response)
    if (result.length > 0) return result[0].codigoProcesso
    return false
}

async function ensurePeopleExists(partes) {
    const partesWithoutDuplicates = partes.uniqueValuesByParteName().uniqueValuesByCpfCnpj()
    const qtdEnvolvidos = partesWithoutDuplicates.length
    msgSetter.setSingleProcessingMsg(`Buscando/criando pessoas: 0 de ${qtdEnvolvidos}`)
    const findPeopleResponsePromises = partesWithoutDuplicates
        .map(async person => {
            let body
            if (person.cpfCnpj)
                body = JSON.stringify({cpfOuCnpj: person.cpfCnpj})
            else
                body = JSON.stringify({nomeOuRazaoSocial: person.nomePessoa})
            return await makeProjurisPost(endPoints.buscarPessoa, body)
        })
    const findAllPeopleResponses = await Promise.all(findPeopleResponsePromises)
    const findAllPeopleMatches = await Promise.all(findAllPeopleResponses
        .map(async response => await extractOptionsArray(response)))
    const projurisFormattedEnvolvidos = await Promise.all(
        findAllPeopleMatches.map(async (matchesForEnvolvido, index) => {
        const envolvido = partesWithoutDuplicates[index]
        const personNotFound = (matchesForEnvolvido === "no content")
            || (matchesForEnvolvido.length === 0)
        if (personNotFound) {
            const response = await createPessoa(envolvido)
            msgSetter.setSingleProcessingMsg(`Pessoas: ${index + 1} de ${qtdEnvolvidos}`)
            return response
        }
        const envolvidoData = {
            ...envolvido,
            codigoPessoa: matchesForEnvolvido[0].codigoPessoa,
            nome: matchesForEnvolvido[0].nome,
        }
        msgSetter.setSingleProcessingMsg(`Pessoas: ${index + 1} de ${qtdEnvolvidos}`)
        return formatEnvolvidoToProjuris(envolvidoData)
    }))
    msgSetter.clear({ type: "processing" })
    msgSetter.addMsg({ type: "success", msg: `Cadastradas ${qtdEnvolvidos} pessoas` })
    return projurisFormattedEnvolvidos.filter(response => response != null)
}

Array.prototype.uniqueValuesByParteName = function() {
    const temp = {}
    return this.filter(parte => !(temp[parte.nomePessoa] = parte.nomePessoa in temp))
}

Array.prototype.uniqueValuesByCpfCnpj = function() {
    const temp = {}
    return this.filter(parte => !(temp[parte.cpfCnpj] = parte.cpfCnpj in temp))
}

async function createPessoa(pessoa) {
    const sajPessoa = new SajParteDataStructure(pessoa.nomePessoa, pessoa.cpfCnpj,
        pessoa.flagSemCpfCnpj, pessoa.justificativaSemCpfCnpj, pessoa.tipoPessoa,
        pessoa.observacaoGeral, pessoa.telefone, pessoa.email, pessoa.habilitado,
        pessoa.profissao)
    const body = JSON.stringify(sajPessoa)
    const response = await makeProjurisPost(endPoints.criarPessoa, body)
    if (!(response.status && response.status >=200 && response.status < 300 )) {
        msgSetter.addMsg({ type: "fail", msg: `Erro ao criar a pessoa ${pessoa.nomePessoa}. Por favor, faça a criação manualmente.` })
        return null
    }
    const responseJson = await response.json()
    const envolvidoData = {
        ...pessoa,
        codigoPessoa: responseJson.chave,
        nome: pessoa.nomePessoa,
    }
    return formatEnvolvidoToProjuris(envolvidoData)
}

function formatEnvolvidoToProjuris(envolvidoData) {
    const {
        flagCliente, flagPrincipal, nome, codigoPessoa, tipoEnvolvido,
        tipoParticipacao: {
            chave: tipoParticipacaoChave,
            valor: tipoParticipacaoValor
        }} = envolvidoData
    
        return {
        flagCliente,
        flagPrincipal,
        pessoaEnvolvido: {
            chave: codigoPessoa,
            valor: nome
        },
        tipoParticipacao: {
            chave: tipoParticipacaoChave,
            valor: tipoParticipacaoValor
        },
        tipoEnvolvido: tipoEnvolvido
    }
}

async function createProcesso(processo) {
    msgSetter.setSingleProcessingMsg("Cadastrando processo...")

    const body = JSON.stringify(processo)
    const response = await makeProjurisPost(endPoints.criarProcesso, body)
    const responseJson = await response?.json()
    const requestSuccessful = (response.status && response.status >=200 && response.status < 300 )
    const createdSuccessful = Boolean(responseJson?.codigoProcesso)
    if (!(requestSuccessful && createdSuccessful)) {
        msgSetter.addMsg({ type: "fail", msg: "Erro ao criar o processo. Por favor, "
            + "recarregue a página e tente novamente." })
        return null
    }
    const codigoProcesso = responseJson.codigoProcesso
    const numeroProcesso = processo.processoNumeroWs[0].numeroDoProcesso
    const msg = `Processo <a href=https://app.projurisadv.com.br/casos/`
        + `processo/visao-completa/${codigoProcesso} target="_blank">${numeroProcesso}</a> `
        + `cadastrado com sucesso.`
    
    msgSetter.clear({ type: "processing" })
    msgSetter.addMsg({ type: "success", msg, before: true })
    return codigoProcesso
}

async function attachPessoasToProcesso(envolvidos, codigoProcesso) {
    const names = envolvidos.map(envolvido => envolvido.pessoaEnvolvido.valor)
    const params = {
        entitiesArray: envolvidos,
        endpoint: endPoints.vincularPessoaProcesso + codigoProcesso,
        checkSuccessfulCreation: responseJson => responseJson === true,
        getName: envolvido => envolvido.pessoaEnvolvido.valor,
        msgs: {
            update: "Vinculando pessoas como partes",
            success: "pessoas vinculadas como partes no processo.",
            failStart: "Erro ao vincular a pessoa",
            failEnd: "como parte no processo. Por favor, faça a vinculação manualmente."
        }
    }
    await attachEntitiesToProcesso(params)
}

async function adjustAndAttachTarefasToProcesso(tarefas, codigoProcesso) {
    tarefas.forEach(tarefa => tarefa.modulos[0].codigoRegistroVinculo = codigoProcesso)
    const params = {
        entitiesArray: tarefas,
        endpoint: endPoints.criarTarefa,
        checkSuccessfulCreation: responseJson => Boolean(responseJson?.chave),
        getName: tarefa => tarefa.tarefaEventoWs.tipoTarefa.valor,
        msgs: {
            update: "Criando tarefas",
            success: "tarefas criadas no processo.",
            failStart: "Erro ao criar a tarefa",
            failEnd: "no processo. Por favor, crie o registro manualmente."
        }
    }
    await attachEntitiesToProcesso(params)
}

async function adjustAndAttachAndamentosToProcesso(andamentos, codigoProcesso) {
    andamentos.forEach(andamento => andamento.modulos[0].codigoRegistroVinculo = codigoProcesso)
    const params = {
        entitiesArray: andamentos,
        endpoint: endPoints.criarAndamento,
        checkSuccessfulCreation: responseJson => Boolean(responseJson?.chave),
        getName: andamento => {
            const maxLength = 60
            const subsString = andamento.descricaoAndamento.substr(0, maxLength)
            const andamentoText = subsString.substr(0, Math.min(subsString.length, subsString.lastIndexOf(" ")))
            const andamentoDate = new Date(andamento.dataAndamento).toLocaleDateString()
            return andamentoDate + " - " + andamentoText
        },
        msgs: {
            update: "Criando andamentos",
            success: "andamentos criados no processo.",
            failStart: "Erro ao criar o andamento",
            failEnd: "no processo. Por favor, crie o registro manualmente."
        }
    }
    await attachEntitiesToProcesso(params)
}

async function attachPedidosToProcesso(pedidos, codigoProcesso) {
    if (pedidos.values.length == 0) return
    const params = {
        entitiesArray: pedidos,
        endpoint: endPoints.criarPedido + codigoProcesso,
        checkSuccessfulCreation: responseJson => Boolean(responseJson?.chave),
        getName: pedido => pedido.nomePedido,
        msgs: {
            update: "Criando pedidos",
            success: "pedidos criados no processo.",
            failStart: "Erro ao criar o pedido",
            failEnd: "no processo. Por favor, crie o registro manualmente."
        }
    }
    await attachEntitiesToProcesso(params)
}

async function attachEntitiesToProcesso(creationParams) {
    const { entitiesArray, endpoint, checkSuccessfulCreation, getName, msgs } = creationParams
    const qtd = entitiesArray.length
    msgSetter.setSingleProcessingMsg(`${msgs.update}: 0 de ${qtd}`)

    let i = 0
    const intervalMs = 300
    const responses = await Promise.all(entitiesArray.map(async (entity, index) => {
        const body = JSON.stringify(entity)
        await new Promise(resolve => setTimeout(resolve, i += intervalMs))
        msgSetter.setSingleProcessingMsg(`${msgs.update}: ${index + 1} de ${qtd}`)
        return makeProjurisPost(endpoint, body)
    }))

    responses.forEach(async (response, index) => {       
        const requestSuccessful = (response.status && response.status >=200 && response.status < 300 )
        const createdSuccessful = checkSuccessfulCreation(await response.json())
        if (!(requestSuccessful && createdSuccessful)) {
            const msg = msgs.failStart + " " + getName(entitiesArray[index]) + " "  + msg.failEnd
            msgSetter.addMsg({ type: "fail", msg })
            return
        }
    })

    msgSetter.clear({ type: "processing" })
    msgSetter.addMsg({ type: "success", msg: `${qtd} ${msgs.success}` })
}

export default createAll