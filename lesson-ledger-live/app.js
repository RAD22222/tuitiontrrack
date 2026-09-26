(function () {
  "use strict";

  const { getCycles, toggleAttendance, totals } = window.TuitionDomain;
  const STORAGE_KEY = "lesson-ledger-v1";
  const COLORS = [
    { name: "Fern", value: "#2f785f" },
    { name: "Persimmon", value: "#e46d52" },
    { name: "Marigold", value: "#d89c2c" },
    { name: "Lagoon", value: "#438a94" },
    { name: "Berry", value: "#a24e6a" },
    { name: "Olive", value: "#78834a" },
  ];
  const today = new Date();
  const todayKey = dateKey(today);
  let state = loadState();
  let selectedDate = todayKey;
  let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let currentView = "home";
  let toastTimer;
  let lastMarkedKey = "";
  let popPct = false;
  let monthSlideDir = "";
  let viewSlideDir = "";
  let deferredInstallPrompt = null;
  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const elements = {
    homeScreen: document.querySelector("#homeScreen"),
    historyScreen: document.querySelector("#historyScreen"),
    calendarGrid: document.querySelector("#calendarGrid"),
    monthLabel: document.querySelector("#monthLabel"),
    tuitionPicker: document.querySelector("#tuitionPicker"),
    tuitionList: document.querySelector("#tuitionList"),
    historyList: document.querySelector("#historyList"),
    dialog: document.querySelector("#tuitionDialog"),
    form: document.querySelector("#tuitionForm"),
    toast: document.querySelector("#toast"),
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.tuitions)) {
        return {
          tuitions: saved.tuitions,
          attendance:
            saved.attendance && typeof saved.attendance === "object"
              ? saved.attendance
              : {},
          selectedTuitionId: saved.selectedTuitionId || "",
        };
      }
    } catch (error) {
      console.warn("Saved tuition data could not be read.", error);
    }
    return {
      tuitions: [],
      attendance: {},
      selectedTuitionId: "",
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("Changes could not be saved on this device.");
      console.error("Tuition data could not be saved.", error);
    }
  }

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function formatMoney(amount) {
    return `৳${Math.round(Number(amount) || 0).toLocaleString("en-BD")}`;
  }

  function formatDate(key, options) {
    return new Intl.DateTimeFormat(
      "en-BD",
      options || { day: "numeric", month: "short", year: "numeric" },
    ).format(parseDate(key));
  }

  function activeTuitions() {
    return state.tuitions.filter((tuition) => !tuition.archivedAt);
  }

  function selectedTuition() {
    return (
      state.tuitions.find(
        (tuition) =>
          tuition.id === state.selectedTuitionId && !tuition.archivedAt,
      ) ||
      activeTuitions()[0] ||
      null
    );
  }

  function cyclesFor(tuition) {
    return getCycles(tuition, state.attendance[tuition.id]);
  }

  function currentCycle(tuition) {
    const cycles = cyclesFor(tuition);
    return cycles[cycles.length - 1];
  }

  function render() {
    if (!selectedTuition() && state.selectedTuitionId)
      state.selectedTuitionId = "";
    renderTopbar();
    renderNavigation();
    renderCalendar();
    renderSelectedDate();
    renderTuitionPicker();
    renderCurrentCycle();
    renderTuitionList();
    renderHistory();
  }

  function renderTopbar() {
    document.querySelector("#topbarDate").textContent = new Intl.DateTimeFormat(
      "en-BD",
      { weekday: "short", day: "numeric", month: "short" },
    ).format(today);
  }

  function renderNavigation() {
    for (const button of document.querySelectorAll("[data-view]")) {
      button.classList.toggle("is-active", button.dataset.view === currentView);
    }
    elements.homeScreen.hidden = currentView !== "home";
    elements.historyScreen.hidden = currentView !== "history";
    const activeScreen =
      currentView === "home" ? elements.homeScreen : elements.historyScreen;
    if (!prefersReducedMotion && viewSlideDir) {
      activeScreen.classList.remove(
        "is-entering",
        "is-entering-from-left",
        "is-entering-from-right",
      );
      void activeScreen.offsetWidth;
      activeScreen.classList.add(
        viewSlideDir === "right"
          ? "is-entering-from-right"
          : "is-entering-from-left",
      );
      setTimeout(
        () =>
          activeScreen.classList.remove(
            "is-entering",
            "is-entering-from-left",
            "is-entering-from-right",
          ),
        360,
      );
      viewSlideDir = "";
    }
  }

  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    elements.monthLabel.textContent = new Intl.DateTimeFormat("en-BD", {
      month: "long",
      year: "numeric",
    }).format(currentMonth);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let markup = dayNames
      .map((day) => `<div class="weekday" role="columnheader">${day}</div>`)
      .join("");

    for (let index = 0; index < firstDay; index += 1)
      markup +=
        '<div class="calendar-blank" role="gridcell" aria-hidden="true"></div>';
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = dateKey(new Date(year, month, day));
      const isSelected = key === selectedDate;
      const isToday = key === todayKey;
      const attendees = state.tuitions.filter((tuition) =>
        (state.attendance[tuition.id] || []).includes(key),
      );
      const selectedMarked = Boolean(
        selectedTuition() &&
        (state.attendance[selectedTuition().id] || []).includes(key),
      );
      const dots = attendees
        .slice(0, 3)
        .map(
          (tuition) =>
            `<i class="day-dot" style="--dot-color:${tuition.color}" aria-hidden="true"></i>`,
        )
        .join("");
      const names = attendees.map((tuition) => tuition.name).join(", ");
      const label = `${formatDate(key, { weekday: "long", day: "numeric", month: "long" })}${names ? `, lessons: ${names}` : ", no lessons marked"}`;
      markup += `<button class="calendar-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}${selectedMarked ? " has-selected-tuition" : ""}" type="button" role="gridcell" aria-label="${escapeHtml(label)}" aria-pressed="${selectedMarked}" data-date="${key}"><span class="day-number">${day}</span><span class="day-dots">${dots}${attendees.length > 3 ? `<b>+${attendees.length - 3}</b>` : ""}</span></button>`;
    }
    elements.calendarGrid.innerHTML = markup;
    renderLegend();
    if (!prefersReducedMotion && monthSlideDir) {
      elements.calendarGrid.classList.remove("slide-next", "slide-prev");
      void elements.calendarGrid.offsetWidth;
      elements.calendarGrid.classList.add(
        monthSlideDir === "next" ? "slide-next" : "slide-prev",
      );
      elements.monthLabel.classList.remove("month-tick");
      void elements.monthLabel.offsetWidth;
      elements.monthLabel.classList.add("month-tick");
      setTimeout(
        () =>
          elements.calendarGrid.classList.remove("slide-next", "slide-prev"),
        320,
      );
      monthSlideDir = "";
    }
    if (lastMarkedKey) {
      const marked = elements.calendarGrid.querySelector(
        `[data-date="${lastMarkedKey}"]`,
      );
      if (marked) {
        marked.classList.add("just-marked");
        setTimeout(() => marked.classList.remove("just-marked"), 420);
      }
      lastMarkedKey = "";
    }
  }

  function renderLegend() {
    const active = activeTuitions();
    document.querySelector("#calendarLegend").innerHTML = active.length
      ? active
          .map(
            (tuition) =>
              `<span class="legend-item"><i style="--dot-color:${tuition.color}"></i>${escapeHtml(tuition.name)}</span>`,
          )
          .join("")
      : '<span class="legend-empty">Add a tuition to begin marking lessons.</span>';
  }

  function renderSelectedDate() {
    const tuition = selectedTuition();
    const attendees = state.tuitions.filter((item) =>
      (state.attendance[item.id] || []).includes(selectedDate),
    );
    const names = attendees.length
      ? attendees
          .map(
            (item) =>
              `<span class="date-attendee"><i style="--dot-color:${item.color}"></i>${escapeHtml(item.name)}</span>`,
          )
          .join("")
      : '<span class="no-attendance">No lessons marked</span>';
    const hint = tuition
      ? `Tap any day to toggle ${escapeHtml(tuition.name)} — tap again to undo.`
      : "Add a tuition to start tracking lessons.";
    document.querySelector("#selectedDateSummary").innerHTML =
      `<div class="selected-date-copy"><strong>${formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</strong><span>${hint}</span></div><div class="date-attendees">${names}</div>`;
  }

  function renderTuitionPicker() {
    const active = activeTuitions();
    if (
      active.length &&
      !active.some((tuition) => tuition.id === state.selectedTuitionId)
    )
      state.selectedTuitionId = active[0].id;
    const tuition = selectedTuition();
    elements.tuitionPicker.innerHTML = active.length
      ? active
          .map(
            (item) =>
              `<option value="${item.id}" ${item.id === tuition?.id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.subject)}</option>`,
          )
          .join("")
      : '<option value="">No tuitions yet</option>';
    elements.tuitionPicker.disabled = active.length === 0;
    document
      .querySelector("#focusColor")
      .style.setProperty("--focus-color", tuition?.color || "transparent");
  }

  function renderCurrentCycle() {
    const tuition = selectedTuition();
    const panel = document.querySelector("#currentCyclePanel");
    if (!tuition) {
      panel.innerHTML =
        '<div class="cycle-empty"><span class="empty-calendar-mark" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></span><h3>Start with one tuition</h3><p>Add a student and lesson plan. Your attendance calendar is ready.</p><button class="button button-dark" type="button" data-action="create">Add first tuition</button></div>';
      return;
    }
    const cycle = currentCycle(tuition);
    const progress = Math.min(
      100,
      Math.round((cycle.lessons / cycle.quota) * 100),
    );
    const remaining = Math.max(0, cycle.quota - cycle.lessons);
    const start = cycle.dates[0] ? formatDate(cycle.dates[0]) : "Not started";
    const finish = cycle.dates[cycle.dates.length - 1]
      ? formatDate(cycle.dates[cycle.dates.length - 1])
      : "—";
    const remainingCopy = cycle.complete
      ? "Cycle complete — a fresh cycle has started."
      : remaining === 0
        ? "Cycle complete."
        : remaining === 1
          ? "1 lesson to go to complete this cycle."
          : `${remaining} lessons to go to complete this cycle.`;
    panel.innerHTML = `<div class="cycle-meta"><span class="cycle-badge" style="--tuition-color:${tuition.color}">${escapeHtml(tuition.name)} ${String(cycle.number).padStart(2, "0")}</span><span class="cycle-status">${cycle.complete ? "Completed" : "In progress"}</span></div><div class="cycle-progress-label"><strong>${cycle.lessons}<span>/${cycle.quota}</span></strong><span>lessons this cycle</span><span class="cycle-pct">${progress}%</span></div><div class="progress-track" role="progressbar" aria-label="Cycle lesson progress" aria-valuemin="0" aria-valuemax="${cycle.quota}" aria-valuenow="${cycle.lessons}"><span style="width:${progress}%;--tuition-color:${tuition.color}"></span></div><div class="cycle-money"><div><span>Earned this cycle</span><strong>${formatMoney(cycle.earned)}<small> / ${formatMoney(tuition.fee)}</small></strong></div><div class="cycle-date-range"><span>Started · ${start}</span><span>Last · ${finish}</span></div></div><div class="cycle-remaining">${remainingCopy}</div>`;
    if (!prefersReducedMotion && popPct) {
      const pct = panel.querySelector(".cycle-pct");
      if (pct) {
        pct.classList.add("pop");
        setTimeout(() => pct.classList.remove("pop"), 360);
      }
      const focus = document.querySelector("#focusColor");
      if (focus) {
        focus.classList.remove("pulse");
        void focus.offsetWidth;
        focus.classList.add("pulse");
        setTimeout(() => focus.classList.remove("pulse"), 460);
      }
      popPct = false;
    }
  }

  function renderTuitionList() {
    const active = activeTuitions();
    document.querySelector("#tuitionCount").textContent =
      `${active.length} ${active.length === 1 ? "tuition" : "tuitions"}`;
    elements.tuitionList.innerHTML = active.length
      ? active
          .map((tuition) => {
            const cycle = currentCycle(tuition);
            const progress = Math.min(
              100,
              Math.round((cycle.lessons / cycle.quota) * 100),
            );
            const selected = tuition.id === selectedTuition()?.id;
            return `<article class="tuition-row${selected ? " is-current" : ""}" style="--tuition-color:${tuition.color}"><button class="tuition-select" type="button" data-select-tuition="${tuition.id}" aria-pressed="${selected}"><span class="tuition-swatch"></span><span class="tuition-main"><strong>${escapeHtml(tuition.name)}</strong><small>${escapeHtml(tuition.subject)}</small></span><span class="tuition-cycle"><strong>${String(cycle.number).padStart(2, "0")}</strong><small>cycle</small></span><span class="tuition-progress"><span>${cycle.lessons}/${cycle.quota} lessons</span><i><b style="width:${progress}%"></b></i></span><span class="tuition-amount"><strong>${formatMoney(cycle.earned)}</strong><small>of ${formatMoney(tuition.fee)}</small></span></button><div class="row-actions"><button type="button" class="text-action" data-edit="${tuition.id}">Edit</button><button type="button" class="text-action text-action-muted" data-archive="${tuition.id}">Archive</button></div></article>`;
          })
          .join("")
      : '<div class="empty-roster"><p>Your roster is empty.</p><button class="text-action" type="button" data-action="create">Add your first tuition</button></div>';

    const completed = state.tuitions
      .flatMap((tuition) =>
        cyclesFor(tuition)
          .filter((cycle) => cycle.complete)
          .map((cycle) => ({ tuition, cycle })),
      )
      .sort((a, b) =>
        (b.cycle.dates.at(-1) || "").localeCompare(a.cycle.dates.at(-1) || ""),
      );
    const section = document.querySelector("#completedSection");
    section.hidden = completed.length === 0;
    document.querySelector("#completedList").innerHTML = completed
      .slice(0, 8)
      .map(
        ({ tuition, cycle }) =>
          `<div class="completed-row"><i style="--dot-color:${tuition.color}"></i><span><strong>${escapeHtml(tuition.name)} ${String(cycle.number).padStart(2, "0")}</strong><small>${cycle.dates.length ? `${formatDate(cycle.dates[0])} – ${formatDate(cycle.dates.at(-1))}` : "No dates"}</small></span><span class="completed-lessons">${cycle.lessons}/${cycle.quota}</span><strong class="completed-money">${formatMoney(cycle.earned)}</strong></div>`,
      )
      .join("");
    if (!prefersReducedMotion) {
      applyStagger(elements.tuitionList, ".tuition-row", 55, 330);
      applyStagger(
        document.querySelector("#completedList"),
        ".completed-row",
        40,
        240,
      );
    }
  }

  function renderHistory() {
    const report = totals(state.tuitions, state.attendance);
    document.querySelector("#reportStrip").innerHTML =
      `<div class="report-stat"><span>Earned overall</span><strong>${formatMoney(report.earned)}</strong><small>Across all cycles</small></div><div class="report-stat"><span>Attendance dates</span><strong>${report.lessons}</strong><small>Lessons marked</small></div><div class="report-stat"><span>Completed cycles</span><strong>${report.completed}</strong><small>${state.tuitions.length} tuition records</small></div>`;
    const filter = document.querySelector("#historyFilter").value;
    const shown = state.tuitions.filter(
      (tuition) =>
        filter === "all" ||
        (filter === "archived"
          ? Boolean(tuition.archivedAt)
          : !tuition.archivedAt),
    );
    elements.historyList.innerHTML = shown.length
      ? shown
          .map((tuition) => {
            const cycles = cyclesFor(tuition);
            const records = cycles
              .map((cycle) => {
                const first = cycle.dates[0]
                  ? formatDate(cycle.dates[0])
                  : "No attendance yet";
                const last = cycle.dates.at(-1)
                  ? formatDate(cycle.dates.at(-1))
                  : "Current cycle";
                return `<div class="history-cycle"><div class="history-cycle-title"><strong>${escapeHtml(tuition.name)} ${String(cycle.number).padStart(2, "0")}</strong><span class="history-status${cycle.complete ? " is-complete" : ""}">${cycle.complete ? "Complete" : "In progress"}</span></div><div class="history-cycle-detail"><span><strong>${cycle.lessons}/${cycle.quota}</strong> lessons</span><span>${first}${first === last ? "" : ` – ${last}`}</span><span>Earned <strong>${formatMoney(cycle.earned)}</strong></span></div></div>`;
              })
              .join("");
            const attendanceCount = (state.attendance[tuition.id] || []).length;
            return `<article class="history-record" style="--tuition-color:${tuition.color}"><div class="history-record-head"><div class="history-tuition-ident"><i></i><div><h3>${escapeHtml(tuition.name)} <span>${tuition.archivedAt ? "Archived" : "Active"}</span></h3><p>${escapeHtml(tuition.subject)} · ${tuition.quota} lessons · ${formatMoney(tuition.fee)} per cycle · ${attendanceCount} dates</p></div></div><div class="history-actions"><button class="text-action" type="button" data-edit="${tuition.id}">Edit</button>${tuition.archivedAt ? `<button class="text-action" type="button" data-restore="${tuition.id}">Restore</button>` : `<button class="text-action text-action-muted" type="button" data-archive="${tuition.id}">Archive</button>`}<button class="text-action text-action-danger" type="button" data-delete="${tuition.id}">Delete</button></div></div><div class="history-cycles">${records}</div></article>`;
          })
          .join("")
      : '<div class="history-empty"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg></span><h3>No tuition records here</h3><p>Add a tuition to see its attendance and earnings history.</p><button class="button button-dark" type="button" data-action="create">Add tuition</button></div>';
    if (!prefersReducedMotion) {
      applyStagger(document.querySelector("#reportStrip"), ".report-stat", 70, 210);
      applyStagger(elements.historyList, ".history-record", 70, 350);
      if (currentView === "history") animateReportNumbers();
    }
  }

  function openTuitionDialog(tuition) {
    elements.form.reset();
    document.querySelector("#formError").textContent = "";
    document.querySelector("#tuitionId").value = tuition?.id || "";
    document.querySelector("#tuitionDialogTitle").textContent = tuition
      ? "Edit tuition"
      : "Add tuition";
    document.querySelector("#saveTuitionButton").textContent = tuition
      ? "Save changes"
      : "Save tuition";
    if (tuition) {
      document.querySelector("#tuitionName").value = tuition.name;
      document.querySelector("#tuitionSubject").value = tuition.subject;
      document.querySelector("#tuitionQuota").value = tuition.quota;
      document.querySelector("#tuitionFee").value = tuition.fee;
    }
    renderColorOptions(tuition?.color || COLORS[0].value);
    elements.dialog.showModal();
    document.querySelector("#tuitionName").focus();
  }

  function renderColorOptions(selected) {
    document.querySelector("#colorOptions").innerHTML = COLORS.map(
      (color) =>
        `<label class="color-choice"><input type="radio" name="color" value="${color.value}" ${selected === color.value ? "checked" : ""}><span style="--swatch:${color.value}" aria-hidden="true"></span><small>${color.name}</small></label>`,
    ).join("");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove("is-visible");
    // force reflow so spring animation replays
    void elements.toast.offsetWidth;
    elements.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => elements.toast.classList.remove("is-visible"),
      2600,
    );
  }

  function vibrate(pattern) {
    try {
      if (!prefersReducedMotion && "vibrate" in navigator)
        navigator.vibrate(pattern);
    } catch (error) {
      /* haptics unavailable — ignore */
    }
  }

  function spawnRipple(host, event) {
    if (prefersReducedMotion || !(host instanceof Element)) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.1;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    let x = rect.width / 2;
    let y = rect.height / 2;
    if (event && typeof event.clientX === "number") {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    host.classList.add("ripple-host");
    host.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  function applyStagger(container, selector, step, max) {
    if (!container) return;
    const items = container.querySelectorAll(selector);
    items.forEach((item, index) => {
      item.style.setProperty(
        "--stagger",
        `${Math.min(index * step, max)}ms`,
      );
    });
  }

  function celebrate() {
    if (prefersReducedMotion) return;
    const layer = document.querySelector("#confettiLayer");
    if (!layer) return;
    const colors = ["#2f785f", "#e46d52", "#d89c2c", "#438a94", "#a24e6a"];
    for (let i = 0; i < 42; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 180}ms`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      if (Math.random() > 0.6) piece.style.borderRadius = "50%";
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), 1900);
    }
  }

  function animateReportNumbers() {
    if (prefersReducedMotion) return;
    const strip = document.querySelector("#reportStrip");
    if (!strip) return;
    const report = totals(state.tuitions, state.attendance);
    const values = [report.earned, report.lessons, report.completed];
    const strongs = strip.querySelectorAll(".report-stat strong");
    strongs.forEach((node, index) => {
      const target = values[index] ?? 0;
      const isMoney = index === 0;
      const duration = 550;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        node.textContent = isMoney ? formatMoney(current) : String(current);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function archiveTuition(id) {
    const tuition = state.tuitions.find((item) => item.id === id);
    if (
      !tuition ||
      !window.confirm(
        `Archive ${tuition.name}? It will leave the calendar but remain in reports and history.`,
      )
    )
      return;
    tuition.archivedAt = new Date().toISOString();
    if (state.selectedTuitionId === id) state.selectedTuitionId = "";
    saveState();
    render();
    showToast(`${tuition.name} archived; its history is preserved.`);
  }

  function permanentlyDelete(id) {
    const tuition = state.tuitions.find((item) => item.id === id);
    if (
      !tuition ||
      !window.confirm(
        `Permanently delete ${tuition.name} and all its attendance and history? This cannot be undone.`,
      )
    )
      return;
    state.tuitions = state.tuitions.filter((item) => item.id !== id);
    delete state.attendance[id];
    if (state.selectedTuitionId === id) state.selectedTuitionId = "";
    saveState();
    render();
    showToast(`${tuition.name} and its history were deleted.`);
  }

  function handleAction(target) {
    const editId = target.closest("[data-edit]")?.dataset.edit;
    if (editId)
      return openTuitionDialog(
        state.tuitions.find((item) => item.id === editId),
      );
    const archiveId = target.closest("[data-archive]")?.dataset.archive;
    if (archiveId) return archiveTuition(archiveId);
    const restoreId = target.closest("[data-restore]")?.dataset.restore;
    if (restoreId) {
      const tuition = state.tuitions.find((item) => item.id === restoreId);
      if (tuition) {
        tuition.archivedAt = null;
        saveState();
        render();
        showToast(`${tuition.name} restored to your calendar.`);
      }
      return;
    }
    const deleteId = target.closest("[data-delete]")?.dataset.delete;
    if (deleteId) return permanentlyDelete(deleteId);
    const selectId = target.closest("[data-select-tuition]")?.dataset
      .selectTuition;
    if (selectId) {
      state.selectedTuitionId = selectId;
      saveState();
      render();
      return;
    }
    if (target.closest('[data-action="create"]'))
      return openTuitionDialog(null);
  }

  // Material ripple on press — Android touch feedback
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const host = target.closest(
        ".button, .icon-button, .today-button, .calendar-day, .mobile-nav-link, .fab, .color-choice, .nav-link",
      );
      if (host) spawnRipple(host, event);
    },
    { passive: true },
  );

  function goToMonth(delta, dir) {
    monthSlideDir = dir || (delta < 0 ? "prev" : "next");
    currentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + delta,
      1,
    );
    vibrate(8);
    renderCalendar();
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const actionButton = target.closest(
      "[data-edit], [data-archive], [data-restore], [data-delete], [data-select-tuition], [data-action]",
    );
    if (actionButton) {
      vibrate(10);
      handleAction(actionButton);
      return;
    }
    const viewButton = target.closest("[data-view]");
    if (viewButton) {
      const next = viewButton.dataset.view;
      if (next !== currentView) {
        viewSlideDir = next === "history" ? "right" : "left";
        currentView = next;
        vibrate(8);
        renderNavigation();
        if (currentView === "history") renderHistory();
      }
      return;
    }
    const dayButton = target.closest("[data-date]");
    if (dayButton) {
      selectedDate = dayButton.dataset.date;
      lastMarkedKey = selectedDate;
      const tuition = selectedTuition();
      if (tuition) {
        const before = getCycles(tuition, state.attendance[tuition.id]);
        const beforeComplete = before.filter((c) => c.complete).length;
        state.attendance[tuition.id] = toggleAttendance(
          state.attendance[tuition.id],
          selectedDate,
        );
        saveState();
        const marked = (state.attendance[tuition.id] || []).includes(
          selectedDate,
        );
        popPct = true;
        vibrate(marked ? 12 : 8);
        const after = getCycles(tuition, state.attendance[tuition.id]);
        const afterComplete = after.filter((c) => c.complete).length;
        if (afterComplete > beforeComplete) {
          vibrate([18, 45, 18]);
          setTimeout(celebrate, 120);
        }
        showToast(
          marked
            ? `${tuition.name} lesson marked.`
            : `${tuition.name} lesson removed.`,
        );
      } else {
        openTuitionDialog(null);
      }
      render();
      return;
    }
    if (
      target.closest("#addTuitionButton, #historyAddButton, #fabAdd")
    ) {
      vibrate(10);
      openTuitionDialog(null);
      return;
    }
    if (target.closest("#previousMonth")) {
      goToMonth(-1, "prev");
      return;
    }
    if (target.closest("#nextMonth")) {
      goToMonth(1, "next");
      return;
    }
    if (target.closest("#todayButton")) {
      monthSlideDir = "prev";
      currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      selectedDate = todayKey;
      vibrate(10);
      renderCalendar();
      renderSelectedDate();
      return;
    }
    if (target.closest("[data-close-dialog]")) elements.dialog.close();
  });

  elements.tuitionPicker.addEventListener("change", () => {
    state.selectedTuitionId = elements.tuitionPicker.value;
    saveState();
    popPct = true;
    vibrate(8);
    render();
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = document.querySelector("#tuitionId").value;
    const name = document.querySelector("#tuitionName").value.trim();
    const subject = document.querySelector("#tuitionSubject").value.trim();
    const quota = Number(document.querySelector("#tuitionQuota").value);
    const fee = Number(document.querySelector("#tuitionFee").value);
    const color =
      elements.form.querySelector('input[name="color"]:checked')?.value ||
      COLORS[0].value;
    const error = document.querySelector("#formError");
    if (
      !name ||
      !subject ||
      !Number.isInteger(quota) ||
      quota < 1 ||
      quota > 366 ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      error.textContent =
        "Enter a name, subject, a lesson count from 1 to 366, and a non-negative fee.";
      return;
    }
    const existing = state.tuitions.find((item) => item.id === id);
    if (existing) Object.assign(existing, { name, subject, quota, fee, color });
    else {
      const tuition = {
        id: crypto.randomUUID(),
        name,
        subject,
        quota,
        fee,
        color,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
      state.tuitions.push(tuition);
      state.attendance[tuition.id] = [];
      state.selectedTuitionId = tuition.id;
    }
    saveState();
    elements.dialog.close();
    render();
    vibrate(existing ? 10 : [12, 40, 12]);
    if (!existing) setTimeout(celebrate, 150);
    showToast(
      existing ? "Tuition details updated." : "Tuition added to your calendar.",
    );
  });

  document
    .querySelector("#historyFilter")
    .addEventListener("change", renderHistory);
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (elements.dialog.open) return;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (["input", "select", "textarea"].includes(tag)) return;
    if (currentView !== "home") return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      goToMonth(event.key === "ArrowLeft" ? -1 : 1);
      event.preventDefault();
    }
  });

  // Swipe months on calendar — native gallery feel
  (function enableCalendarSwipe() {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    elements.calendarGrid.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        tracking = true;
      },
      { passive: true },
    );
    elements.calendarGrid.addEventListener(
      "touchend",
      (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          if (dx < 0) goToMonth(1, "next");
          else goToMonth(-1, "prev");
        }
      },
      { passive: true },
    );
  })();

  // Bottom-sheet drag to dismiss (mobile)
  (function enableSheetDrag() {
    const dialog = elements.dialog;
    const form = elements.form;
    let startY = 0;
    let currentY = 0;
    let dragging = false;
    const handle = () => form.querySelector(".sheet-handle");
    form.addEventListener(
      "touchstart",
      (event) => {
        if (window.innerWidth > 760 || !dialog.open) return;
        if (form.scrollTop > 0) return;
        const touch = event.touches[0];
        // only start drag from handle or top 64px of sheet
        const rect = form.getBoundingClientRect();
        const fromTop = touch.clientY - rect.top;
        if (event.target.closest(".sheet-handle") || fromTop < 64) {
          dragging = true;
          startY = touch.clientY;
          currentY = 0;
          dialog.classList.add("sheet-dragging");
        }
      },
      { passive: true },
    );
    form.addEventListener(
      "touchmove",
      (event) => {
        if (!dragging) return;
        currentY = Math.max(0, event.touches[0].clientY - startY);
        dialog.style.transform = `translateY(${currentY}px)`;
      },
      { passive: true },
    );
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      dialog.classList.remove("sheet-dragging");
      if (currentY > 120) {
        dialog.style.transform = "";
        dialog.close();
        vibrate(10);
      } else {
        dialog.style.transform = "";
        if (currentY > 8) vibrate(6);
      }
      currentY = 0;
    };
    form.addEventListener("touchend", endDrag, { passive: true });
    form.addEventListener("touchcancel", endDrag, { passive: true });
    dialog.addEventListener("close", () => {
      dialog.style.transform = "";
      dialog.classList.remove("sheet-dragging");
    });
    // keep handle ref warm
    void handle;
  })();

  // PWA install banner
  (function setupInstall() {
    const banner = document.querySelector("#installBanner");
    const installBtn = document.querySelector("#installButton");
    const dismissBtn = document.querySelector("#installDismiss");
    if (!banner) return;
    const dismissed = () => {
      try {
        return localStorage.getItem("lesson-ledger-install-dismissed") === "1";
      } catch (error) {
        return true;
      }
    };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      if (!dismissed() && !isStandalone) banner.hidden = false;
    });
    // If prompt never fires but app is installable-worthy, show after delay on mobile
    setTimeout(() => {
      if (
        !deferredInstallPrompt &&
        !dismissed() &&
        !isStandalone &&
        window.innerWidth <= 760 &&
        state.tuitions.length > 0
      )
        banner.hidden = false;
    }, 6000);
    installBtn?.addEventListener("click", async () => {
      vibrate(10);
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        try {
          await deferredInstallPrompt.userChoice;
        } catch (error) {
          /* ignore */
        }
        deferredInstallPrompt = null;
        banner.hidden = true;
      } else {
        showToast("Use your browser menu → Add to Home screen.");
      }
    });
    dismissBtn?.addEventListener("click", () => {
      try {
        localStorage.setItem("lesson-ledger-install-dismissed", "1");
      } catch (error) {
        /* ignore */
      }
      banner.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      banner.hidden = true;
      showToast("Lesson Ledger installed — enjoy full-screen.");
    });
  })();

  // Offline shell + online status
  (function setupNativeShell() {
    if ("serviceWorker" in navigator) {
      const protocol = window.location.protocol;
      if (protocol === "http:" || protocol === "https:") {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("./sw.js").catch(() => {});
        });
      }
    }
    window.addEventListener("offline", () =>
      showToast("You're offline — changes are saved on this device."),
    );
    window.addEventListener("online", () =>
      showToast("Back online."),
    );
  })();

  currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  render();
})();
