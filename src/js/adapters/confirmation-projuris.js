import { fetchGoogleSheetRowsMatchingExpression } from "../connectors/google-sheets"
import createAll from "../creators/projuris"
import SajTarefaDataStructure from "../data-structures/SajTarefaDataStructure"
import Exception from "../exceptions/Exception"
import generateErrMsg from "../exceptions/error-message-generator"
import Drafter from "./drafter"

let msgSetter

async function finalizeProcessoInfo(sajEverything, confirmedInfo, resultSetter) {
    msgSetter = resultSetter
    const { sajProcessoMerged, sajPartesMerged, sajAndamentosMerged, sajPedidosMerged,
        tarefasParams } = await mergeConfirmedInfo(sajEverything, confirmedInfo)
    const polo = identifyClientsPolo(sajPartesMerged)
    try {
        const gtCrew = await Drafter.getGtCrew(sajProcessoMerged.gruposDeTrabalho.valor, tarefasParams.allResponsaveisList)
        gtCrew.gt = sajProcessoMerged.gruposDeTrabalho
        gtCrew.advs = sajProcessoMerged.responsaveis
        tarefasParams.gtCrew = gtCrew
    } catch(e) {
        throw new Exception(e, msgSetter)
    }
    tarefasParams.clientsPoloProcessual = polo
    const sajTarefas = await getAdaptedTarefas(tarefasParams)
    if (Drafter.hasErrors([sajTarefas])) throw new Exception(sajTarefas.errorMsgs, msgSetter)
    const sajTarefasMerged = sajTarefas.values

    finalAdaptProcesso(sajProcessoMerged)
    finalAdaptPartes(sajPartesMerged)
    finalAdaptAndamentos(sajAndamentosMerged, sajProcessoMerged.responsaveis)
    
    // console.log({ sajProcesso: sajProcessoMerged, sajPartes: sajPartesMerged, sajTarefas: sajTarefasMerged, sajAndamentos: sajAndamentosMerged, sajPedidos: sajPedidosMerged }, msgSetter)
    createAll({ sajProcesso: sajProcessoMerged, sajPartes: sajPartesMerged, sajTarefas: sajTarefasMerged, sajAndamentos: sajAndamentosMerged, sajPedidos: sajPedidosMerged }, msgSetter)
}

function identifyClientsPolo(sajPartes) {
    const foundClients = sajPartes.filter(parte => parte.flagCliente === true)
    if (foundClients.length === 0) return false
    return foundClients[0].tipoParticipacao.valor
}

async function mergeConfirmedInfo(sajEverything, confirmedInfo) {
    const { sajProcesso, sajPartes, sajAndamentos } = sajEverything
    const sajProcessoMerge = {
        numeroProcesso: [{
            tipoNumeracao: "PADRAO_CNJ",
            numeroDoProcesso: confirmedInfo.numeroProcesso,
            principal: true
        }],
        assuntoCnj: confirmedInfo.assuntoCnj,
        assunto: confirmedInfo.assunto,
        area: confirmedInfo.area,
        tipoJustica: confirmedInfo.tipoJustica,
        vara: confirmedInfo.vara,
        tipoVara: confirmedInfo.tipoVara,
        dataCitacao: confirmedInfo.dataCitacao,
        dataRecebimento: confirmedInfo.dataRecebimento,
        fase: confirmedInfo.fase,
        gruposDeTrabalho: confirmedInfo.gruposDeTrabalho,
        responsaveis: confirmedInfo.responsaveis,
        segredoJustica: confirmedInfo.segredoJustica,
        senhaProcesso: confirmedInfo.senhaProcesso,
        pastaCliente: confirmedInfo.pastaCliente,
        descricao: confirmedInfo.descricao
    }

    const sajPartesMerge = {
        partesRequerentes: confirmedInfo.partesRequerentes,
        partesRequeridas: confirmedInfo.partesRequeridas
    }

    const sajProcessoMerged = { ...sajProcesso, ...sajProcessoMerge }
    const sajPartesMerged = { ...sajPartes, ...sajPartesMerge }
    const sajPedidosMerged = confirmedInfo.pedidos
    const allSajPartes = [
        ...sajPartesMerged.partesRequerentes,
        ...sajPartesMerged.partesRequeridas,
        ...sajPartesMerged.terceiros,
        sajPartesMerged.magistrado
    ]
    return {
        sajProcessoMerged,
        sajPartesMerged: allSajPartes,
        sajAndamentosMerged: sajAndamentos,
        sajPedidosMerged,
        tarefasParams: sajEverything.tarefasParams
    }
}

function finalAdaptProcesso(sajProcesso) {
    if (!Array.isArray(sajProcesso.gruposDeTrabalho)) sajProcesso.gruposDeTrabalho = [ sajProcesso.gruposDeTrabalho ]
    if (!Array.isArray(sajProcesso.assuntoCnj)) sajProcesso.assuntoCnj = [ sajProcesso.assuntoCnj ]
    if (!Array.isArray(sajProcesso.responsaveis)) sajProcesso.responsaveis = [ sajProcesso.responsaveis ]
    delete sajProcesso.numeroProcesso
    delete sajProcesso.gtCrew
    delete sajProcesso.audienciaFutura
    sajProcesso.completo = true
    sajProcesso.assunto = sajProcesso.assunto.nomeAssunto
}

function finalAdaptPartes(sajPartes) {
    sajPartes.forEach( sajParte => delete sajParte.tipoParticipacao.parent)
}

function finalAdaptAndamentos(sajAndamentos, responsaveis) {
    sajAndamentos.forEach(sajAndamento => sajAndamento.responsaveis = responsaveis)
}

async function getAdaptedTarefas(tarefasParams) {
    const { gtCrew, clientsPoloProcessual } = tarefasParams
    const googleTarefasInfo = await getGoogleTarefasInfo(gtCrew.gt.valor, clientsPoloProcessual)
    const sajTarefas = { values: [], errorMsgs: [] }
    sajTarefas.values = googleTarefasInfo
        .map(tarefaGoogleInfo => adaptGoogleInfoTarefaToProjuris(tarefaGoogleInfo, sajTarefas, tarefasParams))
        .filter(sajTarefa => sajTarefa != undefined)
    return sajTarefas
}

async function getGoogleTarefasInfo(gtName, clientsPoloProcessual) {
    const googleTarefasInfoByGt = await fetchGoogleSheetRowsMatchingExpression("tarefas", gtName, null, true)
    if (!googleTarefasInfoByGt.found) throw new Exception(googleTarefasInfoByGt.value, msgSetter)
    return filterGoogleTarefasByProcessoSide(googleTarefasInfoByGt.value, clientsPoloProcessual)
}

function filterGoogleTarefasByProcessoSide(googleTarefas, clientSide) {
    return googleTarefas.filter(googleTarefa => {
        const tarefaSide = googleTarefa[1]
        return tarefaSide.toLowerCase() === clientSide.toLowerCase()
            || googleTarefa[1].toLowerCase() === "ambos"
            || googleTarefa[1] === ""
    })
}

function adaptGoogleInfoTarefaToProjuris (tarefaGoogleInfo, sajTarefas, tarefasParams) {
    const { tiposTarefa, gtCrew, audienciaFutura } = tarefasParams
    const dataAudiencia = audienciaFutura?.data
    const [ , , nomeTarefa, detalhe, observacao,
        teamsResponsible, prazoPrevistoString, prazoFatalString ] = tarefaGoogleInfo
    if (!dataAudiencia &&
        (prazoPrevistoString.toLowerCase().includes("aud") || prazoFatalString.toLowerCase().includes("aud"))) return
    const sajTarefa = new SajTarefaDataStructure()
    const tipoTarefa = tiposTarefa
        .filter(tipoTarefa => tipoTarefa.nomeTipoTarefa.toLowerCase() === nomeTarefa.toLowerCase())
    if (Array.isArray(tipoTarefa) && tipoTarefa.length === 0) {
        const errorMsg = generateErrMsg.noMatchInGoogle(nomeTarefa, "tarefa")
        sajTarefas.errorMsgs.push(errorMsg)
        return errorMsgFallback
    }
    sajTarefa.compromisso = false
    sajTarefa.possuiRecorrencia = false
    sajTarefa.modulos = [{
        modulo: "PROCESSO",
        codigoRegistroVinculo: undefined,
        vinculoPrincipal: true
    }]
    sajTarefa.tarefaEventoWs =  {
        descricaoTarefa: detalhe + " - " + observacao,
        dataConclusaoPrevista: getDateFromGoogleString(prazoPrevistoString, dataAudiencia).getTime(),
        horaConclusao: getDateFromGoogleString(prazoPrevistoString, dataAudiencia).toISOString(),
        dataLimite: getDateFromGoogleString(prazoFatalString, dataAudiencia).getTime(),
        horaLimite: getDateFromGoogleString(prazoFatalString, dataAudiencia).toISOString(),
        dataBase: new Date().getTime(),
        gruposResponsaveis: [ gtCrew.gt ],
        usuariosResponsaveis: getTeamResponsaveis(teamsResponsible, gtCrew),
        tipoTarefa: {
            chave: tipoTarefa[0].codigoTarefaTipo,
            valor: tipoTarefa[0].nomeTipoTarefa
        },
        notificaClienteCriacao: false,
        notificaResponsavelCriacao: true,
        privado: true,
        tarefaEventoSituacaoWs: {
            codigoTarefaEventoSituacao: 1,
            situacao: "Pendente"
        }
    }
    return sajTarefa
}

function getTeamResponsaveis(teamsResponsible, gtCrew) {
    const areThereEstagiariosTrainees = gtCrew.estagiarios?.length > 0 && Boolean(gtCrew.estagiarios[0])
    const teams = {
        "Coordenação": gtCrew.coordenadores,
        "Advs": gtCrew.advs,
        "Estagiários e Trainees": areThereEstagiariosTrainees ? gtCrew.estagiarios : gtCrew.advs,
        "Controladoria": gtCrew.controladoria
    }
    const groupsArray = teamsResponsible.split("+").map(group => group.trim())
    const arrays = groupsArray.map(group => teams[group])
    return arrays.flat()
 }

function getDateFromGoogleString(dateString, audienciaDate) {
    const baseDate = getBaseDate(dateString, audienciaDate)
    const modifier = getModifier(dateString)
    baseDate.setDate(baseDate.getDate() + modifier)
    return baseDate
}

function getBaseDate(dateString, audienciaDate) {
    return dateString.toLowerCase().includes("aud") ? new Date(audienciaDate) : new Date()    
}

function getModifier(dateString) {
    const whatToReplace = dateString.toLowerCase().includes("aud") ? "aud" : "d"
    return Number(dateString.toLowerCase()
        .trim()
        .replace(whatToReplace, "")
        .replaceAll(" ", ""))
}

export default finalizeProcessoInfo