"use client";

import { useState, useEffect } from "react";

interface Exchange {
  name: string;
  short: string;
  tz: string;
  openH: number;
  openM: number;
  closeH: number;
  closeM: number;
}

const EXCHANGES: Exchange[] = [
  { name: "NYSE / NASDAQ", short: "US", tz: "America/New_York", openH: 9, openM: 30, closeH: 16, closeM: 0 },
  { name: "London (LSE)", short: "UK", tz: "Europe/London", openH: 8, openM: 0, closeH: 16, closeM: 30 },
  { name: "Euronext", short: "EU", tz: "Europe/Paris", openH: 9, openM: 0, closeH: 17, closeM: 30 },
  { name: "Tokyo (TSE)", short: "JP", tz: "Asia/Tokyo", openH: 9, openM: 0, closeH: 15, closeM: 0 },
];

function getExchangeMinutes(now: Date, tz: string): { h: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  let h = 0, m = 0, day = 0;
  for (const p of parts) {
    if (p.type === "hour") h = parseInt(p.value);
    if (p.type === "minute") m = parseInt(p.value);
    if (p.type === "weekday") {
      const d = p.value;
      day = d === "Sun" ? 0 : d === "Mon" ? 1 : d === "Tue" ? 2 : d === "Wed" ? 3 : d === "Thu" ? 4 : d === "Fri" ? 5 : 6;
    }
  }
  return { h, m, day };
}

function isOpen(ex: Exchange, now: Date): boolean {
  const { h, m, day } = getExchangeMinutes(now, ex.tz);
  if (day === 0 || day === 6) return false;
  const mins = h * 60 + m;
  const open = ex.openH * 60 + ex.openM;
  const close = ex.closeH * 60 + ex.closeM;
  return mins >= open && mins < close;
}

function formatTimeInTz(h: number, m: number, tz: string): string {
  // Convert a time (h:m) in the given exchange timezone to the user's local time.
  // Strategy: make a UTC guess, measure the TZ offset, then correct.
  const now = new Date();

  // Get today's date in the exchange timezone (YYYY-MM-DD via en-CA locale)
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  // Start with a UTC guess for this h:m
  const guess = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);

  // Check what hour/minute the guess shows in the exchange timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(guess);

  let guessH = 0, guessM = 0;
  for (const p of parts) {
    if (p.type === "hour") guessH = parseInt(p.value);
    if (p.type === "minute") guessM = parseInt(p.value);
  }

  // Offset = what the TZ shows minus what we wanted
  let offsetMins = (guessH * 60 + guessM) - (h * 60 + m);
  if (offsetMins > 720) offsetMins -= 1440;
  if (offsetMins < -720) offsetMins += 1440;

  // Correct to the real UTC time, then format in the user's local timezone
  const real = new Date(guess.getTime() - offsetMins * 60 * 1000);
  return real.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function timeUntil(ex: Exchange, now: Date): string {
  const { h, m, day } = getExchangeMinutes(now, ex.tz);
  const nowMins = h * 60 + m;
  const openMins = ex.openH * 60 + ex.openM;
  const closeMins = ex.closeH * 60 + ex.closeM;

  let diffMins: number;

  if (day === 0 || day === 6 || nowMins >= closeMins) {
    // Closed — calculate time until next open
    let daysUntil = 0;
    if (day === 6) daysUntil = 2; // Sat -> Mon
    else if (day === 0) daysUntil = 1; // Sun -> Mon
    else if (nowMins >= closeMins) daysUntil = day === 5 ? 3 : 1; // Fri after close -> Mon, else next day
    diffMins = daysUntil * 24 * 60 + (openMins - nowMins);
    if (diffMins < 0) diffMins += 24 * 60;
  } else if (nowMins < openMins) {
    diffMins = openMins - nowMins;
  } else {
    diffMins = closeMins - nowMins;
  }

  if (diffMins >= 60) {
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${diffMins}m`;
}

function statusLabel(ex: Exchange, now: Date): { open: boolean; label: string } {
  const { h, m, day } = getExchangeMinutes(now, ex.tz);
  const nowMins = h * 60 + m;
  const openMins = ex.openH * 60 + ex.openM;
  const open = isOpen(ex, now);

  if (open) {
    return { open: true, label: `Closes in ${timeUntil(ex, now)}` };
  }
  if (day >= 1 && day <= 5 && nowMins < openMins) {
    return { open: false, label: `Opens in ${timeUntil(ex, now)}` };
  }
  return { open: false, label: `Opens in ${timeUntil(ex, now)}` };
}

export default function MarketClock() {
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop()?.replace(/_/g, " ") ?? "";

  return (
    <div className="relative">
      {/* Compact inline strip */}
      <div className="flex items-center gap-3 flex-wrap">
        {EXCHANGES.map((ex) => {
          const { open, label } = statusLabel(ex, now);
          return (
            <button
              key={ex.short}
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title={`${ex.name} — ${label}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${open ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"}`} />
              <span className="font-medium">{ex.short}</span>
              <span className="hidden sm:inline">{label.replace("Closes in ", "").replace("Opens in ", "in ")}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded dropdown with full details */}
      {expanded && (
        <div className="absolute top-8 right-0 z-50 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-3 space-y-2 min-w-[320px]">
          {EXCHANGES.map((ex) => {
            const { open, label } = statusLabel(ex, now);
            const openLocal = formatTimeInTz(ex.openH, ex.openM, ex.tz);
            const closeLocal = formatTimeInTz(ex.closeH, ex.closeM, ex.tz);

            return (
              <div key={ex.short} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${open ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"}`} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{ex.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-gray-400 dark:text-gray-500">{openLocal}-{closeLocal}</span>
                  <span className={`${open ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-gray-400 dark:text-gray-600 pt-1">
            Times in {localTz} &middot; Excludes holidays
          </p>
        </div>
      )}
    </div>
  );
}
