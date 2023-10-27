import Exception from "./Exception";

class NotProcessoHomepageException extends Exception {
  constructor(url) {
    const errorMessage = `A página ${url} não é uma página inicial de processo.`;
    super(errorMessage);
  }
}

export default NotProcessoHomepageException;
