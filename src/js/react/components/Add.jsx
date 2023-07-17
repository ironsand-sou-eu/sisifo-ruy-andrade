import React from "react"

function Add(props) {
    return (
        <div className="col-sm-12 pointer fit" onClick={props.onClick}>
            <svg className="one-liner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                {/* <!-- ! Font Awesome Free 6.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. --> */}
                <path className="add" d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z"/>
            </svg>
            <label className="sisifo-label pointer">Adicionar pedido</label>
        </div>
    )
}

export default Add