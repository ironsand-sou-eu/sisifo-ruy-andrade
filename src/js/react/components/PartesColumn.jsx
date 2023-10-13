import React from "react"
import Parte from "./Parte"

function PartesColumn(props) {
    if (!props.partes) return

    function flagParteAsClient(personName, isClient) {
        props.partes.forEach(element => {
            if (element.nomePessoa === personName) element.flagCliente = isClient
        })
        return props.partes
    }
    
    let i = 0
    return (
        <div className="col-sm-6">
            <label className="col-sm-12 sisifo-v-label">{props.label}</label>
            <div className="col-sm-12 inputGroupContainer">
                {props.partes.map(parte => (
                    <Parte
                        key={i++}
                        type={props.type}
                        isClient={parte.flagCliente}
                        value={parte.nomePessoa}
                        isLawyer={parte.profissao?.valor?.toLowerCase() === "advogado"}
                        onChange={event => {
                            const newFlaggedPartes = flagParteAsClient(parte.nomePessoa, event.target.checked)
                            props.onChange(newFlaggedPartes, {name: props.type})
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

export default PartesColumn