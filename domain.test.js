const test = require("node:test");
const assert = require("node:assert/strict");
const { getCycles, toggleAttendance, totals } = require("./domain.js");

const siam = { id: "siam", name: "Siam", quota: 16, fee: 4000 };

test("partial cycle earnings are proportional and rounded to whole taka", () => {
  const dates = Array.from(
    { length: 12 },
    (_, index) => `2026-09-${String(index + 1).padStart(2, "0")}`,
  );
  const cycles = getCycles(siam, dates);
  assert.equal(cycles[0].lessons, 12);
  assert.equal(cycles[0].earned, 3000);
  assert.equal(cycles.length, 1);
});

test("a completed cycle is followed by a new empty cycle", () => {
  const dates = Array.from(
    { length: 16 },
    (_, index) => `2026-09-${String(index + 1).padStart(2, "0")}`,
  );
  const cycles = getCycles(siam, dates);
  assert.equal(cycles[0].complete, true);
  assert.equal(cycles[0].earned, 4000);
  assert.deepEqual(cycles[1], {
    number: 2,
    dates: [],
    lessons: 0,
    quota: 16,
    complete: false,
    earned: 0,
  });
});

test("attendance is unique per tuition date and can be unmarked", () => {
  const firstMark = toggleAttendance(["2026-09-02"], "2026-09-01");
  assert.deepEqual(firstMark, ["2026-09-01", "2026-09-02"]);
  assert.deepEqual(toggleAttendance(firstMark, "2026-09-01"), ["2026-09-02"]);
  assert.deepEqual(
    toggleAttendance(["2026-09-01", "2026-09-01"], "2026-09-02"),
    ["2026-09-01", "2026-09-02"],
  );
});

test("totals include proportional earnings and attendance across records", () => {
  const tuitions = [
    { ...siam, quota: 2 },
    { id: "n", name: "Nila", quota: 4, fee: 2000 },
  ];
  const result = totals(tuitions, {
    siam: ["2026-09-01", "2026-09-02"],
    n: ["2026-09-03"],
  });
  assert.deepEqual(result, {
    earned: 4500,
    lessons: 3,
    completed: 1,
  });
});
