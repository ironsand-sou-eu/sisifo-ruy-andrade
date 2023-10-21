import React from "react";

export default function Parte(props) {
  const lawyerFlag = props.isLawyer ? "(adv) " : "";
  return (
    <div className="input-group">
      <label className="input-group-addon">
        <input
          type="checkbox"
          checked={props.isClient}
          onChange={props.onChange}
        />
      </label>
      <input
        name={props.type}
        value={lawyerFlag + props.value}
        className="form-control"
        type="text"
        disabled
      />
    </div>
  );
}
