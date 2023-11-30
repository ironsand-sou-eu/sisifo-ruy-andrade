import Drafter from "./adapters/drafter";
import Exception from "./exceptions/Exception";
import useGoogleSheets from "./react/hooks/connectors/useGoogleSheets";

const { fetchGoogleToken } = useGoogleSheets();

const tribunalDomainsToScrappe = [
  "projudi.tjba.jus.br",
  "pje.tjba.jus.br",
  "pje.trt5.jus.br",
];

chrome.runtime.onInstalled.addListener(() => chrome.action.disable());

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === "sisifoContent" && msg.url) {
    if (urlEnablesAction(msg.url) && sender.tab) {
      chrome.action.enable(sender.tab.id);
    }
    sendResponse("dummy message to avoid error logging");
  } else if (
    msg.from === "sisifoPopup" &&
    msg.subject === "query-processo-info-to-show"
  ) {
    startScrapping(sendResponse);
    return true;
  }
});

function urlEnablesAction(activeUrl) {
  return tribunalDomainsToScrappe.some(tribunalSiteUrl =>
    activeUrl.includes(tribunalSiteUrl)
  );
}

function startScrapping(sendResponse) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
    chrome.tabs.sendMessage(
      tab.id,
      {
        from: "sisifoWorker",
        subject: "attempted-start-scrapping",
        tabId: tab.id,
      },
      async processoInfo => {
        try {
          if (!processoInfo) {
            throw new Error(
              "Talvez você não esteja na página inicial de um processo."
            );
          } else if (typeof processoInfo === "string") {
            throw new Error(processoInfo);
          }
          const token = await fetchGoogleToken();
          const processoInfoAdapter = new Drafter(processoInfo, token);
          sendResponse(await processoInfoAdapter.draftProcessoInfo());
        } catch (err) {
          err = { message: err };
          const msg = `Ocorreu um erro: ${err.message}<br />${err.stack ?? ""}`;
          sendResponse({ hasErrors: true, errorMsgs: [msg] });
        }
      }
    );
  });
}
