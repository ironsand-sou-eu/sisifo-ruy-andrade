import React from "react";
import Link from "./components/micro/Link";
import { gSheetsUrls } from "../envVars";

function OptionsApp() {
  const andamentosUrl =
    gSheetsUrls.frontendBase + gSheetsUrls.andamentosSheetId;
  const juizosUrl = gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId;
  const clientesUrl = gSheetsUrls.frontendBase + gSheetsUrls.clientesSheetId;
  const gtsUrl = gSheetsUrls.frontendBase + gSheetsUrls.gtsSheetId;
  const pedidosProvisionamentosUrl =
    gSheetsUrls.frontendBase + gSheetsUrls.pedidosProvisionamentosSheetId;
  const tarefasUrl = gSheetsUrls.frontendBase + gSheetsUrls.tarefasSheetId;
  const lancamentosFinanceirosUrl =
    gSheetsUrls.frontendBase + gSheetsUrls.faturamentosSheetId;
  return (
    <div className="form-group">
      <Link label="Lista de juízos" url={juizosUrl} />
      <Link label="Lista de andamentos" url={andamentosUrl} />
      <Link label="Lista de clientes" url={clientesUrl} />
      <Link label="Lista de grupos de trabalho" url={gtsUrl} />
      <Link label="Lista de pedidos" url={pedidosProvisionamentosUrl} />
      <Link label="Lista de tarefas" url={tarefasUrl} />
      <Link label="Lista de lançamentos financeiros" url={tarefasUrl} />
    </div>
  );
}

export default OptionsApp;
