export default function useLocation() {
  function formatCurrencyToPtBr(number, decimals = 2) {
    return number?.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function formatStringToNumber(string) {
    if (typeof string === "number") return string;
    const onlyDigitsString = string?.replace(/[^\d]/g, "");
    const number = parseFloat(onlyDigitsString);
    return isNaN(number) ? "" : number;
  }

  function formatDateToInputString(date) {
    if (!date) return null;
    return new Date(date).toISOString().substring(0, 10);
  }

  return {
    formatCurrencyToPtBr,
    formatStringToNumber,
    formatDateToInputString,
  };
}
