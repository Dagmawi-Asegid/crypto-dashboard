# Market Dashboard

A small, no-build-step market dashboard with six pages:

- **`index.html` — Crypto.** Top 20 coins by market cap via the CoinGecko public API (no key needed), with a
  click-through 7-day price chart.
- **`stocks.html` — Stocks.** A customizable stock watchlist (live quotes + price history charts) powered by
  the [Twelve Data](https://twelvedata.com/pricing) API. Requires a free API key (no credit card) — the app
  will prompt for it and store it only in your browser's `localStorage`. It is never written to this repo.
- **`learn.html` — Get Started.** A beginner-trader guide: a step-by-step walkthrough of how to actually start
  investing, a comparison of account types (brokerage, Roth IRA, Traditional IRA, 401(k)/403(b), HSA,
  custodial), plain-English trading terms (market/limit orders, bid/ask, dividends, volatility), and common
  beginner mistakes. Nothing on this page is fetched from an API.
- **`funds.html` — Index Funds & Brokerages.** A beginner-friendly educational reference page: a live S&P 500
  (`VOO`) price chart with its 50-day moving average, plus a badge that applies one illustrative rule of thumb
  (price vs. its 50-day average and 1-year high) to today's data as an example of how some investors read a
  chart — clearly framed as one example, not a recommendation. Also includes a plain-English investing
  glossary, what common index funds (S&P 500, total market, bonds, international, etc.) track, a general
  feature comparison of major US brokerages, and a dedicated section on investing as an international
  student/visa holder (F-1, OPT/CPT, J-1, H-1B) — SSN/ITIN and W-8BEN basics, and how nonresident-alien tax
  treatment works for capital gains and dividends, sourced from IRS.gov and Sprintax. The VOO chart uses the
  same Twelve Data API key as the Stocks page (stored only in `localStorage`).
- **`savings.html` — Savings & CDs.** A money-management reference page: how to match cash to a timeline,
  high-yield savings accounts, certificates of deposit (including CD laddering), Treasury bills, a
  side-by-side comparison table (checking, HYSA, CD, T-bill, money market fund, stocks/funds), and a
  single-stock-vs-mutual-fund primer. Nothing on this page is fetched from an API.
- **`compound.html` — Compound Calculator.** A future value / compound interest calculator: enter a starting
  amount, monthly contribution, annual interest rate (with quick presets for a savings-account rate, a
  moderate rate, and the S&P 500's historical average), and a number of years, and it projects the ending
  balance with a chart breaking down total contributions vs. interest earned. Assumes a constant rate of
  return for illustration only — nothing on this page is fetched from an API.

Every page has small "?" buttons next to jargon (percent changes, chart ranges, table columns, etc.) that pop
up a short plain-English explanation on click — built for someone with zero background. Shared logic lives in
`help.js`.

Vanilla JavaScript, no build step, no framework.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Stocks & VOO chart setup

1. Go to [twelvedata.com/pricing](https://twelvedata.com/pricing) and sign up for the **Free** plan (no card
   required).
2. Copy your API key.
3. Open `stocks.html` — it will prompt you for the key on first load (or click **⚙ API Key** any time).
   The key is saved only in your browser's `localStorage`, never committed to this repo or sent anywhere
   except Twelve Data's API.
4. The same key powers the live VOO chart on `funds.html` — if it's not set yet, that page has its own inline
   prompt to add it.

The free plan allows 8 API credits/minute and 800/day, with each watchlist symbol typically costing ~1 credit
per quote refresh. The default watchlist (7 symbols) and 90-second refresh interval are sized to stay
comfortably inside that limit — if you add many more symbols, refreshes may occasionally hit the rate limit
(the page will show a friendly retry message when that happens). The VOO chart makes one additional request
per page load (fetched once, then range buttons re-slice the same data locally).

## Notes

- Every page is an informational/educational tool. None of them provide personalized investment advice, and
  the VOO buy/wait badge on `funds.html` is an illustrative example of one rule of thumb, not a signal to act
  on.
- Crypto and stock prices can be delayed or occasionally inaccurate — always verify with your broker/exchange
  before trading on them.
