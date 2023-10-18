import generateErrMsg from "../../exceptions/error-message-generator"
import { gSheetsUrls } from "../../envVars"

export default function useGoogleSheets() {
    async function fetchGoogleToken() {
        const tokenObj = await chrome.identity.getAuthToken({interactive: true})
        return tokenObj.token
    }
    
    async function fetchGoogleSheetRowsMatchingExpression(sheetName, expressionToSearch, token, getMany) {
        if (!token) token = await fetchGoogleToken()
        const promise = fetchGoogleSheetData(sheetName, token)
        const values = await extractValuesFromSheetsPromise(promise)
        const errorParams = {
            errorKind: "google",
            missingEntry: expressionToSearch,
            entryType: sheetName
        }
        return getMatchingEntry(values, expressionToSearch, errorParams, getMany)
    }
    
    async function extractValuesFromSheetsPromise(promise) {
        const response = await promise
        const json = await response.json()
        return json?.values
    }
    
    function fetchGoogleSheetData(sheetName, token) {
        const sheetIdString = sheetName + "SheetId"
        const sheetInfo = {
            spreadsheetId: gSheetsUrls[sheetIdString],
            name: sheetName
        }
        return requestGoogleSheetContents(sheetInfo, token)
    }
    
    function requestGoogleSheetContents(sheetInfo, token) {
        const uri = gSheetsUrls.apiBase + sheetInfo.spreadsheetId + "/values/" + sheetInfo.name
        const params = {
            method: 'GET',
            async: true,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            'contentType': 'json'
        }
        return fetch(uri, params)
    }
    
    function getMatchingEntry(dictionaryArray, nameToFind, errorParams, getMany = false) {
        const { errorKind, missingEntry, entryType } = errorParams
        const resultArray = dictionaryArray.filter(pairItem => pairItem[0].toLowerCase() === nameToFind.toLowerCase())
        if (resultArray.length >= 1) {
            return { found: true, value: getMany ? resultArray : resultArray[0] }
        } else {
            const errorFunction = {
                google: generateErrMsg.noMatchInGoogle
            }
            return { found: false, value: errorFunction[errorKind](missingEntry, entryType) }
        }
    }
    
    return { fetchGoogleToken, fetchGoogleSheetRowsMatchingExpression, fetchGoogleSheetData,
        extractValuesFromSheetsPromise, getMatchingEntry }
}