# Market Dashboard

A small, no-build-step market dashboard with three pages:

- **`index.html` — Crypto.** Top 20 coins by market cap via the CoinGecko public API (no key needed), with a
  click-through 7-day price chart.
- **`stocks.html` — Stocks.** A customizable stock watchlist (live quotes + price history charts) powered by
  the [Twelve Data](https://twelvedata.com/pricing) API. Requires a free API key (no credit card) — the app
  will prompt for it and store it only in your browser's `localStorage`. It is never written to this repo.
- **`funds.html` — Index Funds & Brokerages.** A static educational reference page: what common index funds
  (S&P 500, total market, bonds, international, etc.) track, and a general feature comparison of major US
  brokerages. Clearly labeled as general information, not personalized financial advice — nothing on this
  page is fetched from an API.

Vanilla JavaScript, no build step, no framework.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Stocks page setup

1. Go to [twelvedata.com/pricing](https://twelvedata.com/pricing) and sign up for the **Free** plan (no card
   required).
2. Copy your API key.
3. Open `stocks.html` — it will prompt you for the key on first load (or click **⚙ API Key** any time).
   The key is saved only in your browser's `localStorage`, never committed to this repo or sent anywhere
   except Twelve Data's API.

The free plan allows 8 API credits/minute and 800/day, with each watchlist symbol typically costing ~1 credit
per quote refresh. The default watchlist (7 symbols) and 90-second refresh interval are sized to stay
comfortably inside that limit — if you add many more symbols, refreshes may occasionally hit the rate limit
(the page will show a friendly retry message when that happens).

## Notes

- All three pages are informational/educational tools. None of them provide personalized investment advice.
- Crypto and stock prices can be delayed or occasionally inaccurate — always verify with your broker/exchange
  before trading on them.
