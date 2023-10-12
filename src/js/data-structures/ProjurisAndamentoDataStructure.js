export default class ProjurisAndamentoDataStructure
{
    constructor(codigoRegistroVinculo, descricaoAndamento, dataAndamento,
        horaAndamento, codigoTipoAndamento, responsaveis, privado = true) {
        Object.assign(this, {
            codigoRegistroVinculo, descricaoAndamento, codigoTipoAndamento,
            responsaveis, privado,
            dataAndamento: dataAndamento ? new Date(dataAndamento.getTime()) : undefined,
            horaAndamento: horaAndamento ? new Date(horaAndamento.getTime()) : undefined
        })
    }
}