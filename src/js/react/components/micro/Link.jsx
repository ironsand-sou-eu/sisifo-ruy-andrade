import React from "react"

export default function SelectInput(props) {
    return (
        <div className="col-sm-8">
            <div className="inputGroupContainer">
                <a href={props.url} target="_blank">{props.label}</a>
            </div>
        </div>
    )
}