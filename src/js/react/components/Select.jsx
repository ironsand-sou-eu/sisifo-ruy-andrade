import React, { useContext } from "react"
import AsyncSelect from "react-select/async"
import { LoadingContext, MsgSetterContext } from "../App"
import useProjurisTranslator from "../hooks/useProjurisTranslator"
import useProjurisConnector from "../hooks/connectors/useProjurisConnector"

function Select(props) {
    const { getGtCrew, loadSimpleOptions } = useProjurisConnector()
    const isLoading = useContext(LoadingContext)
    const msgSetter = useContext(MsgSetterContext)
    const { insertValueLabel, removeValueLabel } = useProjurisTranslator()
    const filterFunction = input => loadSimpleOptions(props.optionsEndpoint, { ...props.filter, val: input, flattenOptions: props.hasMultiLevelSource })
    async function changed(newData) {
        if (props.name !== "gruposDeTrabalho" || newData === null)
            return props.onChange(removeValueLabel(newData), props.name)
        try {
            const gtCrew = await getGtCrew(newData.label, props?.allResponsaveis)
            const responsaveis = gtCrew?.advs
            props.onChange(removeValueLabel(responsaveis), "responsaveis")
            props.onChange(removeValueLabel(newData), props.name)
        } catch(e) {
            msgSetter.addMsg({ type: "fail", msg: e })
            return props.onChange(removeValueLabel(newData), props.name)
        }
    }

    return (
        <div className="col-sm-6">
            <label className="sisifo-label">{props.label}</label>
            <div className="col-sm-12 inputGroupContainer">
                <AsyncSelect
                    loadOptions={filterFunction}
                    value={insertValueLabel(props.value)}
                    name={props.name}
                    placeholder="Selecione uma opção..."
                    onChange={changed}
                    isLoading={isLoading.scrapping ?? true}
                    isSearchable
                    isClearable
                    isMulti={props.isMulti ? true : false}
                    defaultOptions
                    cacheOptions
                />
            </div>
        </div>
    )
}

export default Select