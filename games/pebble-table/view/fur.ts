import * as THREE from 'three'

// Clay fur. Real fur would look wrong on plasticine, so "fur" here is
// sculpted clay: chunky tufts pressed with a tool, rendered as a few
// instanced shells over the body. Each shell is the body pushed out along
// its normals and alpha-tested against a tuft pattern, darker at the root
// and lighter at the tips, with a soft rim and a breath-and-wind sway in the
// vertex shader. Hedgehog quills are instanced tapered clay spikes that sway
// on their own. Shell count is capped and chosen by on-screen size.

export const MAX_SHELLS = 6

export const furTime = { value: 0 }

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tileable tuft heights: fat strokes that run down the body (along v), like clay dragged with a loop tool. */
export function tuftTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, size, size)
  const random = seeded(21)
  g.globalCompositeOperation = 'lighten'
  for (let i = 0; i < 80; i++) {
    const x = random() * size
    const y = random() * size
    const w = 11 + random() * 9
    const h = 34 + random() * 30
    const lean = (random() - 0.5) * 0.5
    for (const [dx, dy] of [
      [0, 0],
      [size, 0],
      [-size, 0],
      [0, size],
      [0, -size],
    ]) {
      g.save()
      g.translate(x + dx, y + dy)
      g.rotate(lean)
      g.scale(1, h / w)
      const gradient = g.createRadialGradient(0, -w * 0.25, 0, 0, 0, w)
      const peak = Math.round(150 + random() * 105)
      gradient.addColorStop(0, `rgb(${peak},${peak},${peak})`)
      gradient.addColorStop(0.6, `rgb(${Math.round(peak * 0.55)},0,0)`)
      gradient.addColorStop(1, 'rgb(0,0,0)')
      g.fillStyle = gradient
      g.beginPath()
      g.arc(0, 0, w, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/** Give a geometry one `aShell` value per instance: shell i of n sits at height (i + 1) / n. */
export function withShells(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geometry.clone()
  const levels = new Float32Array(MAX_SHELLS)
  for (let i = 0; i < MAX_SHELLS; i++) levels[i] = (i + 1) / MAX_SHELLS
  g.setAttribute('aShell', new THREE.InstancedBufferAttribute(levels, 1))
  return g
}

/** Shell material: the clay material, pushed out, alpha-tested against tufts, shaded root-to-tip with a soft rim. */
export function furMaterial(base: THREE.MeshStandardMaterial, tufts: THREE.Texture, length: number): THREE.MeshStandardMaterial {
  const material = base.clone()
  material.side = THREE.FrontSide
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = furTime
    shader.uniforms.uTufts = { value: tufts }
    shader.uniforms.uLength = { value: length }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aShell;
        uniform float uTime;
        uniform float uLength;
        varying float vShell;
        varying float vBare;
        varying vec2 vFurUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
        float h = aShell;
        transformed += normalize(objectNormal) * h * uLength;
        float sway = sin(uTime * 1.6 + position.y * 0.9 + position.x * 0.7) * 0.5 + sin(uTime * 2.7 + position.z) * 0.25;
        transformed.x += sway * h * h * uLength * 0.45;
        transformed.y -= h * h * uLength * 0.25;
        vShell = h;
        vBare = smoothstep(0.3, 0.62, normalize(objectNormal).z);
        vFurUv = uv;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uTufts;
        varying float vShell;
        varying float vBare;
        varying vec2 vFurUv;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float tuft = texture2D(uTufts, vFurUv * vec2(4.5, 3.2)).r * (1.0 - vBare);
        if (tuft < vShell * 0.92 + 0.06) discard;
        diffuseColor.rgb *= mix(0.74, 1.1, vShell);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += diffuseColor.rgb * rim * 0.28 * vShell;`,
      )
  }
  material.customProgramCacheKey = () => `clay-fur-${length}`
  return material
}

/** Quill material: each instance sways from its base, a little out of phase with its neighbours. */
export function quillMaterial(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const material = base.clone()
  material.side = THREE.FrontSide
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = furTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;`)
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
        #ifdef USE_INSTANCING
          float phase = instanceMatrix[3].x * 2.3 + instanceMatrix[3].z * 3.1 + instanceMatrix[3].y;
        #else
          float phase = 0.0;
        #endif
        float bend = position.y * position.y;
        transformed.x += sin(uTime * 2.1 + phase) * bend * 0.05;
        transformed.z += cos(uTime * 1.7 + phase) * bend * 0.035;`,
      )
  }
  material.customProgramCacheKey = () => 'clay-quill'
  return material
}

/** A tapered, slightly bent clay quill along +y, painted dark at the root and light at the tip. */
export function quillGeometry(root: string, tip: string): THREE.BufferGeometry {
  const profile = [
    [0.0, 0],
    [0.42, 0.02],
    [0.46, 0.25],
    [0.34, 0.9],
    [0.18, 1.5],
    [0.05, 1.9],
    [0.0, 1.95],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const geometry = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(14), 7)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const a = new THREE.Color(root)
  const b = new THREE.Color(tip)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    position.setZ(i, position.getZ(i) - y * y * 0.06)
    c.copy(a).lerp(b, THREE.MathUtils.smoothstep(y, 0.6, 1.9))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Instance matrices for quills spread over the back of a sphere (away from the face at +z). */
export function quillLayout(count: number, center: [number, number, number], radius: number, seed: number, from: number, to: number): THREE.Matrix4[] {
  const random = seeded(seed)
  const matrices: THREE.Matrix4[] = []
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const theta = i * 2.39996 + seed
    const phi = from + (to - from) * t
    const dir = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.abs(Math.sin(phi) * Math.cos(theta)) * 0.95 - 0.2).normalize()
    const lean = dir.clone().add(new THREE.Vector3(0, -0.35, -0.55)).normalize()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, lean)
    const length = 0.85 + random() * 0.45
    const width = 0.9 + random() * 0.3
    const base = new THREE.Vector3(...center).addScaledVector(dir, radius * 0.93)
    matrices.push(new THREE.Matrix4().compose(base, quaternion, new THREE.Vector3(width, length, width)))
  }
  return matrices
}
