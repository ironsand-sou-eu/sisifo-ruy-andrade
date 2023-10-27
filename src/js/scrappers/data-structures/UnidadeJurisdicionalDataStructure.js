export default class UnidadeJurisdicionalDataStructure {
  constructor(
    nomeOriginalSistemaJustica = "",
    nomeAdaptadoAoCliente = "",
    orgaoSuperior = undefined,
  ) {
    Object.assign(this, {
      nomeOriginalSistemaJustica,
      nomeAdaptadoAoCliente,
      orgaoSuperior,
    });
  }
}
