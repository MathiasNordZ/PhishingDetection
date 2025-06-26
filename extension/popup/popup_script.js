
/**
 * Event listener for the settings button in the popup.
 * When clicked, it opens the options page of the extension.
 */
document.addEventListener("DOMContentLoaded", function () {
  const settingsButton = document.querySelector(".settings-button");
  settingsButton.addEventListener("click", chrome.runtime.openOptionsPage());
});