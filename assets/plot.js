/* Small numerics and plotting helpers shared by the Learn modules.
 * No dependencies. Plots are drawn as inline SVG so they print and scale.
 */
(function () {
  // ---------- numerics ----------
  // In-place radix-2 FFT on arrays re, im (length a power of two).
  function fft(re, im, inverse) {
    var n = re.length, i, j, k, len;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (len = 2; len <= n; len <<= 1) {
      var ang = 2 * Math.PI / len * (inverse ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var ur = re[i + k], ui = im[i + k];
          var vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          var vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    if (inverse) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  function wrap(p) { return Math.atan2(Math.sin(p), Math.cos(p)); }
  function unwrap(ph) {
    var out = ph.slice(), off = 0;
    for (var i = 1; i < ph.length; i++) {
      var d = ph[i] - ph[i - 1];
      if (d > Math.PI) off -= 2 * Math.PI; else if (d < -Math.PI) off += 2 * Math.PI;
      out[i] = ph[i] + off;
    }
    return out;
  }
  // Gaussian noise (Box–Muller) from a seeded generator so figures are repeatable.
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gauss(r) { var u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function rms(a, b) {
    var s = 0; for (var i = 0; i < a.length; i++) { var d = a[i] - (b ? b[i] : 0); s += d * d; }
    return Math.sqrt(s / a.length);
  }

  // ---------- plotting ----------
  function nice(lo, hi, n) {
    var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = span / n / step; if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var t = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9 * span; v += step) t.push(+v.toPrecision(10));
    return t;
  }
  /* linePlot(svgElement, series, opts)
   * series: [{x:[], y:[], color, width, dash, label, points:true}]
   * opts: {xlabel, ylabel, ymin, ymax, xmin, xmax, w, h, hline} */
  function linePlot(svg, series, o) {
    o = o || {};
    var W = o.w || 900, H = o.h || 230, L = 52, R = 12, T = 14, B = 34;
    var xs = [], ys = [];
    series.forEach(function (s) { xs = xs.concat(s.x); ys = ys.concat(s.y.filter(isFinite)); });
    var xmin = o.xmin !== undefined ? o.xmin : Math.min.apply(null, xs), xmax = o.xmax !== undefined ? o.xmax : Math.max.apply(null, xs);
    var ymin = o.ymin !== undefined ? o.ymin : Math.min.apply(null, ys), ymax = o.ymax !== undefined ? o.ymax : Math.max.apply(null, ys);
    if (ymax - ymin < 1e-12) { ymax += 1; ymin -= 1; }
    var pad = (ymax - ymin) * 0.06; if (o.ymin === undefined) ymin -= pad; if (o.ymax === undefined) ymax += pad;
    var X = function (v) { return L + (v - xmin) / (xmax - xmin) * (W - L - R); };
    var Y = function (v) { return T + (ymax - v) / (ymax - ymin) * (H - T - B); };
    var h = '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="#FAFAFC"/>';
    nice(ymin, ymax, 5).forEach(function (v) {
      h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#E4E4EA"/>' +
        '<text x="' + (L - 5) + '" y="' + (Y(v) + 3) + '" font-size="9" text-anchor="end" fill="#555">' + fmt(v) + '</text>';
    });
    nice(xmin, xmax, 6).forEach(function (v) {
      h += '<line y1="' + T + '" y2="' + (H - B) + '" x1="' + X(v) + '" x2="' + X(v) + '" stroke="#EEEEF2"/>' +
        '<text x="' + X(v) + '" y="' + (H - B + 12) + '" font-size="9" text-anchor="middle" fill="#555">' + fmt(v) + '</text>';
    });
    if (o.hline !== undefined) h += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(o.hline) + '" y2="' + Y(o.hline) + '" stroke="#999" stroke-dasharray="3 3"/>';
    if (o.band) h += '<rect x="' + X(o.band[0]) + '" y="' + T + '" width="' + (X(o.band[1]) - X(o.band[0])) + '" height="' + (H - T - B) + '" fill="#FFC627" opacity=".22"/>';
    series.forEach(function (s) {
      var d = '';
      for (var i = 0; i < s.x.length; i++) {
        if (!isFinite(s.y[i])) continue;
        var yv = Math.max(ymin, Math.min(ymax, s.y[i]));
        d += (d ? 'L' : 'M') + X(s.x[i]).toFixed(1) + ',' + Y(yv).toFixed(1);
      }
      h += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 1.6) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>';
    });
    h += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" font-size="10" text-anchor="middle" fill="#333">' + (o.xlabel || '') + '</text>' +
      '<text x="12" y="' + ((T + H - B) / 2) + '" font-size="10" text-anchor="middle" fill="#333" transform="rotate(-90 12 ' + ((T + H - B) / 2) + ')">' + (o.ylabel || '') + '</text>';
    var lx = L + 8, ly = T + 12;
    series.filter(function (s) { return s.label; }).forEach(function (s) {
      h += '<line x1="' + lx + '" x2="' + (lx + 16) + '" y1="' + (ly - 3) + '" y2="' + (ly - 3) + '" stroke="' + s.color + '" stroke-width="2"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + '/>' +
        '<text x="' + (lx + 20) + '" y="' + ly + '" font-size="9.5" fill="#333">' + s.label + '</text>';
      ly += 13;
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = h;
  }
  function fmt(v) {
    var a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1000 || a < 0.01) return v.toExponential(0).replace('e+', 'e');
    return +v.toPrecision(3) + '';
  }
  window.Lab = { fft: fft, wrap: wrap, unwrap: unwrap, rng: rng, gauss: gauss, rms: rms, linePlot: linePlot };
})();
