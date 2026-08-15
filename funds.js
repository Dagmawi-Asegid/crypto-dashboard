const API_BASE = "https://api.twelvedata.com";
const KEY_STORAGE = "td_api_key"; // shared with stocks.js
const SYMBOL = "VOO";
const SMA_WINDOW = 50;
const FETCH_SIZE = 300; // ~1Y of trading days + buffer so the 50-day average is accurate at every range
const RANGE_DAYS = { "1M": 22, "3M": 65, "6M": 130, "1Y": 252 };

const chartMetaEl = document.getElementById("vooChartMeta");
const rangeEl = document.getElementById("vooChartRange");
const ctx = document.getElementById("vooChart");
const statusEl = document.getElementById("vooStatus");
const signalEl = document.getElementById("vooSignal");
const keyPromptEl = document.getElementById("vooKeyPrompt");
const keyInput = document.getElementById("vooKeyInput");
const keySaveBtn = document.getElementById("vooKeySaveBtn");

let fullSeries = []; // [{ t: ms, close: number }], oldest -> newest
let smaSeries = []; // aligned with fullSeries; null until enough lookback exists
let chart;
let activeRange = "3M";

function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

function formatUsd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function computeSma(values, window) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

async function init() {
  if (!getApiKey()) {
    keyPromptEl.hidden = false;
    statusEl.hidden = false;
    statusEl.textContent = "Add a free Twelve Data API key above to load the live VOO chart.";
    return;
  }
  keyPromptEl.hidden = true;
  await loadData();
}

async function loadData() {
  const key = getApiKey();
  statusEl.hidden = false;
  statusEl.textContent = "Loading VOO price history…";

  try {
    const res = await fetch(
      `${API_BASE}/time_series?symbol=${SYMBOL}&interval=1day&outputsize=${FETCH_SIZE}&apikey=${encodeURIComponent(key)}`
    );
    const data = await res.json();
    if (data.status === "error") throw new Error(data.message || "No data returned");

    fullSeries = [...data.values]
      .reverse()
      .map((v) => ({ t: new Date(v.datetime).getTime(), close: parseFloat(v.close) }));
    smaSeries = computeSma(
      fullSeries.map((p) => p.close),
      SMA_WINDOW
    );

    statusEl.hidden = true;
    renderChart(activeRange);
    renderSignal();
  } catch (err) {
    statusEl.hidden = false;
    statusEl.textContent = `Couldn't load VOO data (${err.message}). Twelve Data's free tier is rate-limited (8 req/min) — try again shortly.`;
  }
}

function renderChart(range) {
  const days = RANGE_DAYS[range] || 65;
  const slice = fullSeries.slice(-days);
  const smaSlice = smaSeries.slice(-days);

  const pricePoints = slice.map((p) => ({ x: p.t, y: p.close }));
  const smaPoints = slice
    .map((p, i) => (smaSlice[i] == null ? null : { x: p.t, y: smaSlice[i] }))
    .filter(Boolean);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "VOO price",
          data: pricePoints,
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34,211,238,0.15)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "50-day average",
          data: smaPoints,
          borderColor: "#ffb020",
          borderDash: [5, 4],
          fill: false,
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
          time: { unit: range === "1Y" ? "month" : "week" },
          grid: { color: "rgba(139,92,246,0.15)" },
          ticks: { color: "#a29bc4" },
        },
        y: {
          grid: { color: "rgba(139,92,246,0.15)" },
          ticks: { color: "#a29bc4" },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: { color: "#a29bc4", boxWidth: 14, font: { size: 11 } },
        },
      },
    },
  });

  const last = slice[slice.length - 1];
  chartMetaEl.textContent = last
    ? `Latest close: ${formatUsd(last.close)} (${new Date(last.t).toLocaleDateString()})`
    : "";
}

function renderSignal() {
  if (!fullSeries.length) return;

  const last = fullSeries[fullSeries.length - 1];
  const lastSma = smaSeries[smaSeries.length - 1];
  const window1y = fullSeries.slice(-252);
  const high1y = Math.max(...window1y.map((p) => p.close));
  const pctFromHigh = ((last.close - high1y) / high1y) * 100;
  const pctFromSma = lastSma != null ? ((last.close - lastSma) / lastSma) * 100 : null;

  let badgeClass = "neutral";
  let badgeText = "Not enough history yet";
  let explanation = "Once 50 days of price history have loaded, this box will compare today's price to its recent trend.";

  if (pctFromSma !== null) {
    if (pctFromSma <= 0) {
      badgeClass = "buyish";
      badgeText = "Below its 50-day average";
      explanation = `VOO is trading about ${Math.abs(pctFromSma).toFixed(1)}% below its own 50-day average price. Some investors treat a dip below a fund's recent trend line as a relatively cheaper entry point than where it's been trading lately — sometimes nicknamed "buying the dip."`;
    } else if (pctFromHigh >= -3) {
      badgeClass = "waitish";
      badgeText = "Near a recent high";
      explanation = `VOO is within 3% of its highest close in the past year (currently ${Math.abs(pctFromHigh).toFixed(1)}% off that high). Buying right at a peak is when some investors hesitate, since a pullback afterward is common.`;
    } else {
      badgeClass = "neutral";
      badgeText = "Above average, not at a high";
      explanation = `VOO is trading ${pctFromSma.toFixed(1)}% above its 50-day average but isn't at a recent high either — a fairly ordinary spot in its trend, without a strong signal either way.`;
    }
  }

  signalEl.innerHTML = `
    <span class="signal-badge ${badgeClass}">${badgeText}</span>
    <span class="signal-text">
      ${explanation}
      <span class="signal-stat">
        This is one illustrative example of a rule some investors use — not a recommendation, and past
        patterns don't predict future prices. Many long-term investors skip timing it altogether and invest
        on a fixed schedule regardless of price (see "Dollar-cost averaging" in the glossary below).
      </span>
    </span>
  `;
  signalEl.hidden = false;
}

rangeEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-range]");
  if (!btn || !fullSeries.length) return;
  rangeEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  activeRange = btn.dataset.range;
  renderChart(activeRange);
});

keySaveBtn.addEventListener("click", () => {
  const key = keyInput.value.trim();
  if (!key) return;
  localStorage.setItem(KEY_STORAGE, key);
  keyPromptEl.hidden = true;
  loadData();
});

init();
