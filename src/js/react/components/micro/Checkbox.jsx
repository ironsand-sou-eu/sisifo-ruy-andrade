import React from "react"

export default function Checkbox(props) {
    return (
        <div className="col-sm-6">
            <label className="sisifo-label">{props.label}</label>
            <div className="col-sm-12 d-flex form-inline">
                <input
                    type="checkbox"
                    name={props.name}
                    value={props.name}
                    checked={props.value}
                    onChange={props.onChange}
                />
            </div>
        </div>
    )
}