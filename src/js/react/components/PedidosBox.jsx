import React from "react"
import Pedido from "./Pedido"
import Add from "./Add"

function PedidosBox(props) {
    const changingFunctions = {
        update: ({targetIndex, newPedido}) => {
            props.pedidos[targetIndex] = newPedido
            return props.pedidos
        },
        delete: (targetIndex) => {
            props.pedidos.splice(targetIndex, 1)
            return props.pedidos
        },
        add: () => {
            props.pedidos.push({dataPedido: Date.now(), flagValorProvisionado: true})
            return props.pedidos
        }
    }

    let i = 0
    return (
        <div className="col-sm-12">
            <Add
                onClick={() => {
                    const pedidos = changingFunctions.add()
                    props.onChange(pedidos, {name: "pedidos"})
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
                {props.pedidos?.map((pedido, index) => (
                    <Pedido
                        key={i++}
                        index={index}
                        pedido={pedido}
                        onChange={changeParams => {
                            const pedidos = changingFunctions[changeParams.type](changeParams)
                            props.onChange(pedidos, "pedidos")
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

export default PedidosBox