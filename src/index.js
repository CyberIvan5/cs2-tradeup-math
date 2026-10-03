/**
 * cs2-tradeup-math — the maths behind Counter-Strike 2 trade up contracts.
 * Zero dependencies. Works in Node (ESM) and the browser.
 *
 * Rules implemented (as of the October 23, 2025 and May 22, 2026 CS2 updates):
 *  - 10 skins of one rarity -> 1 skin of the next rarity, from the input collections only
 *  - 5 Covert skins -> 1 knife or gloves from the case collection of one of the inputs
 *  - Normalised float: each input's position inside its own float range is averaged,
 *    then mapped onto the outcome's range
 *
 * Live calculator built on these functions: https://cs2tradeup.gg
 */

export const RARITIES = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec Grade', 'Restricted', 'Classified', 'Covert', 'Rare Special'];

export const WEARS = [
  { code: 'FN', name: 'Factory New', min: 0.00, max: 0.07 },
  { code: 'MW', name: 'Minimal Wear', min: 0.07, max: 0.15 },
  { code: 'FT', name: 'Field-Tested', min: 0.15, max: 0.38 },
  { code: 'WW', name: 'Well-Worn', min: 0.38, max: 0.45 },
  { code: 'BS', name: 'Battle-Scarred', min: 0.45, max: 1.00 },
];

/** Wear bracket for a float value. */
export function wearOf(float) {
  for (const w of WEARS) if (float < w.max) return w;
  return WEARS[4];
}

/** Position of a float inside a skin's own range, 0..1. */
export function normalise(float, min, max) {
  if (max <= min) throw new Error('invalid float range');
  return (float - min) / (max - min);
}

/**
 * Output float of a contract.
 * @param {Array<{float:number,min:number,max:number}>} inputs  10 (or 5) inputs with their float and the skin's float range
 * @param {{min:number,max:number}} outcome  float range of the outcome skin
 */
export function outputFloat(inputs, outcome) {
  if (!inputs.length) throw new Error('no inputs');
  const avg = inputs.reduce((s, i) => s + normalise(i.float, i.min, i.max), 0) / inputs.length;
  return outcome.min + avg * (outcome.max - outcome.min);
}

/**
 * Highest average normalised input that still gives the target wear on an outcome,
 * or null if that wear is impossible for the outcome's range.
 * Example: outcome 0.00–0.80, target FN -> 0.0875
 */
export function maxAverageFor(outcome, wearCode) {
  const w = WEARS.find((x) => x.code === wearCode);
  if (!w) throw new Error('unknown wear ' + wearCode);
  if (outcome.min >= w.max) return null; // range starts above the bracket
  const v = (Math.min(w.max, outcome.max) - outcome.min) / (outcome.max - outcome.min);
  return Math.max(0, Math.min(1, v));
}

/**
 * Outcome probabilities for a contract.
 * @param {Array<{collection:string}>} inputs   each input only needs its collection id
 * @param {Object<string, Array<any>>} nextTier  map collection id -> array of possible outcome skins at the next rarity
 * @returns {Array<{skin:any, collection:string, probability:number}>}
 */
export function outcomes(inputs, nextTier) {
  const n = inputs.length;
  if (n !== 10 && n !== 5) throw new Error('a contract has 10 inputs (or 5 for Covert -> knife)');
  const count = {};
  for (const i of inputs) count[i.collection] = (count[i.collection] || 0) + 1;
  const out = [];
  for (const cid of Object.keys(count)) {
    const pool = nextTier[cid] || [];
    if (!pool.length) throw new Error('collection ' + cid + ' has no skin at the next rarity');
    const p = (count[cid] / n) / pool.length;
    for (const skin of pool) out.push({ skin, collection: cid, probability: p });
  }
  return out;
}

/**
 * Expected value, ROI and chance of profit.
 * @param {Array<{probability:number, price:number}>} outs  outcomes with the price of the outcome at its resulting wear
 * @param {number} cost   total cost of the inputs
 * @param {number} [fee]  marketplace fee as a fraction (Steam ≈ 0.13), applied to the outcome value
 */
export function expectedValue(outs, cost, fee = 0) {
  const net = 1 - fee;
  let ev = 0, win = 0;
  for (const o of outs) {
    if (typeof o.price !== 'number') throw new Error('every outcome needs a price');
    ev += o.probability * o.price * net;
    if (o.price * net > cost) win += o.probability;
  }
  return { ev, roi: (ev - cost) / cost, profit: ev - cost, chanceOfProfit: win };
}

/**
 * Full contract evaluation in one call.
 * inputs: [{collection, float, min, max, price}], nextTier: {cid: [{name, min, max, prices: {FN,MW,FT,WW,BS}}]}
 */
export function evaluate(inputs, nextTier, fee = 0) {
  const cost = inputs.reduce((s, i) => s + i.price, 0);
  const outs = outcomes(inputs, nextTier).map((o) => {
    const f = outputFloat(inputs, o.skin);
    const wear = wearOf(f);
    const price = o.skin.prices ? o.skin.prices[wear.code] : o.skin.price;
    return { ...o, float: f, wear: wear.code, price };
  });
  return { cost, outcomes: outs, ...expectedValue(outs, cost, fee) };
}
