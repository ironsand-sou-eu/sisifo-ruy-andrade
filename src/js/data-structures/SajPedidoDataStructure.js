class SajPedidoDataStructure
{
    constructor(nomePedido, codigoPedido, dataPedido = new Date(), valorPedido,
        valorProvisionado, tipoCorrecaoMonetaria, situacaoPedido, observacao,
        riscoPorcentagem, estimativaTipo = "POSSIVEL", flagValorProvisionado = true) {
        Object.assign(this, {
            nomePedido, codigoPedido, valorPedido, valorProvisionado,
            tipoCorrecaoMonetaria, situacaoPedido, observacao, riscoPorcentagem,
            estimativaTipo, flagValorProvisionado
        })
        this.dataPedido = dataPedido ? new Date(dataPedido.getTime()) : undefined
    }
}

export default SajPedidoDataStructure