# cs2-tradeup-math

The maths behind Counter-Strike 2 trade up contracts, as a tiny zero-dependency JavaScript library: outcome odds, the CS2 normalised float formula, expected value, ROI and chance of profit. It powers the free calculator at **[cs2tradeup.gg](https://cs2tradeup.gg)**.

Rules implemented (current as of the October 23, 2025 and May 22, 2026 CS2 updates):

- 10 skins of one rarity → 1 skin of the next rarity, drawn only from the input collections
- 5 Covert skins → 1 knife or pair of gloves from the case collection of one of the inputs
- Normalised float: each input's position inside its own float range is averaged, then mapped onto the outcome's range
- StatTrak™ inputs give StatTrak™ outputs; souvenirs can be used as inputs (they lose the souvenir status)

## Install

```
npm install github:CyberIvan5/cs2-tradeup-math
```

or copy `src/index.js`; it is a single ES module.

## Usage

```js
import { outcomes, outputFloat, maxAverageFor, expectedValue, evaluate } from 'cs2-tradeup-math';

// Odds: 8 inputs from collection A (2 Classified skins), 2 from collection B (3 Classified skins)
const inputs = [...Array(8).fill({ collection: 'A' }), ...Array(2).fill({ collection: 'B' })];
outcomes(inputs, { A: ['AUG | Chameleon', 'AWP | Asiimov'], B: ['X', 'Y', 'Z'] });
// → A outcomes 40% each, B outcomes 6.67% each

// Float: ten 0.10 inputs on a 0.00–1.00 range, outcome range 0.00–0.50
outputFloat(Array(10).fill({ float: 0.10, min: 0, max: 1 }), { min: 0, max: 0.5 }); // 0.05 (Factory New)

// How low do my inputs need to be for a Factory New result on a 0.00–0.80 skin?
maxAverageFor({ min: 0, max: 0.8 }, 'FN'); // 0.0875 (average normalised input)

// EV with Steam's ~13% fee
expectedValue([{ probability: 0.5, price: 30 }, { probability: 0.5, price: 10 }], 15, 0.13);
// → { ev: 17.4, roi: 0.16, profit: 2.4, chanceOfProfit: 0.5 }

// Everything in one call (prices per wear on each outcome)
evaluate(
  Array(10).fill({ collection: 'c', float: 0.05, min: 0, max: 1, price: 1 }),
  { c: [{ name: 'X', min: 0, max: 0.5, prices: { FN: 20, MW: 10 } }] },
  0.13
);
```

## API

| Function | What it does |
|---|---|
| `wearOf(float)` | Wear bracket (`FN`, `MW`, `FT`, `WW`, `BS`) for a float |
| `normalise(float, min, max)` | Position of a float inside a skin's range, 0..1 |
| `outputFloat(inputs, outcome)` | Output float of a contract (CS2 normalised formula) |
| `maxAverageFor(outcome, wear)` | Highest average normalised input that still yields that wear, or `null` if impossible |
| `outcomes(inputs, nextTier)` | Every possible outcome with its probability |
| `expectedValue(outs, cost, fee)` | EV, ROI, profit and chance of profit after a marketplace fee |
| `evaluate(inputs, nextTier, fee)` | All of the above for one contract |

## The formulas

Probability of a specific outcome:

```
P(skin) = (inputs from that collection ÷ total inputs) ÷ (number of next-tier skins in that collection)
```

Output float:

```
normalised input = (float − in_min) ÷ (in_max − in_min)
average          = mean of the normalised inputs
output float     = out_min + average × (out_max − out_min)
```

Expected value:

```
EV  = Σ probability × price(outcome at its resulting wear) × (1 − fee)
ROI = (EV − cost of inputs) ÷ cost of inputs
```

A longer explanation with worked examples: [CS2 trade up guide](https://cs2tradeup.gg/cs2-trade-up-guide).

## Data

This library has no price or collection data on purpose. Collection contents and float ranges are in the game files; prices change by the hour. [cs2tradeup.gg](https://cs2tradeup.gg) runs these formulas against live prices from Steam and 11 marketplaces and publishes [which contracts are profitable right now](https://cs2tradeup.gg/profitable-cs2-trade-ups).

## Tests

```
npm test
```

## License

MIT
