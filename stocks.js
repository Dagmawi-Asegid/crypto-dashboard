const API_BASE = "https://api.twelvedata.com";
const KEY_STORAGE = "td_api_key";
const WATCHLIST_STORAGE = "stock_watchlist";
const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "SPY", "QQQ"];

// One batched /quote call per refresh costs ~1 credit per symbol on Twelve Data's
// free plan (8 credits/min, 800/day). Keep this interval conservative so a full
// watchlist refresh comfortably fits inside the per-minute budget.
const REFRESH_INTERVAL_MS = 90_000;

const statusEl = document.getElementById("stockStatus");
const tableEl = document.getElementById("stockTable");
const bodyEl = document.getElementById("stockBody");
const searchInput = document.getElementById("stockSearchInput");
const chartTitle = document.getElementById("stockChartTitle");
const chartMeta = document.getElementById("stockChartMeta");
const chartRangeEl = document.getElementById("chartRange");
const ctx = document.getElementById("stockChart");
const lastUpdatedEl = document.getElementById("stockLastUpdated");
const addForm = document.getElementById("addSymbolForm");
const addInput = document.getElementById("addSymbolInput");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const clearKeyBtn = document.getElementById("clearKeyBtn");

let quotes = {};
let watchlist = loadWatchlist();
let chart;
let activeSymbol = null;
let activeRange = "1M";
let refreshTimer = null;

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to default */
  }
  return [...DEFAULT_WATCHLIST];
}

function saveWatchlist() {
  localStorage.setItem(WATCHLIST_STORAGE, JSON.stringify(watchlist));
}

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

function formatUsd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ---------- Settings modal ----------

function openSettings() {
  apiKeyInput.value = getApiKey();
  settingsModal.hidden = false;
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.hidden = true;
}

settingsBtn.addEventListener("click", openSettings);

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  localStorage.setItem(KEY_STORAGE, key);
  closeSettings();
  loadQuotes();
});

clearKeyBtn.addEventListener("click", () => {
  localStorage.removeItem(KEY_STORAGE);
  apiKeyInput.value = "";
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});

// ---------- Quotes ----------

async function loadQuotes() {
  const key = getApiKey();
  if (!key) {
    statusEl.hidden = false;
    statusEl.textContent = "Add your free Twelve Data API key to start tracking stocks.";
    tableEl.hidden = true;
    openSettings();
    return;
  }
  if (!watchlist.length) {
    statusEl.hidden = false;
    statusEl.textContent = "Your watchlist is empty — add a ticker above to get started.";
    tableEl.hidden = true;
    return;
  }

  try {
    const symbols = watchlist.join(",");
    const res = await fetch(`${API_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${encodeURIComponent(key)}`);
    const data = await res.json();

    if (data.status === "error" || data.code >= 400) {
      throw new Error(data.message || `API responded ${data.code}`);
    }

    // Single-symbol responses come back as a flat object; multi-symbol as {SYM: {...}}.
    const bySymbol = data.symbol ? { [data.symbol]: data } : data;

    quotes = {};
    for (const symbol of watchlist) {
      const q = bySymbol[symbol];
      if (!q || q.status === "error") continue;
      quotes[symbol] = {
        symbol,
        name: q.name || symbol,
        price: parseFloat(q.close),
        open: parseFloat(q.open),
        high: parseFloat(q.high),
        low: parseFloat(q.low),
        prevClose: parseFloat(q.previous_close),
        change: parseFloat(q.change),
        changePercent: parseFloat(q.percent_change),
      };
    }

    renderTable(applyFilter(searchInput.value));
    statusEl.hidden = true;
    tableEl.hidden = false;
    lastUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;

    if (!activeSymbol && watchlist.length) loadChart(watchlist[0]);
  } catch (err) {
    statusEl.hidden = false;
    tableEl.hidden = Object.keys(quotes).length === 0;
    statusEl.textContent = `Couldn't load quotes (${err.message}). Twelve Data's free tier is rate-limited (8 req/min) — try again shortly, or trim your watchlist.`;
  }
}

function applyFilter(query) {
  const q = query.trim().toLowerCase();
  if (!q) return watchlist;
  return watchlist.filter((s) => s.toLowerCase().includes(q) || (quotes[s]?.name || "").toLowerCase().includes(q));
}

function renderTable(symbols) {
  bodyEl.innerHTML = "";
  symbols.forEach((symbol, i) => {
    const q = quotes[symbol];
    const row = document.createElement("tr");
    if (!q) {
      row.innerHTML = `
        <td>${i + 1}</td>
        <td class="asset-name"><span>${symbol}</span></td>
        <td colspan="6" class="dash">Waiting for data…</td>
        <td><button class="remove-btn" data-symbol="${symbol}" title="Remove">✕</button></td>
      `;
    } else {
      const change = q.changePercent ?? 0;
      row.innerHTML = `
        <td>${i + 1}</td>
        <td class="asset-name">
          <span>${q.name}</span>
          <span class="asset-symbol">${q.symbol}</span>
        </td>
        <td>${formatUsd(q.price)}</td>
        <td class="change ${change >= 0 ? "positive" : "negative"}">
          ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
        </td>
        <td>${formatUsd(q.open)}</td>
        <td>${formatUsd(q.high)}</td>
        <td>${formatUsd(q.low)}</td>
        <td>${formatUsd(q.prevClose)}</td>
        <td><button class="remove-btn" data-symbol="${symbol}" title="Remove">✕</button></td>
      `;
    }
    row.addEventListener("click", (e) => {
      if (e.target.closest(".remove-btn")) return;
      loadChart(symbol);
    });
    bodyEl.appendChild(row);
  });

  bodyEl.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeSymbol(btn.dataset.symbol));
  });
}

// ---------- Chart ----------

const RANGE_DAYS = { "1M": 22, "3M": 65, "6M": 130, "1Y": 252 };

async function loadChart(symbol) {
  activeSymbol = symbol;
  const q = quotes[symbol];
  chartTitle.textContent = q ? `${q.name} (${q.symbol}) — price history` : `${symbol} — price history`;
  chartMeta.textContent = "Loading…";

  const key = getApiKey();
  if (!key) return;

  try {
    const outputsize = RANGE_DAYS[activeRange] || 22;
    const res = await fetch(
      `${API_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${encodeURIComponent(key)}`
    );
    const data = await res.json();
    if (data.status === "error") throw new Error(data.message || "No data returned");

    const points = [...data.values]
      .reverse()
      .map((v) => ({ x: new Date(v.datetime).getTime(), y: parseFloat(v.close) }));

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: `${symbol} / USD`,
            data: points,
            borderColor: "#22d3ee",
            backgroundColor: "rgba(34,211,238,0.18)",
            fill: true,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: "time",
            time: { unit: activeRange === "1Y" ? "month" : "week" },
            grid: { color: "rgba(139,92,246,0.15)" },
            ticks: { color: "#a29bc4" },
          },
          y: {
            grid: { color: "rgba(139,92,246,0.15)" },
            ticks: { color: "#a29bc4" },
          },
        },
        plugins: { legend: { display: false } },
      },
    });

    chartMeta.textContent = q ? `Current: ${formatUsd(q.price)}` : "";
  } catch (err) {
    chartMeta.textContent = `Chart unavailable (${err.message})`;
  }
}

chartRangeEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-range]");
  if (!btn) return;
  chartRangeEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  activeRange = btn.dataset.range;
  if (activeSymbol) loadChart(activeSymbol);
});

// ---------- Watchlist management ----------

function removeSymbol(symbol) {
  watchlist = watchlist.filter((s) => s !== symbol);
  delete quotes[symbol];
  saveWatchlist();
  if (activeSymbol === symbol) activeSymbol = null;
  renderTable(applyFilter(searchInput.value));
  if (!watchlist.length) loadQuotes();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const symbol = addInput.value.trim().toUpperCase();
  addInput.value = "";
  if (!symbol || watchlist.includes(symbol)) return;
  watchlist.push(symbol);
  saveWatchlist();
  loadQuotes();
});

searchInput.addEventListener("input", () => {
  renderTable(applyFilter(searchInput.value));
});

// ---------- Init ----------

if (!getApiKey()) {
  openSettings();
  statusEl.textContent = "Add your free Twelve Data API key to start tracking stocks.";
} else {
  loadQuotes();
}

refreshTimer = setInterval(() => {
  if (getApiKey()) loadQuotes();
}, REFRESH_INTERVAL_MS);
