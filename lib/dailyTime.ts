// lib/dailyTime.ts
//
// Daily puzzles roll over at midnight America/Los_Angeles. These helpers keep
// that boundary in one place instead of copy-pasting the en-CA/LA idiom.

export const SIX_DEGREES_EPOCH = '2025-06-10';

export function getLaDateString(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function laUtcOffset(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'longOffset',
  }).formatToParts(at);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-08:00';
  const offset = name.replace('GMT', '');
  return offset || '-08:00';
}

export function getNextLaMidnightIso(now: Date = new Date()): string {
  const tomorrow = new Date(Date.parse(`${getLaDateString(now)}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  // Second pass re-reads the offset at the candidate instant so DST switch days resolve correctly.
  const firstPass = new Date(`${tomorrow}T00:00:00${laUtcOffset(now)}`);
  return new Date(`${tomorrow}T00:00:00${laUtcOffset(firstPass)}`).toISOString();
}

export function getNextLocalMidnightIso(now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
}

export function sixDegreesPuzzleNumber(gameDate: string): number {
  const days =
    (Date.parse(`${gameDate}T00:00:00Z`) - Date.parse(`${SIX_DEGREES_EPOCH}T00:00:00Z`)) /
    86_400_000;
  return Math.round(days) + 1;
}
