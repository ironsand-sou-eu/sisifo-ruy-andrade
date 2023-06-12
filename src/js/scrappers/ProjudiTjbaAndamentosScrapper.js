import AndamentoDataStructure from "../data-structures/AndamentoDataStructure"
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException"
import Exception from "../exceptions/Exception"

class ProjudiTjbaAndamentosScrapper
{
static #HTML_BODY_REGEX = /<body[^]*<\/body>/gi
static #HTML_SCRIPT_TAG_WITH_CONTENT_REGEX = /<script[^]*?<\/script>/gi
static #HTML_SELF_ENCLOSING_SCRIPT_TAG_REGEX = /<script[^]*?>/gi
static #divAndamentosTbody

/**
* @returns {AndamentoDataStructure[]}
*/
static async fetchAndamentosInfo() {
    try {
        this.#loadPageCheckpoints()
        return await this.#getAndamentos()
    } catch(e) {
        if(!(e instanceof NotProcessoHomepageException)) console.error(e)
    }
}

static #loadPageCheckpoints() {
    this.#divAndamentosTbody = document.querySelector('#Arquivos > table > tbody')
}

/**
 * @returns {AndamentoDataStructure[]}
 */
static async #getAndamentos() {
    const andamentos = []
    let andamento = ''
    const andamentosTrs = this.#divAndamentosTbody.querySelectorAll('tr:not(tr:first-of-type, tr *)')
    for (const tr of andamentosTrs) {        
        andamento = new AndamentoDataStructure()
        andamento.id = tr.querySelector('td > table > tbody > tr > td:nth-child(1)').textContent.trim()
        const dataStr = tr.querySelector('td > table > tbody > tr > td:nth-child(3)').textContent.trim()
        andamento.data = this.#brStringToDate(dataStr)
        andamento.agente = tr.querySelector('td > table > tbody > tr > td:nth-child(4)').textContent.trim()
        const nomeAndamentoTd = tr.querySelector('td > table > tbody > tr > td:nth-child(2)')
        andamento.cancelado = this.#isCancelado(nomeAndamentoTd)
        andamento.nomeOriginalSistemaJustica = nomeAndamentoTd.querySelector('b > font').innerText.trim()
        const obsUnderNomeAndamento = andamento.cancelado
            ? nomeAndamentoTd.querySelector('strike').textContent.trim()
            : nomeAndamentoTd.childNodes[nomeAndamentoTd.TEXT_NODE].textContent.trim()
        const contentInButton = tr.querySelector('td > table + span:first-of-type').textContent.trim()
        const contentInDocument = await this.#getDocumentTextContentIfExists(tr) ?? ''
        const fullObservacao = `${obsUnderNomeAndamento}\n${contentInButton}\n${contentInDocument}`
        andamento.observacao = this.#stripBlankLines(fullObservacao)
        andamentos.unshift(andamento)
    }
    return andamentos
}

static #brStringToDate(str) {
    const items = str.split("/")
    if (items[2].length === 2) items[2] = `20` + items[2]
    return new Date(items[2], items[1] - 1, items[0])
}

static #isCancelado(andamentoTd) {
    return andamentoTd.innerHTML.includes('strike')
}

static async #getDocumentTextContentIfExists(tr) {
    const documentsRows = tr.querySelectorAll('td > table ~ span[id^="sub"] > div > div > table > tbody > tr')
    if(!documentsRows) return null
    let docUri = ''
    documentsRows.forEach(tr => {
        let a = tr.querySelector('td:nth-child(4) > a')
        if(a && a.innerText === 'online.html') docUri = a.href
    });
    if (!docUri) return null
    const docTextContent = await this.#getDocumentTextContent(docUri)
    if (this.#documentIsNotRelevant(docTextContent)) return null
    return docTextContent
}

static async #getDocumentTextContent(uri) {
    const response = await fetch(uri, { method: "GET" })
    if(!response.ok) throw new Exception(`Não foi possível coletar de forma automática o conteúdo do andamento. Erro ${response.statusText}`)
    const arrBuffer = await response.arrayBuffer()
    const charCodesArray = new Uint8Array(arrBuffer)
    const dec = new TextDecoder("windows-1252")
    const htmlString = dec.decode(charCodesArray)
    const htmlBody = this.#getBodyFromHtmlString(htmlString)
    const noScriptBody = this.#stripScriptTagsFromHtmlString(htmlBody)
    const fullText = this.#getTextContent(noScriptBody)
    return fullText
}

static #getBodyFromHtmlString(htmlString) {
    const bodyMatches = htmlString.match(this.#HTML_BODY_REGEX)
    if (bodyMatches === null) return `<body>${htmlString}</body>`
    return bodyMatches[0]
}

static #stripScriptTagsFromHtmlString(htmlString) {
    const contentScriptTagsStrippedHtml = htmlString.replaceAll(this.#HTML_SCRIPT_TAG_WITH_CONTENT_REGEX, '')
    return contentScriptTagsStrippedHtml.replaceAll(this.#HTML_SELF_ENCLOSING_SCRIPT_TAG_REGEX, '')
}

static #getTextContent(htmlBodyString) {
    const div = document.createElement('div')
    div.innerHTML = htmlBodyString
    return div.textContent
}

static #documentIsNotRelevant(textContent) {
    const lowCaseDocText = textContent.toLowerCase()
    const notRelevant = lowCaseDocText.includes("endereço para devolução do ar")
        && lowCaseDocText.includes("assinatura do recebedor")
        && lowCaseDocText.includes("rubrica e matrícula do carteiro")
    if (notRelevant) {
        return true
    } else {
        return false
    }
}

static #stripBlankLines(str) {
    const lines = str.split('\n')
    const nonBlankLines = lines.filter(line => line.trim() !== '')
    return nonBlankLines.join('\n')
}
}
export default ProjudiTjbaAndamentosScrapper