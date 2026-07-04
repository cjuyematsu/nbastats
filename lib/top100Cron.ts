// lib/top100Cron.ts
//
// Pure planning for the weekly-rankings cron: given the board's ranked_at and
// the current time, decide whether a rearrangement is owed and how the ending
// cycle's votes must be freshened. No I/O here so `npm test` can drive it
// through simulated schedules (late fires, missed days, DST) without a DB.

import { getLastRearrangementIso, getPreviousRearrangementIso } from '@/lib/top100Time';

// The RPC counts votes from NOW() - 48h; stamping no older than 47h back
// keeps even a very late catch-up's votes inside that window.
const STAMP_FLOOR_HOURS = 47;

export type CronPlan =
  | { action: 'skip'; reason: 'boundary already applied'; boundaryIso: string }
  | {
      action: 'run';
      mode: 'boundary' | 'forced';
      boundaryIso: string;
      stampIso: string;
      freshenStartIso: string;
      freshenEndIso: string | null;
      freshenFilter: string;
    };

export function planRearrangement(opts: {
  force: boolean;
  rankedAt: string | null;
  now?: Date;
}): CronPlan {
  const now = opts.now ?? new Date();
  const boundaryIso = getLastRearrangementIso(now);

  if (!opts.force && opts.rankedAt && Date.parse(opts.rankedAt) >= Date.parse(boundaryIso)) {
    return { action: 'skip', reason: 'boundary already applied', boundaryIso };
  }

  if (opts.force) {
    return {
      action: 'run',
      mode: 'forced',
      boundaryIso,
      stampIso: now.toISOString(),
      freshenStartIso: boundaryIso,
      freshenEndIso: null,
      freshenFilter: `created_at.gte.${boundaryIso},updated_at.gte.${boundaryIso}`,
    };
  }

  const freshenStartIso = getPreviousRearrangementIso(new Date(Date.parse(boundaryIso)));
  const stampIso = new Date(
    Math.max(Date.parse(boundaryIso) - 1000, now.getTime() - STAMP_FLOOR_HOURS * 3_600_000)
  ).toISOString();
  return {
    action: 'run',
    mode: 'boundary',
    boundaryIso,
    stampIso,
    freshenStartIso,
    freshenEndIso: boundaryIso,
    freshenFilter: `and(created_at.gte.${freshenStartIso},created_at.lt.${boundaryIso}),and(updated_at.gte.${freshenStartIso},updated_at.lt.${boundaryIso})`,
  };
}
