# Headless race formula v2

`academy-dry-v5-ratings-0-100` implements the calculation and update order in
`planning/RACE_SIMULATION_CONTRACT.md`. All persisted simulation quantities are integers:
milliseconds, fuel grams, tyre-wear basis points, and parts-per-million input multipliers.
`roundHalfEven` is applied at each segment boundary.

## Coefficients

| Coefficient                         |             Value |
| ----------------------------------- | ----------------: |
| Rating center                       |                50 |
| Driver time factor per rating point |         0.0002565 |
| Car performance scale               |             0.075 |
| Base consistency noise              | 44 ms per segment |
| Fuel penalty                        |      31 ms/kg/lap |
| Base fuel use                       |       1,520 g/lap |
| Dirty-air interaction range         |          1,800 ms |
| Maximum dirty-air penalty           |        22,000 ppm |
| DRS gain                            |        18,000 ppm |
| Overtake attempt gap                |          1,250 ms |
| Overtake attempt cooldown           |            5 laps |
| Immediate pass-back cooldown        |            2 laps |
| Overtake opportunity base           |              0.02 |
| Overtake gap weight                 |              0.18 |
| Overtake passing-zone weight        |              0.22 |
| Overtake pace-advantage weight      |              0.08 |
| Overtake DRS opportunity weight     |              0.30 |
| Overtake opportunity maximum        |              0.65 |
| Pit service time                    |          3,150 ms |
| Start variance ceiling              |            420 ms |
| Qualifying execution variance       |            300 ms |
| Grid-position spacing               |             85 ms |
| Conservative fuel factor            |              1.05 |

Tyre compound grip, warm-up, base wear, linear wear-time loss, wear knee, and post-knee time loss
are fixture inputs. Driver tyre management, setup, engine mode, conservation mode, fuel load, and
segment energy modify wear. The setup wear factor is independent from the peak-pace setup factor so
fixtures can express a pace-versus-durability tradeoff. Wear is monotonic and clamped to 10,000
basis points.

| Compound | Peak grip ppm | Base wear bp/lap | Wear knee bp | Maximum post-knee loss |
| -------- | ------------: | ---------------: | -----------: | ---------------------: |
| Soft     |     1,012,000 |              255 |        2,800 |               4,500 ms |
| Medium   |     1,005,000 |              178 |        2,200 |               8,000 ms |
| Hard     |       999,000 |              125 |        4,000 |               5,000 ms |

## Calibration status

The `academy-dry-v5-ratings-0-100` baseline preserves the prior formula behavior while accepting
direct 0–100 ratings. It requires a fresh calibration pass before acceptance. The previous
`academy-dry-v4` Stage C baseline was accepted after the 100-run academy, matched-strategy,
tyre-management, and setup-sweep reviews.
Changing a coefficient that changes deterministic output requires a new `formulaVersion`.
Changing serialized state or event shapes requires a new `engineVersion`.

| Accepted calibration gate                            | V4 result |
| ---------------------------------------------------- | --------: |
| Clean-air one-stop advantage                         |  2,956 ms |
| Matched races where two-stop was faster              |    51/100 |
| Matched races where two-stop finished better         |    45/100 |
| Immediate pass-backs per performance-grid race       |         8 |
| Preserving setup race-time disadvantage              |  1,342 ms |
| Preserving setup mean used-tyre wear reduction       |    303 bp |
| Strong tyre-management representative-race gain      |  5,414 ms |
| Strong tyre-management mean used-tyre wear reduction |    500 bp |

The representative peak-pace setup uses `997,000 ppm` pace and `1,040,000 ppm` wear. The accepted
preserving setup uses `998,000 ppm` pace and `960,000 ppm` wear. These are calibration anchors for
future setup resolution; track, car, driver, and condition context may interpolate between or move
beyond them.

## Calibration report v4

`pnpm sim:batch` compares a performance-seeded grid with a deterministic scrambled-grid stress
test by default. Use `--grid performance` or `--grid scrambled` to run only one scenario.

The report separates all laps from clean laps, removes pit and following out laps, reports
fuel-corrected stint degradation by compound, estimates effective pit loss, distinguishes unique,
repeat, immediate pass-back, later re-pass, net, DRS, and non-DRS passes, and measures grid/finish
retention. Controlled single-car runs isolate driver pace, car performance, and clean-air strategy
effects, plus tyre-management and setup pace-versus-durability tradeoffs in uninterrupted-stint
stress tests and representative one-stop races. A preserving-setup pace sweep identifies the input
range that gives up zero to three seconds over the baseline race. Matched full-field runs compare
one-stop and two-stop outcomes for the same driver, car, grid, rivals, and seed.
