import AndamentoDataStructure from "../data-structures/AndamentoDataStructure";
import {
  recursivelyRemoveDuplicatedLineBreaks,
  waitForElement,
} from "../utils";

class Pje1gTjbaAndamentosScrapper {
  static #HTML_SCRIPT_TAG_WITH_CONTENT_REGEX = /<script[^]*?<\/script>/gi;
  static #HTML_SELF_ENCLOSING_SCRIPT_TAG_REGEX = /<script[^]*?>/gi;
  static #lisAndamentos;

  /**
   * @returns {AndamentoDataStructure[]}
   */
  static async fetchAndamentosInfo() {
    try {
      await this.#loadPageCheckpoints();
      return await this.#getAndamentos();
    } catch (e) {
      console.error(e);
    }
  }

  static async #loadPageCheckpoints() {
    await this.#expandMovimentos();
    this.#lisAndamentos = document.querySelectorAll(".pje-timeline > li");
  }

  static async #expandMovimentos() {
    document.querySelector("button[aria-label='Exibir movimentos.']").click();
    await waitForElement(".pje-timeline > li > div > mat-card[id^='mov']");
  }

  /**
   * @returns {AndamentoDataStructure[]}
   */

  static async #getAndamentos() {
    const andamentos = [];
    for (const li of this.#lisAndamentos) {
      const andamentoMatcardId = li
        .querySelector(":scope > div > mat-card")
        .getAttribute("id");
      const andamentoType = andamentoMatcardId.startsWith("doc")
        ? "documento"
        : "movimentação";
      const elMatCard = li.querySelector("mat-card");
      let docName;
      let docContent;
      const andamento = new AndamentoDataStructure();
      [andamento.id, andamento.cancelado, docName, docContent] =
        await this.#getDocumentInfo(elMatCard, andamentoType);
      const horaAndamento = elMatCard
        .querySelector(":scope div.tl-item-hora")
        .textContent.trim();
      andamento.data = this.#getDate(li, horaAndamento);
      andamento.nomeOriginalSistemaJustica = this.#getNome(elMatCard, docName);
      const fullObservacao = `${docName ?? ""}\n${docContent ?? ""}`;
      andamento.observacao = this.#stripBlankLines(fullObservacao);
      andamentos.unshift(andamento);
    }
    return await Promise.all(andamentos);
  }

  static async #getDocumentInfo(elMatCard, andamentoType) {
    if (andamentoType !== "documento")
      return new Promise(resolve => resolve([]));
    const isCancelado = !!elMatCard.querySelector(":scope a.is-inativo");
    const docName = this.#getDocName(elMatCard);
    const id = elMatCard
      .querySelector(":scope > div > a > span.ng-star-inserted")
      ?.textContent.replace("- ", "")
      .trim();
    const docContent = await this.#getDocContent(elMatCard, isCancelado);
    return [id, isCancelado, docName, docContent];
  }

  static #getDocName(elMatCard) {
    const nameSpans = Array.from(
      elMatCard.querySelectorAll(":scope > div > a > span:not([class])")
    );
    const [firstNameStr, secondNameStr] = nameSpans.map(span =>
      span.textContent.trim()
    );
    if (firstNameStr === `(${secondNameStr})`) return firstNameStr;
    return `${firstNameStr} ${secondNameStr}`;
  }

  static async #getDocContent(elMatCard, isCancelado) {
    if (isCancelado) return;
    const mainDocumentA = elMatCard.querySelector("a:not(.ng-star-inserted)");

    return (await this.#getDocumentTextContentIfExists(mainDocumentA)) ?? "";
  }

  static async #getDocumentTextContentIfExists(documentAnchorElement) {
    await documentAnchorElement.click();
    const docAreaContainer = await waitForElement(
      "pje-historico-scroll-documento"
    );
    const extractors = {
      pdf: async () => {
        console.warn(1);
        const documentWrapper = await waitForElement(
          "pje-historico-scroll-documento object"
        );
        console.warn(2, documentWrapper);
        const contentElement = await waitForElement(
          "body div#viewer div.endOfContent",
          {
            returnElementSelector: "body div#viewer",
            documentParent: documentWrapper,
            waitForTextContent: false,
          }
        );
        console.warn(3, contentElement);
        return contentElement;
      },
      inline: async () => {
        return await waitForElement(
          "pje-historico-scroll-documento mat-card-content > span",
          { waitForTextContent: true }
        );
      },
    };
    const parser = this.#isPdf(docAreaContainer)
      ? extractors.pdf
      : extractors.inline;
    const contentElement = await parser();
    return this.#getDocumentInnerText(contentElement);
  }

  static #isPdf(docAreaContainer) {
    console.warn({
      docAreaContainer,
      ifQs: !!docAreaContainer.querySelector("div.container-pdf > object"),
    });
    return !!document.querySelector("div.container-pdf > object");
  }

  static #getDocumentInnerText(contentElement) {
    const inHtml = contentElement.innerHTML;
    const noScriptInnerHtml = this.#stripScriptTagsFromHtmlString(inHtml);
    return this.#getTextContent(noScriptInnerHtml);
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

  static #getTextContent(innerHtml) {
    const div = document.createElement("div");
    div.innerHTML = innerHtml.replace(/<br.*?>/gim, "\n");
    return recursivelyRemoveDuplicatedLineBreaks(div.textContent).trim();
  }

  static #getDate(li, horaAndamento) {
    const dateString = this.#findDateString(li);
    return this.#getDateFromPje1gTrt5AndamentoDateString(
      dateString,
      horaAndamento
    );
  }

  static #findDateString(li) {
    if (li.querySelector(":scope > div[role=heading]")) {
      return li.querySelector(":scope > div[role=heading]").textContent.trim();
    }
    return this.#findDateString(li.previousElementSibling);
  }

  static #getDateFromPje1gTrt5AndamentoDateString(dateStr, timeStr = "00:00") {
    const dateArray = dateStr.split(" ");
    const meses = {
      jan: "01",
      fev: "02",
      mar: "03",
      abr: "04",
      mai: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      set: "09",
      out: "10",
      nov: "11",
      dez: "12",
    };
    const mesStr = dateArray[1].replace(".", "").toLowerCase();
    dateArray[1] = meses[mesStr];
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${timeStr}-03:00`;
    return new Date(iso8601DateString);
  }

  static #getNome(elMatCard, docName = "") {
    if (docName !== "") {
      const withoutParenthesisResults = docName.match(/.+(?= ?(\(.+\))$)/);
      return withoutParenthesisResults
        ? withoutParenthesisResults[0].trim()
        : docName;
    }
    return elMatCard
      .querySelector(":scope > div")
      .textContent.replace("Descrição do movimento:", "")
      .trim();
  }

  static #stripBlankLines(str) {
    const lines = str.split("\n");
    const nonBlankLines = lines.filter(line => line.trim() !== "");
    return nonBlankLines.join("\n").trim();
  }
}
export default Pje1gTjbaAndamentosScrapper;
