/* Site navigation for the Deflectometry Learning Lab — one definition for every
 * page. Place <nav class="nav-links" id="site-nav"></nav> in the page and load
 * this script directly after it.
 *
 * It also adds, on every module page:
 *   - a Previous / Next bar at the bottom, following the order of the track;
 *   - a "Print this page" button and a print stylesheet.
 * fringes.html belongs to two tracks (L2 and D2); a link with ?t=d opens it
 * inside the Design sequence.
 */
(function () {
  var TRACKS = {
    learn: { label: 'Learn', home: 'learn.html', next: 'design', steps: [
      { code: 'L1', t: 'Reflection and surface slope', href: 'reflection.html' },
      { code: 'L2', t: 'Fringe coding and phase shifting', href: 'fringes.html' },
      { code: 'L3', t: 'Phase retrieval methods compared', href: 'phase.html' },
      { code: 'L4', t: 'From slope to surface', href: 'integration.html' },
      { code: 'L5', t: 'Errors and calibration', href: 'errors.html' }
    ]},
    design: { label: 'Design', home: 'design.html', next: 'replicate', steps: [
      { code: 'D0', t: 'Choose the bench', href: 'bench.html' },
      { code: 'D1', t: 'Test object and geometry', href: 'geometry.html' },
      { code: 'D2', t: 'Screen and fringes', href: 'fringes.html?t=d' },
      { code: 'D3', t: 'Camera and lens', href: 'camera.html' },
      { code: 'D4', t: 'Error budget', href: 'budget.html' },
      { code: 'D5', t: 'Actuation (segmented arrays)', href: 'piezo.html' },
      { code: 'D6', t: 'Design summary (print)', href: 'summary.html' }
    ]},
    replicate: { label: 'Replicate', home: 'replicate.html', next: null, steps: [
      { code: 'R1', t: 'SMOTS — Choi et al. 2017', href: 'smots.html' },
      { code: 'R2', t: 'Notebooks and scripts', href: 'notebooks.html' },
      { code: 'R3', t: 'SMOTS live simulator', href: 'simulator.html' },
      { code: 'R4', t: 'ASU bench case study', href: 'asu-bench.html' }
    ]}
  };
  var ORDER = ['learn', 'design', 'replicate'];

  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var designCtx = /[?&]t=d\b/.test(location.search);
  var here = file + (file === 'fringes.html' && designCtx ? '?t=d' : '');

  // which track and step is this page?
  var cur = null, idx = -1;
  ORDER.forEach(function (k) {
    if (TRACKS[k].home === file) { cur = k; idx = -1; }
    TRACKS[k].steps.forEach(function (s, i) { if (s.href === here) { cur = k; idx = i; } });
  });

  var css = document.createElement('style');
  css.textContent =
    '.nav-dd{position:relative;display:inline-block}' +
    '.nav-dd>a{display:inline-block}' +
    '.nav-menu{display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);min-width:280px;padding:6px;z-index:800}' +
    '.nav-menu::before{content:"";position:absolute;top:-8px;left:0;right:0;height:8px}' +
    '.nav-dd:hover .nav-menu,.nav-dd:focus-within .nav-menu{display:block}' +
    '.nav-menu a{display:block;color:#191919 !important;background:none !important;font:12px Arial,Helvetica,sans-serif;padding:7px 10px;border-radius:5px;text-decoration:none;white-space:nowrap}' +
    '.nav-menu a:hover{background:#F8ECF1 !important;color:#8C1D40 !important}' +
    '.nav-menu a.here{background:#FFF4D6 !important;font-weight:700}' +
    '.nav-menu a.ov{font-weight:700;color:#8C1D40 !important;border-bottom:1px solid #EEE;border-radius:5px 5px 0 0;margin-bottom:3px}' +
    '.pager{max-width:1240px;margin:18px auto 22px;padding:0 24px;display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}' +
    '.pager a,.pager button{flex:1;min-width:200px;text-decoration:none;background:#fff;border:none;border-radius:10px;padding:12px 16px;font:12px Arial,Helvetica,sans-serif;color:#3E3E3E;cursor:pointer;text-align:left;box-shadow:0 1px 3px rgba(0,0,0,.06)}' +
    '.pager a:hover,.pager button:hover{background:#FFF4D6}' +
    '.pager .lbl{display:block;font-size:10px;color:#747474;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}' +
    '.pager .nx{text-align:right}.pager .nx b,.pager b{color:#8C1D40;font-size:13px}' +
    '.pager .mid{flex:0 0 auto;min-width:0;text-align:center}' +
    '@media print{' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.nav,.brandbar img.logo-lab,.bench-bar,.pager,.tour-btn,#tour-launch,.tour-launch,button.btn,.btn-row{display:none !important}' +
      'body{background:#fff !important}.app{display:block !important}.left-col{width:auto !important;border:none !important;page-break-after:avoid}' +
      '.stepcard,.card,.panel,.metric,.math-block,table{page-break-inside:avoid;break-inside:avoid}' +
      'details{display:block}details>*{display:block}a{color:#191919 !important;text-decoration:none !important}' +
      '.right-col{padding:0 !important}' +
    '}';
  document.head.appendChild(css);

  // ---------- top navigation ----------
  var nav = document.getElementById('site-nav');
  if (nav) {
    var html = '<a href="index.html"' + (file === 'index.html' ? ' class="active"' : '') + '>Home</a>';
    ORDER.forEach(function (k) {
      var T = TRACKS[k], active = cur === k;
      html += '<div class="nav-dd"><a href="' + T.home + '"' + (active ? ' class="active"' : '') + '>' + T.label + ' &#9662;</a><div class="nav-menu">' +
        '<a class="ov' + (file === T.home ? ' here' : '') + '" href="' + T.home + '">' + T.label + ' — overview</a>';
      T.steps.forEach(function (s) {
        html += '<a href="' + s.href + '"' + (s.href === here ? ' class="here"' : '') + '>' + s.code + ' · ' + s.t + '</a>';
      });
      html += '</div></div>';
    });
    html += '<div class="nav-dd"><a href="docs/math-reference.html">Reference &#9662;</a><div class="nav-menu">' +
      '<a href="docs/math-reference.html">Math reference (75 equations)</a></div></div>';
    nav.innerHTML = html;
  }

  // ---------- previous / next bar ----------
  function card(cls, label, item) {
    return '<a class="' + cls + '" href="' + item.href + '"><span class="lbl">' + label + '</span><b>' + item.title + '</b></a>';
  }
  function buildPager() {
    if (!cur || document.body.hasAttribute('data-no-pager')) return;
    var T = TRACKS[cur], prev = null, next = null;
    if (idx === -1) {
      var p = ORDER.indexOf(cur);
      if (p > 0) { var PT = TRACKS[ORDER[p - 1]]; prev = { href: PT.home, title: PT.label + ' — overview' }; }
      next = { href: T.steps[0].href, title: T.steps[0].code + ' · ' + T.steps[0].t };
    } else {
      prev = idx > 0 ? { href: T.steps[idx - 1].href, title: T.steps[idx - 1].code + ' · ' + T.steps[idx - 1].t } : { href: T.home, title: T.label + ' — overview' };
      if (idx < T.steps.length - 1) next = { href: T.steps[idx + 1].href, title: T.steps[idx + 1].code + ' · ' + T.steps[idx + 1].t };
      else if (T.next) next = { href: TRACKS[T.next].home, title: 'Next track: ' + TRACKS[T.next].label };
      else next = { href: 'index.html', title: 'Back to the home page' };
    }
    var bar = document.createElement('div');
    bar.className = 'pager';
    bar.innerHTML = (prev ? card('pv', '← Previous', prev) : '<span style="flex:1"></span>') +
      '<button type="button" class="mid" onclick="window.print()"><span class="lbl">Print</span><b>🖶 This page</b></button>' +
      (next ? card('nx', 'Next →', next) : '<span style="flex:1"></span>');
    var foot = document.querySelector('.footer');
    if (foot) foot.parentNode.insertBefore(bar, foot); else document.body.appendChild(bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPager); else buildPager();

  window.LabNav = { tracks: TRACKS, order: ORDER, current: function () { return { track: cur, index: idx }; } };
})();
