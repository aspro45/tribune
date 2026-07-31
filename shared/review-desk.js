const parseJson = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const OPEN_STATUSES = new Set(["open", "pending"]);
const WINDOW_READY = new Set(["REVIEWED", "SEALED", "VERIFIED", "JUDGED"]);
const FINAL_READY = new Set(["REVIEWED", "SEALED", "VERIFIED", "JUDGED", "CHALLENGE_WINDOW"]);
const ARCHIVE_READY = new Set(["FINALIZED", "SETTLED", "PAID", "REFUNDED", "KEPT", "BROKEN", "CLOSED"]);

function installStyles() {
  if (!document.querySelector('link[rel~="icon"]')) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = "data:,";
    document.head.appendChild(icon);
  }
  if (document.getElementById("gl-review-desk-styles")) return;
  const style = document.createElement("style");
  style.id = "gl-review-desk-styles";
  style.textContent = `
    .gl-review { --glr-accent: var(--accent, #2563eb); --glr-ink: var(--ink, var(--text, #111827)); --glr-muted: var(--muted, var(--grey, #667085)); width: 100%; box-sizing: border-box; color: var(--glr-ink); }
    .gl-review * { box-sizing: border-box; }
    .gl-review__inner { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 64px 0; }
    .gl-review__head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; margin-bottom: 28px; }
    .gl-review__eyebrow { margin: 0 0 8px; font: 700 11px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; text-transform: uppercase; letter-spacing: 0; color: var(--glr-accent); }
    .gl-review h2 { margin: 0; font-size: clamp(28px, 4vw, 54px); line-height: .98; letter-spacing: 0; max-width: 720px; }
    .gl-review__intro { margin: 12px 0 0; max-width: 680px; color: var(--glr-muted); line-height: 1.6; }
    .gl-review__lookup { display: flex; align-items: end; gap: 8px; }
    .gl-review label { display: grid; gap: 7px; font-size: 12px; font-weight: 700; color: var(--glr-muted); }
    .gl-review input, .gl-review textarea { width: 100%; border: 1px solid color-mix(in srgb, var(--glr-ink) 18%, transparent); border-radius: 5px; background: color-mix(in srgb, Canvas 94%, transparent); color: var(--glr-ink); padding: 11px 12px; font: inherit; outline: none; }
    .gl-review input:focus, .gl-review textarea:focus { border-color: var(--glr-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--glr-accent) 16%, transparent); }
    .gl-review textarea { min-height: 92px; resize: vertical; }
    .gl-review__lookup input { width: 100px; }
    .gl-review button { min-height: 42px; border: 1px solid transparent; border-radius: 5px; padding: 0 15px; background: var(--glr-accent); color: #fff; font: 700 13px/1 inherit; cursor: pointer; white-space: nowrap; }
    .gl-review button:hover { filter: brightness(.94); }
    .gl-review button:disabled { cursor: not-allowed; opacity: .48; }
    .gl-review button[data-tone="quiet"] { background: transparent; color: var(--glr-ink); border-color: color-mix(in srgb, var(--glr-ink) 20%, transparent); }
    .gl-review button[data-tone="danger"] { background: #9f1239; }
    .gl-review__state { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr); gap: 16px; }
    .gl-review__record, .gl-review__actions { border: 1px solid color-mix(in srgb, var(--glr-ink) 14%, transparent); border-radius: 7px; padding: 22px; background: color-mix(in srgb, Canvas 96%, transparent); }
    .gl-review__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-bottom: 18px; }
    .gl-review__status { display: inline-flex; align-items: center; min-height: 28px; padding: 0 9px; border-radius: 999px; color: var(--glr-accent); background: color-mix(in srgb, var(--glr-accent) 12%, transparent); font: 800 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .gl-review__record h3, .gl-review__actions h3 { margin: 0; font-size: 19px; letter-spacing: 0; }
    .gl-review__summary { margin: 12px 0 0; color: var(--glr-muted); line-height: 1.58; overflow-wrap: anywhere; }
    .gl-review__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin-top: 22px; background: color-mix(in srgb, var(--glr-ink) 12%, transparent); }
    .gl-review__fact { min-width: 0; padding: 12px; background: Canvas; }
    .gl-review__fact span { display: block; color: var(--glr-muted); font-size: 10px; text-transform: uppercase; }
    .gl-review__fact b { display: block; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; font: 700 12px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .gl-review__timeline { display: grid; gap: 10px; margin-top: 18px; }
    .gl-review__filing { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; border-top: 1px solid color-mix(in srgb, var(--glr-ink) 12%, transparent); padding-top: 11px; }
    .gl-review__filing p { margin: 4px 0 0; color: var(--glr-muted); font-size: 12px; line-height: 1.45; }
    .gl-review__form { display: grid; gap: 11px; margin-top: 18px; padding-top: 18px; border-top: 1px solid color-mix(in srgb, var(--glr-ink) 12%, transparent); }
    .gl-review__button-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .gl-review__empty { margin: 0; color: var(--glr-muted); line-height: 1.55; }
    .gl-review__notice { min-height: 24px; margin: 14px 0 0; color: var(--glr-muted); font-size: 12px; }
    .gl-review__notice[data-kind="error"] { color: #b42318; }
    .gl-review__notice[data-kind="ok"] { color: #067647; }
    .gl-review[data-variant="terminal"] { color: #edf7f4; background: #071c1a; --glr-ink: #edf7f4; --glr-muted: #94aaa5; --glr-accent: #2dd4bf; }
    .gl-review[data-variant="terminal"] .gl-review__record, .gl-review[data-variant="terminal"] .gl-review__actions, .gl-review[data-variant="terminal"] .gl-review__fact, .gl-review[data-variant="terminal"] input, .gl-review[data-variant="terminal"] textarea { background: #0a2522; }
    .gl-review[data-variant="docket"] { border-top: 5px double currentColor; border-bottom: 1px solid currentColor; }
    .gl-review[data-variant="docket"] h2, .gl-review[data-variant="docket"] h3 { font-family: Georgia, serif; }
    .gl-review[data-variant="ribbon"] { background: color-mix(in srgb, var(--glr-accent) 8%, Canvas); border-top: 1px solid color-mix(in srgb, var(--glr-accent) 34%, transparent); }
    .gl-review[data-variant="rail"] .gl-review__inner { border-left: 3px solid var(--glr-accent); padding-left: 32px; }
    .gl-review[data-variant="well"] .gl-review__record, .gl-review[data-variant="well"] .gl-review__actions { border-radius: 0; box-shadow: 10px 10px 0 color-mix(in srgb, var(--glr-accent) 14%, transparent); }
    .gl-review[data-variant="ledger"] .gl-review__facts { font-family: Georgia, serif; }
    @media (max-width: 760px) {
      .gl-review__inner { width: min(100% - 24px, 1180px); padding: 44px 0; }
      .gl-review__head, .gl-review__state { grid-template-columns: 1fr; }
      .gl-review__lookup { justify-content: stretch; }
      .gl-review__lookup label { flex: 1; }
      .gl-review__lookup input { width: 100%; }
      .gl-review__facts { grid-template-columns: 1fr; }
      .gl-review[data-variant="rail"] .gl-review__inner { padding-left: 18px; }
    }
  `;
  document.head.appendChild(style);
}

function displayText(record, config) {
  const fields = config.summaryFields || ["summary", "rationale", "description", "statement", "title", "claim", "premise", "question"];
  for (const field of fields) {
    const value = record?.[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `Onchain ${config.entity.toLowerCase()} record loaded from the canonical contract.`;
}

function filingText(filing, kind) {
  return filing?.claim || filing?.reason || filing?.ruling || `${kind} filing`;
}

export function mountReviewDesk(config) {
  installStyles();
  const section = document.createElement("section");
  section.className = "gl-review";
  section.dataset.variant = config.variant || "ledger";
  section.id = config.anchor || "review-desk";
  section.innerHTML = `
    <div class="gl-review__inner">
      <div class="gl-review__head">
        <div>
          <p class="gl-review__eyebrow">${escapeHtml(config.kicker || "Onchain review lifecycle")}</p>
          <h2>${escapeHtml(config.title || `${config.entity} review desk`)}</h2>
          <p class="gl-review__intro">${escapeHtml(config.intro || "Inspect the canonical record, file evidence-backed challenges, resolve open reviews, and finalize only when no filing remains open.")}</p>
        </div>
        <form class="gl-review__lookup">
          <label>${escapeHtml(config.idLabel || `${config.entity} ID`)}<input name="recordId" inputmode="numeric" autocomplete="off" placeholder="0" /></label>
          <button type="submit" data-tone="quiet">Load record</button>
        </form>
      </div>
      <div class="gl-review__state">
        <article class="gl-review__record"><p class="gl-review__empty">Loading the latest onchain record.</p></article>
        <aside class="gl-review__actions"><p class="gl-review__empty">Actions appear after a valid record is loaded.</p></aside>
      </div>
      <p class="gl-review__notice" role="status" aria-live="polite"></p>
    </div>`;

  const footer = document.querySelector("footer");
  if (footer) footer.before(section); else document.body.appendChild(section);

  const lookup = section.querySelector(".gl-review__lookup");
  const idInput = lookup.elements.recordId;
  const recordNode = section.querySelector(".gl-review__record");
  const actionsNode = section.querySelector(".gl-review__actions");
  const notice = section.querySelector(".gl-review__notice");
  let activeId = "";
  let record = null;
  let challenges = [];
  let appeals = [];
  let busy = false;

  const setNotice = (message, kind = "") => {
    notice.textContent = message || "";
    notice.dataset.kind = kind;
  };

  async function readList(method, id) {
    if (!method) return [];
    try {
      const result = parseJson(await config.read(method, [id]), []);
      return Array.isArray(result) ? result : [];
    } catch (_) { return []; }
  }

  async function transact(method, args, label) {
    if (!method || busy) return;
    busy = true;
    setNotice(`${label} is waiting for wallet confirmation.`);
    actionsNode.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      await config.ensureWallet();
      await config.write(config.contract, method, args);
      setNotice(`${label} was finalized onchain.`, "ok");
      await loadRecord(activeId);
    } catch (error) {
      setNotice(config.fmtErr ? config.fmtErr(error) : String(error), "error");
      renderActions();
    } finally { busy = false; }
  }

  function renderRecord() {
    const status = String(record?.status || record?.state || "UNKNOWN").toUpperCase();
    const outcome = record?.verdict || record?.outcome || record?.result || "pending";
    const confidence = record?.confidenceBps ?? record?.confidence_bps ?? 0;
    const owner = record?.owner || record?.author || record?.opener || record?.proposer || record?.sponsor || record?.asserter || record?.claimant || "not exposed";
    recordNode.innerHTML = `
      <div class="gl-review__meta"><span class="gl-review__status">${escapeHtml(status)}</span><h3>${escapeHtml(config.entity)} #${escapeHtml(activeId)}</h3></div>
      <p class="gl-review__summary">${escapeHtml(displayText(record, config))}</p>
      <div class="gl-review__facts">
        <div class="gl-review__fact"><span>Outcome</span><b>${escapeHtml(outcome)}</b></div>
        <div class="gl-review__fact"><span>Confidence</span><b>${escapeHtml(String(confidence))} bps</b></div>
        <div class="gl-review__fact"><span>Controller</span><b title="${escapeHtml(owner)}">${escapeHtml(owner)}</b></div>
      </div>`;
  }

  function filingRows(items, kind, resolveMethod) {
    if (!items.length) return "";
    return `<div class="gl-review__timeline">${items.map((item) => {
      const isOpen = OPEN_STATUSES.has(String(item?.status || "open").toLowerCase());
      return `<div class="gl-review__filing"><div><strong>${escapeHtml(kind)} #${escapeHtml(item?.id ?? "-")}</strong><p>${escapeHtml(filingText(item, kind))}</p><span class="gl-review__status">${escapeHtml(item?.status || "open")}</span></div>${isOpen && resolveMethod ? `<button type="button" data-action="resolve-${kind.toLowerCase()}" data-filing-id="${escapeHtml(item?.id)}">Resolve</button>` : ""}</div>`;
    }).join("")}</div>`;
  }

  function renderActions() {
    if (!record) {
      actionsNode.innerHTML = `<p class="gl-review__empty">Enter a valid ${escapeHtml(config.entity.toLowerCase())} ID to inspect its review path.</p>`;
      return;
    }
    const status = String(record.status || record.state || "").toUpperCase();
    const openChallenges = challenges.filter((item) => OPEN_STATUSES.has(String(item?.status || "open").toLowerCase()));
    const openAppeals = appeals.filter((item) => OPEN_STATUSES.has(String(item?.status || "open").toLowerCase()));
    const mayOpen = WINDOW_READY.has(status);
    const mayChallenge = status === "CHALLENGE_WINDOW";
    const mayAppeal = status === "CHALLENGE_WINDOW" && openChallenges.length === 0;
    const mayFinalize = config.finalMethod && FINAL_READY.has(status) && openChallenges.length === 0 && openAppeals.length === 0;
    const mayArchive = config.archiveMethod && ARCHIVE_READY.has(status);
    actionsNode.innerHTML = `
      <h3>${escapeHtml(config.actionTitle || "Next valid action")}</h3>
      <div class="gl-review__button-row" style="margin-top:16px">
        ${mayOpen ? `<button type="button" data-action="open-window">Open challenge window</button>` : ""}
        ${mayFinalize ? `<button type="button" data-action="finalize">${escapeHtml(config.finalLabel || "Finalize record")}</button>` : ""}
        ${mayArchive ? `<button type="button" data-action="archive" data-tone="quiet">${escapeHtml(config.archiveLabel || "Archive record")}</button>` : ""}
      </div>
      ${mayChallenge ? `<form class="gl-review__form" data-form="challenge"><label>Challenge statement<textarea name="reason" required maxlength="900" placeholder="State the exact issue with the current outcome"></textarea></label><label>Public evidence URL<input name="url" type="url" required placeholder="https://"></label><button type="submit">File challenge</button></form>` : ""}
      ${filingRows(challenges, "Challenge", config.resolveChallengeMethod)}
      ${mayAppeal ? `<form class="gl-review__form" data-form="appeal"><label>Appeal grounds<textarea name="reason" required maxlength="900" placeholder="Explain why the resolved review should be reconsidered"></textarea></label><label>New evidence URL<input name="url" type="url" required placeholder="https://"></label><button type="submit" data-tone="quiet">File appeal</button></form>` : ""}
      ${filingRows(appeals, "Appeal", config.resolveAppealMethod)}
      ${!mayOpen && !mayChallenge && !mayAppeal && !mayFinalize && !mayArchive && !challenges.length && !appeals.length ? `<p class="gl-review__empty" style="margin-top:16px">This record has no review action available in status ${escapeHtml(status || "UNKNOWN")}.</p>` : ""}`;

    actionsNode.querySelector('[data-action="open-window"]')?.addEventListener("click", () => transact(config.openWindowMethod, [activeId], "Challenge window"));
    actionsNode.querySelector('[data-action="finalize"]')?.addEventListener("click", () => transact(config.finalMethod, [activeId], config.finalLabel || "Finalization"));
    actionsNode.querySelector('[data-action="archive"]')?.addEventListener("click", () => transact(config.archiveMethod, [activeId], config.archiveLabel || "Archive"));
    actionsNode.querySelectorAll('[data-action="resolve-challenge"]').forEach((button) => button.addEventListener("click", () => transact(config.resolveChallengeMethod, [activeId, button.dataset.filingId], "Challenge ruling")));
    actionsNode.querySelectorAll('[data-action="resolve-appeal"]').forEach((button) => button.addEventListener("click", () => transact(config.resolveAppealMethod, [activeId, button.dataset.filingId], "Appeal ruling")));
    actionsNode.querySelector('[data-form="challenge"]')?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      transact(config.submitChallengeMethod, [activeId, String(form.get("reason") || "").trim(), String(form.get("url") || "").trim()], "Challenge filing");
    });
    actionsNode.querySelector('[data-form="appeal"]')?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      transact(config.submitAppealMethod, [activeId, String(form.get("reason") || "").trim(), String(form.get("url") || "").trim()], "Appeal filing");
    });
  }

  async function loadRecord(id) {
    const cleanId = String(id ?? "").trim();
    if (!/^\d+$/.test(cleanId)) {
      setNotice(`Enter a numeric ${config.entity.toLowerCase()} ID.`, "error");
      return;
    }
    activeId = cleanId;
    idInput.value = cleanId;
    setNotice("Reading canonical contract state.");
    try {
      const raw = await config.read(config.recordMethod, [cleanId]);
      const loaded = parseJson(raw, raw);
      if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) throw new Error("Record not found");
      record = loaded;
      [challenges, appeals] = await Promise.all([
        readList(config.challengeReadMethod || "get_challenges", cleanId),
        readList(config.appealReadMethod || "get_appeals", cleanId),
      ]);
      renderRecord();
      renderActions();
      setNotice("Canonical state loaded.", "ok");
    } catch (error) {
      record = null; challenges = []; appeals = [];
      recordNode.innerHTML = `<p class="gl-review__empty">No canonical ${escapeHtml(config.entity.toLowerCase())} record was returned for ID ${escapeHtml(cleanId)}.</p>`;
      renderActions();
      setNotice(config.fmtErr ? config.fmtErr(error) : String(error), "error");
    }
  }

  lookup.addEventListener("submit", (event) => { event.preventDefault(); loadRecord(idInput.value); });
  window.addEventListener("gl:review-record", (event) => loadRecord(event.detail?.id));

  (async () => {
    try {
      const count = Number(await config.read(config.countMethod));
      if (Number.isFinite(count) && count > 0) await loadRecord(String(count - 1));
      else {
        recordNode.innerHTML = `<p class="gl-review__empty">No ${escapeHtml(config.entity.toLowerCase())} records exist yet. Create one in the product workflow above, then return here for review.</p>`;
        actionsNode.innerHTML = `<p class="gl-review__empty">The review lifecycle starts after the first record is created and reviewed.</p>`;
        setNotice("Canonical contract is reachable; record count is zero.", "ok");
      }
    } catch (error) {
      recordNode.innerHTML = `<p class="gl-review__empty">The canonical contract could not be read.</p>`;
      actionsNode.innerHTML = `<p class="gl-review__empty">Check the selected network and contract address, then retry.</p>`;
      setNotice(config.fmtErr ? config.fmtErr(error) : String(error), "error");
    }
  })();

  return { loadRecord };
}
