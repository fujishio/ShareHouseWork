import type { ScheduleEvent } from "@/types";

type Props = {
  events: ScheduleEvent[];
  today: Date;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getWeekDays(today: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(today);
  // Start from Monday of this week
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(date: Date, start: Date, end: Date) {
  const d = date.getTime();
  const s = new Date(start).setHours(0, 0, 0, 0);
  const e = new Date(end).setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

export default function ScheduleWidget({ events, today }: Props) {
  const weekDays = getWeekDays(today);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">今週のスケジュール</h2>
        <a
          href="/schedule"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          カレンダーを見る →
        </a>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="text-center">
              <p
                className={`text-xs mb-1 ${
                  day.getDay() === 0
                    ? "text-red-400"
                    : day.getDay() === 6
                    ? "text-blue-400"
                    : "text-gray-400"
                }`}
              >
                {WEEKDAYS[day.getDay()]}
              </p>
              <div
                className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-emerald-500 text-white"
                    : "text-gray-600"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <p className="text-sm text-gray-400 py-2 text-center mt-2">
          今週の予定はありません
        </p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {events.map((event) => {
            const days = weekDays.filter((d) =>
              isInRange(d, event.startDate, event.endDate)
            );
            const startIdx = weekDays.findIndex((d) =>
              isInRange(d, event.startDate, event.endDate)
            );
            const spanCount = days.length;

            if (spanCount === 0) return null;

            return (
              <div key={event.id} className="relative grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const isStart = i === startIdx;
                  const isInEvent = i >= startIdx && i < startIdx + spanCount;

                  if (isStart) {
                    return (
                      <div
                        key={i}
                        className="rounded-md px-1.5 py-0.5 text-xs font-medium text-white truncate"
                        style={{
                          gridColumn: `${i + 1} / span ${spanCount}`,
                          backgroundColor: event.memberColor,
                        }}
                      >
                        {event.memberName.replace("あなた（家主）", "あなた")} {event.label}
                      </div>
                    );
                  }
                  if (isInEvent) return null;
                  return <div key={i} />;
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
