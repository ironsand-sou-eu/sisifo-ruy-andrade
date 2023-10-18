import useGoogleSheets from "../react/connectors/useGoogleSheets"

const RECURSO_CONHECIDO_REGEX = /^(Conhecido o recurso de ).+$/gim
const RECURSO_CONHECIDO_EM_PARTE_REGEX =  /^(Conhecido em parte o recurso de ).+$/gim
const RECURSO_NÃO_CONHECIDO_REGEX =  /^(Não recebido o recurso de ).+$/gim
const DECORRIDO_PRAZO_DE_ADVS_PROJUDI_REGEX =  /^(Decorrido prazo de Advogados de ).+$/gim
const DECORRIDO_PRAZO_DE_PROJUDI_REGEX =  /^(Decorrido prazo de).+$/gim
const LIMINAR_REJEITADA_REGEX =  /^(Não Concedida a Medida Liminar).+$/gim
const INCLUIDO_EM_PAUTA_REGEX =  /^(Incluído em pauta para ).+$/gim
const PREEXECUTIVIDADE_REJEITADA_REGEX =  /^(Rejeitada a exceção de pré-executividade).+$/gim
const E_PROVIDO_REGEX =  /^.+(e provido)$/gim
const E_PROVIDO_EM_PARTE_REGEX =  /^.+(e provido em parte)$/gim
const E_NAO_PROVIDO_REGEX =  /^.+(e não-provido)$/gim

const DECORRIDO_PRAZO_DE_PJE_REGEX =  /^(Decorrido prazo de ).+( em )[0-9\/ :\.]+$/gim
const DISPONIBILIZADO_NO_DJ_ELETRONICO_PJE_REGEX =  /^(Disponibilizado no DJ Eletrônico ).+$/gim
const PUBLICADO_INTIMACAO_EM_PJE_REGEX =  /^(Publicado Intimação em ).+$/gim

const { fetchGoogleSheetData, extractValuesFromSheetsPromise, getMatchingEntry } = useGoogleSheets()

export default async function insertAdaptedAndamentoNames(processoInfo, token) {
    const promise = fetchGoogleSheetData("andamentos", token)
    const andamentosSheetValues = await extractValuesFromSheetsPromise(promise)
    processoInfo.andamentos.forEach(andamento => {
        const andamentoWithoutPeopleNames = getAdaptedAndamentoNames(andamento.nomeOriginalSistemaJustica)
        const errorParams = {
            errorKind: "google",
            missingEntry: andamentoWithoutPeopleNames,
            entryType: "andamento"
        }    
        const nomeAdaptado = getMatchingEntry(andamentosSheetValues, andamentoWithoutPeopleNames, errorParams)
        if (nomeAdaptado.found) {
            andamento.nomeAdaptadoAoCliente = nomeAdaptado.value[1]
        } else {
            processoInfo.errorMsgs.push(nomeAdaptado.value)
        }
    })
}

function getAdaptedAndamentoNames(nomeAndamento) {
    if (nomeAndamento.search(RECURSO_CONHECIDO_REGEX) > -1) {
        let adaptedName = "Conhecido o recurso de XXX" + getAdaptedRecursoNameEnds(nomeAndamento)
        return adaptedName
    } else if (nomeAndamento.search(RECURSO_CONHECIDO_EM_PARTE_REGEX) > -1) {
        let adaptedName = "Conhecido em parte o recurso de XXX" + getAdaptedRecursoNameEnds(nomeAndamento)
        return adaptedName
    } else if (nomeAndamento.search(RECURSO_NÃO_CONHECIDO_REGEX) > -1) {
        return "Não recebido o recurso de XXX"
    } else if (nomeAndamento.search(LIMINAR_REJEITADA_REGEX) > -1) {
        return "Não Concedida a Medida Liminar a XXX"
    } else if (nomeAndamento.search(INCLUIDO_EM_PAUTA_REGEX) > -1) {
        return "Incluído em pauta para XXX"
    } else if (nomeAndamento.search(PREEXECUTIVIDADE_REJEITADA_REGEX) > -1) {
        return "Rejeitada a exceção de pré-executividade de XXX"
    } else if (nomeAndamento.search(DECORRIDO_PRAZO_DE_ADVS_PROJUDI_REGEX) > -1) {
        return "Decorrido prazo de Advogados de XXX"
    } else if (nomeAndamento.search(DECORRIDO_PRAZO_DE_PROJUDI_REGEX) > -1) {
        return "Decorrido prazo de XXX"
    } else if (nomeAndamento.search(DECORRIDO_PRAZO_DE_PJE_REGEX) > -1) {
        return "Decorrido prazo de XXX"
    } else if (nomeAndamento.search(DISPONIBILIZADO_NO_DJ_ELETRONICO_PJE_REGEX) > -1) {
        return "Disponbilizado no DJ eletrônico XXX"
    } else if (nomeAndamento.search(PUBLICADO_INTIMACAO_EM_PJE_REGEX) > -1) {
        return "Publicado intimação em XXX"
    // TODO: Identificar qual é o nome do andamento que precisa ser adaptado, pois esqueci
    // } else if (InStr(1, conteudoCelulaCompleto, "Contadoria") <> 0)) {
    //     return "Recebidos os autos da contadoria"
    } else {
        return nomeAndamento
    }
}

function getAdaptedRecursoNameEnds(nomeAndamento) {
    if (nomeAndamento.search(E_NAO_PROVIDO_REGEX) > -1) {
        return " e não-provido"
    } else if (nomeAndamento.search(E_PROVIDO_REGEX) > -1) {
        return " e provido"
    } else if (nomeAndamento.search(E_PROVIDO_EM_PARTE_REGEX) > -1) {
        return " e provido em parte"
    }
}