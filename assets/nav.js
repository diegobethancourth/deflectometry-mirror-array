/* Site navigation for the Deflectometry Learning Lab — one definition for every
 * page. Place <nav class="nav-links" id="site-nav"></nav> in the page and load
 * this script directly after it. Entries marked soon:true are shown greyed out
 * until the module exists.
 */
(function () {
  var REPO = 'https://github.com/diegobethancourth/deflectometry-mirror-array/tree/main/';
  var NAV = [
    { label: 'Home', href: 'index.html' },
    { label: 'Learn', items: [
      { t: 'L1 · Reflection and surface slope', href: 'reflection.html' },
      { t: 'L2 · Fringe coding and phase shifting', href: 'fringes.html' },
      { t: 'L3 · Phase retrieval methods compared', href: 'phase.html' },
      { t: 'L4 · From slope to surface', href: 'integration.html' },
      { t: 'L5 · Errors and calibration', href: 'errors.html' }
    ]},
    { label: 'Design', items: [
      { t: 'D0 · Bench setup and presets', href: 'bench.html' },
      { t: 'D1 · Test object and geometry', href: 'geometry.html' },
      { t: 'D2 · Screen and fringes', href: 'fringes.html' },
      { t: 'D3 · Camera and lens', href: 'camera.html' },
      { t: 'D4 · Error budget', href: 'budget.html' },
      { t: 'D5 · Actuation (segmented arrays)', href: 'piezo.html' }
    ]},
    { label: 'Replicate', items: [
      { t: 'R1 · SMOTS — Choi et al. 2017', href: 'smots.html' },
      { t: 'R2 · Notebooks and scripts', href: 'notebooks.html' },
      { t: 'R3 · SMOTS live simulator', href: 'simulator.html' },
      { t: 'R4 · ASU bench case study', href: 'asu-bench.html' }
    ]},
    { label: 'Reference', items: [
      { t: 'Math reference (75 equations)', href: 'docs/math-reference.html' }
    ]}
  ];

  var css = document.createElement('style');
  css.textContent =
    '.nav-dd{position:relative;display:inline-block}' +
    '.nav-dd>button{background:none;border:none;color:rgba(255,255,255,.85);font:700 12px Arial,Helvetica,sans-serif;padding:6px 11px;border-radius:3px;cursor:pointer;white-space:nowrap}' +
    '.nav-dd>button:hover,.nav-dd:focus-within>button{background:rgba(255,255,255,.14);color:#fff}' +
    '.nav-dd>button.active{background:#FFC627;color:#8C1D40}' +
    '.nav-menu{display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);min-width:270px;padding:6px;z-index:800}' +
    '.nav-menu::before{content:"";position:absolute;top:-8px;left:0;right:0;height:8px}' +
    '.nav-dd:hover .nav-menu,.nav-dd:focus-within .nav-menu{display:block}' +
    '.nav-menu a,.nav-menu span{display:block;color:#191919 !important;font:12px Arial,Helvetica,sans-serif;padding:7px 10px;border-radius:5px;text-decoration:none;white-space:nowrap}' +
    '.nav-menu a:hover{background:#F8ECF1;color:#8C1D40 !important}' +
    '.nav-menu a.here{background:#FFF4D6;font-weight:700}' +
    '.nav-menu span{color:#A0A0A0 !important}.nav-menu span em{font-style:normal;font-size:10px;margin-left:6px}';
  document.head.appendChild(css);

  var nav = document.getElementById('site-nav');
  if (!nav) return;
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var html = '';
  NAV.forEach(function (n) {
    if (n.href) {
      html += '<a href="' + n.href + '"' + (n.href === here ? ' class="active"' : '') + '>' + n.label + '</a>';
      return;
    }
    var active = n.items.some(function (i) { return i.href === here; });
    html += '<div class="nav-dd"><button type="button"' + (active ? ' class="active"' : '') + '>' + n.label + ' &#9662;</button><div class="nav-menu">';
    n.items.forEach(function (i) {
      if (i.soon) { html += '<span>' + i.t + '<em>planned</em></span>'; return; }
      html += '<a href="' + i.href + '"' + (i.ext ? ' target="_blank" rel="noopener"' : '') + (i.href === here ? ' class="here"' : '') + '>' + i.t + (i.ext ? ' &#8599;' : '') + '</a>';
    });
    html += '</div></div>';
  });
  nav.innerHTML = html;
})();
