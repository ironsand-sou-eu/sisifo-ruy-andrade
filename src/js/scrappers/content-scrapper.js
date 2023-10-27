import ProjudiTjbaProcessoScrapper from "./scrappers/ProjudiTjbaProcessoScrapper";
import Pje1gTjbaProcessoScrapper from "./scrappers/Pje1gTjbaProcessoScrapper";
import Pje1gTrt5ProcessoScrapper from "./scrappers/Pje1gTrt5ProcessoScrapper";

const DOMAINS = [
  {
    name: "TjBaProjudi",
    hostname: "projudi.tjba.jus.br",
    scrapper: ProjudiTjbaProcessoScrapper,
  },
  {
    name: "TjBaPje1g",
    hostname: "pje.tjba.jus.br",
    scrapper: Pje1gTjbaProcessoScrapper,
  },
  {
    name: "Trt5Pje1g",
    hostname: "pje.trt5.jus.br",
    scrapper: Pje1gTrt5ProcessoScrapper,
  },
];

export default function identifyCorrectScrapper() {
  const found = DOMAINS.filter(
    domainObj => domainObj.hostname === new URL(document.URL).hostname
  );
  if (found.length === 0) return null;
  return found[0].scrapper;
}

export function pjeLoadFullTimeline(conditionsCb = true) {
  (function () {
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
      { hostname: getDomain("TjBaPje1g"), pathnamePartial: "ConsultaProcesso" },
      { hostname: getDomain("Trt5Pje1g"), pathnamePartial: "/detalhe" },
    ];

    return PJE_DOMAIN_CONDITIONS_FOR_LOADING.some(courtConditions => {
      return (
        urlObj.hostname === courtConditions.hostname &&
        urlObj.pathname.includes(courtConditions.pathnamePartial)
      );
    });
  }

  function getDomain(name) {
    const found = DOMAINS.filter(domainObj => domainObj.name === name);
    if (found.length === 0) return null;
    return found[0].domain;
  }
}
