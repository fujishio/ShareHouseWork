import test from "node:test";
import assert from "node:assert/strict";
import { TASKS } from "./task-definitions.ts";
import { getPrioritizedTasks } from "./prioritize-tasks.ts";

const NOW = new Date("2026-02-25T12:00:00.000Z");

test("未完了タスクが優先される", () => {
  const target = TASKS.find((task) => task.frequencyDays === 7);
  assert.ok(target);

  const baselineCompletions = TASKS.reduce<Record<number, Date | null>>((acc, task) => {
    acc[task.id] = NOW;
    return acc;
  }, {});
  baselineCompletions[target.id] = null;

  const result = getPrioritizedTasks(baselineCompletions, NOW, 1);
  assert.equal(result[0].id, target.id);
  assert.equal(result[0].urgencyRatio, Number.POSITIVE_INFINITY);
});

test("期限境界でoverdueDaysが期待通りになる", () => {
  const target = TASKS.find((task) => task.frequencyDays === 7);
  assert.ok(target);

  const almostDue = new Date(NOW.getTime() - 6.9 * 24 * 60 * 60 * 1000);
  const dueToday = new Date(NOW.getTime() - 7.1 * 24 * 60 * 60 * 1000);

  const almostDueResult = getPrioritizedTasks({ [target.id]: almostDue }, NOW, TASKS.length).find(
    (task) => task.id === target.id
  );
  const dueTodayResult = getPrioritizedTasks({ [target.id]: dueToday }, NOW, TASKS.length).find(
    (task) => task.id === target.id
  );

  assert.ok(almostDueResult);
  assert.ok(dueTodayResult);
  assert.equal(almostDueResult.overdueDays, -1);
  assert.equal(dueTodayResult.overdueDays, 0);
});

test("同率時の並び順が決定的である", () => {
  const taskA = TASKS.find((task) => task.id === 1);
  const taskB = TASKS.find((task) => task.id === 4);
  assert.ok(taskA);
  assert.ok(taskB);

  // Both tasks have same frequencyDays(3) and same daysSince(3)
  const sameDaysSince = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
  const result = getPrioritizedTasks(
    {
      [taskA.id]: sameDaysSince,
      [taskB.id]: sameDaysSince,
    },
    NOW,
    TASKS.length
  ).filter((task) => task.id === taskA.id || task.id === taskB.id);

  assert.equal(result.length, 2);
  assert.equal(result[0].id, 1);
  assert.equal(result[1].id, 4);
});
