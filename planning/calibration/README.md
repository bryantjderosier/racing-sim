# Calibration artifacts

Generated simulator reports live here so the repository root stays reserved for source and project
configuration. These files are review inputs, not runtime save content.

Use explicit output paths when generating new reports:

```sh
pnpm --silent sim:batch -- --runs 100 --entries 30 --laps 50 --seed academy-review \
  > planning/calibration/academy-calibration-v5.json

pnpm --silent sim:weather-batch -- --runs 50 --entries 8 --laps 50 \
  --seed weather-strategy-final --scenario W2,W5,W9,W11 \
  --strategy-confirmations 1,2 --strategy-min-stint-refreshes 1,3 \
  > planning/calibration/weather-strategy-sweep-v2.json
```

Naming uses the report family followed by its calibration or policy version. Do not place generated
JSON at the repository root. Prefixes such as `academy` are internal fixture/version identifiers;
player-facing championship names come from the championship definition contract.
