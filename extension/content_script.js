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

  // 3. Collect text that contains http or https.
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return; // Skip invisible
    }

    const matches = el.innerText.match(urlRegex);
    if (matches) {
      matches.forEach((match) => urls.add(match));
    }
  });

  const urlArray = Array.from(urls);
  console.log("Found URLs:", urlArray);

  // Optionally send to background/popup
  chrome.runtime.sendMessage({ type: "CLICKABLE_LINKS", data: urlArray });

  console.log("Checking URLS to GoogleAPI");
  checkUrls(urlArray);
}

// Declare observer at the top so it's accessible everywhere
let observer = null;

// Now assign it properly
observer = new MutationObserver(() => {
  getAllUrls();
});

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
  }
}

function reconnectObserver() {
  if (observer) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
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

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

function checkUrls(urlArray) {
  disconnectObserver();
  fetch("http://127.0.0.1:8000/analyze", {
    method: "POST",
    body: JSON.stringify({
      urls: urlArray,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((json) => {
      const matchedUrls = json.matches.map((entry) => entry.threat.url);
      console.log("Matched threat URLs:", matchedUrls);
      highlightMatchedUrls(matchedUrls);
    });
}

function highlightMatchedUrls(matchedUrls) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        const parent = node.parentNode;
        const style = window.getComputedStyle(parent);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "IFRAME"].includes(
            parent.tagName
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false
  );

  const urlRegexes = matchedUrls.map((url) => ({
    url,
    regex: new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), // escape regex chars
  }));

  let node;
  while ((node = walker.nextNode())) {
    let originalText = node.nodeValue;
    let replaced = false;

    urlRegexes.forEach(({ url, regex }) => {
      if (regex.test(originalText)) {
        replaced = true;
        originalText = originalText.replace(
          regex,
          `<span class="url-highlight" style="background-color: red !important; color: white; font-weight: bold;" title="CAUTION! Link has been flagged as a threat. DO NOT CLICK!">${url}</span>`
        );
      }
    });

    if (replaced) {
      const span = document.createElement("span");
      span.innerHTML = originalText;
      node.parentNode.replaceChild(span, node);
    }
  }
  reconnectObserver();
}
