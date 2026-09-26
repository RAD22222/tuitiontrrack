(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TuitionDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeDates(dates) {
    return [
      ...new Set(
        Array.isArray(dates)
          ? dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
          : [],
      ),
    ].sort();
  }

  function cycleEarnings(fee, quota, lessonCount) {
    if (!Number.isFinite(fee) || !Number.isFinite(quota) || quota < 1) return 0;
    return Math.round((fee * Math.min(lessonCount, quota)) / quota);
  }

  function getCycles(tuition, dates) {
    const attendance = normalizeDates(dates);
    const quota = Math.max(1, Math.floor(Number(tuition.quota) || 1));
    const fee = Math.max(0, Number(tuition.fee) || 0);
    const cycles = [];

    for (let offset = 0; offset < attendance.length; offset += quota) {
      const cycleDates = attendance.slice(offset, offset + quota);
      const number = Math.floor(offset / quota) + 1;
      const earned = cycleEarnings(fee, quota, cycleDates.length);
      cycles.push({
        number,
        dates: cycleDates,
        lessons: cycleDates.length,
        quota,
        complete: cycleDates.length === quota,
        earned,
      });
    }

    const nextNumber = cycles.length ? cycles[cycles.length - 1].number + 1 : 1;
    if (cycles.length === 0 || cycles[cycles.length - 1].complete) {
      cycles.push({
        number: nextNumber,
        dates: [],
        lessons: 0,
        quota,
        complete: false,
        earned: 0,
      });
    }

    return cycles;
  }

  function toggleAttendance(dates, date) {
    const attendance = new Set(normalizeDates(dates));
    if (attendance.has(date)) attendance.delete(date);
    else attendance.add(date);
    return [...attendance].sort();
  }

  function totals(tuitions, attendance) {
    return tuitions.reduce(
      (summary, tuition) => {
        const tuitionCycles = getCycles(tuition, attendance[tuition.id]);
        for (const cycle of tuitionCycles) {
          summary.earned += cycle.earned;
          summary.lessons += cycle.lessons;
          if (cycle.complete) summary.completed += 1;
        }
        return summary;
      },
      { earned: 0, lessons: 0, completed: 0 },
    );
  }

  return { cycleEarnings, getCycles, normalizeDates, toggleAttendance, totals };
});
