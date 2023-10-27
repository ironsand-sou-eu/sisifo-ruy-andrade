import ParteDataStructure from "../data-structures/ParteDataStructure";
import { EMAIL_REGEX, tiposParte, trtInterfacePolosNames } from "../utils";

class Pje1gTjbaParteScrapper {
  static #poloAtivoContainer;
  static #poloPassivoContainer;
  static #outrosContainer;

  /**
   * @returns {ParteDataStructure[]}
   */
  static fetchParticipantesInfo(macroContainer) {
    try {
      this.#loadPageCheckpoints(macroContainer);
      return this.#getPartes();
    } catch (e) {
      console.error(e);
    }
  }

  static #loadPageCheckpoints(macroContainer) {
    const partesContainers = macroContainer.querySelectorAll(
      ".is-item-pilha-parte"
    );
    const poloAtivoWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")
        .textContent.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.autor)
    );
    const poloPassivoWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")
        .textContent.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.reu)
    );
    const poloOutrosWrapper = Array.from(partesContainers).filter(container =>
      container
        .querySelector(".polo")
        .textContent.trim()
        .toLowerCase()
        .includes(trtInterfacePolosNames.outros)
    );
    const polos = [poloAtivoWrapper, poloPassivoWrapper, poloOutrosWrapper];
    const [poloAtivoContainer, poloPassivoContainer, outrosContainer] =
      polos.map(poloWrapper => {
        return poloWrapper?.length == 0
          ? null
          : poloWrapper[0].querySelector("pje-parte-processo > section");
      });
    this.#poloAtivoContainer = poloAtivoContainer;
    this.#poloPassivoContainer = poloPassivoContainer;
    this.#outrosContainer = outrosContainer;
  }

  /**
   * @returns {poloAtivo: ParteDataStructure[], poloPassivo: ParteDataStructure[], outros: ParteDataStructure[] }
   */
  static #getPartes() {
    const poloAtivo = this.#getCompletePartes(
      this.#poloAtivoContainer,
      tiposParte.requerente
    );
    const poloPassivo = this.#getCompletePartes(
      this.#poloPassivoContainer,
      tiposParte.requerido
    );
    const outros = this.#getCompletePartes(this.#outrosContainer, "outros");
    return { poloAtivo, poloPassivo, outros };
  }

  static #getCompletePartes(partesWrapper, tipoDeParte) {
    if (!partesWrapper) return [];
    const partes = [];
    partesWrapper.querySelectorAll(":scope > ul").forEach(item => {
      const nome = item
        .querySelector("pje-nome-parte")
        .textContent.trim()
        .toUpperCase();
      const until3Wrappers = item.firstElementChild.querySelectorAll(
        ":scope > span.ng-star-inserted"
      );
      const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj, email, endereco } =
        this.#getInfoFromPje1gTrt5Wrappers(until3Wrappers);
      const advogados = this.#getAdvogados(
        item.querySelectorAll(".partes-representante")
      );
      partes.push(
        new ParteDataStructure(
          nome,
          cpf,
          cnpj,
          dontHaveCpfCnpj,
          noCpfCnpjReason,
          null,
          endereco,
          email,
          null,
          tipoDeParte,
          advogados
        )
      );
    });
    return partes;
  }

  static #getInfoFromPje1gTrt5Wrappers(until3Wrappers) {
    const cpfCnpjWrapperArray = Array.from(until3Wrappers).filter(wrapper =>
      wrapper.textContent.trim().toLowerCase().startsWith("cpf:")
    );
    const emailWrapperArray = Array.from(until3Wrappers).filter(wrapper =>
      wrapper.textContent.trim().toLowerCase().startsWith("(email:")
    );
    const addressWrapperArray = Array.from(until3Wrappers).filter(
      wrapper =>
        !wrapper.textContent.trim().toLowerCase().startsWith("cpf:") &&
        !wrapper.textContent.trim().toLowerCase().startsWith("(email:")
    );
    const { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj } =
      this.#getCpfCnpjInfo(cpfCnpjWrapperArray);
    const emailRegexMatch = emailWrapperArray.length
      ? emailWrapperArray[0].textContent.match(EMAIL_REGEX)
      : null;
    const email = emailRegexMatch ? emailRegexMatch[0] : null;
    const endereco = addressWrapperArray.length
      ? addressWrapperArray[0].textContent.trim()
      : null;
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj, email, endereco };
  }

  static #getCpfCnpjInfo(wrapperArray) {
    let dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj;
    if (!wrapperArray.length) {
      dontHaveCpfCnpj = true;
      noCpfCnpjReason = "Não cadastrado no PJe";
    } else {
      const onlyNumbersCpfCnpj = wrapperArray[0].textContent.replaceAll(
        /[^\d]/g,
        ""
      );
      if (onlyNumbersCpfCnpj.length === 11) cpf = onlyNumbersCpfCnpj;
      if (onlyNumbersCpfCnpj.length === 14) cnpj = onlyNumbersCpfCnpj;
    }
    return { dontHaveCpfCnpj, noCpfCnpjReason, cpf, cnpj };
  }

  static #getAdvogados(advsWrapper) {
    return Array.from(advsWrapper).map(advWrapper => {
      const advogado = new ParteDataStructure();
      advogado.nome = this.#getAdvogadoName(advWrapper);
      const infoTexts = Array.from(
        advWrapper.querySelectorAll("span.span-informacao")
      ).map(span => span.textContent);
      const { cpf, oab, email } = this.#getAdvogadoInfo(infoTexts);
      return { ...advogado, cpf, oab, email, tipoDeParte: tiposParte.advogado };
    });
  }

  static #getAdvogadoName(advWrapper) {
    const nameStr = advWrapper
      .querySelector("span:not(.ng-star-inserted)")
      .textContent.toUpperCase();
    return nameStr.replace("(ADVOGADO)", "").trim();
  }

  static #getAdvogadoInfo(array) {
    const cpfArray = array.filter(str => str.toLowerCase().includes("(cpf:"));
    const oabArray = array.filter(str => str.includes("(OAB:"));
    const emailArray = array.filter(str => str.match(EMAIL_REGEX) ?? false);
    const cpf = cpfArray.length ? cpfArray[0].replaceAll(/[^\d]/g, "") : null;
    const oab = oabArray.length
      ? oabArray[0].replace("(OAB:", "").replace(")", "").trim()
      : null;
    const email = emailArray.length
      ? emailArray[0].match(EMAIL_REGEX)[0]
      : null;
    return { cpf, oab, email };
  }
}

export default Pje1gTjbaParteScrapper;
