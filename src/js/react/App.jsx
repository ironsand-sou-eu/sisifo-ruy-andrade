import React, { useEffect, useState, createContext } from "react"
import useLoader from "./hooks/useLoader"
import Header from "./components/micro/Header"
import Messenger from "./components/micro/Messenger"
import PopupForm from "./components/macro/PopupForm"
import useMsgSetter from "./hooks/useMsgSetter"
import usePostConfirmationAdapter from "./hooks/usePostConfirmationAdapter"

export const LoadingContext = createContext();
export const MsgSetterContext = createContext();    

export default function App() {
    const [ formData, setFormData ] = useState()
    const [ result, setResult ] = useState({ success: [], processing: [], fail: [] });
    const [ loading, setLoading ] = useState({ scrapping: true, creating: false })
    const { msgSetter } = useMsgSetter(result, setResult);
    const processoDraftedData = useLoader(setLoading, msgSetter, setFormData)
    const { finalizeProcessoInfo } = usePostConfirmationAdapter(processoDraftedData, msgSetter)

    function updateFormData(newData, changedInput) {
        setFormData(prevData => {
            return {...prevData, [changedInput]: newData}
        })
    }

    function onSubmit(e) {
        e.preventDefault()
        setLoading({ scrapping: false, creating: true })
        finalizeProcessoInfo(formData)
    }

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