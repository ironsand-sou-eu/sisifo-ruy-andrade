async function loadEntireTimeline(fullLoad) {
    const autoloadPagesMaxQuantity = 4
    const pagesTotal = parseInt(document.querySelector("#totalPaginas").getAttribute("value"))
    const currentPage = parseInt(document.querySelector("#paginaAtual").getAttribute("value"))
    if (currentPage >= pagesTotal) return
    if (pagesTotal > autoloadPagesMaxQuantity) {
        fullLoad = fullLoad ?? confirm(`O processo tem ${pagesTotal} páginas. Deseja `
            + `carregar todas de imediato?`)
        if (!fullLoad) return
    }
    novaPagina()
    while (newCurrentPage !== currentPage + 1) {
        await new Promise(resolve => setTimeout(resolve, 250))
        var newCurrentPage = parseInt(document.querySelector("#paginaAtual").getAttribute("value"))
    }
    await loadEntireTimeline(true)
}

loadEntireTimeline()