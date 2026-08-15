const startInput = document.getElementById("startAmount");
const contributionInput = document.getElementById("monthlyContribution");
const rateInput = document.getElementById("annualRate");
const yearsInput = document.getElementById("years");
const presetsEl = document.getElementById("ratePresets");

const resultFutureEl = document.getElementById("resultFuture");
const resultContributedEl = document.getElementById("resultContributed");
const resultInterestEl = document.getElementById("resultInterest");
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
function simulate(start, monthlyContribution, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  let balance = start;
  let contributed = start;
  const points = [{ year: 0, balance, contributed, interest: balance - contributed }];

  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + r) + monthlyContribution;
    contributed += monthlyContribution;
    if (m % 12 === 0) {
      points.push({ year: m / 12, balance, contributed, interest: balance - contributed });
    }
  }
  return points;
}

function render() {
  const start = Math.max(0, parseFloat(startInput.value) || 0);
  const monthlyContribution = Math.max(0, parseFloat(contributionInput.value) || 0);
  const annualRate = Math.max(0, parseFloat(rateInput.value) || 0);
  const years = Math.min(60, Math.max(1, parseInt(yearsInput.value, 10) || 1));

  const points = simulate(start, monthlyContribution, annualRate, years);
  const last = points[points.length - 1];

  resultFutureEl.textContent = formatUsd(last.balance);
  resultContributedEl.textContent = formatUsd(last.contributed);
  resultInterestEl.textContent = formatUsd(last.interest);

  const labels = points.map((p) => `Year ${p.year}`);
  const contributedData = points.map((p) => Math.round(p.contributed));
  const interestData = points.map((p) => Math.round(p.interest));

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total contributed",
          data: contributedData,
          borderColor: "#22d3ee",
          backgroundColor: "rgba(34,211,238,0.35)",
          fill: true,
          stack: "growth",
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Interest earned",
          data: interestData,
          borderColor: "#1fe08a",
          backgroundColor: "rgba(31,224,138,0.35)",
          fill: true,
          stack: "growth",
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          grid: { color: "rgba(139,92,246,0.15)" },
          ticks: { color: "#a29bc4", maxTicksLimit: 10 },
        },
        y: {
          stacked: true,
          grid: { color: "rgba(139,92,246,0.15)" },
          ticks: { color: "#a29bc4", callback: (v) => formatUsd(v) },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: { color: "#a29bc4", boxWidth: 14, font: { size: 11 } },
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

[startInput, contributionInput, rateInput, yearsInput].forEach((input) => {
  input.addEventListener("input", () => {
    presetsEl.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    render();
  });
});

render();
