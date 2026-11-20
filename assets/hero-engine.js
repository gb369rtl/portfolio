/* Shared by the hero demos: the baked portrait, a dot sampler, the counted loader and one WebGL point renderer.
   Every dot has two states, A and B, and a delay; one progress value carries all of them from A to B. */
(function () {
  'use strict';
  var HD = window.HeroDots = {};

  // ?motion=reduce shows the reduced-motion path (everything in place at once) without changing the system setting
  HD.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=reduce/.test(location.search);
  HD.modest = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 620;
  HD.rand = function (a, b) { return a + Math.random() * (b - a); };
  HD.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  HD.smooth = function (a, b, v) { var t = HD.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  HD.ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  HD.toward = function (dt, rate) { return 1 - Math.exp(-dt * rate); };
  HD.Z = 0.46;   // how far the nose stands in front of the outline, in portrait units

  /* ---------------------------------------------------------------- portrait maps */

  // Portrait space: y runs from -1 (bottom) to 1 (top); x from -aspect to aspect.
  HD.loadPortrait = function () {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = PORTRAIT.w, h = PORTRAIT.h, c = document.createElement('canvas');
        c.width = w; c.height = h;
        var g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, w, h);
        var px = g.getImageData(0, 0, w, h).data, n = w * h, i, x, y;
        var map = { w: w, h: h, aspect: w / h, tone: new Float32Array(n), depth: new Float32Array(n), alpha: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n) };
        for (i = 0; i < n; i++) { map.tone[i] = px[i * 4] / 255; map.depth[i] = px[i * 4 + 1] / 255; map.alpha[i] = px[i * 4 + 2] / 255; }
        // surface slope, per portrait unit (one map pixel is 2 / h units)
        var k = HD.Z * h / 4;
        for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
          i = y * w + x;
          map.nx[i] = (map.depth[y * w + Math.min(w - 1, x + 1)] - map.depth[y * w + Math.max(0, x - 1)]) * k;
          map.ny[i] = (map.depth[Math.min(h - 1, y + 1) * w + x] - map.depth[Math.max(0, y - 1) * w + x]) * k;
        }
        resolve(map);
      };
      img.onerror = reject;
      img.src = PORTRAIT.src;
    });
  };

  HD.sample = function (map, field, u, v) {
    var fx = HD.clamp(u, 0, 1) * (map.w - 1), fy = HD.clamp(v, 0, 1) * (map.h - 1);
    var x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(map.w - 1, x0 + 1), y1 = Math.min(map.h - 1, y0 + 1);
    var tx = fx - x0, ty = fy - y0, a = field[y0 * map.w + x0], b = field[y0 * map.w + x1], c = field[y1 * map.w + x0], d = field[y1 * map.w + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  // The bust is cut off by the photo's edge; let it thin out there instead of ending in a line.
  HD.edgeFade = function (u, v) {
    var f = 1 - HD.smooth(0.7, 1.0, v);
    if (v > 0.6) f *= HD.smooth(0, 0.16, u) * HD.smooth(0, 0.16, 1 - u);
    return f;
  };

  // How much ink the portrait wants at (u, v): 0 on paper, 1 in the darkest hair.
  HD.inkAt = function (map, u, v, floor, gamma) {
    if (HD.sample(map, map.alpha, u, v) < 0.5) return 0;
    var dark = 1 - HD.sample(map, map.tone, u, v);
    return (floor + (1 - floor) * Math.pow(dark, gamma)) * HD.edgeFade(u, v);
  };

  // Position, normal and darkness of the surface at (u, v), written into out at index i.
  HD.surface = function (map, u, v, out, i) {
    var gx = HD.sample(map, map.nx, u, v), gy = HD.sample(map, map.ny, u, v), len = Math.sqrt(gx * gx + gy * gy + 1);
    out.B[i * 3] = (u * 2 - 1) * map.aspect; out.B[i * 3 + 1] = 1 - v * 2; out.B[i * 3 + 2] = HD.sample(map, map.depth, u, v) * HD.Z;
    out.N[i * 3] = -gx / len; out.N[i * 3 + 1] = gy / len; out.N[i * 3 + 2] = 1 / len;
  };

  HD.alloc = function (n) {
    return { n: n, A: new Float32Array(n * 3), B: new Float32Array(n * 3), S: new Float32Array(n * 2), N: new Float32Array(n * 3), M: new Float32Array(n * 3), G: new Float32Array(n), O: new Float32Array(n * 2) };
  };

  // Scatter n dots over the portrait, more of them where the photo is darker.
  HD.stipple = function (map, n, opt) {
    var d = HD.alloc(n), i = 0, guard = n * 80, u, v, ink;
    while (i < n && guard-- > 0) {
      u = Math.random(); v = Math.random();
      ink = HD.inkAt(map, u, v, opt.floor, opt.gamma);
      if (Math.random() > ink) continue;
      HD.surface(map, u, v, d, i);
      d.S[i * 2 + 1] = 0.7 + 0.6 * ink;
      d.M[i * 3] = Math.random(); d.M[i * 3 + 1] = Math.random(); d.M[i * 3 + 2] = ink;
      i++;
    }
    d.n = i;
    return d;
  };

  /* ---------------------------------------------------------------- the counted loader */

  // A ring of marks that fill as the count rises. The real work is quick, so the count is paced:
  // it never runs ahead of the work, and it never jumps.
  HD.loader = function (root, opt) {
    opt = opt || {};
    var NS = 'http://www.w3.org/2000/svg', svg = root.querySelector('svg'), count = root.querySelector('.loader__count'), marks = [], N = opt.marks || 96, R = opt.radius || 92;
    for (var i = 0; i < N; i++) {
      var a = (i / N) * Math.PI * 2 - Math.PI / 2, el = document.createElementNS(NS, opt.square ? 'rect' : 'circle');
      if (opt.square) { el.setAttribute('x', (R * Math.cos(a) - 2).toFixed(2)); el.setAttribute('y', (R * Math.sin(a) - 2).toFixed(2)); el.setAttribute('width', 4); el.setAttribute('height', 4); }
      else { el.setAttribute('cx', (R * Math.cos(a)).toFixed(2)); el.setAttribute('cy', (R * Math.sin(a)).toFixed(2)); el.setAttribute('r', 1.7); }
      svg.appendChild(el); marks.push(el);
    }
    var L = { radius: R, real: 0, shown: 0, done: null };
    L.set = function (p) {
      var pct = Math.round(HD.clamp(p, 0, 1) * 100);
      count.textContent = String(pct).padStart(3, '0');
      root.setAttribute('aria-valuenow', pct);
      for (var i = 0; i < N; i++) marks[i].toggleAttribute('data-on', i / N < p);
    };
    L.run = function () {
      return new Promise(function (resolve) {
        var last = performance.now();
        (function tick(now) {
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          L.shown = Math.min(L.real, L.shown + dt / (HD.reduced ? 0.01 : 1.5));
          L.set(L.shown);
          if (L.shown >= 1) resolve(); else requestAnimationFrame(tick);
        })(last);
      });
    };
    L.set(0);
    return L;
  };

  /* ---------------------------------------------------------------- pointer */

  HD.pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false, at: 0, touch: false };
  function onPointer(e) { var p = HD.pointer; p.x = e.clientX; p.y = e.clientY; p.active = true; p.touch = e.pointerType === 'touch'; p.at = performance.now(); }
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') HD.pointer.active = false; });

  /* ---------------------------------------------------------------- renderer */

  var VERT = [
    'attribute vec3 aA; attribute vec3 aB; attribute vec2 aS; attribute vec3 aN; attribute vec3 aM; attribute float aG; attribute vec2 aO;',
    'uniform vec2 uRes; uniform vec3 uFit; uniform vec2 uHead; uniform vec3 uLight; uniform vec4 uPush; uniform vec4 uHot; uniform vec4 uBand; uniform mediump float uGlyphs; uniform float uScramble, uTone; uniform vec4 uFade;',
    'uniform float uP, uSpread, uArc, uTime, uLightK, uFall, uSize, uShine, uPersp, uBreath, uJitter, uOpacity, uSolid;',
    'varying float vAlpha; varying float vHot; varying float vGlyph;',
    'const float PI = 3.141592653589793;',
    'vec3 turn(vec3 p, float yaw, float pitch) {',
    '  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);',
    '  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);',
    '  return vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);',
    '}',
    'void main() {',
    // progress of this dot: everyone leaves in the order of their delay
    '  float t = clamp((uP - aM.x * uSpread) / max(0.0001, 1.0 - uSpread), 0.0, 1.0);',
    '  float e = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;',
    '  float r2 = fract(sin(aM.y * 91.7) * 43758.5453);',
    // the head turns fully, the shoulders follow at a quarter
    '  float headW = smoothstep(-0.62, -0.18, aB.y);',
    '  float yaw = uHead.x * (0.25 + 0.75 * headW), pitch = uHead.y * headW;',
    '  vec3 pivot = vec3(0.0, -0.1, -0.4);',
    '  vec3 b = turn(aB - pivot, yaw, pitch) + pivot;',
    '  vec3 n = turn(aN, yaw, pitch);',
    '  b += n * sin(uTime * 1.4 + aM.y * 60.0) * 0.004 * uBreath;',
    // A to B, with a loop out toward the viewer on the way
    '  vec3 pos = mix(aA, b, e);',
    '  float swing = sin(e * PI) * uArc;',
    '  pos.xy += vec2(sin(aM.y * 40.0 + uTime * 0.3), cos(aM.y * 31.0)) * swing * (0.35 + r2);',
    '  pos.z += swing * (0.6 + r2);',
    // dots lean away from the pointer
    '  vec2 away = pos.xy - uPush.xy;',
    '  pos.xy += normalize(away + 0.00001) * (1.0 - smoothstep(0.0, uPush.z, length(away))) * uPush.w * e;',
    // or wherever the page's own physics has knocked this dot
    '  pos.xy += aO * e;',
    // a hot zone under the pointer, and one band of rows that can be singled out
    '  float hot = (1.0 - smoothstep(0.0, uHot.z, length(pos.xy - uHot.xy))) * uHot.w * e;',
    '  float inBand = step(uBand.x, aB.y) * step(aB.y, uBand.y) * uBand.z * e;',
    '  pos.x += inBand * uBand.w;',
    // under the pointer a letter can run through its row of the sheet; its row (the weight) stays put
    '  float cols = max(uGlyphs, 1.0), sheetRow = floor(aG / cols + 0.001);',
    '  vGlyph = sheetRow * cols + mod(aG - sheetRow * cols + floor(uTime * 14.0 + aM.y * 30.0) * step(0.3, hot) * uScramble, cols);',
    // light: on paper, light means less ink
    '  vec3 toL = uLight - pos;',
    '  float lit = max(dot(n, normalize(toL)), 0.0) / (1.0 + dot(toL, toL) * uFall);',
    '  float ink = clamp(1.0 + uLightK * (0.32 - 1.6 * lit), 0.1, 1.45);',
    // one band of weight that crosses the figure once
    '  float band = b.y - b.x * 0.5 - uShine;',
    '  float shine = exp(-band * band * 7.0);',
    '  float size = mix(aS.x, aS.y * (0.42 + 0.58 * ink) * (1.0 + shine * 0.9) * (1.0 + hot * 0.45), e) * (1.0 - uJitter * 0.5 + r2 * uJitter);',
    // a backing pass: every landed dot as a full, opaque cell, so the figure can stand in front of something
    '  size = mix(size, step(0.02, aS.y) * 1.06, uSolid);',
    '  float k = 1.0 / (1.0 - pos.z * uPersp);',
    '  vec2 px = uFit.yz + vec2(pos.x, -pos.y) * uFit.x * k;',
    '  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);',
    '  gl_PointSize = max(size * uSize * k, 0.0);',
    '  vAlpha = mix(mix(0.85, clamp(0.3 + 0.7 * ink, 0.0, 1.0), e), e * e * e, uSolid) * uOpacity * step(0.02, size);',
    // plain dots can belong to one of four groups, each with its own fade
    '  if (uGlyphs < 0.5) vAlpha *= aG < 0.5 ? uFade.x : aG < 1.5 ? uFade.y : aG < 2.5 ? uFade.z : uFade.w;',
    // tone as opacity: pale where the photo is light, full ink where it is dark or singled out
    '  vAlpha *= mix(1.0, mix(0.24 + 0.76 * aM.z, 1.0, max(hot, inBand)), uTone * e);',
    '  vHot = max(shine * e, max(hot, inBand)) * (1.0 - uSolid);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform vec3 uInk; uniform vec3 uAccent; uniform float uSquare; uniform float uGlyphs; uniform float uGlyphRows; uniform sampler2D uAtlas;',
    'varying float vAlpha; varying float vHot; varying float vGlyph;',
    'void main() {',
    '  float r = length(gl_PointCoord - 0.5);',
    '  float a = mix(1.0 - smoothstep(0.34, 0.5, r), 1.0, uSquare) * vAlpha;',
    // a dot can also be a letter: one cell of a strip of glyphs
    '  if (uGlyphs > 0.5) {',
    '    float row = floor(vGlyph / uGlyphs + 0.001), col = vGlyph - row * uGlyphs;',
    '    a = texture2D(uAtlas, vec2((col + gl_PointCoord.x) / uGlyphs, (row + gl_PointCoord.y) / uGlyphRows)).a * vAlpha;',
    '  }',
    '  if (a < 0.012) discard;',
    '  gl_FragColor = vec4(mix(uInk, uAccent, vHot) * a, a);',
    '}'
  ].join('\n');

  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  HD.createRenderer = function (canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    function shader(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);

    var SIZES = { aA: 3, aB: 3, aS: 2, aN: 3, aM: 3, aG: 1, aO: 2 }, buffers = {}, count = 0;
    var R = { gl: gl, dpr: 1, fit: { cx: 0, cy: 0, half: 1 } };
    R.u = { uP: 0, uSpread: 0.45, uArc: 0.3, uTime: 0, uLightK: 0, uFall: 0.9, uSize: 2, uShine: 99, uPersp: 0.16, uBreath: 1, uJitter: 0.8, uOpacity: 1, uSquare: 0, uSolid: 0, uGlyphs: 0, uGlyphRows: 1, uScramble: 1, uTone: 0,
            uHead: [0, 0], uLight: [0, 0.4, 0.9], uPush: [0, 0, 0.2, 0], uFade: [1, 1, 1, 1], uHot: [0, 0, 0.2, 0], uBand: [0, 0, 0, 0], uInk: hex('#10231C'), uAccent: hex('#C92A0E'), uRes: [1, 1], uFit: [1, 0, 0] };
    var loc = {};
    Object.keys(R.u).forEach(function (k) { loc[k] = gl.getUniformLocation(prog, k); });

    R.color = hex;
    // A strip of glyphs, one square cell each: dots are then drawn as the letter whose index they carry.
    R.setAtlas = function (strip, glyphs, rows) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(prog, 'uAtlas'), 0);
      R.u.uGlyphs = glyphs; R.u.uGlyphRows = rows || 1;
    };
    // Give the renderer its dots; pass a single name to rewrite one buffer later.
    R.setDots = function (d, only) {
      count = d.n;
      Object.keys(SIZES).forEach(function (name) {
        if (only && only.indexOf(name) < 0) return;
        var key = name.slice(1), at = gl.getAttribLocation(prog, name);
        if (!buffers[name]) buffers[name] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
        gl.bufferData(gl.ARRAY_BUFFER, d[key], gl.DYNAMIC_DRAW);
        if (at >= 0) { gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, SIZES[name], gl.FLOAT, false, 0, 0); }
      });
    };
    // Where the portrait sits: its centre and height in CSS pixels.
    R.place = function (cx, cy, height) {
      R.dpr = Math.min(2, devicePixelRatio || 1);
      var w = Math.round(canvas.clientWidth * R.dpr), h = Math.round(canvas.clientHeight * R.dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      R.fit = { cx: cx, cy: cy, half: height / 2 };
      R.u.uRes = [w, h]; R.u.uFit = [height / 2 * R.dpr, cx * R.dpr, cy * R.dpr];
    };
    // CSS pixels (relative to the canvas) to portrait units.
    R.units = function (x, y) { return [(x - R.fit.cx) / R.fit.half, -(y - R.fit.cy) / R.fit.half]; };
    R.draw = function (keep) {
      for (var k in R.u) {
        var v = R.u[k], l = loc[k];
        if (typeof v === 'number') gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
        else gl.uniform4f(l, v[0], v[1], v[2], v[3]);
      }
      if (!keep) gl.clear(gl.COLOR_BUFFER_BIT);
      if (count) gl.drawArrays(gl.POINTS, 0, count);
    };
    return R;
  };
})();
