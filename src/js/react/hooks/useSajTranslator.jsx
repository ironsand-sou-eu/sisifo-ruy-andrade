function useSajTranslator() {
    function insertValueLabel(object) {
        if (!object) return object
        if (Array.isArray(object)) return object.map(obj => insertValueLabel(obj))
        return {
            ...object,
            value: object.chave ?? object.codigoAssunto,
            label: object.valor ?? object.nomeAssunto
        }
    }
    
    function removeValueLabel(object) {
        if (!object) return object
        if (Array.isArray(object)) return object.map(obj => removeValueLabel(obj))
        const { value, label, ...others } = object
        return others
    }
    
    
    return { insertValueLabel, removeValueLabel }
}

export default useSajTranslator