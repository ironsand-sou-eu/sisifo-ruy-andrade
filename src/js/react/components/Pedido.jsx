import React from "react"
import Select from "react-select"
import AsyncSelect from "react-select/async"
import Trash from "./Trash"
import { endPoints, loadSimpleOptions } from "../../connectors/projuris"
import useProjurisTranslator from "../hooks/useProjurisTranslator"
import { operators } from "../../utils/utils.js"

function Pedido(props) {
    const { removeValueLabel } = useProjurisTranslator()
    const filterFunction = input => loadSimpleOptions(endPoints.pedidos + input, { key: "valor", operator: operators.insentiviveIncludes, val: input })

    const prognosticoOptions = [
        { value: "PROVAVEL", label: "Provável" },
        { value: "POSSIVEL", label: "Possível" },
        { value: "REMOTO", label: "Remoto" }
    ]

    function getPrognosticoOption(prognosticoValue) {
        return prognosticoOptions.find(prognosticoOption => prognosticoOption.value === prognosticoValue)
    }

    function updatePedido(newLabel, newValue, basePedido = props.pedido) {
        return {...basePedido, [newLabel]: newValue}
    }

    function getUpdateParams(paramsObj) {
        if (!Array.isArray(paramsObj)) paramsObj = [ paramsObj ]
        let newPedido
        paramsObj.forEach(({ updatedField, newValue }) => {
            newPedido = updatePedido(updatedField, newValue, newPedido)
        })
        return {
            type: "update",
            targetIndex: props.index,
            newPedido
        }
    }

    function getDeleteParams() {
        return {
            type: "delete",
            targetIndex: props.index
        }
    }

    const nomeValue = props.pedido.codigoPedido ?
        { value: props.pedido.codigoPedido, label: props.pedido.nomePedido }
        : undefined
    
    function validateNumberAndUpdate({target}, noDecimals = false) {
        let value = formatStringToNumber(target.value)
        if (!noDecimals) value /=  100
        props.onChange(getUpdateParams(
            {updatedField: target.name,
            newValue: formatStringToNumber(value)}
        ))
    }

    function formatNumberToPtbrString(number, decimals = 2) {
        return number?.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    }

    function formatStringToNumber(string) {
        if (typeof(string) === "number") return string
        const onlyDigitsOrCommaString = string?.replace(/[^\d]/g,'')
        const number = parseFloat(onlyDigitsOrCommaString?.replace(",", "."))
        return isNaN(number) ? "" : number
    }

    return (
        <div className="input-group d-flex">
            <div className="col-sm-4 no-padding">
                <AsyncSelect
                    loadOptions={filterFunction}
                    value={nomeValue}
                    name="pedido-name"
                    placeholder="Selecione uma opção..."
                    onChange={newData => {
                        const newMappedData = removeValueLabel(newData)
                        props.onChange(getUpdateParams([
                            {updatedField: "nomePedido", newValue: newMappedData.valor},
                            {updatedField: "codigoPedido", newValue: newMappedData.chave}
                        ]))
                    }}
                    isSearchable
                    defaultOptions
                    cacheOptions
                />
            </div>

            <div className="col-sm-2 no-padding">
                <input name="valorPedido"
                    value={formatNumberToPtbrString(props.pedido.valorPedido) ?? ''}
                    onChange={validateNumberAndUpdate}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-2 no-padding">
                <Select
                    options={prognosticoOptions}
                    value={getPrognosticoOption(props.pedido.estimativaTipo)}
                    onChange={newData => props.onChange(getUpdateParams(
                        {updatedField: "estimativaTipo", newValue: newData.value}
                    ))}
                />
            </div>

            <div className="col-sm-2 no-padding">
                <input name="valorProvisionado"
                    value={formatNumberToPtbrString(props.pedido.valorProvisionado) ?? ''}
                    onChange={validateNumberAndUpdate}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-1 no-padding">
                <input name="riscoPorcentagem"
                    value={formatNumberToPtbrString(props.pedido.riscoPorcentagem, 0) ?? ''}
                    onChange={ev => validateNumberAndUpdate(ev, true)}
                    className="form-control"
                    type="text"
                />
            </div>
            
            <div className="no-padding">
                <Trash
                    onClick={() => props.onChange(getDeleteParams())}
                />
            </div>
        </div>
    )
}

export default Pedido