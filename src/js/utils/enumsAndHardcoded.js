export const hardcoded = Object.freeze({
    tipoResponsavelPagamento : "CLIENTE",
    tipoLancamentoFinanceiro : "RECEITA",
    formaPagamento: "TRANSFERENCIA",
    numeroParcelas: 1,
    unidadeOrganizacional: {
        chave: 37221,
        valor: "Ruy Andrade Advocacia Empresarial"
    },
    favorecido: {
        chave: 3326088,
        valor: "RUY ANDRADE ADVOCACIA EMPRESARIAL"
    },
    planoConta: {
        chave: 357418,
        valor: "Receita de Prestação de Serviços"
    },
    tiposDocumento: {
        notaFiscal: {
            chave: 2,
            valor: "Nota Fiscal"
        }
    },
    condicoesPagamento: {
        aVista: {
            chave: 1,
            valor: "À vista"
        }
    },
    contas: {
        inter: {
            chave: 4362,
            valor: "INTER"
        }
    }
})

export const tiposParte = Object.freeze({
    requerente: 'autor',
    requerido: 'réu',
    testemunha: 'testemunha',
    terceiro: 'terceiro',
    advogado: 'advogado contrário',
    juiz: 'magistrado',
    perito: 'perito',
    assistente: 'assistente',
    administrador: 'administrador',
    servidor: 'servidor'
})

export const projurisTipoEnvolvidoType = Object.freeze({
    requerente: 'PARTE_ATIVA',
    requerido: 'PARTE_PASSIVA',
    terceiro: 'TERCEIRO',
    assistente: 'ASSISTENTE',
    fiscal: 'FISCAL',
    testemunha: 'TESTEMUNHA',
    vitima: 'VITIMA',
    outros: 'OUTROS',
    advogado: 'OUTROS',
    juiz: 'OUTROS',
    perito: 'OUTROS',
    administrador: 'OUTROS',
    servidor: 'OUTROS'

})

export const tiposPedido = Object.freeze({
    danoMoral: 'Indenização por danos morais',
    danoMaterial: 'Indenizaçao por danos materiais',
    cancelamentoContrato: 'Cancelamento de contrato',
    desconstituicaoDebito: 'Desconstituição de débito',
    restituicao: 'Restituição',
    devolucaoEmDobro: 'Devolução em dobro',
    parcelamento: 'Realização de parcelamento'
})

export const tiposContingencia = Object.freeze({
    provavel: 'Provável',
    possivel: 'Possível',
    remoto: 'Remoto'
})

export const sistemas = Object.freeze({
    tjbaProjudi: 'projudiTjba',
    tjba: 'Possível'
})

export const prognosticoOptions = [
    { value: "PROVAVEL", label: "Provável" },
    { value: "POSSIVEL", label: "Possível" },
    { value: "REMOTO", label: "Remoto" }
]

