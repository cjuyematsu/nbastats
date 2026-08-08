import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pairKey,
  findBrokenLinks,
  endpointsMatch,
  auditPath,
  shortestPath,
} from '../lib/sixDegreesPath';

const edges = new Set([pairKey(1, 2), pairKey(2, 3), pairKey(3, 4), pairKey(1, 5)]);

const adjacency = new Map<number, number[]>([
  [1, [2, 5]],
  [2, [1, 3]],
  [3, [2, 4]],
  [4, [3]],
  [5, [1]],
  [9, []],
]);

test('pairKey normalises direction', () => {
  assert.equal(pairKey(7, 3), pairKey(3, 7));
  assert.equal(pairKey(3, 7), '3:7');
});

test('findBrokenLinks reports every non-edge with its position', () => {
  assert.deepEqual(findBrokenLinks([1, 2, 3, 4], edges), []);
  assert.deepEqual(findBrokenLinks([1, 2, 4], edges), [{ index: 1, from: 2, to: 4 }]);
  assert.equal(findBrokenLinks([1, 4, 2, 5], edges).length, 3);
});

test('endpointsMatch requires both ends and a real hop', () => {
  assert.equal(endpointsMatch([1, 2, 3], 1, 3), true);
  assert.equal(endpointsMatch([1, 2, 3], 1, 4), false);
  assert.equal(endpointsMatch([1], 1, 1), false);
});

test('auditPath catches the Anunoby/Barrett shape: real endpoints, fake middle', () => {
  const audit = auditPath([1, 4, 3], 1, 3, edges);
  assert.equal(audit.ok, false);
  assert.equal(audit.endpointsOk, true);
  assert.equal(audit.degrees, 2);
  assert.deepEqual(audit.brokenLinks, [{ index: 0, from: 1, to: 4 }]);
});

test('auditPath accepts a fully valid path', () => {
  assert.deepEqual(auditPath([1, 2, 3, 4], 1, 4, edges), {
    ok: true,
    degrees: 3,
    brokenLinks: [],
    endpointsOk: true,
  });
});

test('auditPath rejects a missing or trivial path', () => {
  assert.equal(auditPath(null, 1, 2, edges).ok, false);
  assert.equal(auditPath([1], 1, 1, edges).ok, false);
});

test('shortestPath finds the minimal route', () => {
  assert.deepEqual(shortestPath(1, 4, adjacency), [1, 2, 3, 4]);
  assert.deepEqual(shortestPath(1, 2, adjacency), [1, 2]);
  assert.deepEqual(shortestPath(3, 3, adjacency), [3]);
});

test('shortestPath returns null when unreachable or past the depth cap', () => {
  assert.equal(shortestPath(1, 9, adjacency), null);
  assert.equal(shortestPath(1, 4, adjacency, 2), null);
  assert.deepEqual(shortestPath(1, 4, adjacency, 3), [1, 2, 3, 4]);
});

test('every shortestPath result passes its own audit', () => {
  const graphEdges = new Set<string>();
  for (const [node, neighbors] of adjacency) {
    for (const n of neighbors) graphEdges.add(pairKey(node, n));
  }
  const path = shortestPath(4, 5, adjacency);
  assert.ok(path);
  assert.equal(auditPath(path, 4, 5, graphEdges).ok, true);
});
