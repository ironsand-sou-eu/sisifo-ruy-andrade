import { useEffect } from "react";

export default function useErrorHandler(processoDraftedData, msgSetter) {
  useEffect(() => {
    handleAdaptedInfoErrors();
  }, [processoDraftedData]);

  function handleAdaptedInfoErrors() {
    if (!adaptedInfoHasErrors()) return;
    processoDraftedData.errorMsgs.forEach((errorMsg) => {
      msgSetter.addMsg({
        type: "fail",
        msg: errorMsg,
      });
    });
    return true;
  }

  function adaptedInfoHasErrors() {
    if (processoDraftedData?.hasErrors) return true;
    else return false;
  }

  return { adaptedInfoHasErrors };
}
