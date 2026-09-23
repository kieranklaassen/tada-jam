import * as THREE from 'three'

// Cosy Scarf's knitted and crocheted look (games/cosy-scarf/ART.md).
// Every surface is yarn, but only the scarf and the characters carry a
// strong stitch: the hillside's knit is fine and faint so it recedes, and the
// loom's backboard is plain felt so the scarf reads cleanly. Stitch relief
// comes from normal maps and a baked stitch-shade (AO) tile drawn on canvases
// at startup; nothing is fetched. One MeshStandardMaterial patch adds the
// shade multiply, a soft yarn rim, glossy bead eyes, and per-animal warmth.

export const YARN = [
  '#d8402e', // tomato red
  '#f3b52c', // sunflower
  '#3f78cf', // cornflower
  '#f4ecdc', // cream
  '#4f9e45', // leaf green
  '#e05b9c', // berry pink
] as const

export const PALETTE = {
  sky: '#98b6d3',
  skyTop: '#6f93b8',
  skyGlow: '#dfe4ea',
  snow: '#eef2f6',
  snowShade: '#bac8d6',
  hill: '#d9e1e9',
  hillFar: '#a9bbce',
  pine: '#3f6a5a',
  pineFar: '#7c998f',
  blanket: '#2f6770',
  blanketRib: '#285a62',
  loom: '#c9955a',
  loomDark: '#a8763f',
  backboard: '#554a63',
  backboardLow: '#3f374c',
  stitch: '#b9aa98',
  needle: '#d9b27a',
  bead: '#f0dcc0',
  basket: '#9b6a3e',
  basketRim: '#b88452',
  butterfly: '#f0a3c4',
  butterflyBody: '#6b4a6e',
  thread: '#f7f1e3',
  eye: '#1b1614',
  shine: '#ffffff',
  nose: '#3b2a24',
  blush: '#f08f98',
  bunny: '#c8ad90',
  bunnyLight: '#f1e6d6',
  bunnyInner: '#eeb0b2',
  penguin: '#2d3a57',
  penguinBelly: '#f5eedf',
  beak: '#f0943a',
  fox: '#dc7431',
  foxLight: '#f6ecdc',
  foxDark: '#4d3328',
  bear: '#8a5836',
  bearLight: '#dcb68c',
  glow: '#ffd978',
  shadow: '#1f2a3a',
  backdrop: '#b7c9dc',
  fog: '#c3d1df',
} as const

// --- canvases -----------------------------------------------------------------

function canvas(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  draw(element.getContext('2d')!)
  return element
}

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

/** Read a grey height canvas (wrapping at the edges). */
function heights(source: HTMLCanvasElement): { at: (x: number, y: number) => number; w: number; h: number } {
  const w = source.width
  const h = source.height
  const data = source.getContext('2d')!.getImageData(0, 0, w, h).data
  return { at: (x, y) => data[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255, w, h }
}

function repeat(texture: THREE.Texture): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 4
  return texture
}

/** A tangent-space normal map from a height canvas. */
function normalFrom(source: HTMLCanvasElement, strength: number): THREE.Texture {
  const { at, w, h } = heights(source)
  const out = canvas(w, h, (g) => {
    const image = g.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength
        const len = Math.hypot(dx, dy, 1)
        const i = (y * w + x) * 4
        image.data[i] = (-dx / len) * 127.5 + 127.5
        image.data[i + 1] = (dy / len) * 127.5 + 127.5
        image.data[i + 2] = (1 / len) * 127.5 + 127.5
        image.data[i + 3] = 255
      }
    }
    g.putImageData(image, 0, 0)
  })
  const texture = new THREE.CanvasTexture(out)
  texture.colorSpace = THREE.NoColorSpace
  return repeat(texture)
}

/** Stitch shade: valleys between loops darken (baked AO), crowns stay bright. */
function shadeFrom(source: HTMLCanvasElement, floor: number): THREE.Texture {
  const { at, w, h } = heights(source)
  const out = canvas(w, h, (g) => {
    const image = g.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = (floor + (1 - floor) * Math.pow(at(x, y), 0.7)) * 255
        const i = (y * w + x) * 4
        image.data[i] = v
        image.data[i + 1] = v
        image.data[i + 2] = v
        image.data[i + 3] = 255
      }
    }
    g.putImageData(image, 0, 0)
  })
  const texture = new THREE.CanvasTexture(out)
  texture.colorSpace = THREE.NoColorSpace
  return repeat(texture)
}

/** One soft yarn loop: a domed ellipse. */
function loop(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle: number, peak = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  g.scale(rx, ry)
  const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  gradient.addColorStop(0, `rgba(255,255,255,${peak})`)
  gradient.addColorStop(0.55, `rgba(255,255,255,${peak * 0.75})`)
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gradient
  g.beginPath()
  g.arc(0, 0, 1, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Plies twisting along a loop: fine diagonal grooves so yarn reads as yarn up close. */
function plies(g: CanvasRenderingContext2D, size: number, random: () => number, count: number): void {
  g.globalCompositeOperation = 'multiply'
  for (let i = 0; i < count; i++) {
    const x = random() * size
    const y = random() * size
    g.strokeStyle = `rgba(150,150,150,${0.25 + random() * 0.2})`
    g.lineWidth = 0.8 + random() * 0.8
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + size * 0.06, y + size * 0.03)
    g.stroke()
  }
  g.globalCompositeOperation = 'source-over'
}

/** One knit stitch per tile: a V of two leaning loops, point down. */
function knitHeight(size: number): HTMLCanvasElement {
  const random = seeded(3)
  return canvas(size, size, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, size, size)
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        loop(g, dx + size * 0.3, dy + size * 0.5, size * 0.2, size * 0.5, -0.5)
        loop(g, dx + size * 0.7, dy + size * 0.5, size * 0.2, size * 0.5, 0.5)
      }
    }
    plies(g, size, random, 40)
  })
}

/** Amigurumi single crochet: small x-shaped stitches in rows, a few per tile. */
function crochetHeight(size: number, per: number): HTMLCanvasElement {
  const random = seeded(11)
  const cell = size / per
  return canvas(size, size, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, size, size)
    for (let row = -1; row <= per; row++) {
      for (let col = -1; col <= per; col++) {
        const x = (col + 0.5 + (row % 2) * 0.12) * cell
        const y = (row + 0.5) * cell
        loop(g, x - cell * 0.18, y, cell * 0.2, cell * 0.44, -0.42, 0.95)
        loop(g, x + cell * 0.18, y, cell * 0.2, cell * 0.44, 0.42, 0.95)
        loop(g, x, y - cell * 0.36, cell * 0.42, cell * 0.14, 0, 0.7)
      }
    }
    plies(g, size, random, 90)
  })
}

/** A wound ball: bands of parallel strands at a few crossing angles. */
function ballHeight(size: number): HTMLCanvasElement {
  const random = seeded(5)
  return canvas(size, size, (g) => {
    g.fillStyle = '#000'
    g.fillRect(0, 0, size, size)
    g.lineCap = 'round'
    for (let band = 0; band < 7; band++) {
      const angle = random() * Math.PI
      const cx = random() * size
      const cy = random() * size
      const width = size * (0.25 + random() * 0.25)
      g.save()
      g.translate(cx, cy)
      g.rotate(angle)
      for (let s = -width; s < width; s += 5) {
        for (const ox of [-size, 0, size]) {
          const gradient = g.createLinearGradient(0, s - 2.5, 0, s + 2.5)
          gradient.addColorStop(0, 'rgba(255,255,255,0)')
          gradient.addColorStop(0.5, 'rgba(255,255,255,0.9)')
          gradient.addColorStop(1, 'rgba(255,255,255,0)')
          g.fillStyle = gradient
          g.fillRect(-size * 1.5 + ox, s - 2.5, size * 3, 5)
        }
      }
      g.restore()
    }
  })
}

// --- textures -------------------------------------------------------------------

export type YarnTextures = {
  knitNormal: THREE.Texture
  knitShade: THREE.Texture
  crochetNormal: THREE.Texture
  crochetShade: THREE.Texture
  ballNormal: THREE.Texture
  ring: THREE.Texture
  blob: THREE.Texture
  hand: THREE.Texture
  dispose(): void
}

function ringTexture(): THREE.Texture {
  const size = 128
  const texture = new THREE.CanvasTexture(
    canvas(size, size, (g) => {
      const c = size / 2
      const gradient = g.createRadialGradient(c, c, 0, c, c, c)
      gradient.addColorStop(0, 'rgba(255,255,255,0.18)')
      gradient.addColorStop(0.62, 'rgba(255,255,255,0.3)')
      gradient.addColorStop(0.78, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.9, 'rgba(255,255,255,0.35)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gradient
      g.fillRect(0, 0, size, size)
    }),
  )
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

function blobTexture(): THREE.Texture {
  const size = 64
  const texture = new THREE.CanvasTexture(
    canvas(size, size, (g) => {
      const c = size / 2
      const gradient = g.createRadialGradient(c, c, 0, c, c, c)
      gradient.addColorStop(0, 'rgba(255,255,255,1)')
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.55)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gradient
      g.fillRect(0, 0, size, size)
    }),
  )
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/** A big friendly mitten-soft cartoon hand, pointing down. */
function handTexture(): THREE.Texture {
  const texture = new THREE.CanvasTexture(
    canvas(256, 320, (g) => {
      g.translate(128, 0)
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(-26, 296)
      g.quadraticCurveTo(-30, 190, -28, 150)
      g.quadraticCurveTo(-70, 150, -74, 110)
      g.quadraticCurveTo(-96, 96, -86, 64)
      g.quadraticCurveTo(-80, 20, -30, 14)
      g.lineTo(46, 14)
      g.quadraticCurveTo(92, 18, 90, 70)
      g.quadraticCurveTo(96, 110, 70, 132)
      g.quadraticCurveTo(52, 150, 30, 150)
      g.quadraticCurveTo(32, 190, 26, 296)
      g.quadraticCurveTo(0, 318, -26, 296)
      g.closePath()
      const fill = g.createLinearGradient(-90, 0, 90, 300)
      fill.addColorStop(0, '#ffffff')
      fill.addColorStop(1, '#f1ebe4')
      g.fillStyle = fill
      g.fill()
      g.lineWidth = 9
      g.strokeStyle = '#5b4a5e'
      g.stroke()
      g.lineWidth = 6
      g.strokeStyle = 'rgba(91,74,94,0.45)'
      for (const x of [-40, 0, 40]) {
        g.beginPath()
        g.moveTo(x, 30)
        g.quadraticCurveTo(x + 4, 70, x, 100)
        g.stroke()
      }
    }),
  )
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function createTextures(): YarnTextures {
  const knit = knitHeight(64)
  const crochet = crochetHeight(128, 4)
  const textures = {
    knitNormal: normalFrom(knit, 5),
    knitShade: shadeFrom(knit, 0.42),
    crochetNormal: normalFrom(crochet, 4),
    crochetShade: shadeFrom(crochet, 0.55),
    ballNormal: normalFrom(ballHeight(128), 3.5),
    ring: ringTexture(),
    blob: blobTexture(),
    hand: handTexture(),
  }
  return {
    ...textures,
    dispose() {
      for (const texture of Object.values(textures)) texture.dispose()
    },
  }
}

// --- the yarn material patch ------------------------------------------------------

export type YarnPatch = {
  /** Stitch-shade tile multiplied into the albedo at the normal-map UVs. */
  shade: THREE.Texture
  shadeAmount: number
  /** Soft halo where yarn turns away from the eye. */
  rim: number
  /** Geometry carries an `aBead` attribute: glossy, unstitched beads (eyes, noses). */
  beads?: boolean
  /** Per-mesh warmth: a cold blue tint and cheeks (`aBlush`) that turn rosy. */
  warmth?: boolean
}

export type WarmthUniforms = { uCold: { value: number }; uBlush: { value: number } }

/** Patch a MeshStandardMaterial with the yarn extras. Clones with the same flags share one program. */
export function patchYarn(material: THREE.MeshStandardMaterial, patch: YarnPatch): WarmthUniforms {
  const warmth: WarmthUniforms = { uCold: { value: 0 }, uBlush: { value: 0 } }
  const key = `yarn-${patch.beads ? 'b' : ''}${patch.warmth ? 'w' : ''}`
  material.customProgramCacheKey = () => key
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShade = { value: patch.shade }
    shader.uniforms.uShadeAmount = { value: patch.shadeAmount }
    shader.uniforms.uRim = { value: patch.rim }
    shader.uniforms.uCold = warmth.uCold
    shader.uniforms.uBlush = warmth.uBlush
    let vertex = shader.vertexShader
    let fragment = shader.fragmentShader
    const varyings = `${patch.beads ? 'varying float vBead;\n' : ''}${patch.warmth ? 'varying float vBlush;\n' : ''}`
    vertex = vertex.replace(
      '#include <common>',
      `#include <common>\n${patch.beads ? 'attribute float aBead;\n' : ''}${patch.warmth ? 'attribute float aBlush;\n' : ''}${varyings}`,
    )
    vertex = vertex.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>\n${patch.beads ? 'vBead = aBead;\n' : ''}${patch.warmth ? 'vBlush = aBlush;\n' : ''}`,
    )
    fragment = fragment.replace(
      '#include <common>',
      `#include <common>\nuniform sampler2D uShade;\nuniform float uShadeAmount;\nuniform float uRim;\nuniform float uCold;\nuniform float uBlush;\n${varyings}`,
    )
    const bead = patch.beads ? 'vBead' : '0.0'
    fragment = fragment.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      #ifdef USE_NORMALMAP
      diffuseColor.rgb *= mix(1.0, texture2D(uShade, vNormalMapUv).r, uShadeAmount * (1.0 - ${bead}));
      #endif
      ${patch.warmth ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.52, 0.56), vBlush * uBlush);\n      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.8, 0.9, 1.1), uCold);' : ''}`,
    )
    fragment = fragment.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, ${bead});`)
    fragment = fragment.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, ${bead}));`)
    fragment = fragment.replace(
      '#include <opaque_fragment>',
      `float yarnFacing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
      outgoingLight += diffuseColor.rgb * uRim * pow(yarnFacing, 2.2) * (1.0 - ${bead});
      #include <opaque_fragment>`,
    )
    shader.vertexShader = vertex
    shader.fragmentShader = fragment
  }
  return warmth
}

export type YarnMaterials = {
  textures: YarnTextures
  /** Crochet for props (loom, basket, butterfly): vertex colours, beads. */
  crochet: THREE.MeshStandardMaterial
  /**
   * The same crochet for instanced meshes (the pines). A material drawn both
   * instanced and plain makes three.js re-pick its program for every switch,
   * which rebuilt the program parameters (and allocated) every frame.
   */
  crochetInstanced: THREE.MeshStandardMaterial
  /** Fine, faint knit for the hillside. */
  land: THREE.MeshStandardMaterial
  /** The sky: a ribbed knit wall, unfogged so its blue stays even. */
  sky: THREE.MeshStandardMaterial
  /** The play blanket: a calm, broad knit. */
  blanket: THREE.MeshStandardMaterial
  /** Plain felt for the loom's backboard: no stitch at all. */
  felt: THREE.MeshStandardMaterial
  balls: THREE.MeshStandardMaterial
  flakes: THREE.MeshStandardMaterial
  shadow: THREE.MeshBasicMaterial
  glow: THREE.MeshBasicMaterial
  hand: THREE.SpriteMaterial
  /** A crochet material for one animal, with its own warmth uniforms. */
  animal(): { material: THREE.MeshStandardMaterial; warmth: WarmthUniforms }
  setHillRelief(on: boolean): void
  dispose(): void
}

export function createMaterials(): YarnMaterials {
  const textures = createTextures()
  const owned: THREE.Material[] = []
  const own = <T extends THREE.Material>(material: T): T => {
    owned.push(material)
    return material
  }

  const makeCrochet = () => {
    const material = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, normalMap: textures.crochetNormal, normalScale: new THREE.Vector2(0.9, 0.9) }))
    patchYarn(material, { shade: textures.crochetShade, shadeAmount: 0.8, rim: 0.35, beads: true })
    return material
  }
  const crochet = makeCrochet()
  const crochetInstanced = makeCrochet()

  const land = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, normalMap: textures.knitNormal, normalScale: new THREE.Vector2(0.7, 0.7) }))
  patchYarn(land, { shade: textures.knitShade, shadeAmount: 0.34, rim: 0.12 })

  const sky = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, normalMap: textures.knitNormal, normalScale: new THREE.Vector2(0.45, 0.45), fog: false }))
  patchYarn(sky, { shade: textures.knitShade, shadeAmount: 0.26, rim: 0 })

  const blanket = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, normalMap: textures.knitNormal, normalScale: new THREE.Vector2(0.55, 0.55) }))
  patchYarn(blanket, { shade: textures.knitShade, shadeAmount: 0.45, rim: 0.18 })

  const felt = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }))

  const balls = own(new THREE.MeshStandardMaterial({ roughness: 0.9, normalMap: textures.ballNormal, normalScale: new THREE.Vector2(1.1, 1.1) }))
  patchYarn(balls, { shade: textures.crochetShade, shadeAmount: 0, rim: 0.4 })

  const flakes = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#dfe8f2', emissiveIntensity: 0.35 }))

  const overlay = (color: string, map: THREE.Texture) =>
    own(new THREE.MeshBasicMaterial({ color, map, transparent: true, depthWrite: false, toneMapped: false, fog: false }))
  const shadow = overlay(PALETTE.shadow, textures.blob)
  const glow = overlay(PALETTE.glow, textures.ring)
  const hand = own(new THREE.SpriteMaterial({ map: textures.hand, transparent: true, depthTest: false, toneMapped: false, fog: false }))

  return {
    textures,
    crochet,
    crochetInstanced,
    land,
    sky,
    blanket,
    felt,
    balls,
    flakes,
    shadow,
    glow,
    hand,
    animal() {
      const material = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, normalMap: textures.crochetNormal, normalScale: new THREE.Vector2(1, 1) }))
      const warmth = patchYarn(material, { shade: textures.crochetShade, shadeAmount: 0.85, rim: 0.42, beads: true, warmth: true })
      return { material, warmth }
    },
    setHillRelief(on) {
      const map = on ? textures.knitNormal : null
      if (land.normalMap === map) return
      land.normalMap = map
      land.needsUpdate = true
    },
    dispose() {
      for (const material of owned) material.dispose()
      textures.dispose()
    },
  }
}
