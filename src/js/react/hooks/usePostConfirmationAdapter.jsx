import ProjurisTarefaDataStructure from "../../data-structures/ProjurisTarefaDataStructure"
import Exception from "../../exceptions/Exception"
import generateErrMsg from "../../exceptions/error-message-generator"
import { hasErrors } from "../../utils/utils"
import useProjurisConnector from "../connectors/useProjurisConnector"
import useGoogleSheets from "../connectors/useGoogleSheets"
import useProjurisCreator from "../creators/useProjurisCreator"

export default function usePostConfirmationAdapter(processoDraftedData, msgSetter) {
    const { getGtCrew } = useProjurisConnector()
    const { createAll } = useProjurisCreator(msgSetter)
    const { fetchGoogleSheetRowsMatchingExpression } = useGoogleSheets()

    async function finalizeProcessoInfo(formData) {
        const { projurisProcessoMerged, projurisPartesMerged, projurisAndamentosMerged, projurisPedidosMerged,
            projurisFaturamentosMerged, tarefasParams } = await mergeFormData(formData)
        try {
            const gtCrew = await getGtCrew(projurisProcessoMerged.gruposDeTrabalho.valor, tarefasParams.allResponsaveisList)
            gtCrew.gt = projurisProcessoMerged.gruposDeTrabalho
            gtCrew.advs = projurisProcessoMerged.responsaveis
            tarefasParams.gtCrew = gtCrew
        } catch(e) {
            throw new Exception(e, msgSetter)
        }
        tarefasParams.clientsPoloProcessual = identifyClientsPolo(projurisPartesMerged)
        const projurisTarefas = await getAdaptedTarefas(tarefasParams)
        if (hasErrors([projurisTarefas])) throw new Exception(projurisTarefas.errorMsgs, msgSetter)
        const projurisTarefasMerged = projurisTarefas.values
    
        finalAdaptProcesso(projurisProcessoMerged)
        finalAdaptPartes(projurisPartesMerged)
        finalAdaptAndamentos(projurisAndamentosMerged, projurisProcessoMerged.responsaveis)
        
        // console.log({ projurisProcesso: projurisProcessoMerged, projurisPartes: projurisPartesMerged,
        //     projurisTarefas: projurisTarefasMerged, projurisAndamentos: projurisAndamentosMerged,
        //     projurisPedidos: projurisPedidosMerged, projurisFaturamentos: projurisFaturamentosMerged }, msgSetter)
        createAll({ projurisProcesso: projurisProcessoMerged, projurisPartes: projurisPartesMerged,
            projurisTarefas: projurisTarefasMerged, projurisAndamentos: projurisAndamentosMerged,
            projurisPedidos: projurisPedidosMerged, projurisFaturamentos: projurisFaturamentosMerged }, msgSetter)
    }
    
    function identifyClientsPolo(projurisPartes) {
        const foundClients = projurisPartes.filter(parte => parte.flagCliente === true)
        if (foundClients.length === 0) return false
        return foundClients[0].tipoParticipacao.valor
    }
    
    async function mergeFormData(formData) {
        const { projurisProcesso, projurisPartes, projurisAndamentos, tarefasParams } = processoDraftedData
        const {
            numeroDoProcesso, assuntoCnj, assunto, area, tipoJustica, vara, tipoVara, dataCitacao,
            dataRecebimento, fase, gruposDeTrabalho, responsaveis, segredoJustica, senhaProcesso,
            pastaCliente, descricao, partesRequerentes, partesRequeridas, pedidos, faturamentos
        } = formData

        const projurisProcessoMerge = {
            numeroProcesso: [{
                tipoNumeracao: "PADRAO_CNJ",
                numeroDoProcesso,
                principal: true
            }],
            assuntoCnj, assunto, area, tipoJustica, vara, tipoVara, dataCitacao, dataRecebimento,
            fase, gruposDeTrabalho, responsaveis, segredoJustica, senhaProcesso, pastaCliente, descricao
        }
        const projurisPartesMerge = { partesRequerentes, partesRequeridas }

        const projurisProcessoMerged = { ...projurisProcesso, ...projurisProcessoMerge }
        const projurisPartesMerged = { ...projurisPartes, ...projurisPartesMerge }
        const allprojurisPartes = [
            ...projurisPartesMerged.partesRequerentes,
            ...projurisPartesMerged.partesRequeridas,
            ...projurisPartesMerged.terceiros,
            projurisPartesMerged.magistrado
        ]
        return {
            projurisProcessoMerged,
            projurisPartesMerged: allprojurisPartes,
            projurisAndamentosMerged: projurisAndamentos,
            projurisPedidosMerged: pedidos,
            projurisFaturamentosMerged: faturamentos,
            tarefasParams: tarefasParams
        }
    }
    
    function finalAdaptProcesso(projurisProcesso) {
        if (!Array.isArray(projurisProcesso.gruposDeTrabalho)) projurisProcesso.gruposDeTrabalho = [ projurisProcesso.gruposDeTrabalho ]
        if (!Array.isArray(projurisProcesso.assuntoCnj)) projurisProcesso.assuntoCnj = [ projurisProcesso.assuntoCnj ]
        if (!Array.isArray(projurisProcesso.responsaveis)) projurisProcesso.responsaveis = [ projurisProcesso.responsaveis ]
        delete projurisProcesso.numeroProcesso
        delete projurisProcesso.gtCrew
        delete projurisProcesso.audienciaFutura
        projurisProcesso.completo = true
        projurisProcesso.assunto = projurisProcesso.assunto.nomeAssunto
    }
    
    function finalAdaptPartes(projurisPartes) {
        projurisPartes.forEach( projurisParte => delete projurisParte.tipoParticipacao.parent)
    }
    
    function finalAdaptAndamentos(projurisAndamentos, responsaveis) {
        projurisAndamentos.forEach(projurisAndamento => projurisAndamento.responsaveis = responsaveis)
    }
    
    async function getAdaptedTarefas(tarefasParams) {
        const { gtCrew, clientsPoloProcessual } = tarefasParams
        const googleTarefasInfo = await getGoogleTarefasInfo(gtCrew.gt.valor, clientsPoloProcessual)
        const projurisTarefas = { values: [], errorMsgs: [] }
        projurisTarefas.values = googleTarefasInfo
            .map(tarefaGoogleInfo => adaptGoogleInfoTarefaToProjuris(tarefaGoogleInfo, projurisTarefas, tarefasParams))
            .filter(projurisTarefa => projurisTarefa != undefined)
        return projurisTarefas
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
    
    function adaptGoogleInfoTarefaToProjuris (tarefaGoogleInfo, projurisTarefas, tarefasParams) {
        const { tiposTarefa, gtCrew, audienciaFutura } = tarefasParams
        const dataAudiencia = audienciaFutura?.data
        const [ , , nomeTarefa, detalhe, observacao,
            teamsResponsible, prazoPrevistoString, prazoFatalString ] = tarefaGoogleInfo
        if (!dataAudiencia &&
            (prazoPrevistoString.toLowerCase().includes("aud") || prazoFatalString.toLowerCase().includes("aud"))) return
        const projurisTarefa = new ProjurisTarefaDataStructure()
        const tipoTarefa = tiposTarefa
            .filter(tipoTarefa => tipoTarefa.nomeTipoTarefa.toLowerCase() === nomeTarefa.toLowerCase())
        if (Array.isArray(tipoTarefa) && tipoTarefa.length === 0) {
            const errorMsg = generateErrMsg.noMatchInGoogle(nomeTarefa, "tarefa")
            projurisTarefas.errorMsgs.push(errorMsg)
            return errorMsgFallback
        }
        projurisTarefa.compromisso = false
        projurisTarefa.possuiRecorrencia = false
        projurisTarefa.modulos = [{
            modulo: "PROCESSO",
            codigoRegistroVinculo: undefined,
            vinculoPrincipal: true
        }]
        projurisTarefa.tarefaEventoWs =  {
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
        return projurisTarefa
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

    return { finalizeProcessoInfo }
}