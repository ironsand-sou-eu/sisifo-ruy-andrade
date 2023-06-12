import React from "react"

function Textarea(props) {
    return (
        <div className="col-sm-12">
            <label className="sisifo-label">{props.label}</label>
            <div className="inputGroupContainer">
                <textarea
                    className="form-control"
                    name={props.name}
                    onChange={props.onChange}
                    rows="4"
                    placeholder={props.placeholder}>
                </textarea>
            </div>
        </div>
    )
}

export default Textarea