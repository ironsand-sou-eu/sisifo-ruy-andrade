import { generateValidationMsg } from "../../exceptions/error-message-generator";

function useValidator(formData) {
  const warningMessages = [];
  if (!formData) return [warningMessages];
  const {
    assunto,
    gruposDeTrabalho,
    responsaveis,
    pastaCliente,
    partesRequerentes,
    partesRequeridas,
  } = formData;

  function validateAll() {
    if (assunto == null)
      warningMessages.push(generateValidationMsg.noSubject());
    if (gruposDeTrabalho == null)
      warningMessages.push(generateValidationMsg.noWorkgroup());
    if (!responsaveis?.length)
      warningMessages.push(generateValidationMsg.noLawyer());
    if (!pastaCliente)
      warningMessages.push(generateValidationMsg.noClientNumber());

    const allPartes = [...partesRequerentes, ...partesRequeridas];
    const clients = allPartes.filter(({ flagCliente }) => flagCliente == true);
    if (clients.length === 0)
      warningMessages.push(generateValidationMsg.noClient());
  }

  function prependGeneralWarning() {
    if (warningMessages.length > 0)
      warningMessages.unshift(generateValidationMsg.generalWarning());
  }

  validateAll();
  prependGeneralWarning();
  return [warningMessages];
}

export default useValidator;
