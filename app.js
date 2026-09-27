(() => {
  const DURATION_MS = 150 * 60 * 1000; // 150 minutes
  const STORAGE_KEY = "agentic-ai-exam-v1";
  const LETTERS = ["A", "B", "C", "D"];

  // The supplied question paper has no answer key. Fill this in (e.g. {1: "B", 2: "C"})
  // to have the result screen show a score; otherwise only attempts are reported.
  const ANSWER_KEY = {};

  const $ = (id) => document.getElementById(id);
  const sections = [...new Set(QUESTIONS.map((q) => q.s))];

  let state = load() || freshState();
  let tick = null;

  function freshState() {
    return { status: "idle", name: "", endsAt: 0, current: 0, answers: {}, review: {}, visited: {} };
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }

  // ---------- Timer ----------
  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function renderTimer() {
    const left = state.status === "running" ? state.endsAt - Date.now() : state.status === "idle" ? DURATION_MS : 0;
    $("timerValue").textContent = formatTime(left);
    const timer = $("timer");
    timer.classList.toggle("warn", state.status === "running" && left <= 15 * 60 * 1000 && left > 5 * 60 * 1000);
    timer.classList.toggle("danger", state.status === "running" && left <= 5 * 60 * 1000);
    if (state.status === "running" && left <= 0) submit(true);
  }

  function startTicking() {
    clearInterval(tick);
    renderTimer();
    tick = setInterval(renderTimer, 250);
  }

  // ---------- Screens ----------
  function show(screen) {
    for (const id of ["startScreen", "examScreen", "resultScreen"]) $(id).classList.toggle("hidden", id !== screen);
  }

  function start() {
    state = freshState();
    state.name = $("candidateName").value.trim();
    state.status = "running";
    state.endsAt = Date.now() + DURATION_MS;
    save();
    enterExam();
  }

  function enterExam() {
    $("candidateLabel").textContent = state.name ? `Candidate: ${state.name}` : "Turns 34–36";
    show("examScreen");
    buildPalette();
    goTo(state.current);
    startTicking();
  }

  // ---------- Question view ----------
  function goTo(index) {
    state.current = Math.min(Math.max(index, 0), QUESTIONS.length - 1);
    state.visited[state.current] = true;
    save();
    renderQuestion();
    renderPalette();
  }

  function renderQuestion() {
    const i = state.current;
    const q = QUESTIONS[i];
    $("qSection").textContent = q.s;
    $("qCounter").textContent = `Question ${i + 1} of ${QUESTIONS.length}`;
    $("qText").textContent = `${q.n}. ${q.q}`;

    const box = $("options");
    box.innerHTML = "";
    q.o.forEach((text, k) => {
      const letter = LETTERS[k];
      const label = document.createElement("label");
      label.className = "option" + (state.answers[i] === letter ? " selected" : "");
      label.innerHTML = `<input type="radio" name="opt" value="${letter}"><span class="letter">${letter}</span><span></span>`;
      label.lastChild.textContent = text;
      const input = label.querySelector("input");
      input.checked = state.answers[i] === letter;
      input.addEventListener("change", () => select(letter));
      box.appendChild(label);
    });

    $("prevBtn").disabled = i === 0;
    $("nextBtn").textContent = i === QUESTIONS.length - 1 ? "Save" : "Save & next →";
    const flagged = !!state.review[i];
    $("reviewBtn").classList.toggle("on", flagged);
    $("reviewBtn").textContent = flagged ? "Unmark review" : "Mark for review";
  }

  function select(letter) {
    state.answers[state.current] = letter;
    save();
    renderQuestion();
    renderPalette();
  }

  function clearResponse() {
    delete state.answers[state.current];
    save();
    renderQuestion();
    renderPalette();
  }

  function toggleReview() {
    const i = state.current;
    if (state.review[i]) delete state.review[i]; else state.review[i] = true;
    save();
    renderQuestion();
    renderPalette();
  }

  // ---------- Palette ----------
  function buildPalette() {
    const pal = $("palette");
    pal.innerHTML = "";
    for (const s of sections) {
      const h = document.createElement("h4");
      h.textContent = s;
      const grid = document.createElement("div");
      grid.className = "grid";
      QUESTIONS.forEach((q, i) => {
        if (q.s !== s) return;
        const b = document.createElement("button");
        b.className = "pal";
        b.textContent = q.n;
        b.dataset.index = i;
        b.addEventListener("click", () => goTo(i));
        grid.appendChild(b);
      });
      pal.append(h, grid);
    }
  }

  function renderPalette() {
    for (const b of $("palette").querySelectorAll(".pal")) {
      const i = Number(b.dataset.index);
      b.className = "pal";
      if (state.review[i]) b.classList.add("review");
      else if (state.answers[i]) b.classList.add("answered");
      else if (state.visited[i]) b.classList.add("visited");
      if (i === state.current) b.classList.add("current");
    }
    const answered = Object.keys(state.answers).length;
    const review = Object.keys(state.review).length;
    $("stats").innerHTML =
      `<div><b>${answered}</b>Answered</div>` +
      `<div><b>${QUESTIONS.length - answered}</b>Remaining</div>` +
      `<div><b>${review}</b>For review</div>`;
  }

  // ---------- Submit & results ----------
  function askSubmit() {
    const answered = Object.keys(state.answers).length;
    const unanswered = QUESTIONS.length - answered;
    const review = Object.keys(state.review).length;
    $("confirmText").textContent =
      `You have answered ${answered} of ${QUESTIONS.length} questions` +
      (unanswered ? ` (${unanswered} unanswered)` : "") +
      (review ? ` and ${review} marked for review` : "") +
      `. You cannot change your answers after submitting.`;
    $("confirmDialog").showModal();
  }

  function submit(timeUp = false) {
    if (state.status !== "running") return;
    state.status = "submitted";
    state.timeUp = timeUp;
    state.submittedAt = Date.now();
    state.timeTakenMs = Math.min(DURATION_MS, DURATION_MS - (state.endsAt - state.submittedAt));
    save();
    if ($("confirmDialog").open) $("confirmDialog").close();
    showResults();
  }

  function showResults() {
    clearInterval(tick);
    renderTimer();
    $("candidateLabel").textContent = state.name ? `Candidate: ${state.name}` : "Turns 34–36";
    show("resultScreen");

    const hasKey = Object.keys(ANSWER_KEY).length > 0;
    const answered = Object.keys(state.answers).length;
    let score = 0;
    QUESTIONS.forEach((q, i) => { if (hasKey && ANSWER_KEY[q.n] === state.answers[i]) score++; });

    $("resultNote").textContent =
      (state.timeUp ? "Time is up — your exam was submitted automatically. " : "") +
      (hasKey ? "" : "The question paper has no answer key, so only attempts are shown. Download your responses for evaluation.");

    $("resultSummary").innerHTML =
      `<div><b>${answered}</b>Attempted</div>` +
      `<div><b>${QUESTIONS.length - answered}</b>Not attempted</div>` +
      `<div><b>${formatTime(state.timeTakenMs || 0)}</b>Time taken</div>` +
      (hasKey ? `<div><b>${score} / ${QUESTIONS.length}</b>Score</div>` : "");

    $("scoreHead").classList.toggle("hidden", !hasKey);
    const rows = $("sectionRows");
    rows.innerHTML = "";
    for (const s of sections) {
      let total = 0, att = 0, sc = 0;
      QUESTIONS.forEach((q, i) => {
        if (q.s !== s) return;
        total++;
        if (state.answers[i]) att++;
        if (hasKey && ANSWER_KEY[q.n] === state.answers[i]) sc++;
      });
      const tr = document.createElement("tr");
      tr.innerHTML = `<td></td><td>${total}</td><td>${att}</td>` + (hasKey ? `<td>${sc}</td>` : "");
      tr.firstChild.textContent = s;
      rows.appendChild(tr);
    }
  }

  function downloadCsv() {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Question", "Section", "Question text", "Your answer", "Your answer text", "Marked for review"].map(esc).join(",")];
    QUESTIONS.forEach((q, i) => {
      const a = state.answers[i] || "";
      const text = a ? q.o[LETTERS.indexOf(a)] : "";
      lines.push([q.n, q.s, q.q, a, text, state.review[i] ? "Yes" : "No"].map(esc).join(","));
    });
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const who = (state.name || "candidate").replace(/[^\w-]+/g, "_");
    a.download = `agentic-ai-exam-${who}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function restart() {
    if (!confirm("Start a new attempt? Your current responses will be cleared from this browser.")) return;
    state = freshState();
    save();
    $("candidateName").value = "";
    $("candidateLabel").textContent = "Turns 34–36";
    renderTimer();
    show("startScreen");
  }

  // ---------- Wiring ----------
  $("startBtn").addEventListener("click", start);
  $("candidateName").addEventListener("keydown", (e) => { if (e.key === "Enter") start(); });
  $("prevBtn").addEventListener("click", () => goTo(state.current - 1));
  $("nextBtn").addEventListener("click", () => goTo(state.current + 1));
  $("clearBtn").addEventListener("click", clearResponse);
  $("reviewBtn").addEventListener("click", toggleReview);
  $("submitBtn").addEventListener("click", askSubmit);
  $("cancelSubmit").addEventListener("click", () => $("confirmDialog").close());
  $("confirmSubmit").addEventListener("click", () => submit(false));
  $("downloadBtn").addEventListener("click", downloadCsv);
  $("restartBtn").addEventListener("click", restart);

  document.addEventListener("keydown", (e) => {
    if (state.status !== "running" || $("confirmDialog").open || e.target.tagName === "INPUT" && e.target.type === "text") return;
    const k = e.key.toUpperCase();
    if (LETTERS.includes(k)) select(k);
    else if (e.key === "ArrowRight") goTo(state.current + 1);
    else if (e.key === "ArrowLeft") goTo(state.current - 1);
  });

  window.addEventListener("beforeunload", (e) => {
    if (state.status === "running") e.preventDefault();
  });

  // Resume where the candidate left off (the deadline is absolute, so reloading does not pause the clock).
  if (state.status === "running") {
    if (Date.now() >= state.endsAt) { submit(true); }
    else enterExam();
  } else if (state.status === "submitted") {
    showResults();
  } else {
    renderTimer();
    show("startScreen");
  }
})();
