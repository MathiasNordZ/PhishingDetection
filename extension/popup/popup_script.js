/**
 * Listener that loads when the DOM is loading/loaded.
 */
document.addEventListener("DOMContentLoaded", function () {
  const settingsButton = document.querySelector(".settings-button");
  settingsButton.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  changeStatus(true);
  getAllUrl();
});

/**
 * Function that changes the status message based on boolean values.
 *
 * @param {boolean} bool - True if safe, false in other cases.
 */
function changeStatus(bool) {
  const status = document.getElementById("status-message");
  if (bool) {
    status.innerHTML = "✅ Site is safe";
  } else {
    status.innerHTML = "⛔️ Site is unsafe";
  }
}

async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url) {
    await checkUrl([tab.url]);
  }
}

async function checkUrl(urlArray) {
  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      body: JSON.stringify({
        urls: urlArray,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();
    const matchedUrls = json.matches.map((entry) => entry.threat.url);

    // Check if current URL is in the matched threats
    const currentUrl = urlArray[0];
    const isSafe = !matchedUrls.includes(currentUrl);

    changeStatus(isSafe);

    return matchedUrls;
  } catch (error) {
    console.error("Error checking URL:", error);
    changeStatus(false);
  }
}
