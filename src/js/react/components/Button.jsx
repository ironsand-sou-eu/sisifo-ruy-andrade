import React, { useContext } from "react";
import { LoadingContext } from "../App.jsx";
import Messenger from "./Messenger.jsx";

function Button({ label, warningMessages }) {
    const loading = useContext(LoadingContext);
    const isLoading = loading.scrapping || loading.creating;
    const open = warningMessages?.length == 0 ? "open" : "";
    return (
        <>
            <div className="capped-btn-container" {...{open}}>
                <button type="submit" className="btn btn-warning capped-btn" disabled={isLoading}>{label}</button>
                <div className="btn-cap-group" onClick={() => document.querySelector(".capped-btn-container").setAttribute("open", "") }>
                    <svg className="btn-cap" viewBox="0 0 100 55">
                        <defs>
                            <pattern id="box-texture" viewBox="0 0 10 10" width="10%" height="10%">
                                <line x1="-10" y1="35" x2="110" y2="20" style={{stroke: "var(--cap-color)"}}
                                    strokeWidth="78px" strokeDasharray="10 1" />
                            </pattern>
                            <pattern id="tape-texture" viewBox="10 0 20 20" width="100%" height="100%">
                                <line x1="-20" y1="10" x2="100" y2="10" className="cap-coloured-strips" strokeWidth="20px" />
                                <line x1="-20" y1="10" x2="100" y2="10" stroke="#301903" strokeWidth="20px"
                                    style={{transform: "skewX(15deg)"}} strokeDasharray="5 5" strokeDashoffset="4" />
                            </pattern>
                            <linearGradient id="grad" gradientTransform="rotate(83)">
                                <stop offset="0%" stopColor="#2f3303" />
                                <stop offset="61%" stopColor="#787909" />
                                <stop offset="100%" style={{stopColor: "var(--cap-color)"}} />
                            </linearGradient>
                        </defs>
                        <path d="m -5 0 l 100 0 a 10 10 0 0 1 10 10 l 0 35 a 10 10 0 0 1 -10 10 l -100 0" fill="url(#grad)" />
                        <path d="m -5 0 l 100 0 a 10 10 0 0 1 10 10 l 0 35 a 10 10 0 0 1 -10 10 l -100 0" fill="url(#box-texture)" />
                        <path d="m -5 0 l 100 0 a 10 10 0 0 1 10 10 l 0 35 a 10 10 0 0 1 -10 10 l -100 0" stroke="url(#tape-texture)"
                            strokeWidth="20px" fillOpacity="0" />
                    </svg>
                    <div className="btn-cap-text">ATENÇÃO</div>
                </div>
            </div>
            <div className="form-group">
                <Messenger
                    processingMsgs={warningMessages}
                />
            </div>

        </>
    )
}

export default Button