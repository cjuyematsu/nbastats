// Pure helpers for auditing stored Six Degrees solution paths against the
// teammate graph. The DB-side equivalents live in
// scripts/sql/six-degrees-path-integrity.sql; keep the two in agreement.

export type PairKey = string;

/** Undirected edge key. `teammates` stores one row per pair, low id first. */
export function pairKey(a: number, b: number): PairKey {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export interface BrokenLink {
  index: number;
  from: number;
  to: number;
}

export function findBrokenLinks(
  path: readonly number[],
  edges: ReadonlySet<PairKey>,
): BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    if (!edges.has(pairKey(path[i], path[i + 1]))) {
      broken.push({ index: i, from: path[i], to: path[i + 1] });
    }
  }
  return broken;
}

export function endpointsMatch(
  path: readonly number[],
  a: number,
  b: number,
): boolean {
  return path.length >= 2 && path[0] === a && path[path.length - 1] === b;
}

export interface PathAudit {
  ok: boolean;
  degrees: number;
  brokenLinks: BrokenLink[];
  endpointsOk: boolean;
}

export function auditPath(
  path: readonly number[] | null | undefined,
  a: number,
  b: number,
  edges: ReadonlySet<PairKey>,
): PathAudit {
  if (!path || path.length < 2) {
    return { ok: false, degrees: 0, brokenLinks: [], endpointsOk: false };
  }
  const brokenLinks = findBrokenLinks(path, edges);
  const endpointsOk = endpointsMatch(path, a, b);
  return {
    ok: endpointsOk && brokenLinks.length === 0,
    degrees: path.length - 1,
    brokenLinks,
    endpointsOk,
  };
}

/** BFS shortest path over an undirected adjacency map. Null when unreachable. */
export function shortestPath(
  a: number,
  b: number,
  adjacency: ReadonlyMap<number, readonly number[]>,
  maxDepth = 6,
): number[] | null {
  if (a === b) return [a];
  const parent = new Map<number, number>([[a, a]]);
  let frontier = [a];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: number[] = [];
    for (const node of frontier) {
      for (const neighbor of adjacency.get(node) ?? []) {
        if (parent.has(neighbor)) continue;
        parent.set(neighbor, node);
        if (neighbor === b) {
          const path = [b];
          let cur = b;
          while (cur !== a) {
            cur = parent.get(cur)!;
            path.unshift(cur);
          }
          return path;
        }
        next.push(neighbor);
      }
    }
    frontier = next;
  }
  return null;
}
