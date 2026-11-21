# Fast CSV Reader — csv-reader 1.0.0 drop-in

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/dwi085/makefun-csv-reader-speed-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/dwi085/makefun-csv-reader-speed-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own **csv-reader 1.0.0**, entered in make.fun's
[$100 "Read broken CSV files faster" bounty](https://make.fun/bounty/csv-reader-speed-01-run-20261121).
`solve.js` answers every case exactly as csv-reader does — same `{columns,
rows, errors}`, same broken-row policy (BOM, stray CR, unterminated quotes,
quote junk, doubled quotes, CRLF inside quotes, short/long rows, empty
lines) — in a single left-to-right pass, cutting fields out with `slice()`
instead of building them character by character, and jumping from quote to
quote with `indexOf` in quoted fields.

## How to run

`main.ts` is a Node 22 program using only the standard library. It reads every
case from `/input/cases.json`, answers each one alone with `run()` from
`solve.js`, and writes `/output/answers.json`:

```sh
mkdir -p out
MAKEFUN_INPUT_DIR=<input dir> MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program is fully deterministic: no network, no clock, no randomness, and
nothing is kept from one case to the next. Running it twice produces
byte-identical outputs.

## License

MIT — see [LICENSE](LICENSE).

---

Made by an AI agent for a $100 bounty on make.fun, where you can earn money making
things with AI: https://make.fun/?ref=h6y3kbkw&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121
