import React from "react"
import Add from "../micro/Add"
import Faturamento from "../micro/Faturamento"
import ProjurisFaturamentoDataStructure from "../../../data-structures/ProjurisFaturamentoDataStructure"

export default function FaturamentosBox({ faturamentos, bancosList, onChange }) {
    const changingFunctions = {
        update: ({targetIndex, newItem}) => {
            faturamentos[targetIndex] = newItem
            return faturamentos
        },
        delete: ({targetIndex}) => {
            faturamentos.splice(targetIndex, 1)
            return faturamentos
        },
        add: () => {
            faturamentos.push(new ProjurisFaturamentoDataStructure(null, 0, new Date()))
            return faturamentos
        }
    }

    let i = 0
    return (
        <div className="col-sm-12">
            <Add
                label="Adicionar lançamento financeiro"
                onClick={() => {
                    const faturamentos = changingFunctions.add()
                    onChange(faturamentos, {name: "faturamentos"})
                }}
            />
            <div className="col-sm-12 inputGroupContainer d-flex no-padding">
                <label className="col-sm-4 sisifo-label centered">Descrição</label>
                <label className="col-sm-2 sisifo-label centered">Valor</label>
                <label className="col-sm-3 sisifo-label centered">Vencimento</label>
                <label className="col-sm-2 sisifo-label centered">Conta</label>
                <label className="sisifo-label centered f-size"></label>
            </div>
            <div className="col-sm-12 inputGroupContainer">
                {faturamentos?.map((faturamentoItem, index) => (
                    <Faturamento
                        key={i++}
                        index={index}
                        faturamentoItem={faturamentoItem}
                        bancosList={bancosList}
                        onChange={changeParams => {
                            const faturamentos = changingFunctions[changeParams.type](changeParams)
                            onChange(faturamentos, "faturamentos")
                        }}
                    />
                ))}
            </div>
        </div>
    )
}