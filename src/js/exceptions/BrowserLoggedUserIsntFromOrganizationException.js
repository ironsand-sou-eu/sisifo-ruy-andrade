import Exception from "./Exception";

class BrowserLoggedUserIsntFromOrganizationException extends Exception {
  constructor() {
    const errorMessage =
      "O usuário logado no navegador deve pertencer à organização.";
    super(errorMessage);
  }
}

export default BrowserLoggedUserIsntFromOrganizationException;
