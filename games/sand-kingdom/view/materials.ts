import * as THREE from 'three'
import { CELL, COLS, ROWS, X0, X1, Z0, Z1 } from '../field'
import { CLOUDS, SUN } from '../layout'
import { HORIZON_Z } from '../camera'

// The look, as four materials: the sand lit from its own height map, the sea
// that stands on it, the sky at the horizon, and the wet-clay shading of the
// folk and the rocks. They share one sun and one sky, so the wet sand and the
// water give back the colours the sky shows.

/** Where the low sun's light comes from, and where the sun stands as the sky is mirrored. */
export const LIGHT_DIR = new THREE.Vector3(-0.42, 0.34, -0.84).normalize()
export const SUN_DIR = new THREE.Vector3(SUN.x, SUN.y + 1.2, HORIZON_Z - 2).normalize()

/** How many shadows the sand takes: the crab, the two rocks, the log (two), the bucket, the starfish and the two pieces of wood. */
export const SHADOWS = 9

const COMMON = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uLightDir;
  uniform float uTime;
  uniform float uDusk;
  uniform float uGold;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // The sunset sky by how high a direction looks: orange at the horizon, rose above it, violet overhead.
  vec3 skyAt(float up) {
    vec3 low = vec3(1.0, 0.66, 0.33), mid = vec3(0.97, 0.47, 0.42), high = vec3(0.47, 0.34, 0.58);
    // At evening it deepens to a burnt orange under violet; as the tide goes out it is gold.
    low = mix(mix(low, vec3(0.98, 0.42, 0.22), uDusk), vec3(1.0, 0.8, 0.42), uGold);
    mid = mix(mix(mid, vec3(0.66, 0.27, 0.44), uDusk), vec3(1.0, 0.68, 0.4), uGold);
    high = mix(high, vec3(0.2, 0.15, 0.4), uDusk);
    vec3 c = mix(low, mid, smoothstep(0.0, 0.3, up));
    return mix(c, high, smoothstep(0.25, 0.9, up));
  }
  // The light of the hour on anything lit: dimmer and more violet at evening, warm gold as the tide goes out.
  vec3 hour(vec3 c) {
    c *= mix(vec3(1.0), vec3(0.8, 0.68, 0.84), uDusk);
    return c * mix(vec3(1.0), vec3(1.1, 1.03, 0.84), uGold);
  }
  // What a wet surface gives back for a mirrored direction: the sky, and the sun's glare where it looks toward the sun.
  vec3 mirrored(vec3 r) {
    vec3 c = skyAt(clamp(r.y, 0.0, 1.0) * 0.55);
    float toward = max(dot(normalize(r.xz), normalize(uSunDir.xz)), 0.0);
    c += vec3(1.0, 0.72, 0.38) * pow(toward, 26.0) * 0.2;
    c += vec3(1.0, 0.9, 0.7) * pow(max(dot(r, uSunDir), 0.0), 90.0) * 1.4;
    return c;
  }
  float base(float z) {
    return 0.1 * (z + 3.0);
  }
`

const FIELD = /* glsl */ `
  uniform sampler2D uHeight;
  const vec2 FIELD_MIN = vec2(${X0.toFixed(2)}, ${Z0.toFixed(2)});
  const vec2 FIELD_SIZE = vec2(${(X1 - X0).toFixed(2)}, ${(Z1 - Z0).toFixed(2)});
  const vec2 TEXEL = vec2(${(1 / COLS).toFixed(6)}, ${(1 / ROWS).toFixed(6)});
  const float CELL = ${CELL.toFixed(3)};
  vec2 fieldUv(vec2 xz) {
    return (xz - FIELD_MIN) / FIELD_SIZE;
  }
  // How far the sand stands from the smooth beach. The edge cells are always level, so beyond the grid it is 0.
  float dig(vec2 uv) {
    return texture2D(uHeight, clamp(uv, 0.0, 1.0)).r;
  }
  // How far the evening water shows in a groove here, 0 to 1.
  float pool(vec2 uv) {
    return texture2D(uHeight, clamp(uv, 0.0, 1.0)).g;
  }
  // The level the water stands at in a groove: a little below the smooth beach.
  const float POOL_LEVEL = -0.07;
`

export type Shared = {
  uSunDir: { value: THREE.Vector3 }
  uLightDir: { value: THREE.Vector3 }
  uTime: { value: number }
  uHeight: { value: THREE.Texture | null }
  uSea: { value: number }
  uFine: { value: number }
  uDusk: { value: number }
  uGold: { value: number }
}

export function makeShared(): Shared {
  return { uSunDir: { value: SUN_DIR.clone() }, uLightDir: { value: LIGHT_DIR }, uTime: { value: 0 }, uHeight: { value: null }, uSea: { value: 0 }, uFine: { value: 1 }, uDusk: { value: 0 }, uGold: { value: 0 } }
}

/** The beach: one plane raised by the height map and lit from it. Low sand is wet and mirrors the sky. */
export function sandMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'sand',
    uniforms: {
      ...shared,
      uGlow: { value: new THREE.Vector3() },
      // The long wave: where its front is, how strongly it shows, and how far up the beach it has been.
      uWave: { value: new THREE.Vector3(-99, 0, -99) },
      // Where a bucket of water soaked away: x, z and how dark.
      uStain: { value: new THREE.Vector3() },
      uShadows: { value: Array.from({ length: SHADOWS }, () => new THREE.Vector4(0, 0, 0, 0)) },
      // The way a long shadow lies, for the thing that has a way of its own; none (0, 0) for one that falls away from the sun.
      uShadowAxes: { value: Array.from({ length: SHADOWS }, () => new THREE.Vector2(0, 0)) },
    },
    vertexShader: /* glsl */ `
      ${COMMON}
      ${FIELD}
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        vec2 uv = fieldUv(p.xz);
        float d = dig(uv);
        // Where the evening water stands in a groove the surface is the water's.
        p.y = base(p.z) + mix(d, max(d, POOL_LEVEL), pool(uv));
        vWorld = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${FIELD}
      uniform float uSea;
      uniform float uFine;
      uniform vec3 uGlow;
      uniform vec3 uWave;
      uniform vec3 uStain;
      uniform vec4 uShadows[${SHADOWS}];
      uniform vec2 uShadowAxes[${SHADOWS}];
      varying vec3 vWorld;
      void main() {
        vec2 uv = fieldUv(vWorld.xz);
        float here = dig(uv);
        float east = dig(uv + vec2(TEXEL.x, 0.0)), west = dig(uv - vec2(TEXEL.x, 0.0));
        float north = dig(uv + vec2(0.0, TEXEL.y)), south = dig(uv - vec2(0.0, TEXEL.y));
        vec3 n = vec3(-(east - west) / (2.0 * CELL), 1.0, -(north - south) / (2.0 * CELL) - 0.1);
        float above = vWorld.y - uSea;
        // Wet at the sea's level, damp up the beach, dry and pale at the top.
        float wet = 1.0 - smoothstep(0.03, 0.4, above);
        // Water seeps into the bottom of whatever is dug, wherever on the beach it is.
        wet = max(wet, smoothstep(0.07, 0.2, -here) * 0.9);
        // A bucket of water soaked away here, and the long wave has been over all of this.
        vec2 fromStain = vWorld.xz - uStain.xy;
        wet = max(wet, uStain.z * (1.0 - smoothstep(0.5, 1.5, length(fromStain) + (noise(vWorld.xz * 3.0) - 0.5) * 0.5)));
        float waveEdge = uWave.x + sin(vWorld.x * 0.7 + uTime * 0.6) * 0.35 + (noise(vec2(vWorld.x * 1.6, uTime * 0.4)) - 0.5) * 0.5;
        float behind = uWave.y * step(waveEdge, vWorld.z) * (1.0 - step(uWave.z, vWorld.z));
        wet = max(wet, behind * 0.92);
        float dry = smoothstep(0.78, 1.08, above) * (1.0 - behind);
        // Sand that stands up (a tower, a heap, a rim) is packed and pale, so it reads from the child's side, which the low sun leaves in shade.
        float raised = smoothstep(0.1, 0.45, here);
        wet *= 1.0 - raised * 0.85;
        // The fine ripples the tide left, strongest on the damp sand, and the grain of the dry sand.
        float ripple = sin(vWorld.z * 9.0 + sin(vWorld.x * 1.3) * 2.2 + noise(vWorld.xz * 0.7) * 5.0);
        n.z += uFine * 0.07 * ripple * (1.0 - dry) * (1.0 - wet * 0.7);
        n.x += uFine * 0.05 * (noise(vWorld.xz * 6.0) - 0.5) * dry;
        n = normalize(n);
        vec3 sand = mix(vec3(0.74, 0.55, 0.40), vec3(0.95, 0.80, 0.62), dry);
        sand = mix(sand, vec3(0.97, 0.78, 0.56), raised * 0.75);
        sand = mix(sand, vec3(0.33, 0.24, 0.23), wet);
        sand *= 1.0 + uFine * (noise(vWorld.xz * 14.0) - 0.5) * 0.09;
        // A hollow is darker than what stands round it, and a rim is lighter.
        float hollow = here - (east + west + north + south) * 0.25;
        float shade = clamp(1.0 + hollow * 2.6, 0.62, 1.18);
        float lit = max(dot(n, uLightDir), 0.0);
        vec3 col = sand * (vec3(0.60, 0.50, 0.55) * (1.0 + raised * 0.45) + vec3(1.25, 0.86, 0.50) * lit * 1.35) * shade;
        // Long low shadows fall away from the sun, toward the child.
        vec2 away = normalize(-uLightDir.xz);
        float shadow = 0.0;
        for (int i = 0; i < ${SHADOWS}; i++) {
          vec4 s = uShadows[i];
          if (s.z <= 0.0) continue;
          vec2 d = vWorld.xz - s.xy;
          // A thing with a way of its own casts its shadow along itself, a little to the side away from the sun.
          vec2 lies = uShadowAxes[i];
          bool own = dot(lies, lies) > 0.5;
          vec2 wide = own ? lies : vec2(-away.y, away.x);
          vec2 deep = own ? vec2(-lies.y, lies.x) * (dot(vec2(-lies.y, lies.x), away) < 0.0 ? -1.0 : 1.0) : away;
          float along = dot(d, deep), across = dot(d, wide);
          vec2 q = vec2(across / s.z, (along - s.w * 0.45) / s.w);
          shadow = max(shadow, 1.0 - smoothstep(0.55, 1.0, length(q)));
        }
        col *= 1.0 - shadow * 0.42;
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        col = mix(col, mirrored(r) * (1.0 - shadow * 0.3), clamp(wet * 0.62 + fresnel * 0.25 * (1.0 - dry), 0.0, 0.85));
        // The evening water in a groove: level, bright with the sky, with a line of foam along its edge.
        float water = pool(uv);
        if (water > 0.01) {
          vec3 wn = normalize(vec3(sin(vWorld.x * 5.0 + uTime * 1.1) * 0.04, 1.0, cos(vWorld.z * 6.0 - uTime * 0.9) * 0.05));
          vec3 wr = reflect(-v, wn);
          vec3 wcol = mix(vec3(0.34, 0.42, 0.48), mirrored(wr), 0.62) * (1.0 - shadow * 0.3);
          float rim = smoothstep(0.25, 0.5, water) * (1.0 - smoothstep(0.55, 0.85, water));
          wcol = mix(wcol, vec3(1.0, 0.94, 0.86), rim * (0.35 + 0.5 * noise(vWorld.xz * 5.0 + uTime * 0.3)));
          col = mix(col, wcol, smoothstep(0.3, 0.6, water));
        }
        // The long wave itself: a low sheet of water this side of its front, and a line of foam on its front.
        float sheet = uWave.y * (1.0 - step(waveEdge, vWorld.z)) * smoothstep(waveEdge - 3.4, waveEdge - 0.4, vWorld.z);
        if (sheet > 0.01) {
          vec3 wn = normalize(vec3(sin(vWorld.x * 2.0 + uTime) * 0.05, 1.0, 0.12 + cos(vWorld.z * 3.0 - uTime * 2.0) * 0.08));
          vec3 wcol = mix(vec3(0.42, 0.5, 0.52), mirrored(reflect(-v, wn)), 0.6);
          float crest = smoothstep(waveEdge - 0.55, waveEdge - 0.1, vWorld.z);
          wcol = mix(wcol, vec3(1.0, 0.95, 0.88), crest * (0.6 + 0.4 * noise(vWorld.xz * 4.0 + uTime)));
          col = mix(col, wcol, sheet * 0.9);
        }
        col = hour(col);
        // The idle glow: a soft breathing light on the sand to be touched.
        float g = uGlow.z * exp(-dot(vWorld.xz - uGlow.xy, vWorld.xz - uGlow.xy) / 3.2) * (0.7 + 0.3 * sin(uTime * 3.2));
        col += vec3(1.0, 0.96, 0.82) * g * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/** The sea: one level plane. It shows only where it stands above the sand, with foam where the two meet. */
export function seaMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'sea',
    uniforms: { ...shared },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${FIELD}
      uniform float uFine;
      varying vec3 vWorld;
      void main() {
        float depth = vWorld.y - (base(vWorld.z) + dig(fieldUv(vWorld.xz)));
        if (depth < -0.03) discard;
        // Swells roll in toward the beach.
        float roll = vWorld.z * 1.9 + uTime * 1.2 + sin(vWorld.x * 0.45 + uTime * 0.2) * 1.4;
        float swell = sin(roll);
        vec3 n = normalize(vec3(sin(vWorld.x * 2.3 + uTime * 0.7) * 0.05, 1.0, cos(roll) * 0.11 + uFine * (noise(vWorld.xz * 3.0 + uTime * 0.3) - 0.5) * 0.12));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 deep = vec3(0.20, 0.33, 0.45), shallow = vec3(0.50, 0.50, 0.46);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 0.55, depth));
        col = mix(col, mirrored(r), clamp(0.36 + fresnel * 0.5, 0.0, 0.9));
        // Glitter on the path to the sun.
        float toward = max(dot(normalize(r.xz), normalize(uSunDir.xz)), 0.0);
        float spark = step(0.82, noise(vWorld.xz * vec2(5.0, 11.0) + vec2(0.0, uTime * 1.6)));
        col += uFine * vec3(1.0, 0.86, 0.6) * spark * pow(toward, 14.0) * 0.6;
        // Foam where the water meets the sand, and on the crest of each swell in the shallows.
        float edge = 1.0 - smoothstep(0.0, 0.075, depth);
        float lace = noise(vWorld.xz * 4.0 + vec2(uTime * 0.25, -uTime * 0.4));
        float crest = smoothstep(0.9, 1.0, swell) * smoothstep(0.12, 0.5, depth) * (1.0 - smoothstep(0.7, 1.5, depth));
        float foam = clamp(edge * (0.55 + 0.6 * lace) + crest * (0.4 + 0.6 * lace), 0.0, 1.0);
        col = mix(col, vec3(1.0, 0.94, 0.86), foam);
        // Far out the sea melts into the light at the horizon.
        col = mix(col, skyAt(0.0) * 1.02, smoothstep(${(HORIZON_Z + 6).toFixed(1)}, ${HORIZON_Z.toFixed(1)}, vWorld.z) * 0.8);
        float alpha = max(smoothstep(-0.03, 0.14, depth) * 0.9, foam);
        gl_FragColor = vec4(hour(col), alpha);
      }
    `,
  })
}

/** The sky that stands at the horizon: the sunset, the sun, three clouds, far headlands and a small boat. */
export function skyMaterial(shared: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'sky',
    uniforms: {
      ...shared,
      uSun: { value: new THREE.Vector3(SUN.x, SUN.y, SUN.radius) },
      // Each cloud: x, height, half width, half height. The game slides and squashes them.
      uClouds: { value: CLOUDS.map((cloud) => new THREE.Vector4(cloud.x, cloud.y, cloud.w, cloud.h)) },
    },
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vWorld = position;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uSun;
      uniform vec4 uClouds[${CLOUDS.length}];
      varying vec3 vWorld;
      float puff(vec2 p, vec2 c, vec2 r) {
        return 1.0 - smoothstep(0.55, 1.0, length((p - c) / r));
      }
      void main() {
        vec2 p = vWorld.xy;
        vec3 col = skyAt(clamp(p.y / 7.5, 0.0, 1.0));
        // The sun: a soft disc with a wide warm halo.
        float d = length(p - uSun.xy);
        col += vec3(1.0, 0.62, 0.3) * exp(-d * d / (uSun.z * uSun.z * 7.0)) * 0.45;
        // Low on the sea it is a deep red-orange ball; up, a pale gold one.
        col = mix(col, mix(vec3(1.0, 0.95, 0.74), vec3(1.0, 0.56, 0.3), uDusk), 1.0 - smoothstep(uSun.z * 0.9, uSun.z, d));
        // Clouds, lit from below by the low sun.
        for (int i = 0; i < ${CLOUDS.length}; i++) {
          vec4 c = uClouds[i];
          float m = puff(p, c.xy, c.zw);
          m = max(m, puff(p, c.xy + vec2(-c.z * 0.45, c.w * 0.5), c.zw * vec2(0.5, 0.9)));
          m = max(m, puff(p, c.xy + vec2(c.z * 0.3, c.w * 0.7), c.zw * vec2(0.45, 1.0)));
          vec3 cloud = mix(vec3(1.0, 0.74, 0.52), vec3(0.74, 0.46, 0.56), smoothstep(-c.w, c.w * 1.2, p.y - c.y));
          col = mix(col, cloud, m * 0.92);
        }
        // Far headlands at either side, and a boat that bobs.
        float land = 0.95 * exp(-pow((p.x + 21.0) / 5.5, 2.0)) + 0.5 * exp(-pow((p.x + 13.5) / 2.6, 2.0)) + 0.75 * exp(-pow((p.x - 19.0) / 5.0, 2.0));
        col = mix(col, vec3(0.50, 0.33, 0.46), smoothstep(0.03, -0.03, p.y - land) * 0.85);
        vec2 b = p - vec2(2.9 + sin(uTime * 0.05) * 1.6, 0.02 + sin(uTime * 1.3) * 0.03);
        b.x += b.y * sin(uTime * 1.3) * 0.08;
        float sail = step(0.12, b.y) * step(b.y, 0.78) * step(abs(b.x - 0.04), (0.78 - b.y) * 0.34);
        float hull = step(0.0, b.y) * step(b.y, 0.1) * step(abs(b.x), 0.3 + b.y * 0.8);
        col = mix(col, vec3(1.0, 0.9, 0.78), sail);
        col = mix(col, vec3(0.42, 0.24, 0.3), hull);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/** The folk and the rocks: matte lumps in their own colours, lit by the low sun with a warm rim. */
export function lumpMaterial(shared: Shared, options: { gloss?: number; sway?: number; opacity?: number; hollow?: boolean } = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'lump',
    side: options.hollow ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: { ...shared, uGloss: { value: options.gloss ?? 0.3 }, uSway: { value: options.sway ?? 0 }, uOpacity: { value: options.opacity ?? 1 } },
    vertexColors: true,
    transparent: options.opacity !== undefined,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSway;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vColor;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        // Grass leans in the wind, more the higher up the blade.
        world.x += uSway * position.y * position.y * sin(uTime * 1.7 + world.x * 0.8 + world.z);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vColor = color;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform float uGloss;
      uniform float uOpacity;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vColor;
      void main() {
        vec3 n = normalize(vNormal);
        // The inside of something hollow is lit as an inside.
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(cameraPosition - vWorld);
        float lit = max(dot(n, uLightDir) * 0.62 + 0.38, 0.0);
        vec3 col = vColor * (vec3(0.50, 0.44, 0.52) + vec3(1.2, 0.85, 0.55) * lit);
        float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);
        col += vec3(1.0, 0.6, 0.3) * rim * (0.25 + 0.55 * max(dot(n, uLightDir), 0.0));
        col += vec3(1.0, 0.9, 0.75) * pow(max(dot(reflect(-v, n), uLightDir), 0.0), 28.0) * uGloss;
        gl_FragColor = vec4(hour(col), uOpacity);
      }
    `,
  })
}

/** Grains and drops in the air: small round points that shrink with distance. */
export function grainMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: 'grains',
    uniforms: { uSize: { value: 1 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = viewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.3, 0.5, d));
      }
    `,
  })
}
