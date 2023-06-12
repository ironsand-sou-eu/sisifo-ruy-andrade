class SajParticipanteDataStructure
{
    constructor(nomePessoa, codigoPessoa, cpfCnpj, flagSemCpfCnpj = false,
        justificativaSemCpfCnpj, tipoPessoa, observacaoGeral, telefone, email,
        habilitado = true, classificacao, profissao, tipoParticipacao, tipoEnvolvido,
        flagPrincipal = true, flagCliente = false, flagCompleto = true)
    {
        Object.assign(this, {
            nomePessoa, codigoPessoa, cpfCnpj, flagSemCpfCnpj, justificativaSemCpfCnpj,
            tipoPessoa, observacaoGeral, telefone, email, habilitado, classificacao,
            profissao, tipoParticipacao, tipoEnvolvido, flagPrincipal, flagCliente,
            flagCompleto
        })
    }
}

export default SajParticipanteDataStructure