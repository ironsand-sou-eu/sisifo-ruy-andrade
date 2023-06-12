import ProcessoDataStructure from "../data-structures/ProcessoDataStructure"
import UnidadeJurisdicionalDataStructure from "../data-structures/UnidadeJurisdicionalDataStructure"
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException"
import { tiposParte } from "../enums"
import ProjudiTjbaAndamentosScrapper from "./ProjudiTjbaAndamentosScrapper"
import ProjudiTjbaPartesScrapper from "./ProjudiTjbaPartesScrapper"

class ProjudiTjbaProcessoScrapper
    // extends ProcessoSiteScrapper
{
static #PROJUDI_TJBA_PROCESSO_HOME_PATH = "/projudi/listagens/DadosProcesso?numeroProcesso="
static #PROJUDI_TJBA_IGNORE_LIST = [
    "https://projudi.tjba.jus.br/projudi/scripts/subModal/carregando.html",
    "https://projudi.tjba.jus.br/projudi/Cabecalho.jsp",
    "https://projudi.tjba.jus.br/projudi/advogado/CentroAdvogado",
    "https://projudi.tjba.jus.br/projudi/",
]
static #PROJUDI_EXTENDED_DATE_REGEX = /\d{1,2} de [a-zç]+ de (\d{2}|\d{4}) às \d{1,2}:\d{1,2}/gi

static #divPartes
static #divPartesTbody
static #andamentos

static async fetchProcessoInfo() {
    try {
        this.#loadPageCheckpoints()
        return await this.#ScrappeProcessoInfo()
    } catch(e) {
        if(!(e instanceof NotProcessoHomepageException)) console.error(e)
    }
}

static checkProcessoHomepage(url) {
    if (this.#PROJUDI_TJBA_IGNORE_LIST.some(itemToIgnore => itemToIgnore === url)) {
        return false
    } else if (!url || !url.includes(this.#PROJUDI_TJBA_PROCESSO_HOME_PATH)) {
        throw new NotProcessoHomepageException(url)
    } else {
        return true
    }
}

static #loadPageCheckpoints() {
    this.#divPartes = document.querySelector('#Partes')
    this.#divPartesTbody = this.#divPartes.querySelector('table > tbody')
}

/**
 * @returns {ProcessoDataStructure}
 */
static async #ScrappeProcessoInfo() {
    this.#andamentos = await this.#getAndamentos()
    const processoInfo = new ProcessoDataStructure(
        this.#getNumero(), "projudiTjba", this.#getNumeroRegional(), this.#getUrl(), this.#getDataDistribuicao(),
        this.#getValorDaCausa(), this.#getTipoDeAcao(), this.#getCausaDePedir(),
        this.#getSegredoJustica(), this.#getJuizo(), this.#getJuizAtual(),
        this.#getNumeroProcessoPrincipal(), this.#getNumerosIncidentes(),
        this.#getNumerosProcessosRelacionados(), this.#getPartesRequerentes(),
        this.#getPartesRequeridas(), this.#getOutrosParticipantes(), this.#andamentos,
        this.#getPedidos(), this.#getAudienciaFutura()
    )
    return processoInfo
}

static #getNumero() {
    const linkNumeroProcesso = this.#divPartes.querySelector(`a[href*="${this.#PROJUDI_TJBA_PROCESSO_HOME_PATH}"]`)
    const numProcesso = linkNumeroProcesso.textContent
    // TODO: Validar número CNJ com RegEx ou lançar exceção
    return numProcesso
}

static #getNumeroRegional() {
    return null
}

static #getUrl() {
    const linkNumeroProcesso = this.#divPartes.querySelector(`a[href*="${this.#PROJUDI_TJBA_PROCESSO_HOME_PATH}"]`)
    const url = new URL(linkNumeroProcesso.href)
    return url
}

static #getDataDistribuicao() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(14) > td:nth-child(3)',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'data de distribuição'
    }
    const projudiDateString = this.#getValueFollowingCellSearchedByTextContent(params)
    return this.#getDateFromProjudiTjbaDateString(projudiDateString)
}

static #getValueFollowingCellSearchedByTextContent({parentElement, firstGuessQuerySelector,
        IterableElementsQuerySelector, partialTextToSearch}) {
    return this.#getElementFollowingCellSearchedByTextContent({parentElement, firstGuessQuerySelector,
        IterableElementsQuerySelector, partialTextToSearch})?.textContent
}

static #getElementFollowingCellSearchedByTextContent({parentElement, firstGuessQuerySelector,
    IterableElementsQuerySelector, partialTextToSearch}) {
    const firstGuess = parentElement.querySelector(firstGuessQuerySelector)
    if (firstGuess?.textContent.toLowerCase().includes(partialTextToSearch.toLowerCase())) {
        return firstGuess.nextElementSibling
    }

    const slowChoice = Array.from(parentElement.querySelectorAll(IterableElementsQuerySelector)).filter(iElement => {
        return iElement.textContent.toLowerCase().includes(partialTextToSearch.toLowerCase())
    })
    return slowChoice[0]?.nextElementSibling
}

static #getDateFromProjudiTjbaDateString(dateStr) {
    const dateStrWithoutPrepositions = dateStr.trim().replaceAll(/(de )|(às )|( h)/g, '')
    const dateStrDividedBySpaces = dateStrWithoutPrepositions.replaceAll(':', ' ')
    const dateArray = dateStrDividedBySpaces.split(' ')
    const meses = {
        'Janeiro': 0,
        'Fevereiro': 1,
        'Março': 2,
        'Abril': 3,
        'Maio': 4,
        'Junho': 5,
        'Julho': 6,
        'Agosto': 7,
        'Setembro': 8,
        'Outubro': 9,
        'Novembro': 10,
        'Dezembro': 11   
    }
    dateArray[1] = meses[dateArray[1]]
    return new Date(dateArray[2], dateArray[1], dateArray[0], dateArray[3], dateArray[4], dateArray[5] ?? null)
}

static #getValorDaCausa() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(15) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'valor da causa'
    }
    const projudiValorDaCausaString = this.#getValueFollowingCellSearchedByTextContent(params)

    let valorDaCausa = projudiValorDaCausaString.trim().replace(/(R\$ )|(\.)/g, '')
    valorDaCausa = valorDaCausa.replace(',', '.')
    return valorDaCausa 
}

static #getTipoDeAcao() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(10) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'classe'
    }
    const projudiTipoDeAcaoString = this.#getValueFollowingCellSearchedByTextContent(params)
    const tipoDeAcaoStringArray = projudiTipoDeAcaoString.split(" « ").reverse()
    return tipoDeAcaoStringArray.map(tipoAcao => { return { id: undefined, valor: tipoAcao.trim() } })
}

static #getCausaDePedir() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(8) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'assunto'
    }
    const projudiCausaDePedirString = this.#getValueFollowingCellSearchedByTextContent(params)
    const causaDePedirStringArray = projudiCausaDePedirString.split(" « ").reverse()
    return causaDePedirStringArray.map(causaPedir => { return { id: undefined, valor: causaPedir.trim() } })
}

static #getSegredoJustica() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(11) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'segredo de justiça'
    }
    const projudiSegredoJusticaString = this.#getValueFollowingCellSearchedByTextContent(params)
    return projudiSegredoJusticaString === 'SIM'
}

static #getJuizo() {
    const JuizoJuiz = this.#projudiJuizoJuizString().split(' Juiz: ')
    const juizo = new UnidadeJurisdicionalDataStructure()
    juizo.nomeOriginalSistemaJustica = JuizoJuiz[0]
    return juizo
}

static #getJuizAtual() {
    const JuizoJuiz = this.#projudiJuizoJuizString().split(' Juiz: ')
    const nomeJuiz = JuizoJuiz[1].replace(' Histórico de Juízes', '').trim()
    return nomeJuiz
}

static #projudiJuizoJuizString() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(7) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'juízo'
    }
    return this.#getValueFollowingCellSearchedByTextContent(params)
}

static #getNumeroProcessoPrincipal() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(6) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'proc. principal'
    }
    const processoPrincipal = this.#getValueFollowingCellSearchedByTextContent(params)
    return processoPrincipal.toLowerCase().includes('o próprio') ? null : processoPrincipal
}

static #getNumerosIncidentes() {
    return null
}

static #getNumerosProcessosRelacionados() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(6) > td:nth-child(3)',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'proc. dependentes'
    }
    // TODO: testar processo com mais de um processo dependente. São muitos TD? São múltiplos elementos A
    // na mesma TD?
    const processosRelacionados = this.#getValueFollowingCellSearchedByTextContent(params).trim()
    return processosRelacionados ? [processosRelacionados] : null
}

static #getPartesRequerentes() {
    const requerentes = ProjudiTjbaPartesScrapper.fetchParticipantesInfo(tiposParte.requerente)
    return requerentes
}

static #getPartesRequeridas() {
    const requeridos = ProjudiTjbaPartesScrapper.fetchParticipantesInfo(tiposParte.requerido)
    return requeridos
}

static #getOutrosParticipantes() {
    const outros = ProjudiTjbaPartesScrapper.fetchParticipantesInfo("outros")
    return outros
}

static async #getAndamentos() {
    return await ProjudiTjbaAndamentosScrapper.fetchAndamentosInfo()
}

static #getPedidos() {
    const params = {
        parentElement: this.#divPartesTbody,
        firstGuessQuerySelector: 'tr:nth-child(9) > td:first-child',
        IterableElementsQuerySelector: 'tr td',
        partialTextToSearch: 'complementares'
    }
    const pedidosTd = this.#getElementFollowingCellSearchedByTextContent(params)
    if(!pedidosTd) return null
    const pedidos = []
    pedidosTd.querySelectorAll('table > tbody > tr').forEach(tr => {
        pedidos.push(tr.innerText)
    })
    return pedidos
}

static #getAudienciaFutura() {
    const audienciaRelatedAndamentos = this.#filterAudienciaConcerningAndamentos(this.#andamentos)
    const lastRelevantAudiencia = this.#getLastAudienciaOrNullIfCancelled(audienciaRelatedAndamentos)
    if(!lastRelevantAudiencia) return null

    const audienciaProjudiDateString = lastRelevantAudiencia.observacao.match(this.#PROJUDI_EXTENDED_DATE_REGEX)[0]
    const audienciaFutura = {...lastRelevantAudiencia,
        data: this.#getDateFromProjudiTjbaDateString(audienciaProjudiDateString),
    }
    return audienciaFutura
}

static #filterAudienciaConcerningAndamentos(andamentosArray) {
    const audienciaRelatedAndamentos = andamentosArray.filter(
        andamento => andamento
            && andamento.nomeOriginalSistemaJustica.toLowerCase().includes('audiência')
            && !andamento.cancelado
    )
    return audienciaRelatedAndamentos
}

static #getLastAudienciaOrNullIfCancelled(audienciasUniverse) {
    const lastRelevantAudiencia = audienciasUniverse[audienciasUniverse.length - 1]
    return lastRelevantAudiencia.observacao.search(this.#PROJUDI_EXTENDED_DATE_REGEX) === -1
        ? null
        : lastRelevantAudiencia
}
}
export default ProjudiTjbaProcessoScrapper