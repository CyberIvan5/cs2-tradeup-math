import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wearOf, normalise, outputFloat, maxAverageFor, outcomes, expectedValue, evaluate } from '../src/index.js';

test('wear brackets', () => {
  assert.equal(wearOf(0.05).code, 'FN');
  assert.equal(wearOf(0.07).code, 'MW');
  assert.equal(wearOf(0.38).code, 'WW');
  assert.equal(wearOf(0.9).code, 'BS');
});

test('normalised float: same float, different ranges', () => {
  assert.ok(Math.abs(normalise(0.10, 0.06, 0.80) - 0.054) < 0.001);
  assert.equal(normalise(0.10, 0, 1), 0.10);
});

test('output float maps the average onto the outcome range', () => {
  const inputs = Array(10).fill({ float: 0.10, min: 0, max: 1 });
  assert.ok(Math.abs(outputFloat(inputs, { min: 0, max: 0.5 }) - 0.05) < 1e-9);
});

test('max average for a wear depends on the outcome range', () => {
  assert.ok(Math.abs(maxAverageFor({ min: 0, max: 0.8 }, 'FN') - 0.0875) < 1e-9);
  assert.ok(Math.abs(maxAverageFor({ min: 0, max: 0.5 }, 'FN') - 0.14) < 1e-9);
  assert.equal(maxAverageFor({ min: 0.15, max: 0.8 }, 'FN'), null);
  assert.equal(maxAverageFor({ min: 0.10, max: 0.70 }, 'FN'), null);
  assert.ok(Math.abs(maxAverageFor({ min: 0.10, max: 0.70 }, 'MW') - 0.0833) < 0.001);
});

test('odds: 8 inputs from a 2-skin collection, 2 from a 3-skin collection', () => {
  const inputs = [...Array(8).fill({ collection: 'a' }), ...Array(2).fill({ collection: 'b' })];
  const outs = outcomes(inputs, { a: ['A1', 'A2'], b: ['B1', 'B2', 'B3'] });
  const p = Object.fromEntries(outs.map((o) => [o.skin, o.probability]));
  assert.ok(Math.abs(p.A1 - 0.4) < 1e-9);
  assert.ok(Math.abs(p.B1 - 0.2 / 3) < 1e-9);
  assert.ok(Math.abs(outs.reduce((s, o) => s + o.probability, 0) - 1) < 1e-9);
});

test('5 Covert -> knife contract', () => {
  const inputs = Array(5).fill({ collection: 'case1' });
  const outs = outcomes(inputs, { case1: Array(13).fill('knife') });
  assert.equal(outs.length, 13);
  assert.ok(Math.abs(outs[0].probability - 1 / 13) < 1e-9);
});

test('expected value, ROI, chance of profit with Steam fee', () => {
  const r = expectedValue([{ probability: 0.5, price: 30 }, { probability: 0.5, price: 10 }], 15, 0.13);
  assert.ok(Math.abs(r.ev - 17.4) < 1e-9);
  assert.ok(Math.abs(r.roi - 0.16) < 1e-9);
  assert.equal(r.chanceOfProfit, 0.5);
});

test('evaluate: full contract', () => {
  const inputs = Array(10).fill({ collection: 'c', float: 0.05, min: 0, max: 1, price: 1 });
  const r = evaluate(inputs, { c: [{ name: 'X', min: 0, max: 0.5, prices: { FN: 20, MW: 10 } }] });
  assert.equal(r.cost, 10);
  assert.equal(r.outcomes[0].wear, 'FN');
  assert.equal(r.ev, 20);
  assert.equal(r.chanceOfProfit, 1);
});
