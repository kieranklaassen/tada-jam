import * as THREE from 'three'

// The look's one surface: papier-mâché. A hard shell of pasted paper strips
// under matte poster paint. Every figure shares one material: the strips are
// one small texture made here in plain numbers (no canvas, so the stage can be
// built in a test), laid on by position from three sides, lit as low relief
// and showing through the paint as tone. The paint itself (stripes, dots,
// bands) is drawn in the shader from what each vertex carries, with edges
// that wander a little like a brush.

const SIZE = 256

function hash(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * The strips: red and green hold the slope of the surface (the relief), blue the tone of each strip with its
 * pale torn edge, alpha the streaks a brush leaves. It tiles.
 */
export function makePaperTexture(): THREE.DataTexture {
  const height = new Float32Array(SIZE * SIZE), tone = new Float32Array(SIZE * SIZE).fill(0.5)
  const at = (x: number, y: number): number => ((y & (SIZE - 1)) * SIZE) + (x & (SIZE - 1))
  for (let strip = 0; strip < 170; strip++) {
    const cx = hash(strip * 7 + 1) * SIZE, cy = hash(strip * 7 + 2) * SIZE
    // Strips are pasted mostly two ways, crossing, with a few astray.
    const way = hash(strip * 7 + 3), angle = (way < 0.45 ? 0.5 : way < 0.9 ? 2.1 : way * 9) + (hash(strip * 7 + 4) - 0.5) * 0.5
    const long = 34 + hash(strip * 7 + 5) * 46, wide = 9 + hash(strip * 7 + 6) * 9
    const level = 0.25 + hash(strip * 7 + 7) * 0.75, shade = 0.38 + hash(strip * 7 + 8) * 0.24
    const cos = Math.cos(angle), sin = Math.sin(angle), reach = Math.ceil(long / 2 + wide)
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const u = dx * cos + dy * sin, v = -dx * sin + dy * cos
        // A torn edge: the strip's outline wanders by a pixel or two.
        const tear = (hash(((cx + dx) | 0) * 131 + ((cy + dy) | 0) * 17 + strip) - 0.5) * 2.2
        const inU = long / 2 - Math.abs(u) + tear, inV = wide / 2 - Math.abs(v) + tear
        if (inU < 0 || inV < 0) continue
        const index = at(Math.round(cx + dx), Math.round(cy + dy)), edge = Math.min(inU, inV)
        height[index] = height[index] * 0.3 + level * 0.7 + (edge < 2 ? 0.12 : 0)
        tone[index] = edge < 1.6 ? 0.82 : shade
      }
    }
  }
  const data = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const smooth = (px: number, py: number): number => (height[at(px, py)] * 2 + height[at(px + 1, py)] + height[at(px - 1, py)] + height[at(px, py + 1)] + height[at(px, py - 1)]) / 6
      const sx = (smooth(x - 1, y) - smooth(x + 1, y)) * 2.2, sy = (smooth(x, y - 1) - smooth(x, y + 1)) * 2.2
      // Brush streaks run one way: long along x, fine across.
      const row = y >> 1, streak = (hash(row * 53 + (x >> 5)) * 0.5 + hash(row * 53 + ((x + 16) >> 5) + 9) * 0.3 + hash(y * 91 + (x >> 3)) * 0.2)
      const index = (y * SIZE + x) * 4
      data[index] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + sx)))
      data[index + 1] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + sy)))
      data[index + 2] = Math.round(255 * tone[at(x, y)])
      data[index + 3] = Math.round(255 * streak)
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** Shared by every material of the look: one sun, one time, one hole. */
export type Shared = {
  uTime: { value: number }
  uPaper: { value: THREE.Texture }
  uRelief: { value: number }
  uSun: { value: THREE.Vector3 }
  /** The hole's middle (x, z), and its two half widths: along `uAxis` and across it. */
  uHole: { value: THREE.Vector4 }
  uAxis: { value: THREE.Vector2 }
  /** The crowd: where the head that ducks stands (x, z), how far it is down, and how far every head has jerked back. */
  uCrowd: { value: THREE.Vector4 }
}

export function makeShared(paper: THREE.Texture): Shared {
  return {
    uTime: { value: 0 },
    uPaper: { value: paper },
    uRelief: { value: 1 },
    uSun: { value: new THREE.Vector3(-0.45, 0.8, 0.4).normalize() },
    uHole: { value: new THREE.Vector4(0, 0, 0.5, 0.5) },
    uAxis: { value: new THREE.Vector2(1, 0) },
    uCrowd: { value: new THREE.Vector4(0, 0, 0, 0) },
  }
}

const SWAY = /* glsl */ `
  attribute vec3 aSway;
  uniform float uTime;
  vec3 swayed(vec3 p, vec3 n) {
    float amp = aSway.x;
    if (amp == 0.0) return p;
    float wave = sin(uTime * 3.1 + aSway.y) * 0.62 + sin(uTime * 5.3 + aSway.y * 1.7) * 0.38;
    // Mode 0 flutters along the surface's own facing (a flag, a fringe); mode 1 rocks from side to side (a head in the crowd).
    if (aSway.z < 0.5) return p + n * (wave * amp);
    return p + vec3(sin(uTime * 1.3 + aSway.y) * amp, 0.0, 0.0);
  }
`

const LIGHT = /* glsl */ `
  uniform sampler2D uPaper;
  uniform float uRelief;
  uniform vec3 uSun;
  // Paper strips from three sides, by where the surface is and which way it faces.
  vec4 paperAt(vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(4.0));
    w /= (w.x + w.y + w.z);
    return texture2D(uPaper, p.zy * 0.55) * w.x + texture2D(uPaper, p.xz * 0.55) * w.y + texture2D(uPaper, p.xy * 0.55) * w.z;
  }
  // A warm sun and a cool sky on a matte surface. Colours are painted in display space, like poster paint.
  vec3 lit(vec3 paint, vec3 n, vec4 paper) {
    vec3 side = normalize(cross(n, vec3(0.03, 1.0, 0.07)));
    vec3 bent = normalize(n + uRelief * ((paper.r - 0.5) * side + (paper.g - 0.5) * cross(n, side)) * 1.5);
    float sun = smoothstep(-0.15, 0.85, dot(bent, uSun));
    vec3 light = vec3(0.60, 0.62, 0.78) * (0.72 + 0.28 * bent.y) + vec3(0.52, 0.47, 0.34) * sun;
    // The strips show through the paint as tone, and the brush as streaks.
    float tone = 0.9 + 0.17 * paper.b + 0.07 * (paper.a - 0.5);
    return paint * light * tone;
  }
`

/** How many numbers a mesh hands the paint for its limbs: two vectors of four to a limb (motion.ts). */
export const LIMB_VECTORS = 10

// A limb is a part of a figure that moves by itself: its vertices carry the
// point it turns about and its number, and the mesh says each frame how each
// of its limbs is turned, grown and shifted. A head of the crowd is a limb of
// the setting that needs no telling: it turns to the hole, ducks under a
// finger and jerks back when the hole swallows.
const LIMB = /* glsl */ `
  attribute vec4 aJoint;
  attribute vec4 aParent;
  uniform vec4 uLimbs[${LIMB_VECTORS}];
  uniform vec4 uHole;
  uniform vec4 uCrowd;
  vec3 turned(vec3 d, vec3 by) {
    float c = cos(by.x), s = sin(by.x);
    d = vec3(d.x, c * d.y - s * d.z, s * d.y + c * d.z);
    c = cos(by.y); s = sin(by.y);
    d = vec3(c * d.x + s * d.z, d.y, -s * d.x + c * d.z);
    c = cos(by.z); s = sin(by.z);
    return vec3(c * d.x - s * d.y, s * d.x + c * d.y, d.z);
  }
  vec3 limbed(vec3 p, inout vec3 n) {
    if (aJoint.w < 0.5) return p;
    vec3 pivot = aJoint.xyz, d = p - pivot;
    if (aJoint.w > 99.5) {
      // A head of the crowd: 101 faces the eye, 102 has its back to it.
      float back = step(101.5, aJoint.w);
      vec2 to = uHole.xy - pivot.xz;
      float yaw = clamp(atan(to.x, mix(to.y, -to.y, back)), -0.7, 0.7) * mix(1.0, -1.0, back);
      float near = 1.0 - step(0.6, distance(uCrowd.xy, pivot.xz));
      vec3 by = vec3(-0.22 * uCrowd.w * mix(1.0, -1.0, back), yaw, 0.0);
      n = turned(n, by);
      return pivot + turned(d, by) - vec3(0.0, 1.15 * uCrowd.z * near, 0.0);
    }
    int at = int(aJoint.w - 0.5) * 2;
    vec4 turn = uLimbs[at], move = uLimbs[at + 1];
    d.y *= 1.0 + turn.w;
    d *= 1.0 + move.w;
    n = turned(n, turn.xyz);
    vec3 q = pivot + turned(d, turn.xyz) + move.xyz;
    if (aParent.w < 0.5) return q;
    // It is on another limb, and goes where that one goes.
    at = int(aParent.w - 0.5) * 2;
    turn = uLimbs[at]; move = uLimbs[at + 1];
    d = q - aParent.xyz;
    d.y *= 1.0 + turn.w;
    d *= 1.0 + move.w;
    n = turned(n, turn.xyz);
    return aParent.xyz + turned(d, turn.xyz) + move.xyz;
  }
`

const FIGURE_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aColor2;
  attribute vec3 aLocal;
  attribute vec2 aPaint;
  ${SWAY}
  ${LIMB}
  varying vec3 vColor;
  varying vec3 vColor2;
  varying vec3 vLocal;
  varying vec2 vPaint;
  varying vec3 vAt;
  varying vec3 vFacing;
  varying vec3 vNormal;
  varying float vDeep;
  void main() {
    vColor = aColor; vColor2 = aColor2; vLocal = aLocal; vPaint = aPaint;
    vAt = position; vFacing = normal;
    vec3 facing = normal;
    vec3 moved = limbed(swayed(position, normal), facing);
    vec4 world = modelMatrix * vec4(moved, 1.0);
    vNormal = normalize(mat3(modelMatrix) * facing);
    vDeep = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const FIGURE_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying vec3 vColor2;
  varying vec3 vLocal;
  varying vec2 vPaint;
  varying vec3 vAt;
  varying vec3 vFacing;
  varying vec3 vNormal;
  varying float vDeep;
  ${LIGHT}
  void main() {
    vec4 paper = paperAt(vAt, normalize(vFacing));
    // The painted pattern, with an edge that wanders like a loaded brush.
    float kind = vPaint.x, count = vPaint.y, wander = (paper.a - 0.5) * 0.16, second = 0.0;
    if (kind > 0.5 && kind < 1.5) second = step(0.5, fract(vLocal.y * count + wander));
    else if (kind < 2.5 && kind > 1.5) second = step(0.5, fract(atan(vLocal.z, vLocal.x) / 6.2832 * count + wander));
    else if (kind > 2.5 && kind < 3.5) {
      vec2 cell = vec2(atan(vLocal.z, vLocal.x) / 6.2832 * count * 2.0, vLocal.y * count * 0.9);
      cell.x += 0.5 * floor(cell.y);
      second = 1.0 - step(0.3, length(fract(cell) - 0.5) + wander * 0.4);
    } else if (kind > 3.5) second = step(0.5, fract(vLocal.x * count + wander));
    vec3 paint = mix(vColor, vColor2, second);
    vec3 color = lit(paint, normalize(vNormal), paper);
    // Down the hole it is dark: a thing going in fades into the indigo of the pit.
    float deep = clamp(-vDeep / 2.6, 0.0, 1.0);
    color = mix(color, vec3(0.07, 0.04, 0.16), deep * 0.92);
    gl_FragColor = vec4(color, uOpacity);
  }
`

/** The one material of every figure. `opacity` below 1 makes a see-through copy, for the ghost hand. */
export function makeFigureMaterial(shared: Shared, opacity = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uOpacity: { value: opacity }, uLimbs: { value: new Float32Array(LIMB_VECTORS * 4) } },
    vertexShader: FIGURE_VERTEX,
    fragmentShader: FIGURE_FRAGMENT,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
  })
}

const HOLE = /* glsl */ `
  uniform vec4 uHole;
  uniform vec2 uAxis;
  // Under 1 inside the mouth, 1 on its edge.
  float mouth(vec2 p) {
    vec2 d = p - uHole.xy;
    float along = dot(d, uAxis), across = dot(d, vec2(-uAxis.y, uAxis.x));
    return length(vec2(along / uHole.z, across / uHole.w));
  }
`

const GROUND_VERTEX = /* glsl */ `
  varying vec2 vStreet;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vStreet = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const GROUND_FRAGMENT = /* glsl */ `
  uniform vec4 uStreet;
  varying vec2 vStreet;
  ${LIGHT}
  ${HOLE}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vStreet;
    float m = mouth(p);
    if (m < 1.0) discard;
    vec4 paper = texture2D(uPaper, p * 0.3);
    // The street: pale sand paint, with cobbles brushed on a shade darker.
    vec2 g = p * 1.7, cell = floor(g), f = fract(g);
    float near = 9.0, next = 9.0, shade = 0.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      float d = length(o + 0.2 + 0.6 * vec2(hash(cell + o), hash(cell + o + 7.3)) - f);
      if (d < near) { next = near; near = d; shade = hash(cell + o + 3.1); } else if (d < next) next = d;
    }
    float joint = smoothstep(0.03, 0.12, next - near + (paper.a - 0.5) * 0.08);
    vec3 street = vec3(0.955, 0.875, 0.70) * (0.95 + 0.07 * shade) * mix(0.88, 1.0, joint);
    // The pavement beyond the kerbs: warm rose flagstones, quieter than the street.
    vec2 flag = fract(p * vec2(0.5, 0.62) + vec2(0.5 * floor(p.y * 0.62), 0.0));
    float seam = smoothstep(0.0, 0.035, min(min(flag.x, 1.0 - flag.x), min(flag.y, 1.0 - flag.y)));
    vec3 pavement = vec3(0.86, 0.70, 0.62) * mix(0.9, 1.0, seam);
    // The kerbs: blocks painted red and cream by turns.
    float far = uStreet.z, nearKerb = uStreet.w, kerbWide = 0.34;
    float onStreet = step(far, p.y) * step(p.y, nearKerb) * step(uStreet.x, p.x) * step(p.x, uStreet.y);
    float kerb = max(step(far - kerbWide, p.y) * step(p.y, far), step(nearKerb, p.y) * step(p.y, nearKerb + kerbWide)) * step(uStreet.x - kerbWide, p.x) * step(p.x, uStreet.y + kerbWide);
    kerb = max(kerb, max(step(uStreet.x - kerbWide, p.x) * step(p.x, uStreet.x), step(uStreet.y, p.x) * step(p.x, uStreet.y + kerbWide)) * step(far - kerbWide, p.y) * step(p.y, nearKerb + kerbWide));
    vec3 block = mix(vec3(0.86, 0.36, 0.32), vec3(0.97, 0.93, 0.84), step(0.5, fract((p.x + p.y) * 0.8)));
    vec3 paint = mix(pavement, street, onStreet);
    paint = mix(paint, block, kerb);
    // Confetti trodden into the paint: small flat dots in the carnival's colours.
    vec2 dot = p * 2.6, dc = floor(dot);
    float pick = hash(dc + 11.0);
    if (pick > 0.72) {
      vec2 centre = 0.25 + 0.5 * vec2(hash(dc + 1.7), hash(dc + 5.9));
      float inside = 1.0 - smoothstep(0.1, 0.13, length(fract(dot) - centre));
      vec3 bit = pick > 0.93 ? vec3(0.90, 0.25, 0.32) : pick > 0.86 ? vec3(0.20, 0.55, 0.85) : pick > 0.79 ? vec3(0.98, 0.78, 0.20) : vec3(0.25, 0.70, 0.55);
      paint = mix(paint, mix(paint, bit, 0.75), inside);
    }
    vec3 color = lit(paint, vec3(0.0, 1.0, 0.0), paper);
    // The street darkens a little just round the mouth, where the paper dips.
    color *= mix(0.8, 1.0, smoothstep(1.0, 1.16, m));
    gl_FragColor = vec4(color, 1.0);
  }
`

/** The street and the pavement round it, with the hole cut out of it. `street` is x0, x1, z0, z1. */
export function makeGroundMaterial(shared: Shared, street: THREE.Vector4): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ uniforms: { ...shared, uStreet: { value: street } }, vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT })
}

const SHADOW_VERTEX = /* glsl */ `
  attribute float aDark;
  varying vec2 vDisc;
  varying vec2 vStreet;
  varying float vDark;
  void main() {
    vDisc = position.xz;
    vDark = aDark;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vStreet = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const SHADOW_FRAGMENT = /* glsl */ `
  varying vec2 vDisc;
  varying vec2 vStreet;
  varying float vDark;
  ${HOLE}
  void main() {
    if (mouth(vStreet) < 1.0) discard;
    float soft = 1.0 - smoothstep(0.45, 1.0, length(vDisc));
    // A negative darkness is a smear of cream: pale, and it fades as it is given less.
    if (vDark < 0.0) gl_FragColor = vec4(1.0, 0.97, 0.90, 0.85 * soft * -vDark);
    else gl_FragColor = vec4(0.30, 0.16, 0.36, 0.34 * soft * vDark);
  }
`

/** Blob shadows: soft violet discs on the street, one draw for all of them, cut away over the hole. The cream a pie smears is drawn with them. */
export function makeShadowMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ uniforms: { uHole: shared.uHole, uAxis: shared.uAxis }, vertexShader: SHADOW_VERTEX, fragmentShader: SHADOW_FRAGMENT, transparent: true, depthWrite: false })
}

const SCRAP_VERTEX = /* glsl */ `
  varying vec3 vTint;
  varying vec3 vNormal;
  void main() {
    vTint = instanceColor;
    vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

const SCRAP_FRAGMENT = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vTint;
  varying vec3 vNormal;
  void main() {
    float sun = 0.75 + 0.25 * abs(dot(normalize(vNormal), uSun));
    gl_FragColor = vec4(vTint * sun, 1.0);
  }
`

/** Torn scraps of paper in the air: one draw, a colour for each. */
export function makeScrapMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ uniforms: { uSun: shared.uSun }, vertexShader: SCRAP_VERTEX, fragmentShader: SCRAP_FRAGMENT, side: THREE.DoubleSide })
}

const GLOW_VERTEX = /* glsl */ `
  varying vec2 vDisc;
  void main() {
    vDisc = position.xz;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`

const GLOW_FRAGMENT = /* glsl */ `
  uniform float uGlow;
  varying vec2 vDisc;
  void main() {
    // A bright ring with a dark edge either side, so it reads on pale paint and on the dark of the hole alike.
    float r = length(vDisc);
    float ring = smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.94, 1.0, r));
    float edge = smoothstep(0.74, 0.80, r) * (1.0 - smoothstep(0.86, 0.9, r)) + smoothstep(0.9, 0.94, r) * (1.0 - smoothstep(0.98, 1.0, r));
    vec3 color = mix(vec3(0.45, 0.10, 0.42), vec3(1.0, 0.93, 0.35), ring);
    gl_FragColor = vec4(color, uGlow * max(ring, edge * 0.7));
  }
`

/** The idle glow: a ring on the street round what can be touched now. */
export function makeGlowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ uniforms: { uGlow: { value: 0 } }, vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT, transparent: true, depthWrite: false })
}

const PIT_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vAt;
  void main() {
    vAt = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const PIT_FRAGMENT = /* glsl */ `
  uniform sampler2D uPaper;
  varying vec3 vWorld;
  varying vec3 vAt;
  void main() {
    // Round the wall, by angle and depth: the torn layers the street is pasted from, then the dark.
    float round = atan(vAt.z, vAt.x) / 6.2832;
    vec4 paper = texture2D(uPaper, vec2(round * 3.0, vWorld.y * 0.5));
    float deep = -vWorld.y + (paper.a - 0.5) * 0.12 + 0.05 * sin(round * 44.0);
    vec3 layer = deep < 0.09 ? vec3(0.99, 0.95, 0.84) : deep < 0.17 ? vec3(0.95, 0.56, 0.60) : deep < 0.24 ? vec3(0.98, 0.84, 0.42) : vec3(0.30, 0.17, 0.46);
    vec3 dark = vec3(0.07, 0.04, 0.16);
    vec3 color = mix(layer * (0.86 + 0.2 * paper.b), dark, clamp((deep - 0.24) / 0.7, 0.0, 1.0));
    // The far wall catches the sun, the near wall is in its own shade.
    color *= 0.82 + 0.18 * clamp(-vAt.z, -1.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`

/** The inside of the hole: a wall of torn paper layers going down into indigo, seen from above. */
export function makePitMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({ uniforms: { uPaper: shared.uPaper }, vertexShader: PIT_VERTEX, fragmentShader: PIT_FRAGMENT, side: THREE.DoubleSide })
}

/** A colour as three numbers in display space, as the paint is mixed. */
export function rgb(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
}
