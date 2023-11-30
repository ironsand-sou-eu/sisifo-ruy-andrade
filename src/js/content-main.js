import {
  identifyCorrectScrapper,
  NotProcessoHomepageException,
} from "brazilian-courts-scrappers";

chrome.runtime.sendMessage(
  {
    from: "sisifoContent",
    url: new URL(document.URL),
  },
  () => {}
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.subject === "attempted-start-scrapping") {
    try {
      const scrapperClass = identifyCorrectScrapper(document);
      const scrapper = new scrapperClass(document);
      if (!scrapper.checkProcessoHomepage()) return;
      scrapper
        .fetchProcessoInfo()
        .then(processoInfo => {
          sendResponse(processoInfo);
        })
        .catch(e => sendResponse(e));
    } catch (e) {
      if (!(e instanceof NotProcessoHomepageException)) sendResponse(e);
    }
    return true;
  }
});

(function pjeLoadFullTimeline() {
  const conditionsCb =
    typeof conditionsCb === "function" ? conditionsCb() : true;
  if (conditionsCb && conditionsForPjeFullLoading()) {
    const pjeFullPageLoader = document.createElement("script");
    pjeFullPageLoader.src = chrome.runtime.getURL("timelineLoader.js");
    pjeFullPageLoader.type = "module";
    pjeFullPageLoader.defer = true;
    document.head.appendChild(pjeFullPageLoader);
  }
})();

function conditionsForPjeFullLoading() {
  const urlObj = new URL(document.URL);

  const PJE_DOMAIN_CONDITIONS_FOR_LOADING = [
    { hostname: "pje.tjba.jus.br", pathnamePartial: "ConsultaProcesso" },
    { hostname: "pje.trt5.jus.br", pathnamePartial: "/detalhe" },
  ];

  return PJE_DOMAIN_CONDITIONS_FOR_LOADING.some(courtConditions => {
    return (
      urlObj.hostname === courtConditions.hostname &&
      urlObj.pathname.includes(courtConditions.pathnamePartial)
    );
  });
}
