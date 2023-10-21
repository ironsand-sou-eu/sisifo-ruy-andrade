import ParteDataStructure from "../data-structures/ParteDataStructure";
import NotProcessoHomepageException from "../exceptions/NotProcessoHomepageException";
import { tiposParte } from "../utils/enumsAndHardcoded";

class Pje1gTjbaParteScrapper {
  static #PJE_OAB_REGEX = /OAB [A-Z]{2}\d{4,}/;
  static #divPoloAtivoTbody;
  static #divPoloPassivoTbody;

  /**
   * @returns {ParteDataStructure[]}
   */
  static fetchParticipantesInfo(parteTypeToScrappe) {
    try {
      this.#loadPageCheckpoints();
      return this.#getPartes(parteTypeToScrappe);
    } catch (e) {
      if (!(e instanceof NotProcessoHomepageException)) console.error(e);
    }
  }

  static #loadPageCheckpoints() {
    this.#divPoloAtivoTbody = document.querySelector(
      "#poloAtivo > table > tbody",
    );
    this.#divPoloPassivoTbody = document.querySelector(
      "#poloPassivo > table > tbody",
    );
  }

  /**
   * @returns {ParteDataStructure[]}
   */
  static #getPartes(parteTypeToScrappe) {
    switch (parteTypeToScrappe) {
      case tiposParte.requerente:
        return this.#getCompletePartes(
          this.#divPoloAtivoTbody,
          tiposParte.requerente,
        );
      case tiposParte.requerido:
        return this.#getCompletePartes(
          this.#divPoloPassivoTbody,
          tiposParte.requerido,
        );
      case "outros":
        return [];
    }
  }

  static #getCompletePartes(partesWrapperTbody, tipoDeParte) {
    const partes = this.#getPartesWithoutEnderecos(
      partesWrapperTbody,
      tipoDeParte,
    );
    return partes;
  }

  static #getPartesWithoutEnderecos(tbody, tipoDeParte) {
    const partes = [];
    tbody.querySelectorAll(":scope > tr").forEach((tr) => {
      const parte = new ParteDataStructure();
      const parteString = tr
        .querySelector("td:nth-child(1) > span:nth-child(1) > span")
        .textContent.trim();
      parte.nome = this.#getNameFromPje1gTjbaParteString(parteString);
      const cpfCnpj = this.#getCpfCnpjFromPje1gTjbaParteString(parteString);
      this.#putCpfCnpjToParte(cpfCnpj, parte);
      parte.tipoDeParte = tipoDeParte;
      this.#pushAdvogadosToParte(tr, parte);
      partes.push(parte);
    });
    return partes;
  }

  static #getNameFromPje1gTjbaParteString(parteString) {
    const stringWithoutParteType = parteString
      .replace(/ \([A-Za-z]*\)$/, "")
      .trim();
    const nameWithoutCpfCnpj = stringWithoutParteType
      .replace(
        /(CPF: \d{3}\x2E\d{3}\x2E\d{3}\x2D\d{2})|(CNPJ: \d{2}.\d{3}.\d{3}\/\d{4}-\d{2})$/,
        "",
      )
      .replace(/ - $/, "");
    const nameWithoutOab = nameWithoutCpfCnpj
      .replace(this.#PJE_OAB_REGEX, "")
      .replace(/ - $/, "");
    return nameWithoutOab;
  }

  static #getCpfCnpjFromPje1gTjbaParteString(parteString) {
    const cpfCnpj = parteString.match(
      /(\d{3}\x2E\d{3}\x2E\d{3}\x2D\d{2})|(\d{2}.\d{3}.\d{3}\/\d{4}-\d{2})/,
    );
    return cpfCnpj ? cpfCnpj[0] : null;
  }

  static #getOabFromPje1gTjbaParteString(parteString) {
    const oab = parteString.match(this.#PJE_OAB_REGEX);
    if (!oab) return null;
    return oab[0].replace("OAB ", "");
  }

  static #putCpfCnpjToParte(cpfCnpj, parte) {
    if (!cpfCnpj) {
      parte.dontHaveCpfCnpj = true;
      parte.noCpfCnpjReason = "Não cadastrado no PJe";
      return;
    }
    const dashDotSlashStrippedString = cpfCnpj.replaceAll(
      /(\-)|(\.)|(\/)/g,
      "",
    );
    if (cpfCnpj.length === 14 && dashDotSlashStrippedString.length === 11)
      parte.cpf = cpfCnpj;
    if (cpfCnpj.length === 18 && dashDotSlashStrippedString.length === 14)
      parte.cnpj = cpfCnpj;
  }

  static #pushAdvogadosToParte(parteWrapperTr, parte) {
    const advogadosLists = parteWrapperTr.querySelectorAll(":scope > td > ul");
    const advogadosLis = Array.from(advogadosLists)
      .map((ulList) => ulList.querySelectorAll(":scope > li"))
      .flat()[0];
    let advogado = "";
    parte.advogados = [];
    if (advogadosLis == undefined) return;
    Array.from(advogadosLis).forEach((li) => {
      const advString = li
        .querySelector(":scope > small > span > span")
        .textContent.trim();
      advogado = new ParteDataStructure();
      advogado.nome = this.#getNameFromPje1gTjbaParteString(advString);
      advogado.cpf = this.#getCpfCnpjFromPje1gTjbaParteString(advString);
      advogado.oab = this.#getOabFromPje1gTjbaParteString(advString);
      advogado.tipoDeParte = tiposParte.advogado;
      parte.advogados.push(advogado);
    });
  }
}

export default Pje1gTjbaParteScrapper;
