import envVars from "../envVars"
import compareWithOperator from "../utils/utils"

const endPoints = {
    assuntosSaj: "/assunto/consulta/",
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

async function getSajAuthTokenWithinExpiration() {
    const tokenResponse = await chrome.storage.local.get(["sajToken", "sajExpiration"])
    const tokenResponseIsEmpty = Object.keys(tokenResponse).length === 0
    if (tokenResponseIsEmpty === true) return await fetchAndStoreNewSajAuthToken()
    const tokenExpired = tokenResponse.sajExpiration < new Date().getTime()
    if (tokenExpired) return await fetchAndStoreNewSajAuthToken()
    return tokenResponse.sajToken
}

async function fetchAndStoreNewSajAuthToken() {
    const tokenObj = await fetchSajAuthToken()
    await chrome.storage.local.set(tokenObj)
    return tokenObj.sajToken
}

async function fetchSajAuthToken() {
    const sajLoginUri = `https://login-api.projurisadv.com.br/adv-bouncer-authorization-server/oauth/token`
    const secret = `${envVars.SAJ_API_CLIENT_ID}:${envVars.SAJ_API_CLIENT_SECRET}`
    const secretHash = btoa(secret)

    const params = {
        method: "POST",
        async: true,
        headers: {
            Authorization: `Basic ${secretHash}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=password&username=${envVars.SAJ_API_USERNAME}$$${envVars.SAJ_API_DOMAIN}&password=${envVars.SAJ_API_PASSWORD}`
    }
    const response = await fetch(sajLoginUri, params)
    const tokenData = await response.json()
    const now = new Date()
    const sajExpiration = now.getTime() + (tokenData.expires_in * 1000)
    return {
        sajToken: tokenData.access_token,
        sajExpiration
    }
}

async function fetchSajInfo (endPoint) {
    const uri = `https://api.projurisadv.com.br/adv-service/${endPoint}`.replaceAll(`/${endPoint}`, `${endPoint}`)
    const token = await getSajAuthTokenWithinExpiration()
    const params = {
        method: "GET",
        async: true,
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    return fetch(uri, params)
}

async function extractOptionsArray(sajFetchResponse) {
    if (sajFetchResponse.status === 204) return "no content"
    const jsonResp = await sajFetchResponse.json()
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

async function loadSimpleOptions (endPoint, filterObject = undefined, shallMap = true) {
    const optionsPromise = await fetchSajInfo(endPoint)
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

async function makeProjurisPost (endPoint, body) {
    const uri = `https://api.projurisadv.com.br/adv-service/${endPoint}`.replaceAll(`/${endPoint}`, `${endPoint}`)
    const token = await getSajAuthTokenWithinExpiration()
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

function flattenObjectsArray(objsArray, parent, res = []){
    objsArray.forEach(obj => {
        const { chave, valor, nodeWs: children } = obj
        res.push({ chave, valor, parent })
        if (Array.isArray(children) && children.length > 0) {
            flattenObjectsArray(children, valor, res)
        }
    })
    return res;
}

export default fetchSajInfo
export { makeProjurisPost, loadSimpleOptions, extractOptionsArray, flattenObjectsArray, endPoints }
