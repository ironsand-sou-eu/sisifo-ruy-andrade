export default class ProjurisTarefaDataStructure {
  constructor(
    codigoProcesso,
    compromisso = false,
    possuiRecorrencia = false,
    descricaoTarefa,
    dataConclusaoPrevista,
    horaConclusao,
    horaLimite,
    dataLimite,
    dataBase = new Date(),
    usuariosResponsaveis,
    gruposResponsaveis,
    tipoTarefa = { chave: null, valor: "" },
    notificaClienteCriacao = false,
    notificaResponsavelCriacao = true,
    privado = true,
    tarefaEventoSituacaoWs = {
      codigoTarefaEventoSituacao: 1,
      situacao: "Pendente",
      situacaoConcluida: false,
    },
  ) {
    Object.assign(this, {
      compromisso,
      possuiRecorrencia,
      modulos: [
        {
          modulo: "PROCESSO",
          codigoRegistroVinculo: codigoProcesso,
          vinculoPrincipal: true,
        },
      ],
      tarefaEventoWs: {
        descricaoTarefa,
        dataConclusaoPrevista: dataConclusaoPrevista
          ? new Date(dataConclusaoPrevista.getTime())
          : undefined,
        horaConclusao: horaConclusao
          ? new Date(horaConclusao.getTime())
          : undefined,
        horaLimite: horaLimite ? new Date(horaLimite.getTime()) : undefined,
        dataLimite: dataLimite ? new Date(dataLimite.getTime()) : undefined,
        dataBase: dataBase ? new Date(dataBase.getTime()) : undefined,
        usuariosResponsaveis,
        gruposResponsaveis,
        tipoTarefa,
        notificaClienteCriacao,
        notificaResponsavelCriacao,
        privado,
        tarefaEventoSituacaoWs,
      },
    });
  }
}
