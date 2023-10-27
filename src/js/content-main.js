import identifyCorrectScrapper, {
  pjeLoadFullTimeline,
} from "./scrappers/content-scrapper";

identifyCorrectScrapper();
pjeLoadFullTimeline();

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
      const scrapper = identifyCorrectScrapper();
      if (!scrapper.checkProcessoHomepage(document.URL)) return;
      scrapper.fetchProcessoInfo().then(processoInfo => {
        sendResponse(processoInfo);
      });
    } catch (e) {
      sendResponse(e);
    }
    return true;
  }
});
