import AndamentoDataStructure from "../data-structures/AndamentoDataStructure";
import Pje1gTjbaProcessoScrapper from "./Pje1gTjbaProcessoScrapper";

class Pje1gTjbaAndamentosScrapper {
  static #HTML_SCRIPT_TAG_WITH_CONTENT_REGEX = /<script[^]*?<\/script>/gi;
  static #HTML_SELF_ENCLOSING_SCRIPT_TAG_REGEX = /<script[^]*?>/gi;
  static #divTimeline;

  /**
   * @returns {AndamentoDataStructure[]}
   */
  static async fetchAndamentosInfo() {
    try {
      this.#loadPageCheckpoints();
      const andamentos = await this.#getAndamentos();
      return andamentos;
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints() {
    this.#divTimeline = document.getElementById(
      "divTimeLine:eventosTimeLineElement"
    );
  }

  /**
   * @returns {AndamentoDataStructure[]}
   */

  static async #getAndamentos() {
    const andamentosMediaDivs = this.#divTimeline.querySelectorAll(
      ":scope > .media:not(.data)"
    );
    const andamentos = [];
    for (const mediaDiv of andamentosMediaDivs) {
      const andamentoPjeType = Array.from(mediaDiv.classList).includes("tipo-D")
        ? "documento"
        : "movimentação";
      const bodyBoxDiv = mediaDiv.querySelector(".media-body");
      const horaAndamento = bodyBoxDiv
        .querySelector("small.text-muted")
        .textContent.trim();
      let docName;
      let docContent;
      const andamento = new AndamentoDataStructure();
      if (andamentoPjeType === "documento") {
        [andamento.id, andamento.cancelado, docName, docContent] =
          await this.#getDocumentInfo(bodyBoxDiv);
      }
      andamento.data = this.#getDate(mediaDiv, horaAndamento);
      andamento.nomeOriginalSistemaJustica = this.#getNome(bodyBoxDiv, docName);
      const fullObservacao = `${docName ?? ""}\n${docContent ?? ""}`;
      andamento.observacao = this.#stripBlankLines(fullObservacao);
      andamentos.unshift(andamento);
    }
    return andamentos;
  }

  static async #getDocumentInfo(bodyBoxDiv) {
    let mainDocumentNameString;
    let docContent;
    const isCancelado = this.#isCancelado(bodyBoxDiv);
    if (isCancelado) {
      mainDocumentNameString = bodyBoxDiv
        .querySelector(".anexos > .anexos-inativos > span")
        .textContent.trim();
    } else {
      const mainDocumentA = bodyBoxDiv.querySelector(".anexos > a:first-child");
      mainDocumentNameString = mainDocumentA
        .querySelector(":scope > span")
        .textContent.trim();
      docContent =
        (await this.#getDocumentTextContentIfExists(mainDocumentA)) ?? "";
    }
    const id = this.#getIdFromDocString(mainDocumentNameString);
    const docName = this.#getNameFromDocString(mainDocumentNameString);
    return [id, isCancelado, docName, docContent];
  }

  static #getIdFromDocString(docString) {
    const idRegex = /^\d+(?= -)/;
    const match = docString.match(idRegex);
    return match ? match[0] : null;
  }

  static #getNameFromDocString(docString) {
    const idRegex = /(?<=^\d+ - ).+/;
    const match = docString.match(idRegex);
    return match ? match[0] : null;
  }

  static #getDate(mediaDiv, horaAndamento) {
    const dateString = this.#findDateSibling(mediaDiv).textContent.trim();
    return Pje1gTjbaProcessoScrapper.getDateFromPjeTjbaDateString(
      dateString,
      horaAndamento
    );
  }

  static #findDateSibling(mediaDiv) {
    const prevSibling = mediaDiv.previousElementSibling;
    if (Array.from(prevSibling.classList).includes("data")) return prevSibling;
    return this.#findDateSibling(prevSibling);
  }

  static #getNome(bodyBoxDiv, filename = "") {
    if (filename !== "") {
      const matchParenthesisResults = filename.match(/.+(?= (\(.+\))$)/);
      return matchParenthesisResults
        ? matchParenthesisResults[0].trim()
        : filename;
    }
    const titleDivs = bodyBoxDiv.querySelectorAll(
      ":scope > :not(.anexos, .col-sm-12)"
    );
    const titles = Array.from(titleDivs).map(titleDiv =>
      titleDiv.querySelector("span").textContent.trim()
    );
    return titles[0];
  }

  static #isCancelado(bodyBoxDiv) {
    const inativosDiv = bodyBoxDiv.querySelector(".anexos > .anexos-inativos");
    return Boolean(inativosDiv);
    // TODO: buscar exemplo de andamento cancelado SEM DOCUMENTO no PJe
  }

  static async #getDocumentTextContentIfExists(documentAnchorElement) {
    if (this.#isPdf(documentAnchorElement)) return null;
    documentAnchorElement.click();
    const contentDoc = await this.#waitPageLoad("#frameHtml");
    await new Promise(resolve => setTimeout(resolve, 250));
    if (this.#isPjeDocumentLandingPageBug(contentDoc)) return null;
    else return this.#getDocumentTextContent(contentDoc);
  }

  static #isPdf(documentAnchorElement) {
    const icon = documentAnchorElement.querySelector(":scope > i:first-child");
    return Array.from(icon.classList).includes("fa-file-pdf-o");
  }

  static async #waitPageLoad(iframeDocSelector) {
    let readystateComplete;
    let bodyLengthChanged;
    let bodyLength;
    let iframe;
    while (!readystateComplete || bodyLengthChanged) {
      await new Promise(resolve => setTimeout(resolve, 350));
      iframe = document.querySelector(iframeDocSelector);
      readystateComplete = iframe?.contentDocument?.readyState === "complete";
      bodyLengthChanged =
        bodyLength !== iframe?.contentDocument?.body.children.length;
      bodyLength = iframe?.contentDocument?.body.children.length;
    }
    return iframe.contentDocument;
  }

  static #isPjeDocumentLandingPageBug(htmlDoc) {
    if (htmlDoc.head.children.length > 3) return true;
    else return false;
  }

  static #getDocumentTextContent(contentDoc) {
    const body = this.#getBodyFromHtmlDoc(contentDoc);
    const noScriptBody = this.#stripScriptTagsFromHtmlString(body);
    return this.#getTextContent(noScriptBody);
  }

  static #getBodyFromHtmlDoc(htmlDoc) {
    return `<body>${htmlDoc.body.innerHTML}</body>`;
  }

  static #stripScriptTagsFromHtmlString(htmlString) {
    const contentScriptTagsStrippedHtml = htmlString.replaceAll(
      this.#HTML_SCRIPT_TAG_WITH_CONTENT_REGEX,
      ""
    );
    return contentScriptTagsStrippedHtml.replaceAll(
      this.#HTML_SELF_ENCLOSING_SCRIPT_TAG_REGEX,
      ""
    );
  }

  static #getTextContent(htmlBodyString) {
    const div = document.createElement("div");
    div.innerHTML = htmlBodyString;
    return div.textContent;
  }

  static #stripBlankLines(str) {
    const lines = str.split("\n");
    const nonBlankLines = lines.filter(line => line.trim() !== "");
    return nonBlankLines.join("\n");
  }
}
export default Pje1gTjbaAndamentosScrapper;
