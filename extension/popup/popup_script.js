/**
 * Listener that loads when the DOM is loading/loaded.
 */
document.addEventListener("DOMContentLoaded", function () {
  const settingsButton = document.querySelector(".settings-button");
  settingsButton.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  changeStatus(true);
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
