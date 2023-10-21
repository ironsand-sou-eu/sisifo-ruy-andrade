import Exception from "./Exception";

class ProcessoAlreadyExistsException extends Exception {
  constructor(codigoProcesso, numeroDoProcesso, msgSetter) {
    const errorMessage =
      `O processo <a href=https://app.projurisadv.com.br/casos/` +
      `processo/visao-completa/${codigoProcesso} target="_blank">${numeroDoProcesso}` +
      `</a> já está cadastrado.`;
    super(errorMessage, msgSetter);
  }
}

export default ProcessoAlreadyExistsException;
