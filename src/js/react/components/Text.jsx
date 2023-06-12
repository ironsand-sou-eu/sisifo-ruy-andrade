import React from "react"

function Text(props) {
    return (
        <div className="col-sm-6">
            <label className="sisifo-label">{props.label}</label>
            <div className="col-sm-12 inputGroupContainer">
                <input name={props.name}
                    placeholder={props.placeholder}
                    value={props.value ?? ''}
                    onChange={props.onChange}
                    className="form-control"
                    type={props.type}
                    disabled={props.isDisabled ? true : false}
                />
            </div>
        </div>
    )
}

export default Text