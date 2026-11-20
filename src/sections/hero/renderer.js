// One WebGL point renderer, used twice by the hero: once for the letters of the portrait, once for the pixels
// of the words. Every dot has a start (A), a home (B) and a delay; one progress value carries them all from A to B.
//
// A dot set holds one typed array per attribute:
//   A start position      B home position      S size at start and at home
//   M delay, a random number, tone             G glyph or fade group       O offset from the page's physics

const VERTEX = `
attribute vec3 aA; attribute vec3 aB; attribute vec2 aS; attribute vec3 aM; attribute float aG; attribute vec2 aO;
uniform vec2 uRes; uniform vec3 uFit; uniform vec2 uHead; uniform mediump float uGlyphs; uniform vec4 uFade;
uniform float uP, uSpread, uArc, uTime, uSize, uPersp, uJitter, uOpacity;
varying float vAlpha; varying float vGlyph;
const float PI = 3.141592653589793;
vec3 turn(vec3 p, float yaw, float pitch) {
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  return vec3(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
}
void main() {
  // progress of this dot: everyone leaves in the order of their delay
  float t = clamp((uP - aM.x * uSpread) / max(0.0001, 1.0 - uSpread), 0.0, 1.0);
  float e = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  float r2 = fract(sin(aM.y * 91.7) * 43758.5453);
  // the head turns fully, the shoulders follow at a quarter
  float headW = smoothstep(-0.62, -0.18, aB.y);
  float yaw = uHead.x * (0.25 + 0.75 * headW), pitch = uHead.y * headW;
  vec3 pivot = vec3(0.0, -0.1, -0.4);
  vec3 b = turn(aB - pivot, yaw, pitch) + pivot;
  // A to B, with a loop out toward the viewer on the way
  vec3 pos = mix(aA, b, e);
  float swing = sin(e * PI) * uArc;
  pos.xy += vec2(sin(aM.y * 40.0 + uTime * 0.3), cos(aM.y * 31.0)) * swing * (0.35 + r2);
  pos.z += swing * (0.6 + r2);
  // wherever the page's own physics has knocked this dot
  pos.xy += aO * e;
  vGlyph = aG;
  float size = mix(aS.x, aS.y, e) * (1.0 - uJitter * 0.5 + r2 * uJitter);
  float k = 1.0 / (1.0 - pos.z * uPersp);
  vec2 px = uFit.yz + vec2(pos.x, -pos.y) * uFit.x * k;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = max(size * uSize * k, 0.0);
  vAlpha = mix(0.85, 1.0, e) * uOpacity * step(0.02, size);
  // plain dots can belong to one of four groups, each with its own fade
  if (uGlyphs < 0.5) vAlpha *= aG < 0.5 ? uFade.x : aG < 1.5 ? uFade.y : aG < 2.5 ? uFade.z : uFade.w;
}`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uInk; uniform float uGlyphs; uniform sampler2D uAtlas;
varying float vAlpha; varying float vGlyph;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.34, 0.5, r)) * vAlpha;
  // a dot can also be a letter: one cell of a strip of glyphs
  if (uGlyphs > 0.5) a = texture2D(uAtlas, vec2((vGlyph + gl_PointCoord.x) / uGlyphs, gl_PointCoord.y)).a * vAlpha;
  if (a < 0.012) discard;
  gl_FragColor = vec4(uInk * a, a);
}`;

const ATTRIBUTE_SIZES = { aA: 3, aB: 3, aS: 2, aM: 3, aG: 1, aO: 2 };
const MAX_PIXEL_RATIO = 2;

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Empty arrays for `count` dots. */
export function allocDots(count) {
  return {
    n: count,
    A: new Float32Array(count * 3),
    B: new Float32Array(count * 3),
    S: new Float32Array(count * 2),
    M: new Float32Array(count * 3),
    G: new Float32Array(count),
    O: new Float32Array(count * 2),
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} ink the dots' colour, as #rrggbb
 * @returns the renderer, or null where WebGL is not available
 */
export function createRenderer(canvas, ink) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  const buffers = {};
  let count = 0;

  const renderer = {
    /** device pixels per CSS pixel in use, capped so a 4K screen is not drawn at full density */
    dpr: 1,
    fit: { cx: 0, cy: 0, half: 1 },
    /** uniforms; set them before draw() */
    u: {
      uP: 0,
      uSpread: 0.45,
      uArc: 0.3,
      uTime: 0,
      uSize: 2,
      uPersp: 0.16,
      uJitter: 0.8,
      uOpacity: 1,
      uGlyphs: 0,
      uHead: [0, 0],
      uFade: [1, 1, 1, 1],
      uInk: hexToRgb(ink),
      uRes: [1, 1],
      uFit: [1, 0, 0],
    },

    /** A strip of glyphs, one square cell each: dots are then drawn as the letter whose index they carry in G. */
    setAtlas(strip, glyphs) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, 'uAtlas'), 0);
      renderer.u.uGlyphs = glyphs;
    },

    /** Give the renderer its dots. Pass attribute names in `only` to rewrite just those buffers later. */
    setDots(dots, only) {
      count = dots.n;
      for (const [name, size] of Object.entries(ATTRIBUTE_SIZES)) {
        if (only && !only.includes(name)) continue;
        const location = gl.getAttribLocation(program, name);
        buffers[name] ??= gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
        gl.bufferData(gl.ARRAY_BUFFER, dots[name.slice(1)], gl.DYNAMIC_DRAW);
        if (location >= 0) {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        }
      }
    },

    /** Where the drawing sits on the canvas: its centre and height in CSS pixels. */
    place(cx, cy, height) {
      renderer.dpr = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * renderer.dpr);
      const h = Math.round(canvas.clientHeight * renderer.dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      renderer.fit = { cx, cy, half: height / 2 };
      renderer.u.uRes = [w, h];
      renderer.u.uFit = [(height / 2) * renderer.dpr, cx * renderer.dpr, cy * renderer.dpr];
    },

    /** CSS pixels on the canvas to the drawing's own units. */
    toUnits(x, y) {
      return [(x - renderer.fit.cx) / renderer.fit.half, -(y - renderer.fit.cy) / renderer.fit.half];
    },

    draw() {
      for (const [name, value] of Object.entries(renderer.u)) {
        const location = locations[name];
        if (typeof value === 'number') gl.uniform1f(location, value);
        else if (value.length === 2) gl.uniform2f(location, value[0], value[1]);
        else if (value.length === 3) gl.uniform3f(location, value[0], value[1], value[2]);
        else gl.uniform4f(location, value[0], value[1], value[2], value[3]);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (count) gl.drawArrays(gl.POINTS, 0, count);
    },
  };

  const locations = Object.fromEntries(
    Object.keys(renderer.u).map((name) => [name, gl.getUniformLocation(program, name)]),
  );
  return renderer;
}
