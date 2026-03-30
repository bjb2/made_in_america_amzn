# Made in America — Amazon Highlighter

A Chrome extension that identifies and highlights Made in America brands while you shop on Amazon.

## What it does

- **Product pages** — injects a banner below the title when the brand or manufacturer matches a known American-made company
- **Search results** — badges each result card whose brand is in the database
- Clicking a badge opens the brand's own website

## Data

The extension bundles a database of **2,066 companies** sourced from:

- [OneBison](https://onebison.us/companies/american-made)
- [Southland Heritage](https://www.southland-heritage.com/madeinusalist)
- [Americans Working](https://americansworking.com)

The database is compiled and deduplicated by the scraper scripts in the parent repository.

## Installation (Developer Mode)

1. Clone this repo
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `chrome_extension/` folder

## Project structure

```
chrome_extension/
  manifest.json          — MV3 manifest, targets amazon.com
  content_script.js      — brand detection + DOM highlighting
  styles.css             — badge and banner styles
  popup.html / popup.js  — toolbar popup showing DB stats + current page match
  data/
    companies.js         — bundled company lookup map (auto-generated)
    companies_debug.json — full company list with match keys (auto-generated)
  icons/
    icon16/48/128.png
```

## Updating the database

From the parent scraper repo:

```bash
python scrape_made_in_america.py
python scrape_americans_working.py
python merge_results.py
python build_extension_data.py
```

Then reload the extension in Chrome.

## Matching logic

Amazon brand/manufacturer text is normalized (lowercased, punctuation stripped) and matched against pre-computed keys derived from each company name and domain. Longest prefix match wins.
