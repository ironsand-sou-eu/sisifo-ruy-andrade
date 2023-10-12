import envVars from "../envVars"
import compareWithOperator from "../utils/utils"

export const endPoints = {
    assuntosProjuris: "/assunto/consulta/",
    assuntosCnj: "/processo/assunto/",
    tiposJustica: "/tipo?chave-tipo=processo-justica",
    orgaoJudicial: "/tipo?chave-tipo=processo-orgao-judicial",
    varas: "/processo/vara-numero/",
    tiposVara: "/processo/vara-tipo/",
    areas: "/processo/area/",
    fases: "/processo/fase/",
    gruposTrabalho: "/grupo/",
    responsaveis: "/usuario/",
    instanciasCnj: "/processo/instancia-cnj/",
    camposDinamicos: "/campo-dinamico/3/13",
    tiposParticipacao: "/processo/participacao-tipo/obter-arvore-completa/",
    tiposTarefa: "/tarefa-tipo/consulta",
    tiposAndamento: "/andamento-tipo/consulta?",
    pedidos: "/processo/pedido/consultar-por-nome?nome-pedido=",
    buscarPessoa: "/pessoa/consulta",
    criarPessoa: "/pessoa",
    vincularPessoaProcesso: "/processo/envolvido/",
    buscarProcessoPorNumero: "/processo/consulta?filtro-geral=",
    criarProcesso: "/processo-judicial",
    criarAndamento: "/andamento",
    criarPedido: "/processo/pedido/",
    criarTarefa: "/tarefa"
}

async function getProjurisAuthTokenWithinExpiration() {
    const tokenResponse = await chrome.storage.local.get(["projurisToken", "projurisExpiration"])
    const tokenResponseIsEmpty = Object.keys(tokenResponse).length === 0
    if (tokenResponseIsEmpty === true) return await fetchAndStoreNewProjurisAuthToken()
    const tokenExpired = tokenResponse.projurisExpiration < new Date().getTime()
    if (tokenExpired) return await fetchAndStoreNewProjurisAuthToken()
    return tokenResponse.projurisToken
}

async function fetchAndStoreNewProjurisAuthToken() {
    const tokenObj = await fetchProjurisAuthToken()
    await chrome.storage.local.set(tokenObj)
    return tokenObj.projurisToken
}

async function fetchProjurisAuthToken() {
    const projurisLoginUri = `https://login-api.projurisadv.com.br/adv-bouncer-authorization-server/oauth/token`
    const secret = `${envVars.PROJURIS_API_CLIENT_ID}:${envVars.PROJURIS_API_CLIENT_SECRET}`
    const secretHash = btoa(secret)

    const params = {
        method: "POST",
        async: true,
        headers: {
            Authorization: `Basic ${secretHash}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=password&username=${envVars.PROJURIS_API_USERNAME}$$${envVars.PROJURIS_API_DOMAIN}&password=${envVars.PROJURIS_API_PASSWORD}`
    }
    const response = await fetch(projurisLoginUri, params)
    const tokenData = await response.json()
    const now = new Date()
    const projurisExpiration = now.getTime() + (tokenData.expires_in * 1000)
    return {
        projurisToken: tokenData.access_token,
        projurisExpiration
    }
}

export default async function fetchProjurisInfo (endPoint) {
    const uri = `https://api.projurisadv.com.br/adv-service/${endPoint}`.replaceAll(`/${endPoint}`, `${endPoint}`)
    const token = await getProjurisAuthTokenWithinExpiration()
    const params = {
        method: "GET",
        async: true,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    return fetch(uri, params)
}

export async function extractOptionsArray(projurisFetchResponse) {
    if (projurisFetchResponse.status === 204) return "no content"
    const jsonResp = await projurisFetchResponse.json()
    if (jsonResp.simpleDto) return jsonResp.simpleDto
    if (jsonResp.consultaTipoRetorno && jsonResp.consultaTipoRetorno[0].simpleDto) return jsonResp.consultaTipoRetorno[0].simpleDto
    if (jsonResp.nodeWs) return jsonResp.nodeWs
    if (jsonResp.tarefaTipoConsultaWs) return jsonResp.tarefaTipoConsultaWs
    if (jsonResp.andamentoTipoConsultaWs) return jsonResp.andamentoTipoConsultaWs
    if (jsonResp.assuntoWs) return jsonResp.assuntoWs
    if (jsonResp.processoConsultaWs) return jsonResp.processoConsultaWs
    if (jsonResp.pessoaConsulta) return jsonResp.pessoaConsulta
    if (jsonResp.pessoaConsultaSimples) return jsonResp.pessoaConsultaSimples
    if (jsonResp.campoDinamicoWs) return jsonResp.campoDinamicoWs
    return
}

export async function loadSimpleOptions (endPoint, filterObject = undefined, shallMap = true) {
    const optionsPromise = await fetchProjurisInfo(endPoint)
    const rawOptions = await extractOptionsArray(optionsPromise)
    let flattenedOptions
    if (filterObject?.flattenOptions) {
        flattenedOptions = flattenObjectsArray(rawOptions)
    }
    const options = flattenedOptions ?? rawOptions
    let filteredOptions = options
    if (filterObject) {
        filteredOptions = options
            .filter(option => {
                return compareWithOperator(option[filterObject.key], filterObject.operator, filterObject.val)
            })
    }
    filteredOptions.forEach(option => {
        delete option.nodeWs
        delete option.codigoModulo
    })
    if (shallMap) {
        return filteredOptions
            .map(option => {
                return {
                    ...option,
                    value: option.chave ?? option.codigoAssunto,
                    label: option.valor ?? option.nomeAssunto
                }
            })
    } else {
        return filteredOptions
    }
}

export async function makeProjurisPost (endPoint, body) {
    const uri = `https://api.projurisadv.com.br/adv-service/${endPoint}`.replaceAll(`/${endPoint}`, `${endPoint}`)
    const token = await getProjurisAuthTokenWithinExpiration()
    const params = {
        method: "POST",
        async: true,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body
    }
    return fetch(uri, params)
}

export function flattenObjectsArray(objsArray, parent, res = []){
    objsArray.forEach(obj => {
        const { chave, valor, nodeWs: children } = obj
        res.push({ chave, valor, parent })
        if (Array.isArray(children) && children.length > 0) {
            flattenObjectsArray(children, valor, res)
        }
    })
    return res;
}