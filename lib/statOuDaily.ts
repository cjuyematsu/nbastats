// lib/statOuDaily.ts

export const statOuStorageKey = (era: string, date: string) => `statOuDaily_${era}_${date}`;

export function readAllLocalStatOuDates(): string[] {
  try {
    const dates = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('statOuDaily_')) continue;
      const date = key.slice(key.lastIndexOf('_') + 1);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
    }
    return Array.from(dates);
  } catch {
    return [];
  }
}
