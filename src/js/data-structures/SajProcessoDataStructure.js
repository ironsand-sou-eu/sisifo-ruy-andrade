import hardcoded from "../hardcodedValues"

class SajProcessoDataStructure
{
    constructor(situacaoProcesso = { chave: 1, valor: "Ativo" },
        unidadeOrganizacionalOrigem = hardcoded.unidadeOrganizacional.RuyAndrade,
        unidadeOrganizacionalAtual = hardcoded.unidadeOrganizacional.RuyAndrade,
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
            tipoProcessoRelacionadoWs, codigoProcessoPai, errorMsgs
        })
        this.dataDistribuicao = dataDistribuicao ? new Date(dataDistribuicao.getTime()) : undefined
        this.dataRecebimento = dataRecebimento ? new Date(dataRecebimento.getTime()) : undefined
        this.dataCitacao = dataCitacao ? new Date(dataCitacao.getTime()) : undefined
    }
}

export default SajProcessoDataStructure