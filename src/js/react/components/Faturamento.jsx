import React from "react"
import Trash from "./Trash"
import useProjurisTranslator from "../hooks/useProjurisTranslator"
import useLocation from "../hooks/useLocation"
import Select from "react-select"
import { debounce } from "../../utils/utils"

export default function Faturamento({ index, faturamentoItem, bancosList, onChange }) {
    const { insertValueLabel, removeValueLabel } = useProjurisTranslator()
    const { formatCurrencyToPtBr, formatStringToNumber, formatDateToInputString } = useLocation()
    const bancosSelectList = insertValueLabel(bancosList)
    const magicNumberStyling =  {height: '38px'}

    function updateDescription({target}) {
        const newReceitaDespesaItem = [{...faturamentoItem.receitaDespesaItemWs[0], descricao: target.value}]
        onChange(getUpdateParams({ updatedField: "receitaDespesaItemWs", newValue: newReceitaDespesaItem }))
    }

    function validateValueAndUpdate({target: {value}}) {
        const valueInteger = formatStringToNumber(value)
        value = valueInteger / 100
        const newReceitaDespesaItem = [{...faturamentoItem.receitaDespesaItemWs[0], valor: value}]
        const newPagamentoTransferencia = [{...faturamentoItem.pagamentoTransferenciaWs[0], valorPagamento: value}]
        const newSolicitacaoRecebimentoPagto = [{...faturamentoItem.solicitacaoRecebimentoPagtoWs[0], valorSolicitacao: value}]
        onChange(getUpdateParams([
            {updatedField: "receitaDespesaItemWs", newValue: newReceitaDespesaItem},
            {updatedField: "pagamentoTransferenciaWs", newValue: newPagamentoTransferencia},
            {updatedField: "solicitacaoRecebimentoPagtoWs", newValue: newSolicitacaoRecebimentoPagto},
            {updatedField: "valorDocumento", newValue: value}
        ]))
    }
    
    function validateDueDateAndUpdate({target: {value}}) {
        const newPagamentoTransferencia = [{...faturamentoItem.pagamentoTransferenciaWs[0], dataVencimento: value}]
        const newSolicitacaoRecebimentoPagto = [{...faturamentoItem.solicitacaoRecebimentoPagtoWs[0], dataVencimento: value}]
        onChange(getUpdateParams([
            {updatedField: "pagamentoTransferenciaWs", newValue: newPagamentoTransferencia},
            {updatedField: "solicitacaoRecebimentoPagtoWs", newValue: newSolicitacaoRecebimentoPagto},
            {updatedField: "dataVencimento", newValue: value}
        ]))
    }

    function validateBancoAndUpdate(value) {
        const banco = removeValueLabel(value)
        const newPagamentoTransferencia = [{...faturamentoItem.pagamentoTransferenciaWs[0], conta: banco}]
        onChange(getUpdateParams({updatedField: "pagamentoTransferenciaWs", newValue: newPagamentoTransferencia}))
    }
    
    function getUpdateParams(paramsObj) {
        if (!Array.isArray(paramsObj)) paramsObj = [ paramsObj ]
        let newItem
        paramsObj.forEach(({ updatedField, newValue }) => {
            newItem = {...newItem ?? faturamentoItem, [updatedField]: newValue}
        })
        return {
            type: "update",
            targetIndex: index,
            newItem
        }
    }

    function getDeleteParams() {
        return {
            type: "delete",
            targetIndex: index
        }
    }

    return (
        <div className="input-group d-flex" style={magicNumberStyling}>
            <div className="col-sm-4 no-padding">
                <input name="descricao"
                    placeholder="Descrição da cobrança"
                    value={faturamentoItem?.receitaDespesaItemWs[0].descricao ?? ''}
                    onChange={updateDescription}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-2 no-padding">
                <input name="valorDocumento"
                    value={formatCurrencyToPtBr(faturamentoItem?.valorDocumento) ?? ''}
                    onChange={validateValueAndUpdate}
                    className="form-control"
                    type="text"
                />
            </div>

            <div className="col-sm-3 no-padding">
                <input name="dataVencimento"
                    placeholder="Vencimento"
                    value={formatDateToInputString(faturamentoItem?.dataVencimento) ?? ''}
                    onChange={validateDueDateAndUpdate}
                    className="form-control"
                    type="date"
                />
            </div>

            <div className="col-sm-2 no-padding">
                <Select
                    options={bancosSelectList}
                    value={insertValueLabel(faturamentoItem?.pagamentoTransferenciaWs[0].conta)}
                    placeholder="Selecione uma opção..."
                    onChange={validateBancoAndUpdate}
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