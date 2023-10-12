export const REGEX_CNJ_NUMBER = /(\d{7}-\d{2}.\d{4}.)(\d)(.\d{2}.\d{4})/

export const operators = Object.freeze({
    sensitiveStrictEquality: "sensitiveStrictEquality",
    insensitiveStrictEquality: "insensitiveStrictEquality",
    insentiviveIncludes: "insentiviveIncludes",
    includes: "includes",
    numericEquality: "numericEquality"
})

export default function compareWithOperator(a, operator, b) {
    if (a === undefined || b === undefined) return false
    switch (operator) {
    case operators.sensitiveStrictEquality:
        return a === b
    case operators.insensitiveStrictEquality:
        return a.toString().toLowerCase() === b.toString().toLowerCase()
    case operators.insentiviveIncludes:
        return a.toLowerCase().includes(b.toLowerCase())
    case operators.includes:
        return a.includes(b)
    case operators.numericEquality:
        return Number(a) === Number(b)
    }
}

export function debounce(cb, delay = 250) {
    let timeOut
    return (...args) => {
        clearTimeout(timeOut)
        timeOut = setTimeout(() => {
            cb(...args)
        }, delay)
    }
}