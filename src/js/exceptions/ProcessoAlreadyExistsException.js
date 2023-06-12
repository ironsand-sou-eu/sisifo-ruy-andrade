import Exception from "./Exception"

class ProcessoAlreadyExistsException
    extends Exception
{
    constructor(codigoProcesso, numeroProcesso, msgSetter) {
        const errorMessage = `O processo <a href=https://app.projurisadv.com.br/casos/`
            + `processo/visao-completa/${codigoProcesso} target="_blank">${numeroProcesso}`
            + `</a> já está cadastrado.`
        super(errorMessage, msgSetter)
    }
}

export default ProcessoAlreadyExistsException