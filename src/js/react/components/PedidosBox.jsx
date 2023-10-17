import React from "react"
import Pedido from "./Pedido"
import Add from "./Add"

export default function PedidosBox({ pedidos, onChange }) {
    const changingFunctions = {
        update: ({targetIndex, newPedido}) => {
            pedidos[targetIndex] = newPedido
            return pedidos
        },
        delete: ({targetIndex}) => {
            pedidos.splice(targetIndex, 1)
            return pedidos
        },
        add: () => {
            pedidos.push({dataPedido: Date.now(), flagValorProvisionado: true})
            return pedidos
        }
    }

    return (
        <div className="col-sm-12">
            <Add
                onClick={() => {
                    const pedidos = changingFunctions.add()
                    onChange(pedidos, {name: "pedidos"})
                }}
            />
            <div className="col-sm-12 inputGroupContainer d-flex no-padding">
                <label className="col-sm-4 sisifo-label centered">Pedido</label>
                <label className="col-sm-2 sisifo-label centered">Valor</label>
                <label className="col-sm-2 sisifo-label centered">Prognóstico</label>
                <label className="col-sm-2 sisifo-label centered">R$ analisado</label>
                <label className="col-sm-1 sisifo-label centered">%</label>
                <label className="sisifo-label centered f-size"></label>
            </div>
            <div className="col-sm-12 inputGroupContainer">
                {pedidos?.map((pedido, index) => (
                    <Pedido
                        key={index}
                        index={index}
                        pedido={pedido}
                        onChange={changeParams => {
                            const pedidos = changingFunctions[changeParams.type](changeParams)
                            onChange(pedidos, "pedidos")
                        }}
                    />
                ))}
            </div>
        </div>
    )
}