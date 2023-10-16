import { useEffect } from "react"
import { debounce } from "../../utils/utils"


export default function useLoader(processoDraftedData, setProcessoDraftedData) {
    useEffect(debounce(() => {
        if (processoDraftedData !== null) return
        chrome.runtime.sendMessage({
                from: "sisifoPopup",
                subject: "query-processo-info-to-show"
            },
            response => {
                setProcessoDraftedData(response)
            }
        )
    }, [processoDraftedData]))
    return { processoDraftedData }
}