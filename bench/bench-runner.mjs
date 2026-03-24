import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
import path from 'path';

const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const ITERATIONS = parseInt(process.env.ITERATIONS || '30', 10);
const MORPHDOM_PATH = '/morphdom/dist/morphdom-umd.js';

const benchHtml = readFileSync('/bench/style-benchmark.html', 'utf8');

// Inject morphdom from mounted volume instead of relative path
const patchedHtml = benchHtml.replace(
  '<script src="../dist/morphdom-umd.js"></script>',
  '<script>' + readFileSync(MORPHDOM_PATH, 'utf8') + '</script>'
);

const browser = await puppeteer.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  headless: true,
});

const page = await browser.newPage();
await page.setContent(patchedHtml, { waitUntil: 'domcontentloaded' });

// Run benchmark inside page context
const results = await page.evaluate((iterations) => {
  /* globals morphdom, performance */

  var STYLE_PROPS = [
    'color', 'background-color', 'padding', 'margin', 'font-size',
    'border', 'border-radius', 'opacity', 'display', 'width',
    'height', 'max-width', 'min-height', 'line-height', 'letter-spacing',
    'text-align', 'overflow', 'position', 'top', 'left'
  ];
  var VALUES_A = [
    'red', '#f0f0f0', '10px', '5px', '14px',
    '1px solid #ccc', '4px', '1', 'block', '100px',
    '50px', '200px', '20px', '1.5', '0.5px',
    'left', 'hidden', 'relative', '0px', '0px'
  ];
  var VALUES_B = [
    'blue', '#333333', '20px', '15px', '18px',
    '2px solid #999', '8px', '0.8', 'flex', '150px',
    '80px', '300px', '40px', '1.8', '1px',
    'center', 'auto', 'absolute', '10px', '20px'
  ];

  function styleStr(values, count, cssVarSuffix) {
    var parts = [];
    for (var i = 0; i < count && i < STYLE_PROPS.length; i++) {
      parts.push(STYLE_PROPS[i] + ':' + values[i]);
    }
    return parts.join(';') + (cssVarSuffix || '');
  }

  function buildTree(elCount, propCount, variant, changeRatio, cssVars) {
    var wrap = document.createElement('div');
    wrap.id = 'bench-root';
    var sA = propCount > 0 ? styleStr(VALUES_A, propCount, cssVars ? ';--value:10;--size:4rem' : '') : null;
    var sB = propCount > 0 ? styleStr(VALUES_B, propCount, cssVars ? ';--value:75;--size:6rem' : '') : null;
    for (var i = 0; i < elCount; i++) {
      var el = document.createElement('div');
      el.id = 'item-' + i;
      el.textContent = 'item ' + i;
      var useB = variant === 'b' && (changeRatio >= 1.0 || (i / elCount) < changeRatio);
      var s = useB ? sB : sA;
      if (s) el.setAttribute('style', s);
      wrap.appendChild(el);
    }
    return wrap;
  }

  function measure(sc) {
    var times = [];
    var container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    for (var iter = 0; iter < iterations; iter++) {
      var from = buildTree(sc.elCount, sc.propCount, 'a', sc.changeRatio, sc.cssVars);
      container.textContent = '';
      container.appendChild(from);
      var to = buildTree(sc.elCount, sc.propCount, 'b', sc.changeRatio, sc.cssVars);
      from.offsetHeight; // force layout
      var t0 = performance.now();
      morphdom(from, to);
      var t1 = performance.now();
      times.push(t1 - t0);
    }
    document.body.removeChild(container);

    times.sort(function(a, b) { return a - b; });
    var trim = Math.floor(times.length * 0.1);
    var t = times.slice(trim, times.length - trim);
    if (t.length === 0) t = times;
    var sum = 0;
    for (var i = 0; i < t.length; i++) sum += t[i];
    var mean = sum / t.length;
    var vari = 0;
    for (var i = 0; i < t.length; i++) vari += (t[i] - mean) * (t[i] - mean);
    return {
      mean: mean,
      median: t[Math.floor(t.length / 2)],
      stddev: Math.sqrt(vari / t.length),
      min: t[0],
      max: t[t.length - 1]
    };
  }

  var scenarios = [
    { name: '1000 els, 5 props, 100% changed',  elCount: 1000, propCount: 5,  changeRatio: 1.0 },
    { name: '1000 els, 20 props, 100% changed', elCount: 1000, propCount: 20, changeRatio: 1.0 },
    { name: '1000 els, 5 props, 10% changed',   elCount: 1000, propCount: 5,  changeRatio: 0.1 },
    { name: '1000 els, 20 props, 10% changed',  elCount: 1000, propCount: 20, changeRatio: 0.1 },
    { name: '1000 els, 20 props, 0% changed',   elCount: 1000, propCount: 20, changeRatio: 0.0 },
    { name: '5000 els, 5 props, 100% changed',  elCount: 5000, propCount: 5,  changeRatio: 1.0 },
    { name: '100 els, 20 props + CSS vars',      elCount: 100,  propCount: 20, changeRatio: 1.0, cssVars: true },
    { name: '1000 els, no style (baseline)',     elCount: 1000, propCount: 0,  changeRatio: 0 }
  ];

  var out = [];
  for (var s = 0; s < scenarios.length; s++) {
    var r = measure(scenarios[s]);
    out.push({ name: scenarios[s].name, mean: r.mean, median: r.median, stddev: r.stddev, min: r.min, max: r.max });
  }
  return out;
}, ITERATIONS);

await browser.close();

// Print results as markdown table
console.log('| Scenario | Mean (ms) | Median (ms) | StdDev | Min | Max |');
console.log('|----------|-----------|-------------|--------|-----|-----|');
for (const r of results) {
  console.log(
    '| ' + r.name +
    ' | ' + r.mean.toFixed(2) +
    ' | ' + r.median.toFixed(2) +
    ' | ' + r.stddev.toFixed(2) +
    ' | ' + r.min.toFixed(2) +
    ' | ' + r.max.toFixed(2) + ' |'
  );
}
