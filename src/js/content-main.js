import NotProcessoHomepageException from "./exceptions/NotProcessoHomepageException"
import Pje1gTjbaProcessoScrapper from "./scrappers/Pje1gTjbaProcessoScrapper"
import ProjudiTjbaProcessoScrapper from "./scrappers/ProjudiTjbaProcessoScrapper"

const DOMAINS = {
    TJBA: {
        projudi: "projudi.tjba.jus.br",
        pje1g: "pje.tjba.jus.br"
    }
}

const SCRAPPERS = {
    "projudi.tjba.jus.br": ProjudiTjbaProcessoScrapper,
    "pje.tjba.jus.br": Pje1gTjbaProcessoScrapper
}

const urlObj = new URL(document.URL);

(function() {
    if (urlObj.hostname === DOMAINS.TJBA.pje1g && urlObj.pathname.includes('ConsultaProcesso')) {
        const pjeFullPageLoader = document.createElement('script')
        pjeFullPageLoader.src = chrome.runtime.getURL('timelineLoader.js')
        pjeFullPageLoader.type = "module"
        pjeFullPageLoader.defer = true
        document.head.appendChild(pjeFullPageLoader)
    }
})()

chrome.runtime.sendMessage({
        from: "sisifoContent",
        url: urlObj
    },
    () => {}
)

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.from === "sisifoWorker" && msg.subject === "attempted-start-scrapping") {
        try {
            const scrapper = identifyCorrectScrapper()
            if (!scrapper.checkProcessoHomepage(document.URL)) return
            scrapper.fetchProcessoInfo()
                .then(processoInfo => {
                    sendResponse(processoInfo)
                })
            return true
        } catch (e) {
            if(!(e instanceof NotProcessoHomepageException)) console.error(e)
        }
    }
})

function identifyCorrectScrapper() {
    const url = new URL(document.URL)
    return SCRAPPERS[url.hostname]
}

export default DOMAINS