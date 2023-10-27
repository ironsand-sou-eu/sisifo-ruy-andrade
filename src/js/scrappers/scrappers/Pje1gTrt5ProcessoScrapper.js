import ProcessoDataStructure from "../data-structures/ProcessoDataStructure";
import UnidadeJurisdicionalDataStructure from "../data-structures/UnidadeJurisdicionalDataStructure";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";
import Pje1gTrt5AndamentosScrapper from "./Pje1gTrt5AndamentosScrapper";
import Pje1gTrt5PartesScrapper from "./Pje1gTrt5PartesScrapper";
import { waitForElement } from "../utils";

export default class Pje1gTrt5ProcessoScrapper {
  static #PJE1G_TRT5_PROCESSO_HOME_PATH = "/pjekz/processo/";
  static #PJE1G_TRT5_IGNORE_LIST = [
    "https://pje.trt5.jus.br/pjekz/assets/pdf/web/viewer.html",
    "https://pje.trt5.jus.br/pjekz/downloadBinario.seam",
  ];
  static #tiposAcao = {
    ATOrd: "Ação Trabalhista Ordinária",
  };
  static #elResumoProcesso;
  static #divDetails;

  static async fetchProcessoInfo() {
    try {
      await this.#loadPageCheckpoints();
      const fim = await this.#ScrappeProcessoInfo();
      console.log(fim);
      return fim;
    } catch (e) {
      if (!(e instanceof NotProcessoHomepageException)) console.error(e);
    }
  }

  static checkProcessoHomepage(url) {
    if (
      this.#PJE1G_TRT5_IGNORE_LIST.some(itemToIgnore =>
        url.includes(itemToIgnore)
      )
    ) {
      return false;
    } else if (!url || !url.includes(this.#PJE1G_TRT5_PROCESSO_HOME_PATH)) {
      throw new NotProcessoHomepageException(url);
    } else {
      return true;
    }
  }

  static async #loadPageCheckpoints() {
    this.#elResumoProcesso = document.querySelector("pje-resumo-processo");
    this.#divDetails = await this.#getDetailsDiv();
    this.#divDetails = this.#divDetails.cloneNode(true);
    this.#closeDetailsDiv();
  }

  static async #getDetailsDiv() {
    const expandDetailsButton = document.querySelector(
      "[aria-label*='resumo do processo']"
    );
    expandDetailsButton.click();
    return await waitForElement("pje-parte-processo > section > ul", {
      returnElementSelector: "#processo > div",
    });
  }

  static #closeDetailsDiv() {
    document.querySelector("a:has(~ pje-autuacao)").click();
  }

  /**
   * @returns {ProcessoDataStructure}
   */
  static async #ScrappeProcessoInfo() {
    const andamentos = await this.#getAndamentos();
    const { poloAtivo, poloPassivo, outros } = this.#getPartes();
    return new ProcessoDataStructure(
      this.#getNumero(),
      "pje1gTrt5",
      this.#getNumeroRegional(),
      this.#getUrl(),
      this.#getDataDistribuicao(),
      this.#getValorDaCausa(),
      this.#getTipoDeAcao(),
      this.#getCausaDePedir(),
      this.#getSegredoJustica(),
      this.#getJuizo(),
      this.#getJuizAtual(),
      this.#getNumeroProcessoPrincipal(),
      this.#getNumerosIncidentes(),
      this.#getNumerosProcessosRelacionados(),
      poloAtivo,
      poloPassivo,
      outros,
      andamentos,
      this.#getPedidos(),
      await this.#getAudienciaFutura()
    );
  }

  static #getNumero() {
    const containerNumeroProcesso = document.querySelector(
      "[aria-label*='Abre o resumo do processo']"
    );
    return containerNumeroProcesso.textContent.trim();
  }

  static #getNumeroRegional() {
    return null;
  }

  static #getUrl() {
    return document.URL;
  }

  static #getDataDistribuicao() {
    const params = {
      parentElement: this.#elResumoProcesso,
      firstGuessQuerySelector: "#dataAutuacao + dd",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "Autuado",
    };
    const dateString = this.#getValueFollowingCellSearchedByTextContent(params);
    return this.getDateFromPjeTrt1gDateString(dateString);
  }

  static #getValueFollowingCellSearchedByTextContent({
    parentElement,
    firstGuessQuerySelector,
    IterableElementsQuerySelector,
    partialTextToSearch,
  }) {
    return this.#getElementFollowingCellSearchedByTextContent({
      parentElement,
      firstGuessQuerySelector,
      IterableElementsQuerySelector,
      partialTextToSearch,
    })?.textContent;
  }

  static #getElementFollowingCellSearchedByTextContent({
    parentElement,
    firstGuessQuerySelector,
    IterableElementsQuerySelector,
    partialTextToSearch,
  }) {
    const firstGuess = parentElement.querySelector(firstGuessQuerySelector);
    if (
      firstGuess?.textContent
        .toLowerCase()
        .includes(partialTextToSearch.toLowerCase())
    ) {
      return firstGuess.nextElementSibling;
    }

    const slowChoice = Array.from(
      parentElement.querySelectorAll(IterableElementsQuerySelector)
    ).filter(iElement => {
      return iElement.textContent
        .toLowerCase()
        .includes(partialTextToSearch.toLowerCase());
    });
    return slowChoice[0]?.nextElementSibling;
  }

  static getDateFromPjeTrt1gDateString(dateTimeStr) {
    dateTimeStr = dateTimeStr.replace(" ", "/");
    const dateArray = dateTimeStr.split("/");
    const iso8601DateString = `${dateArray[2]}-${dateArray[1]}-${dateArray[0]}T${dateArray[3]}-03:00`;
    return new Date(iso8601DateString);
  }

  static #getValorDaCausa() {
    const params = {
      parentElement: this.#elResumoProcesso,
      firstGuessQuerySelector: "#valorCausa",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "valor da causa",
    };
    const valorDaCausaString =
      this.#getValueFollowingCellSearchedByTextContent(params);

    let valorDaCausa = valorDaCausaString.trim().replace(/(R\$ )|(\.)/g, "");
    return valorDaCausa.replace(",", ".");
  }

  static #getTipoDeAcao() {
    const containerDescricaoProcesso = document.querySelector(
      "pje-descricao-processo"
    );
    const stringTipoProcesso = containerDescricaoProcesso
      .querySelector("span:first-child")
      .querySelector("span:last-child")
      .textContent.trim();
    const tipoDeAcaoNome = this.#tiposAcao[stringTipoProcesso];
    return {
      id: null,
      valor: tipoDeAcaoNome,
    };
  }

  static #getCausaDePedir() {
    const detailsList = this.#divDetails.querySelector(
      "div:first-child > dl:only-child"
    );
    const params = {
      parentElement: detailsList,
      firstGuessQuerySelector: "dt:last-of-type",
      IterableElementsQuerySelector: "*",
      partialTextToSearch: "Assunto(s)",
    };
    const causaDePedir =
      this.#getValueFollowingCellSearchedByTextContent(params)?.trim();
    return {
      id: null,
      valor: causaDePedir,
    };
  }

  static #getSegredoJustica() {
    //TODO: descobrir um processo em segredo de justiça para encontrar onde fica a informação
    return null;
  }

  static #getJuizo() {
    const detailsList = this.#divDetails.querySelector(
      "div:first-child > dl:only-child"
    );
    const params = {
      parentElement: detailsList,
      firstGuessQuerySelector: "dt:first-child",
      IterableElementsQuerySelector: "dl dt",
      partialTextToSearch: "Órgão julgador",
    };
    const juizo = new UnidadeJurisdicionalDataStructure();
    juizo.nomeOriginalSistemaJustica =
      this.#getValueFollowingCellSearchedByTextContent(params);
    return juizo;
  }

  static #getJuizAtual() {
    return null;
  }

  static #getNumeroProcessoPrincipal() {
    return undefined;
    //TODO: encontrar um processo que tenha processo principal para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processoPrincipal = this.#getValueFollowingCellSearchedByTextContent(params)
    // return processoPrincipal.toLowerCase().includes('o próprio') ? null : processoPrincipal
  }

  static #getNumerosIncidentes() {
    return null;
  }

  static #getNumerosProcessosRelacionados() {
    return undefined;
    //TODO: encontrar um processo que tenha processos relacionados para localizar a informação.
    // const params = {
    //     parentElement: this.#divMaisDetalhes,
    //     firstGuessQuerySelector: 'div:nth-child(2) > dl > dt',
    //     IterableElementsQuerySelector: 'dl dt',
    //     partialTextToSearch: 'órgão julgador'
    // }
    // const processosRelacionados = this.#getValueFollowingCellSearchedByTextContent(params).trim()
    // return processosRelacionados ? [processosRelacionados] : null
  }

  static #getPartes() {
    return Pje1gTrt5PartesScrapper.fetchParticipantesInfo(this.#divDetails);
  }

  static async #getAndamentos() {
    return await Pje1gTrt5AndamentosScrapper.fetchAndamentosInfo();
  }

  static #getPedidos() {
    return undefined;
  }

  static async #getAudienciaFutura(processoUrl) {
    // const audienciasUrl = processoUrl.replace(
    //   "/detalhe",
    //   "/audiencias-sessoes"
    // );

    // TODO: Procurar processo com audiência marcada para ver como o PJe mostra.
    return null;
  }
}
