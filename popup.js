const $ = (id) => document.getElementById(id);

const countEl = $("count");
const delayEl = $("delay");
const costEl = $("cost");
const statusEl = $("status");
const progressEl = $("progress");
const startBtn = $("start");
const stopBtn = $("stop");
const openShopBtn = $("openShop");

function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function updateCost() {
  const count = Math.max(1, Math.min(500, Number(countEl.value) || 1));
  costEl.textContent = `Estimated cost: ${formatNumber(count * 1400)} Orbs`;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent(message) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("No active tab found.");
  return chrome.tabs.sendMessage(tab.id, message);
}

function renderState(s) {
  if (!s) return;
  statusEl.textContent = s.status || (s.running ? "Running" : "Idle");
  progressEl.textContent = `${s.completed || 0} / ${s.target || 0} redeemed`;
  startBtn.disabled = !!s.running;
  stopBtn.disabled = !s.running;
}

async function refreshStatus() {
  try {
    const state = await sendToContent({ type: "ORBS_GET_STATUS" });
    renderState(state);
  } catch {
    statusEl.textContent = "Open Discord in this tab first.";
    progressEl.textContent = "0 / 0 redeemed";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

countEl.addEventListener("input", () => {
  updateCost();
  chrome.storage.local.set({ orbsRedeemerCount: Number(countEl.value) || 1 });
});

delayEl.addEventListener("change", () => {
  chrome.storage.local.set({ orbsRedeemerDelay: Number(delayEl.value) || 1300 });
});

openShopBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  await chrome.tabs.update(tab.id, { url: "https://discord.com/shop?tab=orbs" });
  window.close();
});

startBtn.addEventListener("click", async () => {
  const count = Math.max(1, Math.min(500, Number(countEl.value) || 1));
  const delay = Math.max(500, Math.min(5000, Number(delayEl.value) || 1300));

  const ok = confirm(
    `Redeem ${count} × 3-Day Nitro Credit for up to ${formatNumber(count * 1400)} Orbs?\n\nDiscord Orb purchases are final.`
  );
  if (!ok) return;

  try {
    const state = await sendToContent({
      type: "ORBS_START",
      count,
      delay,
    });
    renderState(state);
  } catch (err) {
    statusEl.textContent = err?.message || "Could not start.";
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    const state = await sendToContent({ type: "ORBS_STOP" });
    renderState(state);
  } catch {}
});

chrome.storage.local.get(["orbsRedeemerCount", "orbsRedeemerDelay"], (data) => {
  if (data.orbsRedeemerCount) countEl.value = data.orbsRedeemerCount;
  if (data.orbsRedeemerDelay) delayEl.value = String(data.orbsRedeemerDelay);
  updateCost();
  refreshStatus();
});

setInterval(refreshStatus, 1000);
