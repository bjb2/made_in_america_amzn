// Populate stats from the bundled COMPANIES_MAP
document.addEventListener("DOMContentLoaded", () => {
  if (typeof COMPANIES_MAP !== "undefined") {
    const keys = Object.keys(COMPANIES_MAP);
    const uniqueCompanies = new Set(
      keys.map((k) => COMPANIES_MAP[k].raw_name || COMPANIES_MAP[k].name)
    ).size;
    document.getElementById("stat-companies").textContent =
      uniqueCompanies.toLocaleString();
    document.getElementById("stat-keys").textContent =
      keys.length.toLocaleString();
  }

  // Query the active tab to see if the content script found a match
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab || !tab.url || !tab.url.includes("amazon.com")) return;

    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          // Ask the content script what it found via a DOM marker
          const banner = document.querySelector(".mia-banner");
          if (!banner) return null;
          const nameEl = banner.querySelector("strong");
          const catEl  = banner.querySelector("em");
          const linkEl = banner.querySelector("a");
          return {
            name:     nameEl ? nameEl.textContent : null,
            category: catEl  ? catEl.textContent  : null,
            website:  linkEl ? linkEl.href         : null,
          };
        },
      },
      ([result]) => {
        if (chrome.runtime.lastError || !result || !result.result) return;
        const { name, category, website } = result.result;
        const el = document.getElementById("match-info");
        el.innerHTML = `
          <div class="match-name">${name}</div>
          ${category ? `<div class="match-category">${category}</div>` : ""}
          ${website
            ? `<div><a href="${website}" target="_blank" rel="noopener">
                 ${website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
               </a></div>`
            : ""}
          <div class="match-source">✓ Verified Made in America</div>
        `;
      }
    );
  });
});
