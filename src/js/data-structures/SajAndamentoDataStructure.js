class SajAndamentoDataStructure
{
    constructor(codigoRegistroVinculo, descricaoAndamento, dataAndamento,
        horaAndamento, codigoTipoAndamento, responsaveis, privado = true) {
        Object.assign(this, {
            codigoRegistroVinculo, descricaoAndamento, codigoTipoAndamento,
            responsaveis, privado
        })
        this.dataAndamento = dataAndamento ? new Date(dataAndamento.getTime()) : undefined
        this.horaAndamento = horaAndamento ? new Date(horaAndamento.getTime()) : undefined
    }
}

export default SajAndamentoDataStructure