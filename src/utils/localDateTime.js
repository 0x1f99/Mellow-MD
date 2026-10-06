export function getTimeZone() {
  return process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatTime(date = new Date(), timeZone = getTimeZone()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatDate(date = new Date(), timeZone = getTimeZone()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatWeekday(date = new Date(), timeZone = getTimeZone()) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date);
}
