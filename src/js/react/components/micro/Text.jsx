import React from "react"

export default function Text({type, value, name, label, placeholder, onChange, isDisabled}) {
    return (
        <div className="col-sm-6">
            <label className="sisifo-label">{label}</label>
            <div className="col-sm-12 inputGroupContainer">
                <input name={name}
                    placeholder={placeholder}
                    value={value ?? ''}
                    onChange={onChange}
                    className="form-control"
                    type={type}
                    disabled={isDisabled ? true : false}
                />
            </div>
        </div>
    )
}