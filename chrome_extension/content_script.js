/**
 * Made in America Highlighter — content script
 *
 * Runs on amazon.com. Handles two contexts:
 *   1. Product detail page  — highlights Brand / Manufacturer fields
 *   2. Search results page  — badges each result card whose brand matches
 *
 * Depends on COMPANIES_MAP injected by data/companies.js
 */

// ── normalization (must match build_extension_data.py logic) ─────────────────

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Given a brand string from Amazon, try progressively shorter prefixes
 * until we find a match in COMPANIES_MAP, or return null.
 */
function lookup(brandText) {
  if (!brandText) return null;
  const words = normalize(brandText).split(" ").filter(Boolean);

  // Try longest match first, down to 1 word
  for (let len = words.length; len >= 1; len--) {
    const key = words.slice(0, len).join(" ");
    if (key.length < 3) continue;
    if (COMPANIES_MAP[key]) return COMPANIES_MAP[key];
  }
  return null;
}

// ── badge helpers ─────────────────────────────────────────────────────────────

function makeBadge(company) {
  const badge = document.createElement("span");
  badge.className = "mia-badge";
  badge.title = `${company.source} · ${company.category || ""}`.replace(/ · $/, "");
  badge.textContent = "🇺🇸 Made in America";
  if (company.website) {
    badge.style.cursor = "pointer";
    badge.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(company.website, "_blank", "noopener");
    });
  }
  return badge;
}

function markElement(el, company) {
  if (el.dataset.miaChecked) return;
  el.dataset.miaChecked = "1";
  el.classList.add("mia-highlight");
  el.appendChild(makeBadge(company));
}

// ── product detail page ───────────────────────────────────────────────────────
// Amazon renders brand/manufacturer in several different layouts depending on
// the category. We try all known locations.

function getBrandFromDetailPage() {
  const candidates = [];

  // Layout A: <span id="bylineInfo"> "Visit the Speed Queen Store" or "Brand: X"
  const byline = document.querySelector("#bylineInfo");
  if (byline) candidates.push(byline.textContent);

  // Layout B: product overview table  .po-brand .po-break-word
  const pooBrand = document.querySelector(".po-brand .po-break-word");
  if (pooBrand) candidates.push(pooBrand.textContent);

  // Layout C: tech spec table  #productDetails_techSpec_section_1
  document.querySelectorAll(
    "#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr"
  ).forEach((tr) => {
    const th = tr.querySelector("th");
    const td = tr.querySelector("td");
    if (th && td) {
      const label = th.textContent.trim().toLowerCase();
      if (label === "brand" || label === "manufacturer") {
        candidates.push(td.textContent);
      }
    }
  });

  // Layout D: detail bullets  #detailBullets_feature_div
  document.querySelectorAll("#detailBullets_feature_div li").forEach((li) => {
    const spans = li.querySelectorAll("span");
    if (spans.length >= 2) {
      const label = spans[0].textContent.trim().toLowerCase().replace(/:$/, "");
      if (label === "brand" || label === "manufacturer") {
        candidates.push(spans[1].textContent);
      }
    }
  });

  // Layout E: #brand input (hidden field Amazon sometimes uses)
  const brandInput = document.querySelector("#brand");
  if (brandInput) candidates.push(brandInput.value || brandInput.textContent);

  return candidates.map((t) => t.trim()).filter(Boolean);
}

function handleDetailPage() {
  const brands = getBrandFromDetailPage();
  if (!brands.length) return;

  let matched = null;
  let matchedBrand = null;
  for (const brand of brands) {
    // Strip "Visit the X Store" pattern
    const cleaned = brand
      .replace(/^visit the\s+/i, "")
      .replace(/\s+store$/i, "")
      .replace(/^brand[:\s]+/i, "")
      .replace(/^manufacturer[:\s]+/i, "")
      .trim();
    matched = lookup(cleaned);
    if (matched) { matchedBrand = cleaned; break; }
  }

  if (!matched) return;

  // Highlight the page title area
  const titleEl = document.querySelector("#productTitle, #title");
  if (titleEl) markElement(titleEl, matched);

  // Also highlight byline
  const byline = document.querySelector("#bylineInfo");
  if (byline) markElement(byline, matched);

  // Add a prominent banner below the title
  const titleBlock = document.querySelector("#titleSection, #title_feature_div");
  if (titleBlock && !titleBlock.dataset.miaBanner) {
    titleBlock.dataset.miaBanner = "1";
    const banner = document.createElement("div");
    banner.className = "mia-banner";
    banner.innerHTML = `
      <span class="mia-banner-flag">🇺🇸</span>
      <span class="mia-banner-text">
        <strong>${matched.name}</strong> is a Made in America brand
        ${matched.category ? `· <em>${matched.category}</em>` : ""}
      </span>
      ${matched.website
        ? `<a class="mia-banner-link" href="${matched.website}" target="_blank" rel="noopener">
             Visit brand site ↗
           </a>`
        : ""}
    `;
    titleBlock.insertAdjacentElement("afterend", banner);
  }
}

// ── search results page ───────────────────────────────────────────────────────

function getBrandFromCard(card) {
  const candidates = [];

  // Brand byline directly in result card
  const byline = card.querySelector(".s-title-instructions-style span, [data-cy='title-recipe-brand']");
  if (byline) candidates.push(byline.textContent);

  // Sponsored / brand display
  const brandRow = card.querySelector(".s-brand-name, [class*='brand']");
  if (brandRow) candidates.push(brandRow.textContent);

  // Product title — brand often leads the title
  const titleEl = card.querySelector("h2 a span, h2 span");
  if (titleEl) {
    // Take only the first token(s) before a dash or comma as a fallback
    const titleText = titleEl.textContent.split(/[-,|]/)[0];
    candidates.push(titleText);
  }

  return candidates.map((t) => t.trim()).filter(Boolean);
}

function handleSearchResults() {
  const cards = document.querySelectorAll(
    '[data-component-type="s-search-result"]:not([data-mia-checked])'
  );
  cards.forEach((card) => {
    card.dataset.miaChecked = "1";
    const brands = getBrandFromCard(card);
    for (const brand of brands) {
      const company = lookup(brand);
      if (company) {
        card.classList.add("mia-card-highlight");
        const titleEl = card.querySelector("h2 a span, h2 span");
        if (titleEl) markElement(titleEl, company);
        break;
      }
    }
  });
}

// ── page detection & mutation observer ───────────────────────────────────────

function isDetailPage() {
  return !!document.querySelector("#productTitle, #title, #dp");
}

function isSearchPage() {
  return !!document.querySelector('[data-component-type="s-search-result"]');
}

function run() {
  if (isDetailPage()) handleDetailPage();
  if (isSearchPage()) handleSearchResults();
}

// Run on initial load
run();

// Re-run when Amazon dynamically loads content (infinite scroll, SPA nav)
const observer = new MutationObserver(() => {
  if (isSearchPage()) handleSearchResults();
});
observer.observe(document.body, { childList: true, subtree: true });
