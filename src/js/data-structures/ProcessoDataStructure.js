import UnidadeJurisdicionalDataStructure from "./UnidadeJurisdicionalDataStructure"
import ParteDataStructure from "./ParteDataStructure"

class ProcessoDataStructure
{
    constructor(numero, sistema, numeroRegional, url, dataDistribuicao, valorDaCausa,
        tipoDeAcao, causaDePedir, segredoJustica, juizo, juizAtual,
        numeroProcessoPrincipal, numerosIncidentes, numerosProcessosRelacionados,
        partesRequerentes, partesRequeridas, outrosParticipantes, andamentos,
        pedidos, audienciaFutura, errorMsgs = [])
    {
        Object.assign(this, {
            numero, sistema, numeroRegional, url, valorDaCausa, tipoDeAcao,
            causaDePedir, segredoJustica, juizo, juizAtual, numeroProcessoPrincipal,
            numerosIncidentes, numerosProcessosRelacionados, partesRequerentes,
            partesRequeridas, outrosParticipantes, andamentos, pedidos, audienciaFutura,
            errorMsgs
        })
        this.dataDistribuicao = dataDistribuicao ? new Date(dataDistribuicao.getTime()) : undefined
    }
}

export default ProcessoDataStructure