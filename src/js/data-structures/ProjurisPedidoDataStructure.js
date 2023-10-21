export default class ProjurisPedidoDataStructure {
  constructor(
    nomePedido,
    codigoPedido,
    dataPedido = new Date(),
    valorPedido,
    valorProvisionado,
    tipoCorrecaoMonetaria,
    situacaoPedido,
    observacao,
    riscoPorcentagem,
    estimativaTipo = "POSSIVEL",
    flagValorProvisionado = true,
  ) {
    Object.assign(this, {
      nomePedido,
      codigoPedido,
      valorPedido,
      valorProvisionado,
      tipoCorrecaoMonetaria,
      situacaoPedido,
      observacao,
      riscoPorcentagem,
      estimativaTipo,
      flagValorProvisionado,
      dataPedido: dataPedido ? new Date(dataPedido.getTime()) : undefined,
    });
  }
}
