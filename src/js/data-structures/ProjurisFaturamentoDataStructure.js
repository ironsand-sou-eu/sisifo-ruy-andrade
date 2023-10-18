import { hardcoded } from "../utils/enumsAndHardcoded"

export default class ProjurisFaturamentoDataStructure
{
    constructor(
        responsavelPagamento, valorDocumento, data, dataVencimento, conta, descricao,
        unidadeOrganizacional = hardcoded.pessoa.RuyAndrade, planoConta = hardcoded.planoConta,
        tipoResponsavelPagamento = hardcoded.tipoResponsavelPagamento, tipoLancamentoFinanceiro = hardcoded.tipoLancamentoFinanceiro,
        tipoDocumento = hardcoded.tiposDocumento.notaFiscal, condicaoPagamento = hardcoded.condicoesPagamento.aVista,
        numeroTotalParcelas = hardcoded.numeroParcelas, pagamentoTipo = hardcoded.pagamentoTipo,
        tipoParcela = hardcoded.tipoParcela
    ) {
        data = data ? new Date(data.getTime()) : undefined
        dataVencimento = dataVencimento ? new Date(dataVencimento.getTime()) : undefined
        Object.assign(this, {
            unidadeOrganizacional, planoConta, tipoResponsavelPagamento,
            tipoLancamentoFinanceiro, responsavelPagamento, valorDocumento,
            tipoDocumento, condicaoPagamento, numeroTotalParcelas, data, dataVencimento,
            favorecido: unidadeOrganizacional,
            receitaDespesaItemWs: [
                {
                    descricao,
                    valor: valorDocumento,
                    planoConta
                }
            ],
            pagamentoTransferenciaWs: [{
                valorPagamento: valorDocumento,
                dataVencimento,
                pagamentoTipo,
                conta,
                tipoParcela,
                dataEmissao: data
            }],
            solicitacaoRecebimentoPagtoWs: [{
                pessoa: responsavelPagamento,
                valorSolicitacao: valorDocumento,
                dataVencimento,
                tipoSolicitacaoRecebimentoPagto: tipoLancamentoFinanceiro
            }]
        })
    }
}