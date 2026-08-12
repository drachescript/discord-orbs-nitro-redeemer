(() => {
  if (window.__discordOrbsNitroRedeemerLoaded) return;
  window.__discordOrbsNitroRedeemerLoaded = true;

  const PRODUCT_NAME = "3-Day Nitro Credit";
  const PRICE = 1400;

  const state = {
    running: false,
    stopRequested: false,
    completed: 0,
    target: 0,
    delay: 1300,
    status: "Idle",
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function snapshot() {
    return {
      running: state.running,
      completed: state.completed,
      target: state.target,
      delay: state.delay,
      status: state.status,
    };
  }

  function setStatus(text) {
    state.status = text;
    console.log(`[Orbs Nitro Redeemer] ${text}`);
  }

  function normalizedText(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function isVisuallyHidden(el) {
    if (!el) return true;

    // Discord uses accessibility-only text such as `hiddenVisually_*` for
    // descriptions like "Not enough Orbs". Those elements can still have a
    // tiny non-zero rectangle, so checking width/height alone gives false
    // positives.
    if ([...el.classList].some((c) => /hiddenVisually|visuallyHidden/i.test(c))) {
      return true;
    }

    const style = getComputedStyle(el);
    const clip = String(style.clip || "").replace(/\s+/g, "");
    const clipPath = String(style.clipPath || "").replace(/\s+/g, "");

    if (clip === "rect(0px,0px,0px,0px)" || clip === "rect(0,0,0,0)") return true;
    if (/inset\((49|50)%/.test(clipPath)) return true;

    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1 && style.overflow === "hidden") return true;

    return false;
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    if (isVisuallyHidden(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function visibleAll(selector) {
    return [...document.querySelectorAll(selector)].filter(isVisible);
  }

  function findButtonByText(exactText) {
    return visibleAll('button, [role="button"]')
      .find((el) => normalizedText(el) === exactText);
  }

  function findProductOpenTarget() {
    const exact = visibleAll(`[role="button"][aria-label="${PRODUCT_NAME}"]`);
    if (exact.length) return exact[0];

    const named = [...document.querySelectorAll("span, div")]
      .filter(isVisible)
      .find((el) => normalizedText(el) === PRODUCT_NAME);

    if (!named) return null;

    let p = named;
    for (let i = 0; i < 8 && p; i++, p = p.parentElement) {
      const roleButton = p.querySelector?.(`[role="button"][aria-label="${PRODUCT_NAME}"]`);
      if (roleButton && isVisible(roleButton)) return roleButton;
    }

    return null;
  }

  function isInsideProductCard(el) {
    let p = el;
    for (let i = 0; i < 8 && p; i++, p = p.parentElement) {
      if ([...p.classList].some((c) => c.startsWith("productCardContainer"))) return true;
    }
    return false;
  }

  function isDisabled(el) {
    return !!(
      el?.disabled ||
      el?.getAttribute?.("aria-disabled") === "true" ||
      el?.matches?.(":disabled")
    );
  }

  function findRedeemButton() {
    const candidates = visibleAll('button[aria-label]')
      .filter((b) => /^Redeem for\s+1?,?400\s+orbs$/i.test(b.getAttribute("aria-label") || ""));

    if (!candidates.length) return null;

    // Prefer an ENABLED button in the opened detail view. Discord may leave
    // another product-card button mounted underneath the modal.
    return (
      candidates.find((b) => !isInsideProductCard(b) && !isDisabled(b)) ||
      candidates.find((b) => !isDisabled(b)) ||
      null
    );
  }

  function findDisabledRedeemButton() {
    const candidates = visibleAll('button[aria-label]')
      .filter((b) => /^Redeem for\s+1?,?400\s+orbs$/i.test(b.getAttribute("aria-label") || ""));

    return (
      candidates.find((b) => !isInsideProductCard(b) && isDisabled(b)) ||
      candidates.find((b) => isDisabled(b)) ||
      null
    );
  }

  function linkedDescription(el) {
    const ids = (el?.getAttribute?.("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean);

    return ids
      .map((id) => normalizedText(document.getElementById(id)))
      .filter(Boolean)
      .join(" ");
  }

  function disabledBecauseNotEnough(el) {
    if (!el || !isDisabled(el)) return false;
    return /not enough orbs/i.test(linkedDescription(el));
  }

  function hasRateLimitOrError() {
    const bodyText = document.body?.innerText || "";
    return /too many requests|rate limit|rate-limited|you are being rate limited|something went wrong/i.test(bodyText);
  }

  function findAcquiredHeading() {
    return [...document.querySelectorAll("h1, h2, [role=heading]")]
      .filter(isVisible)
      .find((el) => normalizedText(el) === "Nitro Credit Acquired");
  }

  function findCloseForHeading(heading) {
    let p = heading;
    for (let i = 0; i < 10 && p; i++, p = p.parentElement) {
      const close = p.querySelector?.('button[aria-label="Close"]');
      if (close && isVisible(close)) return close;
    }

    const visibleClose = visibleAll('button[aria-label="Close"]');
    return visibleClose[visibleClose.length - 1] || null;
  }

  async function waitFor(fn, { timeout = 10000, poll = 120, label = "element" } = {}) {
    const end = Date.now() + timeout;

    while (Date.now() < end) {
      if (state.stopRequested) throw new Error("Stopped by user");
      if (hasRateLimitOrError()) throw new Error("Discord showed an error/rate-limit message");

      const result = fn();
      if (result) return result;
      await sleep(poll);
    }

    throw new Error(`Timed out waiting for ${label}`);
  }

  async function clickAndPause(el, description) {
    if (!el || !isVisible(el)) throw new Error(`${description} is not visible`);
    el.scrollIntoView({ block: "center", inline: "center" });
    await sleep(150);
    el.click();
    await sleep(state.delay);
  }

  async function redeemOne(index) {
    setStatus(`Redemption ${index}/${state.target}: opening ${PRODUCT_NAME}...`);

    const product = await waitFor(findProductOpenTarget, {
      timeout: 12000,
      label: `${PRODUCT_NAME} product card`,
    });
    await clickAndPause(product, PRODUCT_NAME);

    setStatus(`Redemption ${index}/${state.target}: waiting for Redeem...`);

    let redeem;
    try {
      redeem = await waitFor(findRedeemButton, {
        timeout: 10000,
        label: "enabled Redeem for 1400 orbs button",
      });
    } catch (err) {
      const disabledRedeem = findDisabledRedeemButton();
      if (disabledBecauseNotEnough(disabledRedeem)) {
        throw new Error("Not enough Orbs");
      }
      throw err;
    }

    await clickAndPause(redeem, "Redeem button");

    setStatus(`Redemption ${index}/${state.target}: confirming with Orbs...`);

    const claim = await waitFor(() => {
      const button = findButtonByText("Claim with Orbs");
      return button && !isDisabled(button) ? button : null;
    }, {
      timeout: 10000,
      label: "enabled Claim with Orbs button",
    });

    await clickAndPause(claim, "Claim with Orbs button");

    setStatus(`Redemption ${index}/${state.target}: waiting for confirmation...`);

    const acquired = await waitFor(findAcquiredHeading, {
      timeout: 15000,
      label: "Nitro Credit Acquired confirmation",
    });

    state.completed += 1;
    setStatus(`Redeemed ${state.completed}/${state.target}. Closing confirmation...`);

    const close = await waitFor(() => findCloseForHeading(acquired), {
      timeout: 5000,
      label: "confirmation Close button",
    });

    await clickAndPause(close, "Close button");

    // Make sure Discord actually dismissed the success dialog before starting
    // the next redemption. This prevents the next loop from clicking elements
    // that are still mounted underneath the closing animation.
    await waitFor(() => !findAcquiredHeading(), {
      timeout: 6000,
      label: "success dialog to close",
    });
  }

  async function runBatch() {
    try {
      if (!location.href.startsWith("https://discord.com/shop")) {
        throw new Error("Open https://discord.com/shop?tab=orbs first");
      }

      for (let i = 1; i <= state.target; i++) {
        if (state.stopRequested) throw new Error("Stopped by user");
        await redeemOne(i);
      }

      setStatus(`Done — redeemed ${state.completed}/${state.target} credits.`);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg === "Stopped by user") {
        setStatus(`Stopped — redeemed ${state.completed}/${state.target}.`);
      } else if (/not enough orbs/i.test(msg)) {
        setStatus(`Stopped: not enough Orbs. Redeemed ${state.completed}/${state.target}.`);
      } else {
        setStatus(`Stopped: ${msg}. Redeemed ${state.completed}/${state.target}.`);
      }
    } finally {
      state.running = false;
      state.stopRequested = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "ORBS_GET_STATUS") {
      sendResponse(snapshot());
      return;
    }

    if (message?.type === "ORBS_STOP") {
      state.stopRequested = true;
      setStatus("Stop requested — finishing the current UI action...");
      sendResponse(snapshot());
      return;
    }

    if (message?.type === "ORBS_START") {
      if (state.running) {
        sendResponse(snapshot());
        return;
      }

      const count = Math.max(1, Math.min(500, Number(message.count) || 1));
      const delay = Math.max(500, Math.min(5000, Number(message.delay) || 1300));

      state.running = true;
      state.stopRequested = false;
      state.completed = 0;
      state.target = count;
      state.delay = delay;
      setStatus(`Starting ${count} redemption${count === 1 ? "" : "s"}...`);

      runBatch();
      sendResponse(snapshot());
    }
  });
})();
