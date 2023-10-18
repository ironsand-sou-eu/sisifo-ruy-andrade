import React, { useEffect, useState, createContext } from "react"
import useLoader from "./hooks/useLoader"
import Header from "./components/Header"
import Messenger from "./components/Messenger"
import PopupForm from "./components/PopupForm"
import useMsgSetter from "./hooks/useMsgSetter"
import useErrorHandler from "./hooks/useErrorHandler"
import useLocation from "./hooks/useLocation"
import usePostConfirmationAdapter from "./hooks/usePostConfirmationAdapter"

export const LoadingContext = createContext();
export const MsgSetterContext = createContext();    

export default function App() {
    const [ processoDraftedData, setProcessoDraftedData ] = useState(null)
    const [ formData, setFormData ] = useState()
    const [ result, setResult ] = useState({ success: [], processing: [], fail: [] });
    const [ loading, setLoading ] = useState({ scrapping: true, creating: false })
    const { msgSetter } = useMsgSetter(result, setResult);
    const { adaptedInfoHasErrors } = useErrorHandler(processoDraftedData, msgSetter)
    const { formatDateToInputString } = useLocation()
    const { finalizeProcessoInfo } = usePostConfirmationAdapter(processoDraftedData, setResult)
    useLoader(processoDraftedData, setProcessoDraftedData)

    function updateFormData(newData, changedInput) {
        setFormData(prevData => {
            return {...prevData, [changedInput]: newData}
        })
    }

    function onSubmit(e) {
        e.preventDefault()
        setLoading({ scrapping: false, creating: true })
        // finalizeProcessoInfo(processoDraftedData, formData, msgSetter)
    }

    useEffect(() => {
        if (processoDraftedData === null) return
        setLoading({ scrapping: false, creating: false })
        if (adaptedInfoHasErrors()) return
        const {
            projurisProcesso: {
                processoNumeroWs: [{numeroDoProcesso}], assuntoCnj, area, tipoJustica, vara, tipoVara, fase,
                gruposDeTrabalho, responsaveis, segredoJustica
            },
            projurisPartes: { partesRequerentes, partesRequeridas },
            responsaveisList,
            projurisPedidos: pedidos,
            projurisFaturamentos: faturamentos,
            bancosList
        } = processoDraftedData
        const data = {
            numeroDoProcesso, area, tipoJustica, vara, tipoVara, assuntoCnj, fase, responsaveisList, gruposDeTrabalho,
            responsaveis, segredoJustica, partesRequerentes, partesRequeridas, pedidos, faturamentos,
            assunto: null,
            dataCitacao:  formatDateToInputString(new Date()),
            dataRecebimento: formatDateToInputString(new Date()),
            bancosList
        }
        setFormData(data)
    }, [processoDraftedData])

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