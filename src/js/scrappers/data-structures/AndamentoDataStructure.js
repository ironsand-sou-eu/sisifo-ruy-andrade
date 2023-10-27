class AndamentoDataStructure {
  constructor(
    id,
    nomeOriginalSistemaJustica,
    data,
    observacao,
    agente,
    cancelado,
    errorMsgs = [],
  ) {
    Object.assign(this, {
      id,
      nomeOriginalSistemaJustica,
      observacao,
      agente,
      cancelado,
      errorMsgs,
    });
    this.data = data ? new Date(data.getTime()) : undefined;
  }
}

export default AndamentoDataStructure;
