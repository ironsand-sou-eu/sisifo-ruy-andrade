const REGEX_CNJ_NUMBER = /(\d{7}-\d{2}.\d{4}.)(\d)(.\d{2}.\d{4})/

function compareWithOperator(a, operator, b) {
    if (a === undefined || b === undefined) return false
    switch (operator) {
    case "sensitiveStrictEquality":
        return a === b
    case "insensitiveStrictEquality":
        return a.toString().toLowerCase() === b.toString().toLowerCase()
    case "insentiviveIncludes":
        return a.toLowerCase().includes(b.toLowerCase())
    case "includes":
        return a.includes(b)
    }
}

function debounce(cb, delay = 250) {
    let timeOut
    return (...args) => {
        clearTimeout(timeOut)
        timeOut = setTimeout(() => {
            cb(...args)
        }, delay)
    }
}

export default compareWithOperator
export { debounce, REGEX_CNJ_NUMBER }