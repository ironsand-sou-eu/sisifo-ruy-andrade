import { gSheetsUrls } from "../envVars";

const textualReferenceType = {
    vara: "uma vara",
    tipoVara: "um tipo de vara",
    instanciaCnj: "uma instância CNJ",
    orgaoJudicial: "um órgão judicial",
    tipoJustica: "um tipo de justiça",
    area: "uma área",
    fase: "uma fase",
    juizo: "um juízo",
    andamento: "um andamento",
    tarefa: "tarefas para um grupo de trabalho",
    gts: "um grupo de trabalho",
    usuario: "um usuário",
    pedido: "um pedido"
};

const gSheetUrl = {
    vara: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    tipoVara: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    instanciaCnj: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    orgaoJudicial: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    tipoJustica: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    juizo: gSheetsUrls.frontendBase + gSheetsUrls.juizosSheetId,
    andamento: gSheetsUrls.frontendBase + gSheetsUrls.andamentosSheetId,
    tarefa: gSheetsUrls.frontendBase + gSheetsUrls.tarefasSheetId,
    gts: gSheetsUrls.frontendBase + gSheetsUrls.gtsSheetId,
    pedido: gSheetsUrls.frontendBase + gSheetsUrls.pedidosProvisionamentosSheetId
};

function linkOrText(type, text) {
    const url = gSheetUrl[type]
    if (url) {
        return `<a href=${url} target="_blank">${text}</a>`
    } else {
        return text
    }
};

const generateErrMsg = {
    noMatchInGoogle: (missingEntry, type) => {
        return `Não encontramos ${textualReferenceType[type]} correspondente a `
        + `<span class="copy">${missingEntry}</span>. Insira a informação na `
        + `${linkOrText(type, "planilha correspondente")} e tente novamente.`
    },

    noMatchInProjuris: (missingEntry, type) => {
        return `Não encontramos ${textualReferenceType[type]} correspondente a `
        + `<span class="copy">${missingEntry}</span> no Projuris. Confira as `
        + `informações no Projuris e na ${linkOrText(type, "planilha correspondente")} `
        + `e tente novamente.`
    },
};

const generateValidationMsg = {
    generalWarning: () => {
        return 'Foram encontrados as situações abaixo. Se você quiser cadastrar o processo '
        + 'sem resolvê-las, é só clicar na tampa, mas lembre-se de que os itens abaixo não '
        + 'estarão no cadastro e deverão ser verificados manualmente.'
    },

    noClient: () => {
        return 'Você não indicou qual das partes é o cliente. Para fazê-lo, vá '
        + 'até a lista de partes e marque a caixa de seleção ao lado do nome do cliente.'
    },

    noClientNumber: () => {
        return 'Você não indicou um número de pasta no sistema do cliente (isso só faz '
        + 'falta se o cliente usar um sistema próprio com números de pasta).'
    },

    noSubject: () => {
        return 'Você não indicou o assunto (campo "Assunto Projuris").'
    },

    noWorkgroup: () => {
        return 'Você não indicou o grupo de trabalho responsável pelo processo. Isso pode '
        + 'fazer com que as tarefas não sejam cadastradas corretamente.'
    },

    noLawyer: () => {
        return 'Você não indicou o(s) advogado(s) responsável(is) pelo processo. Isso pode '
        + 'fazer com que as tarefas não sejam cadastradas corretamente.'
    }

};

export default generateErrMsg;
export { generateValidationMsg };