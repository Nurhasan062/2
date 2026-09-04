// Attendance is tracked in memory only for this browser tab.
// (No localStorage — see the note at the bottom of the page.)

const SUBJECTS = ["CSE111", "CSE326", "INT108", "INT335", "MTH165", "MEC136"];
const TARGET_PCT = 75;

// state: { CODE: { attended: n, total: n, lastAction: 'present'|'absent'|null } }
const state = {};
SUBJECTS.forEach(code => {
  state[code] = { attended: 0, total: 0, lastAction: null };
});

const log = []; // { code, action, time }

const registerEl = document.getElementById("register");
const overallPctEl = document.getElementById("overallPct");
const overallDetailEl = document.getElementById("overallDetail");
const ledgerListEl = document.getElementById("ledgerList");
const ledgerEmptyEl = document.getElementById("ledgerEmpty");

function pctClass(pct) {
  if (pct === null) return "";
  if (pct >= TARGET_PCT) return "ok";
  if (pct >= TARGET_PCT - 10) return "warn";
  return "bad";
}

function computePct(entry) {
  if (entry.total === 0) return null;
  return Math.round((entry.attended / entry.total) * 100);
}

function buildRows() {
  registerEl.innerHTML = "";
  SUBJECTS.forEach(code => {
    const row = document.createElement("div");
    row.className = "subject-row";
    row.dataset.code = code;
    row.innerHTML = `
      <div class="subject-code">${code}</div>
      <div class="subject-stats">
        <span class="subject-count" data-role="count"></span>
        <div class="bar-track"><div class="bar-fill" data-role="bar"></div></div>
        <span class="subject-pct" data-role="pct"></span>
      </div>
      <div class="subject-actions">
        <button class="btn btn-present" type="button" data-action="present">+ Present</button>
        <button class="btn btn-absent" type="button" data-action="absent">+ Absent</button>
        <button class="btn-undo" type="button" data-action="undo" disabled>Undo</button>
      </div>
    `;
    registerEl.appendChild(row);
  });
}

function renderRow(code) {
  const row = registerEl.querySelector(`.subject-row[data-code="${code}"]`);
  const entry = state[code];
  const pct = computePct(entry);
  const cls = pctClass(pct);

  row.querySelector('[data-role="count"]').textContent =
    `${entry.attended} of ${entry.total} attended`;

  const pctEl = row.querySelector('[data-role="pct"]');
  pctEl.textContent = pct === null ? "—" : `${pct}%`;
  pctEl.className = `subject-pct ${cls}`;

  const barEl = row.querySelector('[data-role="bar"]');
  barEl.style.width = pct === null ? "0%" : `${pct}%`;
  barEl.className = `bar-fill ${cls === "warn" ? "warn" : cls === "bad" ? "bad" : ""}`;

  row.querySelector('[data-action="undo"]').disabled = !entry.lastAction;
}

function renderOverall() {
  const totals = Object.values(state).reduce(
    (acc, e) => {
      acc.attended += e.attended;
      acc.total += e.total;
      return acc;
    },
    { attended: 0, total: 0 }
  );
  const pct = totals.total === 0 ? null : Math.round((totals.attended / totals.total) * 100);
  overallPctEl.textContent = pct === null ? "—" : `${pct}%`;
  overallPctEl.style.color =
    pct === null ? "" : pct >= TARGET_PCT ? "var(--present)" : pct >= TARGET_PCT - 10 ? "var(--warn)" : "var(--absent)";
  overallDetailEl.textContent = `${totals.attended} of ${totals.total} classes attended`;
}

function renderLedger() {
  if (log.length === 0) {
    ledgerListEl.innerHTML = "";
    ledgerListEl.appendChild(ledgerEmptyEl);
    return;
  }
  ledgerListEl.innerHTML = "";
  log
    .slice()
    .reverse()
    .forEach(entry => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${entry.code} — <span class="ledger-tag ${entry.action}">${entry.action === "present" ? "Present" : "Absent"}</span></span>
        <span class="ledger-time">${entry.time}</span>
      `;
      ledgerListEl.appendChild(li);
    });
}

function markAttendance(code, action) {
  const entry = state[code];
  entry.total += 1;
  if (action === "present") entry.attended += 1;
  entry.lastAction = action;

  log.push({
    code,
    action,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });

  renderRow(code);
  renderOverall();
  renderLedger();
}

function undoLast(code) {
  const entry = state[code];
  if (!entry.lastAction) return;
  entry.total -= 1;
  if (entry.lastAction === "present") entry.attended -= 1;

  // Remove the most recent log entry for this subject.
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].code === code) {
      log.splice(i, 1);
      break;
    }
  }
  entry.lastAction = null;

  renderRow(code);
  renderOverall();
  renderLedger();
}

registerEl.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const row = e.target.closest(".subject-row");
  const code = row.dataset.code;
  const action = btn.dataset.action;

  if (action === "present" || action === "absent") {
    markAttendance(code, action);
  } else if (action === "undo") {
    undoLast(code);
  }
});

document.getElementById("clearLogBtn").addEventListener("click", () => {
  log.length = 0;
  renderLedger();
});

document.getElementById("resetAllBtn").addEventListener("click", () => {
  if (!confirm("Reset attendance for all subjects? This cannot be undone.")) return;
  SUBJECTS.forEach(code => {
    state[code] = { attended: 0, total: 0, lastAction: null };
    renderRow(code);
  });
  log.length = 0;
  renderOverall();
  renderLedger();
});

buildRows();
SUBJECTS.forEach(renderRow);
renderOverall();
renderLedger();
