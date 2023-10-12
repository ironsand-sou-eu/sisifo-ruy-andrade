import React, { useEffect, useState, createContext } from "react"
import Header from "./components/Header.jsx"
import Messenger from "./components/Messenger.jsx"
import PopupForm from "./components/PopupForm.jsx"
import finalizeProcessoInfo from "../adapters/confirmation-projuris.js"
import useMsgSetter from "./hooks/useMsgSetter.jsx"
import { debounce } from "../utils/utils"

const LoadingContext = createContext();
const MsgSetterContext = createContext();    

function App() {
    const [result, setResult] = useState({ success: [], processing: [], fail: [] });
    const { msgSetter } = useMsgSetter(result, setResult);
    const [formData, setFormData] = useState()
    const [processoProjurisData, setProcessoProjurisData] = useState(null)
    const [loading, setLoading] = useState({ scrapping: true, creating: false })

    function updateFormData(newData, changedInput) {
        setFormData(prevData => {
            return {...prevData, [changedInput]: newData}
        })
    }

    function onSubmit(e) {
        e.preventDefault()
        setLoading({ scrapping: false, creating: true })
        finalizeProcessoInfo(processoProjurisData, formData, msgSetter)
    }

    function handleAdaptedInfoErrors() {
        if (!adaptedInfoHasErrors()) return
        processoProjurisData.errorMsgs.forEach(errorMsg => {msgSetter.addMsg({
            type: "fail",
            msg: errorMsg
        })})
        return true
    }

    function adaptedInfoHasErrors() {
        if (processoProjurisData?.hasErrors) return true
        else return false
    }

    useEffect(
        () => {
            if (adaptedInfoHasErrors()) handleAdaptedInfoErrors()
        },
        [processoProjurisData]
    )

    useEffect(debounce(() => {
        if (processoProjurisData !== null) return
        chrome.runtime.sendMessage({
                from: "sisifoPopup",
                subject: "query-processo-info-to-show"
            },
            response => {
                setProcessoProjurisData(response)
            }
        )
    }, [processoProjurisData]))

    useEffect(() => {
        if (processoProjurisData === null) return
        setLoading({ scrapping: false, creating: false })
        if (adaptedInfoHasErrors()) return
        const {
            projurisProcesso: {
                processoNumeroWs: [{numeroDoProcesso}], assuntoCnj, area, tipoJustica, vara, tipoVara, fase,
                gruposDeTrabalho, responsaveis, segredoJustica
            },
            projurisPartes: { partesRequerentes, partesRequeridas },
            responsaveisList,
            projurisPedidos
        } = processoProjurisData
        const data = {
            numeroDoProcesso, area, tipoJustica, vara, tipoVara, assuntoCnj, fase, responsaveisList, gruposDeTrabalho,
            responsaveis, segredoJustica, partesRequerentes, partesRequeridas, projurisPedidos,
            assunto: null,
            dataCitacao: new Date().toISOString().substring(0, 10),
            dataRecebimento: new Date().toISOString().substring(0, 10),
        }
        setFormData(data)
    }, [processoProjurisData])

    return (
        <LoadingContext.Provider value={loading}>
            <MsgSetterContext.Provider value={msgSetter}>
                <Header />
                <Messenger
                    successMsgs={result.success}
                    processingMsgs={result.processing}
                    failureMsgs={result.fail}
                />
                <PopupForm
                    data={formData}
                    updateData={updateFormData}
                    onSubmit={onSubmit}
                />
            </MsgSetterContext.Provider>
        </LoadingContext.Provider>
    )
}

export default App
export { LoadingContext, MsgSetterContext }