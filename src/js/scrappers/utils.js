export const REGEX_CNJ_NUMBER = /(\d{7}-\d{2}.\d{4}.)(\d)(.\d{2}.\d{4})/;

export const EMAIL_REGEX =
  /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;

export const tiposParte = Object.freeze({
  requerente: "autor",
  requerido: "réu",
  testemunha: "testemunha",
  terceiro: "terceiro",
  advogado: "advogado contrário",
  juiz: "magistrado",
  perito: "perito",
  assistente: "assistente",
  administrador: "administrador",
  servidor: "servidor",
});

export const trtInterfacePolosNames = Object.freeze({
  autor: "ativo",
  reu: "passivo",
  outros: "outros",
});

export const sistemas = Object.freeze({
  tjbaProjudi: "projudiTjba",
  tjba: "Possível",
});

export function recursivelyRemoveDuplicatedLineBreaks(str) {
  const newStr = str.replace("\n\n", "\n");
  if (newStr === str) return newStr;
  return recursivelyRemoveDuplicatedLineBreaks(newStr);
}

export async function waitForElement(
  selector,
  {
    returnElementSelector = selector,
    documentParent,
    waitForTextContent = false,
  } = {}
) {
  function reevaluateCheckpoints() {
    const documentToSearch = documentParent
      ? documentParent.contentDocument
      : document;
    const awaitedElement = documentToSearch.querySelector(selector);
    const conditionsWereMet = waitForTextContent
      ? !!awaitedElement?.textContent
      : !!awaitedElement;
    return { documentToSearch, conditionsWereMet };
  }

  return await new Promise(resolve => {
    const { documentToSearch, conditionsWereMet } = reevaluateCheckpoints();
    if (conditionsWereMet) {
      return resolve(documentToSearch.querySelector(returnElementSelector));
    }

    const timerId = setInterval(() => {
      const { documentToSearch, conditionsWereMet } = reevaluateCheckpoints();
      if (conditionsWereMet) {
        clearInterval(timerId);
        resolve(documentToSearch.querySelector(returnElementSelector));
      }
    }, 250);
  });
}
