export default function useLocation() {
    function formatCurrencyToPtBr(number, decimals = 2) {
        return number?.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    }

    function formatStringToNumber(string) {
        if (typeof(string) === "number") return string
        const onlyDigitsString = string?.replace(/[^\d]/g,'')
        const number = parseFloat(onlyDigitsString)
        return isNaN(number) ? "" : number
    }

    function formatDateToInputString(date) {
        if (!date) return null
        date = new Date(date)
        const day = `${date.getDate()}`.padStart(2, "0")
        const month = `${date.getMonth() + 1}`.padStart(2, "0")
        const year = `${date.getFullYear()}`
        return `${year}-${month}-${day}`
    }

    return { formatCurrencyToPtBr, formatStringToNumber, formatDateToInputString }
}