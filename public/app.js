import { makeReader, write, connectWallet, activeAccount, balanceOf, short, toGen, GEN, fmtErr }
  from "./shared/genlayer-lite.js";

const CONTRACT = "0x74814E96e2dF5d46E7404e0d4606CD6428fE5925";
const EXPLORER = "https://explorer-studio.genlayer.com/address/" + CONTRACT;
const { read } = makeReader(CONTRACT);
const B_OPEN = 0, B_PAID = 1, B_CANCELLED = 2;
const SUB_PENDING = 0, SUB_ACCEPTED = 1, SUB_REJECTED = 2;
const BSTAT = ["Open", "Paid", "Cancelled"];
const BCLS = ["bs-open", "bs-paid", "bs-cancelled"];
const SSTAT = ["Pending", "Accepted", "Rejected"];
const SCLS = ["sb-pending", "sb-accepted", "sb-rejected"];
let account = null, bounties = [], submissions = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

$("contractLink").href = EXPLORER;
$("contractLink").textContent = "Contract " + short(CONTRACT) + " ->";
$("contractLink").target = "_blank";
$("contractLink").rel = "noopener";

function toast(msg, kind = "", title = "tribune") {
  const el = document.createElement("div"); el.className = "toast " + kind;
  el.innerHTML = `<span class="tt">${title}</span>`; el.appendChild(document.createTextNode(msg));
  $("log").appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 15000 : 5000);
}

async function refreshWallet() {
  account = await activeAccount();
  const slot = $("walletslot");
  if (account) { let bal = 0n; try { bal = await balanceOf(account); } catch (_) {} slot.innerHTML = `<span class="mono" style="font-size:12.5px;color:var(--txt2)">${short(account)} / ${toGen(bal)} GEN</span>`; }
  else { slot.innerHTML = `<button class="btn ghost sm" id="connectBtn">Connect</button>`; $("connectBtn").onclick = doConnect; }
}
async function doConnect() { try { account = await connectWallet(); toast("Connected on studionet.", "ok"); await refreshWallet(); } catch (e) { toast(fmtErr(e), "err"); } }
async function ensureWallet() { if (!account) account = await connectWallet(); await refreshWallet(); }

const subsFor = (bid) => submissions.filter((s) => Number(s.bounty_id) === bid);

async function load() {
  try {
    const bc = Number(await read("get_bounty_count"));
    const bs = [];
    for (let i = 0; i < bc; i++) bs.push({ id: i, ...(await read("get_bounty", [i])) });
    const sc = Number(await read("get_submission_count"));
    const ss = [];
    for (let i = 0; i < sc; i++) ss.push({ id: i, ...(await read("get_submission", [i])) });
    bounties = bs; submissions = ss; renderList(); fillTerm();
    $("bCount").textContent = bc + (bc === 1 ? " bounty" : " bounties");
    $("stOpen").textContent = bs.filter((b) => Number(b.status) === B_OPEN).length;
    $("stReward").textContent = toGen(bs.filter((b) => Number(b.status) === B_OPEN).reduce((a, b) => a + BigInt(b.reward), 0n).toString());
    $("stPaid").textContent = bs.filter((b) => Number(b.status) === B_PAID).length;
  } catch (e) { $("bountyList").innerHTML = `<div class="b-empty">Could not reach the chain. ${fmtErr(e)}</div>`; }
}

function fillTerm() {
  const judged = submissions.find((s) => Number(s.status) !== SUB_PENDING);
  if (!judged) return;
  const ok = Number(judged.status) === SUB_ACCEPTED;
  $("tSid").textContent = judged.id;
  const v = $("tVerdict"); v.textContent = ok ? "verdict: PASS - reward released" : "verdict: FAIL";
  v.className = ok ? "tc-g" : "tc-dim";
  $("tReason").textContent = judged.rationale ? "// " + judged.rationale.slice(0, 120) : "";
  $("tReason").style.color = "var(--faint)";
}

function renderList() {
  const el = $("bountyList");
  if (!bounties.length) { el.innerHTML = `<div class="b-empty">No bounties yet. Post the first one.</div>`; return; }
  el.innerHTML = "";
  [...bounties].reverse().forEach((b) => {
    const st = Number(b.status); const subs = subsFor(b.id);
    const card = document.createElement("div"); card.className = "bounty";
    card.innerHTML = `
      <div class="bounty-top"><span class="bounty-title">${esc(b.title)}</span><span class="bstatus ${BCLS[st]}">${BSTAT[st]}</span></div>
      <div class="bounty-spec">${esc(b.spec)}</div>
      <div class="bounty-foot"><span class="bounty-reward">${toGen(b.reward)} GEN</span><span class="bounty-subs">${subs.length} submission${subs.length === 1 ? "" : "s"}</span></div>`;
    card.onclick = () => openDetail(b.id);
    el.appendChild(card);
  });
}

function openDrawer() { $("scrim").classList.add("on"); $("drawer").classList.add("on"); }
function closeDrawer() { $("scrim").classList.remove("on"); $("drawer").classList.remove("on"); }

function openNew() {
  $("drawerTitle").textContent = "$ tribune post";
  $("drawerBody").innerHTML = `
    <div class="cmd">
      <div class="cl"><span class="cp">tribune&gt;</span> post <input id="nTitle" class="ci wide" placeholder="bounty title" autocomplete="off" /></div>
      <div class="cl"><span class="cp">&nbsp;&nbsp;--reward</span> <input id="nReward" class="ci sm" type="number" min="0" step="0.5" value="5" /> GEN</div>
      <div class="cl"><span class="cp">&nbsp;&nbsp;--spec</span></div>
      <textarea id="nSpec" class="ci-area" placeholder="Exactly what a valid solution must satisfy. The AI judges submissions against this."></textarea>
      <button class="btn primary block" id="createBtn">&#9656; LOCK REWARD &amp; POST</button>
    </div>`;
  $("createBtn").onclick = doCreate; openDrawer();
}

function openDetail(id) {
  const b = bounties.find((x) => x.id === id); if (!b) return;
  const st = Number(b.status); const subs = subsFor(id);
  $("drawerTitle").textContent = "Bounty #" + id;
  const isSponsor = account && account.toLowerCase() === b.sponsor.toLowerCase();
  let verdict = "";
  if (st === B_PAID) verdict = `<div class="verdict-box vb-ok"><b>Solved & paid.</b> Winner ${short(b.winner)}. ${b.rationale ? esc(b.rationale) : ""}</div>`;
  const subsHtml = subs.length ? subs.map((s) => {
    const ss = Number(s.status);
    const canJudge = st === B_OPEN && ss === SUB_PENDING;
    return `<div class="sub"><div class="sub-top"><span class="sub-solver">${short(s.solver)}</span><span class="sub-badge ${SCLS[ss]}">${SSTAT[ss]}</span></div>
      <a class="sub-url" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)} \u2197</a>
      ${s.rationale ? `<div class="sub-reason">${esc(s.rationale)}</div>` : ""}
      ${canJudge ? `<button class="btn primary sm judgeBtn" data-sid="${s.id}" style="margin-top:8px"><i class="ph-bold ph-gavel"></i> Run AI judging</button>` : ""}</div>`;
  }).join("") : `<p class="hint">No submissions yet.</p>`;
  const submitForm = st === B_OPEN
    ? `<label>Submit a solution URL</label><input id="solUrl" placeholder="https://github.com/you/solution" /><button class="btn line block" id="submitBtn"><i class="ph-bold ph-paper-plane-tilt"></i> Submit solution</button>`
    : "";
  const cancelBtn = (st === B_OPEN && isSponsor) ? `<button class="btn ghost block" id="cancelBtn" style="margin-top:8px">Cancel & refund reward</button>` : "";
  $("drawerBody").innerHTML = `
    <div class="d-title">${esc(b.title)}</div>
    <div class="d-reward">${toGen(b.reward)} GEN</div>
    ${verdict}
    <div class="d-spec">${esc(b.spec)}</div>
    <div class="kv"><span class="k">SPONSOR</span><span class="v mono">${short(b.sponsor)}</span></div>
    <div style="margin:16px 0 6px;font-weight:600;color:var(--txt);font-size:14px">Submissions</div>
    ${subsHtml}
    <div style="margin-top:16px">${submitForm}${cancelBtn}</div>`;
  openDrawer();
  document.querySelectorAll(".judgeBtn").forEach((btn) => btn.onclick = () => doJudge(Number(btn.dataset.sid)));
  if ($("submitBtn")) $("submitBtn").onclick = () => doSubmit(id);
  if ($("cancelBtn")) $("cancelBtn").onclick = () => doCancel(id);
}

async function doCreate() {
  const title = $("nTitle").value.trim(), spec = $("nSpec").value.trim(), reward = parseFloat($("nReward").value);
  if (!title) return toast("Give the bounty a title.", "err");
  if (!spec) return toast("Write the spec.", "err");
  if (!(reward > 0)) return toast("Reward must be above zero.", "err");
  const btn = $("createBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> posting';
  try { await ensureWallet(); await write(CONTRACT, "post_bounty", [title, spec], GEN(reward)); toast("Bounty posted.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.innerHTML = "Post & lock reward"; }
}
async function doSubmit(id) {
  const url = $("solUrl").value.trim(); if (!url) return toast("Enter the solution URL.", "err");
  const btn = $("submitBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> submitting';
  try { await ensureWallet(); await write(CONTRACT, "submit_solution", [id, url]); toast("Solution submitted.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.textContent = "Submit solution"; }
}
async function doJudge(sid) {
  if (!confirm("Run AI judging? Validators read the submission against the spec. Calls a real LLM; passing pays the solver.")) return;
  toast("Validators judging the submission...", "", "judge");
  try { await ensureWallet(); await write(CONTRACT, "judge", [sid]); toast("Judged on-chain.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); }
}
async function doCancel(id) {
  const btn = $("cancelBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> cancelling';
  try { await ensureWallet(); await write(CONTRACT, "cancel_bounty", [id]); toast("Bounty cancelled, reward refunded.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.textContent = "Cancel & refund reward"; }
}

$("heroPostBtn").onclick = openNew;
$("ctaPostBtn").onclick = openNew;
$("navPostBtn").onclick = openNew;
$("refreshBtn").onclick = load;
$("closeDrawer").onclick = closeDrawer;
$("scrim").onclick = closeDrawer;
const _cb = $("connectBtn"); if (_cb) _cb.onclick = doConnect;
if (window.ethereum) window.ethereum.on?.("accountsChanged", refreshWallet);

refreshWallet();
load();

// ====== green grid/particle field (Three.js, dev aesthetic) ======
(function grid() {
  const canvas = $("gridCanvas"); if (!canvas || !window.THREE) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight || 500; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  const GREEN = 0x3ecf8e;
  const N = 26, COLS = 26; const pts = new Float32Array(N * COLS * 3);
  let i = 0;
  for (let x = 0; x < COLS; x++) for (let y = 0; y < N; y++) { pts[i++] = (x - COLS / 2) * 0.9; pts[i++] = (y - N / 2) * 0.7; pts[i++] = (Math.random() - .5) * 2; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const dots = new THREE.Points(g, new THREE.PointsMaterial({ color: GREEN, size: .05, transparent: true, opacity: .5 }));
  scene.add(dots);

  resize(); addEventListener("resize", resize);
  let t = 0, running = true;
  const vis = new IntersectionObserver((es) => { running = es[0].isIntersecting; if (running) loop(); }, { threshold: 0 });
  vis.observe(canvas);
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop); t += 0.012;
    const p = g.attributes.position.array;
    for (let k = 0; k < p.length; k += 3) p[k + 2] = Math.sin(t + p[k] * 0.4 + p[k + 1] * 0.3) * 1.1;
    g.attributes.position.needsUpdate = true;
    dots.rotation.x = -0.5 + Math.sin(t * 0.1) * 0.06; dots.rotation.z = Math.sin(t * 0.08) * 0.05;
    renderer.render(scene, camera);
  }
  loop();
})();
