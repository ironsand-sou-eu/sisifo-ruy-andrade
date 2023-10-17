import React from "react"
import Select from "react-select"
import AsyncSelect from "react-select/async"
import Trash from "./Trash"
import { endPoints, loadSimpleOptions } from "../../connectors/projuris"
import useProjurisTranslator from "../hooks/useProjurisTranslator"
import { operators } from "../../utils/utils.js"
import { prognosticoOptions } from "../../utils/enumsAndHardcoded"
import useLocation from "../hooks/useLocation"

export default function Pedido({pedido, index, onChange}) {
    const { removeValueLabel } = useProjurisTranslator()
    const { formatCurrencyToPtBr, formatStringToNumber } = useLocation()
    const filterFunction = input => loadSimpleOptions(endPoints.pedidos + input, { key: "valor", operator: operators.insentiviveIncludes, val: input })

    function getPrognosticoOption(prognosticoValue) {
        return prognosticoOptions.find(prognosticoOption => prognosticoOption.value === prognosticoValue)
    }

    function updatePedido(newLabel, newValue, basePedido = pedido) {
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
            targetIndex: index,
            newPedido
        }
    }

    function getDeleteParams() {
        return {
            type: "delete",
            targetIndex: index
        }
    }

    const nomeValue = pedido.codigoPedido ?
        { value: pedido.codigoPedido, label: pedido.nomePedido }
        : undefined
    
    function validateNumberAndUpdate({target}, noDecimals = false) {
        let value = formatStringToNumber(target.value)
        if (!noDecimals) value /=  100
        onChange(getUpdateParams(
            {updatedField: target.name,
            newValue: formatStringToNumber(value)}
        ))
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
                        onChange(getUpdateParams([
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
                    value={formatCurrencyToPtBr(pedido.valorPedido) ?? ''}
                    onChange={validateNumberAndUpdate}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-2 no-padding">
                <Select
                    options={prognosticoOptions}
                    value={getPrognosticoOption(pedido.estimativaTipo)}
                    placeholder="Selecione uma opção..."
                    onChange={newData => onChange(getUpdateParams(
                        {updatedField: "estimativaTipo", newValue: newData.value}
                    ))}
                />
            </div>

            <div className="col-sm-2 no-padding">
                <input name="valorProvisionado"
                    value={formatCurrencyToPtBr(pedido.valorProvisionado) ?? ''}
                    onChange={validateNumberAndUpdate}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-1 no-padding">
                <input name="riscoPorcentagem"
                    value={formatCurrencyToPtBr(pedido.riscoPorcentagem, 0) ?? ''}
                    onChange={ev => validateNumberAndUpdate(ev, true)}
                    className="form-control"
                    type="text"
                />
            </div>
            
            <div className="no-padding">
                <Trash
                    onClick={() => onChange(getDeleteParams())}
                />
            </div>
        </div>
    )
}