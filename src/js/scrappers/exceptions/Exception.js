class Exception {
  constructor(
    errorMessages = "Ocorreu um imprevisto e o programa será encerrado",
    msgSetter = undefined
  ) {
    if (!msgSetter) {
      throw errorMessages;
    } else {
      if (!Array.isArray(errorMessages)) errorMessages = [errorMessages];
      errorMessages.forEach(errMsg => {
        msgSetter.clear({ type: "processing" });
        msgSetter.addMsg({ type: "fail", msg: errMsg });
      });
    }
  }
}

export default Exception;
