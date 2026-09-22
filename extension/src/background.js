// Right-click menus. The choice is parked in session storage and the popup
// picks it up when it opens.

import { SERVER } from "./config.js";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: "image", title: "add this image to wardrobe", contexts: ["image"] });
  chrome.contextMenus.create({ id: "link", title: "add linked product to wardrobe", contexts: ["link"] });
  chrome.contextMenus.create({ id: "page", title: "add this page to wardrobe", contexts: ["page"] });

  // the extension rides on the wardrobe sign-in, so start people there
  if (reason === "install") chrome.tabs.create({ url: `${SERVER}/studio` });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const pending =
    info.menuItemId === "image" && info.srcUrl ? { image: info.srcUrl } :
    info.menuItemId === "link" && info.linkUrl ? { link: info.linkUrl } :
    {};
  await chrome.storage.session.set({ pending });
  try {
    await chrome.action.openPopup();
  } catch {
    // Chrome before 127 can't open the popup from here — nudge a toolbar click
    chrome.action.setBadgeText({ text: "✦" });
    chrome.action.setBadgeBackgroundColor({ color: "#14161b" });
  }
});
