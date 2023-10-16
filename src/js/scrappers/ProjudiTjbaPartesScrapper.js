import ParteDataStructure from "../data-structures/ParteDataStructure"
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException"
import { tiposParte } from "../utils/enumsAndHardcoded"

class ProjudiTjbaPartesScrapper
{
static #divPartesTbody

/**
 * @returns {ParteDataStructure[]}
 */
static fetchParticipantesInfo(parteTypeToScrappe) {
    try {
        this.#loadPageCheckpoints()
        return this.#getPartes(parteTypeToScrappe)
    } catch(e) {
        if(!(e instanceof NotProcessoHomepageException)) console.error(e)
    }
}

static #loadPageCheckpoints() {
    this.#divPartesTbody = document.querySelector('#Partes > table > tbody')
}

/**
 * @returns {ParteDataStructure[]}
 */
static #getPartes(parteTypeToScrappe) {
    switch(parteTypeToScrappe) {
        case tiposParte.requerente:
            const requerentesWrapperTd = this.#divPartesTbody.querySelector(':scope > tr:nth-child(2) > td:nth-child(2)')
            const requerentes = this.#getCompletePartes(requerentesWrapperTd, tiposParte.requerente)
            return requerentes
        case tiposParte.requerido:
            const requeridosWrapperTd = this.#divPartesTbody.querySelector(':scope > tr:nth-child(3) > td:nth-child(2)')
            const requeridos = this.#getCompletePartes(requeridosWrapperTd, tiposParte.requerido)
            return requeridos
        default:
            const testemunhasWrapperTd = this.#divPartesTbody.querySelector(':scope > tr:nth-child(4) > td:nth-child(2)', tiposParte.testemunha)
            const testemunhas = this.#getCompletePartes(testemunhasWrapperTd, tiposParte.testemunha)
            const terceirosWrapperTd = this.#divPartesTbody.querySelector(':scope > tr:nth-child(5) > td:nth-child(2)', tiposParte.terceiro)
            const terceiros = this.#getCompletePartes(terceirosWrapperTd, tiposParte.terceiro)
            return testemunhas.concat(terceiros)
    }
}

static #getCompletePartes(partesWrapperTd, tipoDeParte) {
    const partesTbody = partesWrapperTd.querySelector('table.tabelaLista tbody')
    const partes = this.#getPartesWithoutAdvogadosNorEnderecos(partesTbody, tipoDeParte)
    this.#pushAdvogadosToPartes(partesWrapperTd, partes)
    this.#pushContatosToPartes(partesWrapperTd, partes)
    return partes
}

static #getPartesWithoutAdvogadosNorEnderecos(tbody, tipoDeParte) {
    const partes = []
    tbody.querySelectorAll('tr[id]').forEach(tr => {
        const parte = new ParteDataStructure()
        const projudiId = tr.id.replace('tr', '')
        parte.JudSystemId = projudiId
        parte.nome = tr.querySelector('td:nth-child(2)').textContent.trim()
        const cpfCnpj = tr.querySelector('td:nth-child(4)').innerText.trim()
        this.#putCpfCnpjToParte(cpfCnpj, parte)
        parte.tipoDeParte = tipoDeParte
        partes.push(parte)
    });
    return partes
}

static #putCpfCnpjToParte(cpfCnpj, parte) {
    const dashDotSlashStrippedString = cpfCnpj.replaceAll(/(\-)|(\.)|(\/)/g, '')
    if (cpfCnpj.length === 14 && dashDotSlashStrippedString.length === 11) parte.cpf = cpfCnpj
    if (cpfCnpj.length === 18 && dashDotSlashStrippedString.length === 14) parte.cnpj = cpfCnpj
    if (cpfCnpj === "Não Cadastrado") {
        parte.dontHaveCpfCnpj = true
        parte.noCpfCnpjReason = "Não cadastrado no Projudi"
    }
}

static #pushAdvogadosToPartes(partesWrapperTd, partes) {
    partes.forEach(function(parte) {
        const advogadosTbodySelector = 'table.tabelaLista ~ span[id^="spanAdv' + parte.JudSystemId + '"] table[id^="tabelaAdvogadoPartes"] > tbody'
        const advogadosTbody = this.querySelector(advogadosTbodySelector)
        const advogadosTrs = advogadosTbody.querySelectorAll('tr[class]:not([class="ultimaLinha"])')
        let advogado = ''
        parte.advogados = []
        advogadosTrs.forEach(tr => {
            const nomeCpfString = tr.querySelector('td:nth-child(1)').textContent.trim()
            const oabString = tr.querySelector('td:nth-child(2)').textContent.trim()
            const nomeCpf = nomeCpfString.split(" (CPF:")
            nomeCpf[1] = nomeCpf[1].replace(')', '')
            advogado = new ParteDataStructure()
            advogado.nome = nomeCpf[0]
            advogado.cpf = nomeCpf[1]
            advogado.oab = oabString
            advogado.tipoDeParte = tiposParte.advogado
            parte.advogados.push(advogado)
        })
    }, partesWrapperTd);
}

static #pushContatosToPartes(partesWrapperTd, partes) {
    partes.forEach(parte => this.#pushContatosToOneParte(parte, partesWrapperTd))
}

static #pushContatosToOneParte (parte, partesWrapperTd) {
    const contactsTbodySelector = 'table.tabelaLista ~ span[id^="spanEnd' + parte.JudSystemId + '"] table > tbody'
    const contactsTbody = partesWrapperTd.querySelector(contactsTbodySelector)
    let contactInfo = contactsTbody.querySelector('tr:nth-child(2) > td').textContent
    contactInfo = contactInfo.replaceAll(String.fromCharCode(10), '')
    contactInfo = contactInfo.replaceAll(/\s+/g, ' ')
    const { address, email, phone } = this.#parseContactInfo(contactInfo)
    parte.endereco = address
    parte.email = email
    parte.telefone = phone
}

static #parseContactInfo(contactInfo) {
    let address = contactInfo
    const email = this.#getEmail(contactInfo)
    if (email) address = address.replaceAll(email, "")
    const phoneWithTag = this.#getPhoneWithTag(contactInfo)
    let phone
    if (phoneWithTag) {
        address = address.replaceAll(phoneWithTag, "")
        phone = phoneWithTag.replaceAll(/(\()|(Contato: )|(\))/g, "")
    }
    address = this.#trimSpacesAndCommas(address)
    return { address, email, phone }
}

static #getEmail(str) {
    const emailRegex = /[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*/
    return str.match(emailRegex) ? str.match(emailRegex)[0] : undefined
}

static #getPhoneWithTag(str) {
    const phoneRegex = /\(Contato: \+?[0-9 ]{10,}\)/
    return str.match(phoneRegex) ? str.match(phoneRegex)[0] : undefined 
}

static #trimSpacesAndCommas(str) {
    let result = str
    do {
        result = result.trim()
        if (result.slice(-1) === ",") result = result.slice(0, -1)
    } while (result.slice(-1) === "," || result !== result.trim())
    return result
}
}
export default ProjudiTjbaPartesScrapper