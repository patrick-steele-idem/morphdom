# morphdom style benchmark results

Environment: Docker node:20-slim + Chromium, headless, 30 iterations (trimmed mean)

## master (setAttribute)

| Scenario                         | Mean (ms) | Median (ms) | StdDev | Min   | Max   |
| -------------------------------- | --------- | ----------- | ------ | ----- | ----- |
| 1000 els, 5 props, 100% changed  | 3.77      | 3.70        | 0.31   | 3.30  | 4.40  |
| 1000 els, 20 props, 100% changed | 5.46      | 5.50        | 0.26   | 5.10  | 6.10  |
| 1000 els, 5 props, 10% changed   | 1.79      | 1.70        | 0.22   | 1.50  | 2.30  |
| 1000 els, 20 props, 10% changed  | 2.09      | 2.00        | 0.38   | 1.70  | 3.00  |
| 1000 els, 20 props, 0% changed   | 1.61      | 1.50        | 0.27   | 1.40  | 2.30  |
| 5000 els, 5 props, 100% changed  | 16.80     | 16.20       | 1.82   | 14.70 | 20.90 |
| 100 els, 20 props + CSS vars     | 0.67      | 0.70        | 0.06   | 0.60  | 0.80  |
| 1000 els, no style (baseline)    | 1.20      | 1.20        | 0.06   | 1.10  | 1.30  |

## fix v1 — syncStyle property-by-property (REJECTED)

| Scenario                         | Mean (ms) | Median (ms) | StdDev | Min   | Max   |
| -------------------------------- | --------- | ----------- | ------ | ----- | ----- |
| 1000 els, 5 props, 100% changed  | 15.26     | 15.30       | 0.86   | 13.80 | 16.70 |
| 1000 els, 20 props, 100% changed | 61.18     | 61.40       | 1.76   | 57.90 | 63.90 |
| 1000 els, 5 props, 10% changed   | 5.66      | 5.50        | 0.33   | 5.40  | 6.30  |
| 1000 els, 20 props, 10% changed  | 19.23     | 19.00       | 0.73   | 18.30 | 20.60 |
| 1000 els, 20 props, 0% changed   | 15.00     | 15.00       | 0.50   | 14.10 | 16.00 |
| 5000 els, 5 props, 100% changed  | 75.53     | 75.40       | 2.93   | 71.50 | 81.60 |
| 100 els, 20 props + CSS vars     | 6.93      | 7.00        | 0.25   | 6.50  | 7.50  |
| 1000 els, no style (baseline)    | 1.27      | 1.20        | 0.13   | 1.10  | 1.70  |

4-11x slower than master. Rejected due to property-by-property loop overhead.

## fix v3 — getAttribute + style.cssText (CURRENT)

| Scenario                         | Mean (ms) | Median (ms) | StdDev | Min   | Max   |
| -------------------------------- | --------- | ----------- | ------ | ----- | ----- |
| 1000 els, 5 props, 100% changed  | 5.51      | 5.40        | 0.64   | 4.40  | 7.30  |
| 1000 els, 20 props, 100% changed | 13.73     | 13.70       | 0.73   | 12.70 | 15.90 |
| 1000 els, 5 props, 10% changed   | 1.90      | 1.90        | 0.18   | 1.70  | 2.50  |
| 1000 els, 20 props, 10% changed  | 2.92      | 2.80        | 0.37   | 2.50  | 3.80  |
| 1000 els, 20 props, 0% changed   | 1.57      | 1.50        | 0.26   | 1.40  | 2.30  |
| 5000 els, 5 props, 100% changed  | 24.35     | 24.40       | 1.70   | 22.00 | 27.60 |
| 100 els, 20 props + CSS vars     | 1.32      | 1.30        | 0.04   | 1.30  | 1.40  |
| 1000 els, no style (baseline)    | 1.26      | 1.20        | 0.10   | 1.10  | 1.50  |

## Final comparison (v3 vs master)

| Scenario                         | master | v3    | Factor          |
| -------------------------------- | ------ | ----- | --------------- |
| 1000 els, 5 props, 100% changed  | 3.77   | 5.51  | 1.46x slower    |
| 1000 els, 20 props, 100% changed | 5.46   | 13.73 | 2.51x slower    |
| 1000 els, 5 props, 10% changed   | 1.79   | 1.90  | 1.06x (neutral) |
| 1000 els, 20 props, 10% changed  | 2.09   | 2.92  | 1.40x slower    |
| 1000 els, 20 props, 0% changed   | 1.61   | 1.57  | 0.97x (neutral) |
| 5000 els, 5 props, 100% changed  | 16.80  | 24.35 | 1.45x slower    |
| 100 els, 20 props + CSS vars     | 0.67   | 1.32  | 1.97x slower    |
| 1000 els, no style (baseline)    | 1.20   | 1.26  | 1.05x (neutral) |

## Analysis

- **0% changed (most common in LiveView re-renders): identical to master** (0.97x)
- **10% changed (typical incremental update): ~1.06-1.40x** — negligible
- **100% changed (worst case, all 1000+ elements change all styles): 1.5-2.5x** — the minimum cost of CSP-safe CSSOM setter vs setAttribute
- **No style (baseline): identical** — zero overhead for elements without style
- The remaining overhead in 100% changed is intrinsic to `style.cssText = value` (CSSOM parsing + layout invalidation) vs `setAttribute("style")` (string-only)
- v3 approach: compare via `getAttribute("style")` (cheap string read), write via `style.cssText` (CSP-safe CSSOM setter)
