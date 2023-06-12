import React from "react"
import { useEffect } from "react"
import { useRef } from "react"

function Messenger({ successMsgs, processingMsgs, failureMsgs }) {
    const aside = useRef(null)
    const successUl = useRef(null)
    const processingUl = useRef(null)
    const failUl = useRef(null)

    useEffect(() => {
        if (!successMsgs?.length && !processingMsgs?.length && !failureMsgs?.length) return
        aside.current.scrollIntoView({ block: "center", behavior: "smooth" })
    },
    [successMsgs?.length, processingMsgs?.length, failureMsgs?.length]
    )

    //TODO: testar substituir por classList.toggle()
    if (successMsgs?.length > 0) successUl.current?.classList.remove("d-none")
    else successUl.current?.classList.add("d-none")
    if (processingMsgs?.length > 0) processingUl.current?.classList.remove("d-none")
    else processingUl.current?.classList.add("d-none")
    if (failureMsgs?.length > 0) failUl.current?.classList.remove("d-none")
    else failUl.current?.classList.add("d-none")

    return (
        <aside ref={aside}>
            <ul ref={successUl} className={"result-msg success d-none"}>
                {successMsgs?.map((msg, index) => (
                    <li key={index} dangerouslySetInnerHTML={{__html: msg}}></li>
                ))}
            </ul>
            <ul ref={processingUl} className={"result-msg processing d-none"}>
                {processingMsgs?.map((msg, index) => (
                    <li key={index} dangerouslySetInnerHTML={{__html: msg}}></li>
                ))}
            </ul>
            <ul ref={failUl} className={"result-msg fail d-none"}>
                {failureMsgs?.map((msg, index) => (
                    <li key={index} dangerouslySetInnerHTML={{__html: msg}}></li>
                ))}
            </ul>
        </aside>
    )
}

export default Messenger