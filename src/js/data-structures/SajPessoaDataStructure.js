export default class SajParteDataStructure
{
    constructor(nomePessoa, cpfCnpj, flagSemCpfCnpj = false, justificativaSemCpfCnpj,
        tipoPessoa, observacaoGeral, telefone, email, habilitado = true, profissao) {
        Object.assign(this, {
            nomePessoa, cpfCnpj, flagSemCpfCnpj, justificativaSemCpfCnpj, tipoPessoa,
            observacaoGeral, telefone, email, habilitado, profissao
        })
    }
}