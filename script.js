const API_BASE = "https://api.coingecko.com/api/v3";

const statusEl = document.getElementById("status");
const tableEl = document.getElementById("coinTable");
const bodyEl = document.getElementById("coinBody");
const searchInput = document.getElementById("searchInput");
const chartTitle = document.getElementById("chartTitle");
const chartMeta = document.getElementById("chartMeta");
const ctx = document.getElementById("priceChart");
const lastUpdatedEl = document.getElementById("lastUpdated");

const REFRESH_INTERVAL_MS = 60_000;

let coins = [];
let chart;

function formatUsd(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatCompact(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

async function loadMarkets() {
  try {
    const res = await fetch(
      `${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`
    );
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    coins = await res.json();
    renderTable(coins);
    statusEl.hidden = true;
    tableEl.hidden = false;
    if (coins.length) loadChart(coins[0]);
    lastUpdatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    statusEl.textContent = `Couldn't load market data (${err.message}). CoinGecko's public API is rate-limited — try refreshing in a moment.`;
  }
}

function renderTable(list) {
  bodyEl.innerHTML = "";
  list.forEach((coin, i) => {
    const change = coin.price_change_percentage_24h ?? 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td class="coin-name">
        <img src="${coin.image}" alt="" />
        <span>${coin.name}</span>
        <span class="coin-symbol">${coin.symbol}</span>
      </td>
      <td>${formatUsd(coin.current_price)}</td>
      <td class="change ${change >= 0 ? "positive" : "negative"}">
        ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
      </td>
      <td>${formatCompact(coin.market_cap)}</td>
    `;
    row.addEventListener("click", () => loadChart(coin));
    bodyEl.appendChild(row);
  });
}

async function loadChart(coin) {
  chartTitle.textContent = `${coin.name} (${coin.symbol.toUpperCase()}) — 7 day price trend`;
  chartMeta.textContent = "Loading…";
  try {
    const res = await fetch(
      `${API_BASE}/coins/${coin.id}/market_chart?vs_currency=usd&days=7`
    );
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const data = await res.json();
    const points = data.prices.map(([ts, price]) => ({ x: ts, y: price }));

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: `${coin.symbol.toUpperCase()} / USD`,
            data: points,
            borderColor: "#7c8cff",
            backgroundColor: "rgba(124,140,255,0.12)",
            fill: true,
            tension: 0.25,
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
            time: { unit: "day" },
            grid: { color: "#232838" },
            ticks: { color: "#8b93a7" },
          },
          y: {
            grid: { color: "#232838" },
            ticks: { color: "#8b93a7" },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
    chartMeta.textContent = `Current: ${formatUsd(coin.current_price)}`;
  } catch (err) {
    chartMeta.textContent = `Chart unavailable (${err.message})`;
  }
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const filtered = coins.filter(
    (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

let sortKey = null;
let sortDir = 1;

document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    sortDir = sortKey === key ? -sortDir : 1;
    sortKey = key;
    document.querySelectorAll("th.sortable").forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
    th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");
    const sorted = [...coins].sort((a, b) => sortDir * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)));
    renderTable(sorted);
  });
});

loadMarkets();
setInterval(loadMarkets, REFRESH_INTERVAL_MS);
