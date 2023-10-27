import useGoogleSheets from "../react/hooks/connectors/useGoogleSheets";

const namesStartAndEndsAdaptations = [
  {
    nameStart: "Conhecido o recurso de ",
    nameEnd: "e provido",
    adaptedName: "Conhecido o recurso de XXX e provido",
  },
  {
    nameStart: "Conhecido o recurso de ",
    nameEnd: "e provido em parte",
    adaptedName: "Conhecido o recurso de XXX e provido em parte",
  },
  {
    nameStart: "Conhecido o recurso de ",
    nameEnd: "e não-provido",
    adaptedName: "Conhecido o recurso de XXX e não-provido",
  },
  {
    nameStart: "Conhecido em parte o recurso de ",
    nameEnd: "e provido",
    adaptedName: "Conhecido em parte o recurso de XXX e provido",
  },
  {
    nameStart: "Conhecido em parte o recurso de ",
    nameEnd: "e provido em parte",
    adaptedName: "Conhecido em parte o recurso de XXX e provido em parte",
  },
  {
    nameStart: "Conhecido em parte o recurso de ",
    nameEnd: "e não-provido",
    adaptedName: "Conhecido em parte o recurso de XXX e não-provido",
  },
];

const namesStartsAdaptations = [
  { nameStart: "Conclusos os autos ", adaptedName: "Conclusos os autos" },
  { nameStart: "Decorrido prazo de ", adaptedName: "Decurso de prazo" },
  {
    nameStart: "Não Concedida a Medida Liminar",
    adaptedName: "Não Concedida a Medida Liminar",
  },
  {
    nameStart: "Rejeitada a exceção de pré-executividade",
    adaptedName: "Rejeitada a exceção de pré-executividade",
  },
  { nameStart: "Incluído em pauta", adaptedName: "Incluído em pauta" },
  {
    nameStart: "Não recebido o recurso",
    adaptedName: "Não recebido o recurso",
  },
  { nameStart: "Publicado Intimação", adaptedName: "Publicação" },
  { nameStart: "Publicado(a) o(a)", adaptedName: "Publicação" },
  { nameStart: "Expedido(a) intimação a(o)", adaptedName: "Intimação" },
  { nameStart: "Expedido(a) notificação a(o)", adaptedName: "Notificação" },
  { nameStart: "Expedido(a) mandado", adaptedName: "Mandado assinado(a)" },
  {
    nameStart: "Disponibilizado no DJ Eletrônico",
    adaptedName: "Disponibilizado no DJ Eletrônico",
  },
  {
    nameStart: "Concedida a antecipação de tutela ",
    adaptedName: "Concedida a Medida Liminar",
  },
  {
    nameStart: "Não concedida a antecipação de tutela ",
    adaptedName: "Não Concedida a Medida Liminar a XXX",
  },
  {
    nameStart: "Decorrido o prazo de ",
    adaptedName: "Decurso de prazo",
  },
  {
    nameStart: "Concedida a assistência judiciária gratuita ",
    adaptedName: "Concedida a Assistência Judiciária Gratuita a parte",
  },
  {
    nameStart: "Não concedida a assistência judiciária gratuita ",
    adaptedName: "Não concedida a Assistência Judiciária Gratuita a parte",
  },
  {
    nameStart: "Audiência inicial cancelada",
    adaptedName: "Audiência Inicial Cancelada",
  },
  {
    nameStart: "Audiência inicial designada",
    adaptedName: "Audiência Inicial Designada",
  },
  {
    nameStart: "Audiência inicial realizada",
    adaptedName: "Audiência inicial realizada",
  },
  {
    nameStart: "Audiência una cancelada",
    adaptedName: "Audiência Una Cancelada",
  },
  {
    nameStart: "Audiência una designada",
    adaptedName: "Audiência Una Designada",
  },
  {
    nameStart: "Audiência una realizada",
    adaptedName: "Audiência una realizada",
  },
  {
    nameStart: "Audiência instrução cancelada",
    adaptedName: "Audiência Instrução Cancelada",
  },
  {
    nameStart: "Audiência instrução designada",
    adaptedName: "Audiência Instrução Designada",
  },
  {
    nameStart: "Audiência instrução realizada",
    adaptedName: "Audiência instrução realizada",
  },
  {
    nameStart: "Audiência de instrução por videoconferência cancelada",
    adaptedName: "Audiência de instrução por videoconferência Cancelada",
  },
  {
    nameStart: "Audiência de instrução por videoconferência designada",
    adaptedName: "Audiência de instrução por videoconferência Designada",
  },
  {
    nameStart: "Audiência de instrução por videoconferência realizada",
    adaptedName: "Audiência de instrução por videoconferência realizada",
  },
  {
    nameStart: "Audiência instrução e julgamento cancelada",
    adaptedName: "Audiência Instrução e Julgamento Cancelada",
  },
  {
    nameStart: "Audiência instrução e julgamento designada",
    adaptedName: "Audiência Instrução e Julgamento Designada",
  },
  {
    nameStart: "Audiência instrução e julgamento realizada",
    adaptedName: "Audiência instrução e julgamento realizada",
  },
];

const {
  fetchGoogleSheetData,
  extractValuesFromSheetsPromise,
  getMatchingEntry,
} = useGoogleSheets();

export default async function insertAdaptedAndamentoNames(processoInfo, token) {
  const promise = fetchGoogleSheetData("andamentos", token);
  const andamentosSheetValues = await extractValuesFromSheetsPromise(promise);
  processoInfo.andamentos.forEach(andamento => {
    const andamentoWithoutDatesNorPeopleNames = getAdaptedAndamentoNames(
      andamento.nomeOriginalSistemaJustica
    );
    const errorMsgParams = {
      errorKind: "google",
      missingEntry: andamentoWithoutDatesNorPeopleNames,
      entryType: "andamento",
    };
    const nomeAdaptado = getMatchingEntry(
      andamentosSheetValues,
      andamentoWithoutDatesNorPeopleNames,
      errorMsgParams
    );
    if (nomeAdaptado.found) {
      andamento.nomeAdaptadoAoCliente = nomeAdaptado.value[1];
    } else {
      processoInfo.errorMsgs.push(nomeAdaptado.value);
    }
  });
}

function getAdaptedAndamentoNames(nomeAndamento) {
  const foundSimpleAdaptation = namesStartsAdaptations.filter(adaptation =>
    nomeAndamento.startsWith(adaptation.nameStart)
  );
  if (foundSimpleAdaptation.length !== 0)
    return foundSimpleAdaptation[0].adaptedName;

  const foundCompoundAdaptation = namesStartAndEndsAdaptations.filter(
    adaptation =>
      nomeAndamento.startsWith(adaptation.nameStart) &&
      nomeAndamento.endsWith(adaptation.nameEnd)
  );
  if (foundCompoundAdaptation.length !== 0)
    return foundCompoundAdaptation[0].adaptedName;

  return nomeAndamento;
}
