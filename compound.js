const startInput = document.getElementById("startAmount");
const contributionInput = document.getElementById("monthlyContribution");
const rateInput = document.getElementById("annualRate");
const yearsInput = document.getElementById("years");
const inflationInput = document.getElementById("inflationRate");
const presetsEl = document.getElementById("ratePresets");

const resultFutureEl = document.getElementById("resultFuture");
const resultContributedEl = document.getElementById("resultContributed");
const resultInterestEl = document.getElementById("resultInterest");
const resultRealFutureEl = document.getElementById("resultRealFuture");
const resultRealValueEl = document.getElementById("resultRealValue");
const resultYearsLabelEl = document.getElementById("resultYearsLabel");
const fvHeroEl = document.getElementById("fvHero");
const splitContributedEl = document.getElementById("splitContributed");
const splitInterestEl = document.getElementById("splitInterest");
const splitContributedPctEl = document.getElementById("splitContributedPct");
const splitInterestPctEl = document.getElementById("splitInterestPct");
const ctx = document.getElementById("growthChart");

let chart;

function formatUsd(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// Simulates month-by-month, snapshotting balance/contributed at each year boundary.
// Contributions are added at the end of each month, so a 0% rate just sums deposits.
// "real" is the same balance re-priced into today's purchasing power, discounted by inflation.
function simulate(start, monthlyContribution, annualRatePct, years, inflationRatePct) {
  const r = annualRatePct / 100 / 12;
  let balance = start;
  let contributed = start;
  const points = [{ year: 0, balance, contributed, interest: balance - contributed, real: balance }];

  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + r) + monthlyContribution;
    contributed += monthlyContribution;
    if (m % 12 === 0) {
      const year = m / 12;
      const real = balance / Math.pow(1 + inflationRatePct / 100, year);
      points.push({ year, balance, contributed, interest: balance - contributed, real });
    }
  }
  return points;
}

function render() {
  const start = Math.max(0, parseFloat(startInput.value) || 0);
  const monthlyContribution = Math.max(0, parseFloat(contributionInput.value) || 0);
  const annualRate = Math.max(0, parseFloat(rateInput.value) || 0);
  const years = Math.min(60, Math.max(1, parseInt(yearsInput.value, 10) || 1));
  const inflationRate = Math.max(0, parseFloat(inflationInput.value) || 0);

  const points = simulate(start, monthlyContribution, annualRate, years, inflationRate);
  const last = points[points.length - 1];

  resultFutureEl.textContent = formatUsd(last.balance);
  resultContributedEl.textContent = formatUsd(last.contributed);
  resultInterestEl.textContent = formatUsd(last.interest);
  resultRealFutureEl.textContent = formatUsd(last.real);
  resultRealValueEl.textContent = formatUsd(last.real);
  resultYearsLabelEl.textContent = years;

  // Give the hero number a quick pulse whenever it changes, for a bit of life.
  fvHeroEl.classList.remove("pulse");
  void fvHeroEl.offsetWidth; // restart the CSS animation
  fvHeroEl.classList.add("pulse");

  const contributedPct = last.balance > 0 ? (last.contributed / last.balance) * 100 : 100;
  const interestPct = 100 - contributedPct;
  splitContributedEl.style.width = `${contributedPct}%`;
  splitInterestEl.style.width = `${interestPct}%`;
  splitContributedPctEl.textContent = contributedPct >= 12 ? `${Math.round(contributedPct)}%` : "";
  splitInterestPctEl.textContent = interestPct >= 12 ? `${Math.round(interestPct)}%` : "";

  const labels = points.map((p) => `Year ${p.year}`);
  const contributedData = points.map((p) => Math.round(p.contributed));
  const interestData = points.map((p) => Math.round(p.interest));
  const realData = points.map((p) => Math.round(p.real));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total contributed",
          data: contributedData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.35)",
          fill: true,
          stack: "growth",
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Interest earned",
          data: interestData,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.35)",
          fill: true,
          stack: "growth",
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "In today's dollars (after inflation)",
          data: realData,
          borderColor: "#e2673a",
          borderDash: [6, 4],
          stack: "real",
          fill: false,
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          grid: { color: "rgba(227,178,60,0.15)" },
          ticks: { color: "#98a1b8", maxTicksLimit: 10 },
        },
        y: {
          stacked: true,
          grid: { color: "rgba(227,178,60,0.15)" },
          ticks: { color: "#98a1b8", callback: (v) => formatUsd(v) },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: { color: "#98a1b8", boxWidth: 14, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${formatUsd(item.parsed.y)}`,
          },
        },
      },
    },
  });
}

presetsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-rate]");
  if (!btn) return;
  presetsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  rateInput.value = btn.dataset.rate;
  render();
});

[startInput, contributionInput, rateInput, yearsInput, inflationInput].forEach((input) => {
  input.addEventListener("input", () => {
    presetsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    render();
  });
});

render();
