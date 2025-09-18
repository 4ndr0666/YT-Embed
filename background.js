chrome.commands.onCommand.addListener((command) => {
  if (command === "modify_youtube_link") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let tab = tabs[0];
      if (tab.url.includes("youtube.com")) {
        let newUrl = tab.url.replace("youtube.com", "youtube.embed.com");
        chrome.tabs.update(tab.id, { url: newUrl });
      }
    });
  }
});
