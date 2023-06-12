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
    const [processoSajData, setProcessoSajData] = useState(null)
    const [loading, setLoading] = useState({ scrapping: true, creating: false })

    function updateFormData(newData, changedInput) {
        setFormData(prevData => {
            return {...prevData, [changedInput]: newData}
        })
    }

    function onSubmit(e) {
        e.preventDefault()
        setLoading({ scrapping: false, creating: true })
        finalizeProcessoInfo(processoSajData, formData, msgSetter)
    }

    function handleAdaptedInfoErrors() {
        if (!adaptedInfoHasErrors()) return
        processoSajData.errorMsgs.forEach(errorMsg => {msgSetter.addMsg({
            type: "fail",
            msg: errorMsg
        })})
        return true
    }

    function adaptedInfoHasErrors() {
        if (processoSajData?.hasErrors) return true
        else return false
    }

    useEffect(
        () => {
            if (adaptedInfoHasErrors()) handleAdaptedInfoErrors()
        },
        [processoSajData]
    )

    useEffect(debounce(() => {
        if (processoSajData !== null) return
        chrome.runtime.sendMessage({
                from: "sisifoPopup",
                subject: "query-processo-info-to-show"
            },
            response => {
                setProcessoSajData(response)
            }
        )
    }, [processoSajData]))

    useEffect(() => {
        if (processoSajData === null) return
        setLoading({ scrapping: false, creating: false })
        if (adaptedInfoHasErrors()) return
        const data = {
            numeroProcesso: processoSajData.sajProcesso.processoNumeroWs[0].numeroDoProcesso,
            assuntoCnj: processoSajData.sajProcesso.assuntoCnj,
            assunto: null,
            area: processoSajData.sajProcesso.area,
            tipoJustica: processoSajData.sajProcesso.tipoJustica,
            vara: processoSajData.sajProcesso.vara,
            tipoVara: processoSajData.sajProcesso.tipoVara,
            dataCitacao: new Date().toISOString().substring(0, 10),
            dataRecebimento: new Date().toISOString().substring(0, 10),
            fase: processoSajData.sajProcesso.fase,
            allResponsaveis: processoSajData.responsaveisList,
            gruposDeTrabalho: processoSajData.sajProcesso.gruposDeTrabalho,
            responsaveis: processoSajData.sajProcesso.responsaveis,
            segredoJustica: processoSajData.sajProcesso.segredoJustica,
            partesRequerentes: processoSajData.sajPartes.partesRequerentes,
            partesRequeridas: processoSajData.sajPartes.partesRequeridas,
            pedidos: processoSajData.sajPedidos
        }
        setFormData(data)
    }, [processoSajData])

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