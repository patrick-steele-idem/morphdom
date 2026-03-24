# Style synchronization benchmark

Measures morph time for elements with inline styles to compare
`setAttribute("style")` (master) vs `style.cssText` (fix).

## Quick start (Docker)

```bash
# From the morphdom root directory:
npm run build
docker build -t morphdom-bench ./bench
docker run --rm \
  -v "$(pwd)/dist:/morphdom/dist:ro" \
  -v "$(pwd)/bench/style-benchmark.html:/bench/style-benchmark.html:ro" \
  morphdom-bench
```

To compare branches:

```bash
# 1. Benchmark the fix branch
git checkout fix/csp-safe-style-sync
npm run build
docker run --rm \
  -v "$(pwd)/dist:/morphdom/dist:ro" \
  -v "$(pwd)/bench/style-benchmark.html:/bench/style-benchmark.html:ro" \
  morphdom-bench

# 2. Benchmark master
git checkout master
npm run build
docker run --rm \
  -v "$(pwd)/dist:/morphdom/dist:ro" \
  -v "$(pwd)/bench/style-benchmark.html:/bench/style-benchmark.html:ro" \
  morphdom-bench
```

## Browser (manual)

Open `bench/style-benchmark.html` in any browser. Click "Run extended" for
more precise results (50 iterations with outlier trimming).

## Configuration

The Docker runner accepts environment variables:

- `ITERATIONS` — number of iterations per scenario (default: 30)

```bash
docker run --rm -e ITERATIONS=50 \
  -v "$(pwd)/dist:/morphdom/dist:ro" \
  -v "$(pwd)/bench/style-benchmark.html:/bench/style-benchmark.html:ro" \
  morphdom-bench
```

## Scenarios

| Scenario                          | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| 1000 els, 5 props, 100% changed   | Moderate worst case                     |
| 1000 els, 20 props, 100% changed  | Heavy worst case                        |
| 1000 els, 5/20 props, 10% changed | Realistic incremental update            |
| 1000 els, 20 props, 0% changed    | Fast-path (no mutation)                 |
| 5000 els, 5 props, 100% changed   | Scale test                              |
| 100 els, 20 props + CSS vars      | CSS custom properties                   |
| 1000 els, no style (baseline)     | Regression check for non-style elements |
