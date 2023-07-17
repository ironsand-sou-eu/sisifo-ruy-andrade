import React, { useEffect } from "react";
import PartesColumn from "./PartesColumn.jsx";
import Text from "./Text.jsx";
import Select from "./Select.jsx";
import Checkbox from "./Checkbox.jsx";
import Textarea from "./Textarea.jsx";
import PedidosBox from "./PedidosBox.jsx";
import Button from "./Button.jsx";
import { endPoints } from "../../connectors/projuris";
import useValidator from "../hooks/useValidator.jsx";

function PopupForm({ onSubmit, data, updateData }) {
    const [ warningMessages ] = useValidator(data);
    const filter = {
        key: "valor",
        operator: "insentiviveIncludes"
    };


    return (
        <form className="form-horizontal" action="" method="post"
        id="confirmation_info" onSubmit={e => { onSubmit(e) }}>
            <div className="form-group">
                <Text
                    type="text"
                    name="numeroProcesso"
                    label="Número"
                    value={data?.numeroProcesso}
                    placeholder="Número do processo"
                    isDisabled
                    />
                <Text
                    type="text"
                    name="pastaCliente"
                    label="Pasta do cliente"
                    value={data?.pastaCliente}
                    placeholder="Número no sistema do cliente"
                    onChange={event => updateData(event.target.value, event.target.name)}
                />
            </div>
            <fieldset className="form-group">
                <legend className="sisifo-v-label">Partes</legend>
                <PartesColumn
                    type="requerentes"
                    partes={data?.partesRequerentes}
                    label="Requerentes"
                    onChange={updateData}
                />
                <PartesColumn
                    type="requeridos"
                    partes={data?.partesRequeridas}
                    label="Requeridos"
                    onChange={updateData}
                />
            </fieldset>
            <div className="form-group">
                <Select
                    name="assuntoCnj"
                    label="Assunto CNJ"
                    optionsEndpoint={endPoints.assuntosCnj}
                    filter={filter}
                    value={data?.assuntoCnj}
                    isMulti
                    hasMultiLevelSource
                    onChange={updateData}
                />
                <Select
                    name="assunto"
                    label="Assunto Projuris"
                    optionsEndpoint={endPoints.assuntosSaj}
                    filter={{...filter, key: "nomeAssunto"}}
                    value={data?.assunto}
                    onChange={updateData}
                />
            </div>
            <div className="form-group">
                <Select
                    name="area"
                    label="Área"
                    optionsEndpoint={endPoints.areas}
                    filter={filter}
                    value={data?.area}
                    onChange={updateData}
                />
                <Select
                    name="tipoJustica"
                    label="Tipo de justiça"
                    optionsEndpoint={endPoints.tiposJustica}
                    filter={filter}
                    value={data?.tipoJustica}
                    onChange={updateData}
                />
            </div>
            <div className="form-group">
                <Select
                    name="vara"
                    label="Vara"
                    optionsEndpoint={endPoints.varas}
                    filter={filter}
                    value={data?.vara}
                    onChange={updateData}
                />
                <Select
                    name="tipoVara"
                    label="Tipo de vara"
                    optionsEndpoint={endPoints.tiposVara}
                    filter={filter}
                    value={data?.tipoVara}
                    onChange={updateData}
                />
            </div>
            <div className="form-group">
                <Text
                    type="date"
                    name="dataCitacao"
                    label="Citação"
                    value={data?.dataCitacao}
                    placeholder="Data da citação do cliente"
                    onChange={event => updateData(event.target.value, event.target.name)}
                />
                <Text
                    type="date"
                    name="dataRecebimento"
                    label="Recebimento pelo escritório"
                    value={data?.dataRecebimento}
                    placeholder="Data de recebimento pelo escritório"
                    onChange={event => updateData(event.target.value, event.target.name)}
                />
            </div>
            <div className="form-group">
                <Select
                    name="fase"
                    label="Fase"
                    optionsEndpoint={endPoints.fases}
                    filter={filter}
                    value={data?.fase}
                    onChange={updateData}
                />
            </div>
            <div className="form-group">
                <Select
                    name="gruposDeTrabalho"
                    label="Grupo de Trabalho"
                    optionsEndpoint={endPoints.gruposTrabalho}
                    filter={filter}
                    value={data?.gruposDeTrabalho}
                    onChange={updateData}
                    allResponsaveis={data?.allResponsaveis}
                />
                <Select
                    name="responsaveis"
                    label="Responsável"
                    optionsEndpoint={endPoints.responsaveis}
                    filter={filter}
                    value={data?.responsaveis}
                    onChange={updateData}
                    isMulti
                />
            </div>
            <div className="form-group">
                <Checkbox
                    label="Segredo de justiça"
                    name="segredoJustica"
                    checked={data?.segredoJustica}
                    onChange={event => updateData(event.target.checked, event.target.name)}
                />
                <Text
                    type="text"
                    name="senhaProcesso"
                    label="Senha de acesso"
                    value={data?.senhaProcesso}
                    placeholder="Senha para segredo de justiça"
                    onChange={event => updateData(event.target.value, event.target.name)}
                />
            </div>
            <div className="form-group">
                <Textarea
                    name="descricao"
                    label="Resumo do caso"
                    placeholder="Resumo do processo"
                    onChange={event => updateData(event.target.value, event.target.name)}
                />
            </div>
            <fieldset className="form-group">
                <legend className="sisifo-v-label">Pedidos e provisionamento</legend>
                <PedidosBox
                    pedidos={data?.pedidos}
                    onChange={updateData}
                />
            </fieldset>
            <div className="form-group">
                <Button
                    label="Cadastrar"
                    warningMessages={warningMessages}
                />
            </div>
        </form>
    )
};

export default PopupForm;