class ParteDataStructure {
  constructor(
    nome,
    cpf,
    cnpj,
    dontHaveCpfCnpj,
    noCpfCnpjReason,
    oab,
    endereco,
    email,
    telefone,
    tipoDeParte,
    advogados,
    JudSystemId,
  ) {
    Object.assign(this, {
      nome,
      cpf,
      cnpj,
      dontHaveCpfCnpj,
      noCpfCnpjReason,
      oab,
      tipoDeParte,
      endereco,
      email,
      telefone,
      advogados,
      JudSystemId,
    });
  }
}

export default ParteDataStructure;
