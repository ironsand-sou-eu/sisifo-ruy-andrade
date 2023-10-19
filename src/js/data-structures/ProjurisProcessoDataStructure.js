import { hardcoded } from "../utils/enumsAndHardcoded"

export default class ProjurisProcessoDataStructure
{
    constructor(situacaoProcesso = { chave: 1, valor: "Ativo" },
        unidadeOrganizacionalOrigem = hardcoded.unidadeOrganizacional,
        unidadeOrganizacionalAtual = hardcoded.unidadeOrganizacional,
        gruposDeTrabalho, responsaveis, assunto, valorAcao, descricao, tipoProcesso = "J",
        tipoJustica, vara, tipoVara, complementoVara, dataDistribuicao, dataCitacao,
        area, fase, tipoInstancia = "PRIMEIRA_INSTANCIA",
        processoNumeroWs =  [{ tipoNumeracao: "PADRAO_CNJ", numeroDoProcesso: "", principal: true }],
        dataRecebimento, capturaHabilitada = false, mergeCaptura = false,
        instanciaCnj, orgaoJudicial, classeCnj, assuntoCnj, segredoJustica,
        senhaProcesso, pastaCliente, tipoProcessoRelacionadoWs, codigoProcessoPai, errorMsgs = [])
    {
        Object.assign(this, {
            situacaoProcesso, unidadeOrganizacionalOrigem, unidadeOrganizacionalAtual,
            gruposDeTrabalho, responsaveis, assunto, descricao, tipoProcesso, tipoJustica,
            vara, tipoVara, complementoVara, area, fase, tipoInstancia, valorAcao,
            processoNumeroWs, capturaHabilitada, mergeCaptura, instanciaCnj, orgaoJudicial,
            classeCnj, assuntoCnj, segredoJustica, senhaProcesso, pastaCliente,
            tipoProcessoRelacionadoWs, codigoProcessoPai, errorMsgs,
            dataDistribuicao: dataDistribuicao ? new Date(dataDistribuicao.getTime()) : undefined,
            dataRecebimento: dataRecebimento ? new Date(dataRecebimento.getTime()) : undefined,
            dataCitacao: dataCitacao ? new Date(dataCitacao.getTime()) : undefined
        })
    }
}