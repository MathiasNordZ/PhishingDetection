/**
 * Content script that runs on web pages and analyzes links
 */

class LinkAnalyzer {
  constructor() {
    this.observer = null;
    this.isAnalyzing = false;
    this.processedUrls = new Set();
    this.highlightedUrls = new Set();
    this.debounceTimer = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.apiUrl = "http://127.0.0.1:8000/analyze";

    this.init();
  }

  init() {
    this.setupMutationObserver();
    this.startAnalysis();
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      // Check if any mutations actually added new content
      const hasNewContent = mutations.some(
        (mutation) =>
          mutation.type === "childList" && mutation.addedNodes.length > 0
      );

      if (hasNewContent) {
        this.debouncedAnalysis();
      }
    });
  }

  debouncedAnalysis() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.getAllUrls();
    }, 500); // Wait 500ms before analyzing
  }

  startAnalysis() {
    // Run when DOM is loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.getAllUrls());
    } else {
      // DOM is already loaded
      this.getAllUrls();
    }
  }

  getAllUrls() {
    if (this.isAnalyzing) {
      console.log("Analysis already in progress, skipping...");
      return;
    }

    this.isAnalyzing = true;
    const urls = new Set();

    try {
      // 1. Collect <a href="..."> links
      this.collectAnchorLinks(urls);

      // 2. Collect clickable elements that may act as links
      this.collectClickableElements(urls);

      // 3. Collect text that contains URLs
      this.collectTextUrls(urls);

      const urlArray = Array.from(urls).filter((url) => {
        try {
          new URL(url); // Validate URL
          return !this.processedUrls.has(url);
        } catch {
          return false;
        }
      });

      if (urlArray.length > 0) {
        console.log("Found new URLs:", urlArray);

        // Add to processed URLs
        urlArray.forEach((url) => this.processedUrls.add(url));

        // Send to extension popup/background
        this.sendToExtension(urlArray);

        // Check URLs with API
        this.checkUrls(urlArray);
      } else {
        console.log("No new URLs found");
        this.startObserving();
      }
    } catch (error) {
      console.error("Error during URL collection:", error);
      this.startObserving();
    } finally {
      this.isAnalyzing = false;
    }
  }

  collectAnchorLinks(urls) {
    const anchorTags = document.querySelectorAll("a[href]");
    anchorTags.forEach((anchor) => {
      try {
        const href = anchor.href;
        if (
          href &&
          (href.startsWith("http://") || href.startsWith("https://"))
        ) {
          urls.add(href);
        }
      } catch (error) {
        console.warn("Error processing anchor link:", error);
      }
    });
  }

  collectClickableElements(urls) {
    const clickableSelectors = [
      "[href]",
      "[onclick]",
      "button",
      '[role="link"]',
      "[tabindex]",
      "[data-href]",
      "[data-url]",
    ];

    const elements = document.querySelectorAll(clickableSelectors.join(","));

    elements.forEach((el) => {
      try {
        if (!this.isElementVisible(el)) return;

        const href = this.extractHrefFromElement(el);
        if (
          href &&
          (href.startsWith("http://") || href.startsWith("https://"))
        ) {
          urls.add(href);
        }
      } catch (error) {
        console.warn("Error processing clickable element:", error);
      }
    });
  }

  collectTextUrls(urls) {
    const urlRegex =
      /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g;
    const textNodes = this.getVisibleTextNodes();

    textNodes.forEach((node) => {
      try {
        const matches = node.nodeValue.match(urlRegex);
        if (matches) {
          matches.forEach((match) => {
            try {
              new URL(match); // Validate URL
              urls.add(match);
            } catch {
              // Invalid URL, skip
            }
          });
        }
      } catch (error) {
        console.warn("Error processing text node:", error);
      }
    });
  }

  isElementVisible(el) {
    try {
      const style = window.getComputedStyle(el);
      return !(
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity) === 0 ||
        el.offsetParent === null
      );
    } catch {
      return false;
    }
  }

  extractHrefFromElement(el) {
    return (
      el.getAttribute("href") ||
      el.getAttribute("data-href") ||
      el.getAttribute("data-url") ||
      this.extractUrlFromOnClick(el.getAttribute("onclick")) ||
      null
    );
  }

  extractUrlFromOnClick(onclickValue) {
    if (!onclickValue) return null;
    try {
      const match = onclickValue.match(/https?:\/\/[^\s'"]+/);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  getVisibleTextNodes() {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          try {
            const parent = node.parentNode;
            if (!parent) return NodeFilter.FILTER_REJECT;

            // Skip script, style, and other non-content elements
            const excludedTags = [
              "SCRIPT",
              "STYLE",
              "TEXTAREA",
              "INPUT",
              "IFRAME",
              "NOSCRIPT",
            ];
            if (excludedTags.includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if text is just whitespace
            if (!node.nodeValue.trim()) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if parent is not visible
            if (!this.isElementVisible(parent)) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          } catch {
            return NodeFilter.FILTER_REJECT;
          }
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  }

  sendToExtension(urlArray) {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.sendMessage
      ) {
        chrome.runtime.sendMessage(
          {
            type: "CLICKABLE_LINKS",
            data: urlArray,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Extension communication error:",
                chrome.runtime.lastError
              );
            }
          }
        );
      }
    } catch (error) {
      console.warn("Error sending message to extension:", error);
    }
  }

  async checkUrls(urlArray) {
    this.stopObserving();

    try {
      console.log("Checking URLs with API:", urlArray);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: urlArray }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      console.log("API Response:", json);

      this.processApiResponse(json);
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error("Error checking URLs:", error);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying... (${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.checkUrls(urlArray), 2000 * this.retryCount);
        return;
      } else {
        console.error("Max retries reached, giving up");
        this.retryCount = 0;
      }
    } finally {
      this.startObserving();
    }
  }

  processApiResponse(json) {
    try {
      console.log("Raw API Response:", json);

      // Handle the format: {"url": {"safe": false, "threat": {...}}}
      const matchedUrls = [];

      Object.entries(json).forEach(([url, result]) => {
        console.log(`Processing ${url}: safe=${result.safe}`);

        if (result.safe === false) {
          console.log("🚨 UNSAFE URL DETECTED:", url);
          matchedUrls.push(url);
        }
      });

      if (matchedUrls.length > 0) {
        console.log("Matched threat URLs:", matchedUrls);
        this.highlightMatchedUrls(matchedUrls);
      } else {
        console.log("No threat URLs found");
      }
    } catch (error) {
      console.error("Error processing API response:", error);
    }
  }

  highlightMatchedUrls(matchedUrls) {
    console.log("Starting highlight process for URLs:", matchedUrls);

    if (matchedUrls.length === 0) return;

    // Filter out already highlighted URLs
    const newUrls = matchedUrls.filter((url) => !this.highlightedUrls.has(url));
    if (newUrls.length === 0) {
      console.log("All URLs already highlighted");
      return;
    }

    const urlPatterns = newUrls.map((url) => ({
      url,
      pattern: this.escapeRegExp(url),
    }));

    console.log("Created regex patterns:", urlPatterns);

    this.highlightInLinks(urlPatterns);
    this.highlightInText(urlPatterns);

    // Mark URLs as highlighted
    newUrls.forEach((url) => this.highlightedUrls.add(url));
  }

  highlightInLinks(urlPatterns) {
    const links = document.querySelectorAll("a[href]");

    links.forEach((link) => {
      try {
        if (!this.isElementVisible(link)) return;

        const href = link.href;
        const matchingPattern = urlPatterns.find(({ url }) => href === url);

        if (matchingPattern) {
          this.applyThreatStyling(
            link,
            "This link has been identified as potentially malicious"
          );
        }
      } catch (error) {
        console.warn("Error highlighting link:", error);
      }
    });
  }

  highlightInText(urlPatterns) {
    const textNodes = this.getVisibleTextNodes();

    textNodes.forEach((node) => {
      try {
        if (!document.contains(node)) return;

        let originalText = node.nodeValue;
        let hasMatch = false;

        urlPatterns.forEach(({ url, pattern }) => {
          const regex = new RegExp(pattern, "gi");
          if (regex.test(originalText)) {
            hasMatch = true;
            const replaceRegex = new RegExp(pattern, "gi");
            originalText = originalText.replace(replaceRegex, (match) => {
              return `<span class="malicious-url-highlight" data-original-url="${match}" title="⚠️ CAUTION: This URL has been identified as potentially malicious. DO NOT CLICK!">${match}</span>`;
            });
          }
        });

        if (hasMatch) {
          this.replaceTextNode(node, originalText);
        }
      } catch (error) {
        console.warn("Error highlighting text node:", error);
      }
    });
  }

  replaceTextNode(node, htmlContent) {
    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      // Apply styling to highlighted spans
      const highlightedSpans = tempDiv.querySelectorAll(
        ".malicious-url-highlight"
      );
      highlightedSpans.forEach((span) => {
        this.applyThreatStyling(span, span.title);
      });

      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    } catch (error) {
      console.error("Error replacing text node:", error);
    }
  }

  applyThreatStyling(element, title) {
    element.style.cssText = `
      background-color: #ff4444 !important;
      color: white !important;
      font-weight: bold !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      text-decoration: none !important;
      border: 2px solid #cc0000 !important;
      box-shadow: 0 0 5px rgba(255, 68, 68, 0.5) !important;
      cursor: not-allowed !important;
      position: relative !important;
    `;

    element.title = title;

    // Prevent clicking on malicious links
    element.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        alert(
          "⚠️ This link has been blocked because it was identified as potentially malicious."
        );
      },
      true
    );
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  startObserving() {
    if (this.observer && document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
    }
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  destroy() {
    this.stopObserving();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// Initialize the link analyzer
let linkAnalyzer;

try {
  linkAnalyzer = new LinkAnalyzer();
} catch (error) {
  console.error("Failed to initialize LinkAnalyzer:", error);
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (linkAnalyzer) {
    linkAnalyzer.destroy();
  }
});

// Add CSS for malicious URL highlighting
const style = document.createElement("style");
style.textContent = `
  .malicious-url-highlight {
    background-color: #ff4444 !important;
    color: white !important;
    font-weight: bold !important;
    padding: 2px 4px !important;
    border-radius: 3px !important;
    border: 2px solid #cc0000 !important;
    box-shadow: 0 0 5px rgba(255, 68, 68, 0.5) !important;
    cursor: not-allowed !important;
    text-decoration: none !important;
  }
  
  .malicious-url-highlight:hover {
    background-color: #cc0000 !important;
    transform: scale(1.02) !important;
  }
`;
document.head.appendChild(style);
