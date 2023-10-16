import ProcessoDataStructure from "../data-structures/ProcessoDataStructure"
import UnidadeJurisdicionalDataStructure from "../data-structures/UnidadeJurisdicionalDataStructure"
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException"
import { tiposParte } from "../utils/enumsAndHardcoded"
import Pje1gTjbaAndamentosScrapper from "./Pje1gTjbaAndamentosScrapper"
import Pje1gTjbaParteScrapper from "./Pje1gTjbaPartesScrapper"
import { REGEX_CNJ_NUMBER } from "../utils/utils"

class Pje1gTjbaProcessoScrapper
    // extends ProcessoSiteScrapper
{
static #PJE1G_TJBA_PROCESSO_HOME_PATH = "/pje/Processo/ConsultaProcesso/Detalhe/"
static #PJE1G_TJBA_IGNORE_LIST = [
    "https://pje.tjba.jus.br/pje/downloadBinario.seam",
]
static #PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID = /(?<=\()\d*(?=\)$)/g
static #PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME = /.*(?=\(\d*\)$)/g
static #divMaisDetalhes
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
    if (this.#PJE1G_TJBA_IGNORE_LIST.some(itemToIgnore => itemToIgnore === url)) {
        return false
    } else if (!url || !url.includes(this.#PJE1G_TJBA_PROCESSO_HOME_PATH)) {
        throw new NotProcessoHomepageException(url)
    } else {
        return true
    }
}

static #loadPageCheckpoints() {
    this.#divMaisDetalhes = document.querySelector('#maisDetalhes')
}

/**
 * @returns {ProcessoDataStructure}
 */
static async #ScrappeProcessoInfo() {
    this.#andamentos = await this.#getAndamentos()
    return new ProcessoDataStructure(
        this.#getNumero(), "pje1gTjba", this.#getNumeroRegional(), this.#getUrl(), this.#getDataDistribuicao(),
        this.#getValorDaCausa(), this.#getTipoDeAcao(), this.#getCausaDePedir(),
        this.#getSegredoJustica(), this.#getJuizo(), this.#getJuizAtual(),
        this.#getNumeroProcessoPrincipal(), this.#getNumerosIncidentes(),
        this.#getNumerosProcessosRelacionados(), this.#getPartesRequerentes(),
        this.#getPartesRequeridas(), this.#getOutrosParticipantes(),
        this.#andamentos, this.#getPedidos(), this.#getAudienciaFutura()
    )
}

static #getNumero() {
    const containerNumeroProcesso = document.querySelector("a.titulo-topo:has(i)")
    const classAndNumeroProcessoString = containerNumeroProcesso.firstChild.textContent.trim()  
    return REGEX_CNJ_NUMBER.exec(classAndNumeroProcessoString)[0]
}

static #getNumeroRegional() {
    return null
}

static #getUrl() {
    return null
}

static #getDataDistribuicao() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'dl > dt:nth-child(7)',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'autuação'
    }
    const dateString = this.#getValueFollowingCellSearchedByTextContent(params)
    return this.getDateFromPjeTjbaDateString(dateString)
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

static getDateFromPjeTjbaDateString(dateStr, timeStr = "00:00") {
    const dateArray = dateStr.split(' ')
    const meses = {
        'jan': "01",
        'fev': "02",
        'mar': "03",
        'abr': "04",
        'mai': "05",
        'jun': "06",
        'jul': "07",
        'ago': "08",
        'set': "09",
        'out': "10",
        'nov': "11",
        'dez': "12"   
    }
    dateArray[1] = meses[dateArray[1].toLowerCase(0)]
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${timeStr}-03:00`
    return new Date(iso8601DateString)
}

static #getValorDaCausa() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'dl > dt:nth-child(11)',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'valor da causa'
    }
    const valorDaCausaString = this.#getValueFollowingCellSearchedByTextContent(params)

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, '')
    return valorDaCausa.replace(',', '.')
}

static #getTipoDeAcao() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'dl > dt:nth-child(1)',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'classe judicial'
    }
    const tipoDeAcaoFullString = this.#getValueFollowingCellSearchedByTextContent(params).trim()
    const tipoDeAcaoId = tipoDeAcaoFullString.match(this.#PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID)
    const tipoDeAcaoNome = tipoDeAcaoFullString.match(this.#PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME)
    return {
        id: tipoDeAcaoId ? Number(tipoDeAcaoId[0]) : null,
        valor: tipoDeAcaoNome ? tipoDeAcaoNome[0].trim() : null
    }
}

static #getCausaDePedir() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'dl > dt:nth-child(3)',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'assunto'
    }
    const causaDePedirFullString = this.#getValueFollowingCellSearchedByTextContent(params).trim()
    const causaDePedirId = causaDePedirFullString.match(this.#PJE1G_TJBA_ASSUNTO_OU_CLASSE_ID)
    const causaDePedirNome = causaDePedirFullString.match(this.#PJE1G_TJBA_ASSUNTO_OU_CLASSE_NOME)
    return {
        id: causaDePedirId ? Number(causaDePedirId[0]) : null,
        valor: causaDePedirNome ? causaDePedirNome[0].trim() : null
    }
}

static #getSegredoJustica() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'dl > dt:nth-child(13)',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'segredo de justiça'
    }
    const projudiSegredoJusticaString = this.#getValueFollowingCellSearchedByTextContent(params)
    return projudiSegredoJusticaString.toLowerCase() === 'sim'
}

static #getJuizo() {
    const params = {
        parentElement: this.#divMaisDetalhes,
        firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
        IterableElementsQuerySelector: 'dl dt',
        partialTextToSearch: 'órgão julgador'
    }
    const juizo = new UnidadeJurisdicionalDataStructure()
    juizo.nomeOriginalSistemaJustica = this.#getValueFollowingCellSearchedByTextContent(params)
    return juizo
}

static #getJuizAtual() {
    return null
}

static #getNumeroProcessoPrincipal() {
    return undefined
    //TODO: encontrar um processo que tenha processo principal para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processoPrincipal = this.#getValueFollowingCellSearchedByTextContent(params)
    // return processoPrincipal.toLowerCase().includes('o próprio') ? null : processoPrincipal
}

static #getNumerosIncidentes() {
    return null
}

static #getNumerosProcessosRelacionados() {
    return undefined
    //TODO: encontrar um processo que tenha processos dependentes para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processosRelacionados = this.#getValueFollowingCellSearchedByTextContent(params).trim()
    // return processosRelacionados ? [processosRelacionados] : null
}

static #getPartesRequerentes() {
    const requerentes = Pje1gTjbaParteScrapper.fetchParticipantesInfo(tiposParte.requerente)
    return requerentes
}

static #getPartesRequeridas() {
    const requeridos = Pje1gTjbaParteScrapper.fetchParticipantesInfo(tiposParte.requerido)
    return requeridos
}

static #getOutrosParticipantes() {
    const outros = Pje1gTjbaParteScrapper.fetchParticipantesInfo("outros")
    return outros
}

static async #getAndamentos() {
    return await Pje1gTjbaAndamentosScrapper.fetchAndamentosInfo()
}

static #getPedidos() {
    return undefined
}

static #getAudienciaFutura() {
    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    // 'navbar:linkAbaAudiencia'
    // const audienciaProjudiDateString = lastRelevantAudiencia.observacao.match(this.#PROJUDI_EXTENDED_DATE_REGEX)[0]
    // const audienciaFutura = {...lastRelevantAudiencia,
    //     data: this.#getDatFomPjeTjbaDateString(audienciaProjudiDateString),
    // }
    return null
}
}

export default Pje1gTjbaProcessoScrapper
// export {fetchProcessoInfo, checkProcessoHomepage}