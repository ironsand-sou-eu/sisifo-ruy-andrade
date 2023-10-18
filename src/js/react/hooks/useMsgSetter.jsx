import { useEffect } from "react";

export default function useMsgSetter(result, setResult) {
    useEffect(() => {
        document.addEventListener("click", ev => {
            if (ev.target.classList.contains("copy"))
                navigator.clipboard.writeText(ev.target.textContent)
        })
    }, [result])

    const msgSetter = {
        addMsg: ({ type, msg, before = false }) => {
            setResult(prevData => {
                if (prevData[type].includes(msg)) return prevData;
                const newData = { ...prevData };
                if (before) newData[type].unshift(msg);
                else newData[type].push(msg);
                return newData;
            })
        },
        clear: ({ type }) => {
            if (!type) {
                setResult({ success: [], processing: [], fail: [] });
            } else {
                setResult(prevData => {
                    return { ...prevData, [type]: [] };
                });
            };
        },
        setSingleProcessingMsg: (msg) => {
            setResult(prevData => {
                return { ...prevData, processing: [ msg ] };
            });
        }
    };

    return { msgSetter };
}