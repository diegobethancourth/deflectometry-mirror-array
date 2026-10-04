/* Shared bench configuration for the Deflectometry Learning Lab.
 *
 * One set of values (test object, screen, camera, geometry) is kept in the
 * browser (localStorage) and read by every Design page, so a value changed on
 * one page is the value used on all of them. Presets load a complete bench;
 * Export / Import move a bench between computers as a JSON file.
 *
 * Load this file in <head>. Pages then call Bench.bind({controlId: 'field'})
 * near the top of their script, before their first update().
 */
(function () {
  var KEY = 'deflectometry.bench.v1';

  var BASLER_EXAMPLES = [
    { name: 'acA2440-20gm', pxH: 2448, pxV: 2048, pix: 3.45, mono: 'yes', glob: 'yes', mount: 'C', bits: 12, iface: 'GigE', cable: 100, fps: 23, price: '$879 (list)' },
    { name: 'acA2440-35um', pxH: 2448, pxV: 2048, pix: 3.45, mono: 'yes', glob: 'yes', mount: 'C', bits: 12, iface: 'USB 3.0', cable: 5, fps: 35, price: '$879 – $1,031' },
    { name: 'a2A2448-23gmBAS', pxH: 2448, pxV: 2048, pix: 2.74, mono: 'yes', glob: 'yes', mount: 'C', bits: 12, iface: 'GigE', cable: 100, fps: 23, price: '$659 – $935' }
  ];

  var PRESETS = {
    asu: {
      label: 'ASU SOLAR bench — 3 × 3 square mirrors',
      note: 'As-built bench of the Week 11 camera report: measured mirror size and gap, 15.6 in 4K screen at 300 mm, camera on a vertical stage above the array.',
      obj: 'grid', cols: 3, rows: 3, a: 24.89, g: 11.18, delta: 9,
      W: 344, Nx: 3840, Ny: 2160, n: 13, zd: 300,
      method: 'smots', steps: 4, kpx: 10, zplan: 350,
      zminCam: 300, smin: 350, smax: 500, cable: 5,
      focals: [8, 12, 16, 25, 35, 50], N: 11, z: 432,
      candidates: BASLER_EXAMPLES
    },
    choi: {
      label: 'Choi et al. 2017 — 7 hexagonal segments (SPIE 10377)',
      note: 'Values from Sec. 3.1 and Fig. 1 of the paper: z_d = 2020 mm, screen pixel 294 µm, 30 px fringe period. Segment size and gap are approximate, read from the 230 mm span in Fig. 1. The camera distance is not reported; 4000 mm is assumed so that the screen covers the field (check on D1). Camera data to be verified against the FLIR datasheet.',
      obj: 'hex7', cols: 3, rows: 3, a: 74.7, g: 3, delta: 10,
      W: 376.3, Nx: 1280, Ny: 1024, n: 30, zd: 2020,
      method: 'smots', steps: 4, kpx: 10, zplan: 4000,
      zminCam: 0, smin: 2500, smax: 6000, cable: 5,
      focals: [12, 16, 25, 35, 50, 75], N: 8, z: 4000,
      candidates: [
        { name: 'FL3-U3-13Y3M-C (verify)', pxH: 1280, pxV: 1024, pix: 4.8, mono: 'yes', glob: 'yes', mount: 'C', bits: '', iface: 'USB 3.0', cable: 5, fps: '', price: '' }
      ]
    },
    single: {
      label: 'Single flat mirror — 2 in (generic exercise)',
      note: 'A starting point for students: one 50.8 mm flat mirror, the same screen and distance as the ASU bench, and an editable example camera list.',
      obj: 'single', cols: 1, rows: 1, a: 50.8, g: 0, delta: 10,
      W: 344, Nx: 3840, Ny: 2160, n: 13, zd: 300,
      method: 'psi', steps: 4, kpx: 10, zplan: 350,
      zminCam: 300, smin: 350, smax: 600, cable: 5,
      focals: [8, 12, 16, 25, 35, 50], N: 8, z: 450,
      candidates: BASLER_EXAMPLES
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function fresh(key) {
    var b = clone(PRESETS[key]);
    b.version = 1; b.preset = key; b.edited = false;
    return b;
  }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.version === 1 && PRESETS[s.preset]) {
        var b = fresh(s.preset);
        for (var k in s) b[k] = s[k];
        return b;
      }
    } catch (e) { /* storage unavailable: fall back to the default preset */ }
    return fresh('asu');
  }

  var B = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(B)); } catch (e) { }
  }

  // Array extent along x and y (mm) for each object type.
  function extent(b) {
    b = b || B;
    if (b.obj === 'single') return { x: b.a, y: b.a, count: 1 };
    if (b.obj === 'hex7') {
      // pointy-top hexagons in rows of 2-3-2; a = flat-to-flat width
      var h = 2 * b.a / Math.sqrt(3);
      return { x: 3 * b.a + 2 * b.g, y: 2.5 * h + 2 * b.g * Math.sqrt(3) / 2, count: 7 };
    }
    return { x: b.cols * b.a + (b.cols - 1) * b.g, y: b.rows * b.a + (b.rows - 1) * b.g, count: b.cols * b.rows };
  }

  function objLabel(b) {
    b = b || B;
    if (b.obj === 'single') return 'single ' + b.a + ' mm mirror';
    if (b.obj === 'hex7') return '7 hexagonal segments';
    return b.cols + ' × ' + b.rows + ' square mirrors';
  }

  function set(field, value) {
    if (B[field] === value) return;
    B[field] = value; B.edited = true; save();
    refreshBar();
  }

  // Results computed by a page (e.g. the camera chosen in D3) are stored without
  // marking the bench as edited by the user.
  function setDerived(field, value) {
    if (B[field] === value) return;
    B[field] = value; save();
  }

  function usePreset(key) {
    if (!PRESETS[key]) return;
    B = fresh(key); save(); location.reload();
  }

  function exportJSON() {
    var blob = new Blob([JSON.stringify(B, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deflectometry-bench.json';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function importJSON(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var s = JSON.parse(r.result);
        if (!s || s.version !== 1 || !PRESETS[s.preset]) throw new Error('not a bench file');
        B = fresh(s.preset);
        for (var k in s) B[k] = s[k];
        B.edited = true; save(); location.reload();
      } catch (e) { alert('This file is not a deflectometry bench (version 1).'); }
    };
    r.readAsText(file);
  }

  /* bind({controlId: 'field' | {field, toControl, fromControl}})
   * Writes the bench value into each control, then keeps the bench updated
   * whenever the control changes. Controls whose value the bench cannot
   * represent (e.g. a layout not in the page's list) are left as they are. */
  var gridOnly = false;
  function bind(map, opts) {
    opts = opts || {};
    if (opts.gridOnly) gridOnly = true;
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var spec = typeof map[id] === 'string' ? { field: map[id] } : map[id];
      var toC = spec.toControl || function (v) { return v; };
      var fromC = spec.fromControl || function (v) { var x = parseFloat(v); return isNaN(x) ? v : x; };
      var v = toC(B[spec.field], B);
      if (v !== undefined && v !== null) {
        if (el.tagName === 'SELECT') {
          var ok = Array.prototype.some.call(el.options, function (o) { return o.value === String(v); });
          if (ok) el.value = String(v);
        } else {
          if (el.type === 'range') {
            var num = parseFloat(v);
            if (el.max !== '' && num > parseFloat(el.max)) el.max = String(num);
            if (el.min !== '' && num < parseFloat(el.min)) el.min = String(num);
          }
          el.value = String(v);
        }
      }
      var push = function () {
        var val = fromC(el.value, B);
        if (spec.write) spec.write(val, B); else set(spec.field, val);
      };
      el.addEventListener('input', push);
      el.addEventListener('change', push);
    });
  }

  // ---------- the bench bar shown under the navigation ----------
  // A read-only reminder of which bench the page is using. Changing, saving
  // and loading benches happens on one page only: D0 (bench.html).
  var bar = null;
  function refreshBar() {
    if (!bar) return;
    bar.querySelector('.bench-name').textContent = PRESETS[B.preset].label + (B.edited ? ' — values edited' : '');
    var warn = bar.querySelector('.bench-warn');
    if (warn) warn.style.display = (gridOnly && B.obj !== 'grid') ? 'inline' : 'none';
  }

  function buildBar() {
    var anchor = document.querySelector('.gold-bar');
    if (!anchor || document.body.hasAttribute('data-no-bench')) return;
    var css = document.createElement('style');
    css.textContent =
      '.bench-bar{background:#FFF8E1;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 24px;font:12px Arial,Helvetica,sans-serif;color:#3E3E3E}' +
      '.bench-bar b{color:#8C1D40}.bench-bar .bench-name{font-weight:700}' +
      '.bench-bar a{font-size:11px;font-weight:700;color:#8C1D40;background:#fff;border-radius:4px;padding:4px 9px;text-decoration:none}' +
      '.bench-bar a:hover{background:#FFE08A}.bench-warn{color:#b71c1c;font-weight:700}.bench-help{color:#747474;font-size:11px}';
    document.head.appendChild(css);
    bar = document.createElement('div');
    bar.className = 'bench-bar';
    bar.innerHTML = '<b>Working bench:</b><span class="bench-name"></span>' +
      '<span>· ' + objLabel() + ' · screen ' + B.W + ' mm, ' + B.Nx + ' px · z<sub>d</sub> = ' + B.zd + ' mm</span>' +
      '<span class="bench-warn" style="display:none">This page draws square grids only; the bench object is approximated.</span>' +
      '<span class="bench-help" style="margin-left:auto">Values changed on this page update the working bench.</span>' +
      '<a href="bench.html">Change bench (D0)</a>';
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    refreshBar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBar); else buildBar();

  window.Bench = {
    get: function () { return B; },
    set: set,
    setDerived: setDerived,
    bind: bind,
    extent: extent,
    objLabel: objLabel,
    presets: function () { return PRESETS; },
    usePreset: usePreset,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: function () { usePreset(B.preset); }
  };
})();
