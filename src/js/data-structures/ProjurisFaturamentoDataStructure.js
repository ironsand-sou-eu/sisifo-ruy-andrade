import { hardcoded } from "../utils/enumsAndHardcoded"

export default class ProjurisFaturamentoDataStructure
{
    constructor(
        responsavelPagamento, valorDocumento, data, dataVencimento, conta, descricao,
        unidadeOrganizacional = hardcoded.unidadeOrganizacional, favorecido = hardcoded.favorecido,
        planoConta = hardcoded.planoConta, tipoResponsavelPagamento = hardcoded.tipoResponsavelPagamento,
        tipoLancamentoFinanceiro = hardcoded.tipoLancamentoFinanceiro, tipoDocumento = hardcoded.tiposDocumento.notaFiscal,
        condicaoPagamento = hardcoded.condicoesPagamento.aVista, numeroTotalParcelas = hardcoded.numeroParcelas,
        formaPagamento = hardcoded.formaPagamento, tipoParcela = hardcoded.tipoParcela
    ) {
        data = data ? new Date(data.getTime()) : undefined
        dataVencimento = dataVencimento ? new Date(dataVencimento.getTime()) : undefined
        Object.assign(this, {
            unidadeOrganizacional, planoConta, tipoResponsavelPagamento,
            tipoLancamentoFinanceiro, responsavelPagamento, valorDocumento,
            tipoDocumento, numeroTotalParcelas, data, dataVencimento, favorecido,
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
                conta,
                tipoParcela,
                dataEmissao: data
            }],
            solicitacaoRecebimentoPagtoWs: [{
                pessoa: responsavelPagamento,
                valorSolicitacao: valorDocumento,
                dataVencimento,
                condicaoPagamento,
                formaPagamento,
                tipoSolicitacaoRecebimentoPagto: tipoLancamentoFinanceiro
            }]
        })
    }
}