/**
 * Content script that runs on web pages and analyzes links
 */
function getAllUrls() {
  const urls = new Set();

  // 1. Collect <a href="..."> links
  const anchorTags = document.querySelectorAll("a[href]");
  anchorTags.forEach((a) => {
    if (a.href && a.href.startsWith("http")) {
      urls.add(a.href);
    }
  });

  // 2. Collect clickable elements that may act as links
  const allElements = document.querySelectorAll("*");
  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return; // Skip invisible elements
    }

    const hasHref = el.hasAttribute("href");
    const hasOnClick = el.hasAttribute("onclick");
    const isButton = el.tagName === "BUTTON";
    const isLinkTag = el.tagName === "A";
    const hasRoleLink = el.getAttribute("role") === "link";
    const hasTabIndex = el.hasAttribute("tabindex");

    if (
      hasHref ||
      hasOnClick ||
      isButton ||
      isLinkTag ||
      hasRoleLink ||
      hasTabIndex
    ) {
      // Try to extract a link-like value
      const href =
        el.getAttribute("href") ||
        el.getAttribute("data-href") ||
        extractUrlFromOnClick(el.getAttribute("onclick")) ||
        null;

      if (href && href.startsWith("http")) {
        urls.add(href);
      }
    }
  });

  const urlArray = Array.from(urls);
  console.log("Found URLs:", urlArray);

  // Optionally send to background/popup
  chrome.runtime.sendMessage({ type: "CLICKABLE_LINKS", data: urlArray });

  return urlArray;
}

// Helper to extract URLs from inline onclick handlers
function extractUrlFromOnClick(onclickValue) {
  if (!onclickValue) return null;
  const match = onclickValue.match(/https?:\/\/[^\s'"]+/);
  return match ? match[0] : null;
}

// Run when DOM is loaded
document.addEventListener("DOMContentLoaded", getAllUrls);

// Run immediately if already loaded
if (document.readyState !== "loading") {
  getAllUrls();
}

// Observe SPA or dynamically-loaded changes
const observer = new MutationObserver(() => {
  getAllUrls();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
