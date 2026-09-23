import * as THREE from 'three'
import { PALETTE } from './palette'

// One toon look for everything that is lit. MeshToonMaterial with a
// three-step ramp gives warm lit faces and lilac shadows; a small shader
// hook adds two things the stock material cannot: the firefly's light, in
// stepped rings that slide over frogs and pads as it passes, and a gold
// rim on top edges from the sunset behind the pond. Reeds sway through the
// same hook (a per-vertex `sway` weight; absent everywhere else, so zero).
// Outlines are inverted hulls in plum: the back faces of the same mesh,
// pushed out along the normals.

export type SharedUniforms = {
  uTime: { value: number }
  uFirePos: { value: THREE.Vector3 }
  uFireColor: { value: THREE.Color }
  uFireStrength: { value: number }
  uRimColor: { value: THREE.Color }
  uRimStrength: { value: number }
  /** Toward the sunset behind the pond, in view space (set when the camera moves). */
  uRimDir: { value: THREE.Vector3 }
}

export function createShared(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uFirePos: { value: new THREE.Vector3(0, 2, 0) },
    uFireColor: { value: new THREE.Color(PALETTE.fireflyGlow) },
    uFireStrength: { value: 1 },
    uRimColor: { value: new THREE.Color(PALETTE.rim) },
    uRimStrength: { value: 0.55 },
    uRimDir: { value: new THREE.Vector3(0, 1, 0) },
  }
}

const SUNSET = new THREE.Vector3(0.25, 0.7, -1).normalize()

/** Point the rim light at the sunset as seen from this camera. */
export function aimRim(shared: SharedUniforms, camera: THREE.Camera): void {
  camera.updateMatrixWorld()
  shared.uRimDir.value.copy(SUNSET).transformDirection(camera.matrixWorldInverse)
}

/** Three flat steps: shadow, half, lit. */
export function gradientMap(): THREE.DataTexture {
  const data = new Uint8Array([96, 178, 255])
  const map = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
  map.minFilter = THREE.NearestFilter
  map.magFilter = THREE.NearestFilter
  map.generateMipmaps = false
  map.needsUpdate = true
  return map
}

const SWAY_VERTEX = /* glsl */ `
  #ifdef FROG_SWAY
    vec4 swayWorld = modelMatrix * vec4(transformed, 1.0);
    float swayWave = sin(uTime * 1.3 + swayWorld.x * 0.7 + swayWorld.z * 0.4) + 0.4 * sin(uTime * 2.3 + swayWorld.x * 1.9);
    transformed.x += swayWave * sway * 0.07;
    transformed.z += swayWave * sway * 0.03;
  #endif
`

function worldPosition(varying: string): string {
  return /* glsl */ `
    vec4 fireWorld = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      fireWorld = instanceMatrix * fireWorld;
    #endif
    ${varying} = (modelMatrix * fireWorld).xyz;
  `
}

/** Firefly light in three stepped rings: a toon light pool. */
export const FIRE_BANDS = /* glsl */ `
  float fireBands(float d) {
    return step(d, 1.0) * 0.2 + step(d, 1.9) * 0.14 + step(d, 3.0) * 0.08;
  }
`

type ToonOptions = THREE.MeshToonMaterialParameters & {
  sway?: boolean
  /** 0..1: a wide gold band around every silhouette edge, the idle "you can touch this" breath. */
  touchGlow?: { value: number }
}

export function toonMaterial(shared: SharedUniforms, gradient: THREE.Texture, options: ToonOptions = {}): THREE.MeshToonMaterial {
  const { sway, touchGlow, ...parameters } = options
  const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, ...parameters })
  if (sway) material.defines = { ...material.defines, FROG_SWAY: '' }
  if (touchGlow) material.defines = { ...material.defines, FROG_TOUCH: '' }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, touchGlow ? { uTouchGlow: touchGlow } : {})
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float sway;\nvarying vec3 vFireWorld;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SWAY_VERTEX}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${worldPosition('vFireWorld')}`)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform vec3 uFirePos;\nuniform vec3 uFireColor;\nuniform float uFireStrength;\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform vec3 uRimDir;\nuniform float uTouchGlow;\nvarying vec3 vFireWorld;\n${FIRE_BANDS}`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        float fireD = distance(vFireWorld, uFirePos);
        outgoingLight += uFireColor * fireBands(fireD) * uFireStrength * (0.35 + 0.65 * diffuseColor.rgb);
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float rim = step(facing, 0.36) * step(0.25, dot(normal, uRimDir));
        outgoingLight += uRimColor * rim * uRimStrength;
        #ifdef FROG_TOUCH
          outgoingLight += uRimColor * step(facing, 0.44) * uTouchGlow * 0.6;
        #endif
        #include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => `frog-toon${sway ? '-sway' : ''}${touchGlow ? '-touch' : ''}`
  return material
}

/** The inverted-hull outline: back faces pushed out by `width` world units, flat plum. */
export function outlineMaterial(shared: SharedUniforms, width: number, options: { sway?: boolean; color?: string } = {}): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color: options.color ?? PALETTE.outline, side: THREE.BackSide })
  if (options.sway) material.defines = { FROG_SWAY: '' }
  const uniforms = { uOutline: { value: width } }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uOutline;\nattribute float sway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SWAY_VERTEX}\ntransformed += normalize(normal) * uOutline;`)
  }
  material.customProgramCacheKey = () => `frog-outline${options.sway ? '-sway' : ''}`
  material.userData.width = uniforms.uOutline
  return material
}
