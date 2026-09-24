import { BoxGeometry, BufferGeometry, Matrix4, PerspectiveCamera, PlaneGeometry, SphereGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { describe, expect, it } from 'vitest'
import { analyseMoment, canFight, clipToPlanes, depthResolution, preparePiece, splitComponents, type CameraInfo, type MaterialInfo, type PieceInput, type PoseTrack } from '../scripts/intersections/core.ts'

const camera = (() => {
  const cam = new PerspectiveCamera(30, 1180 / 820, 1, 200)
  cam.position.set(0, 6, 14)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  const e = cam.matrixWorld.elements
  const info: CameraInfo = {
    position: [e[12], e[13], e[14]],
    forward: [-e[8], -e[9], -e[10]],
    ortho: false,
    near: cam.near,
    far: cam.far,
    fov: cam.fov,
    orthoHeight: 0,
    view: Array.from(cam.matrixWorldInverse.elements),
    projection: Array.from(cam.projectionMatrix.elements),
    viewport: [1180, 820],
    logDepth: false,
  }
  return info
})()
const viewSize = 2 * 15 * Math.tan((30 * Math.PI) / 360) * (1180 / 820)

const opaque: MaterialInfo = { type: 'MeshStandardMaterial', side: 0, transparent: false, opacity: 1, depthTest: true, depthWrite: true, polygonOffset: false, colorWrite: true, customVertex: false, renderOrder: 0 }

function piece(id: string, geometry: BufferGeometry, at: [number, number, number], options: { object?: string; material?: Partial<MaterialInfo>; matrix?: Matrix4 } = {}): PieceInput {
  const g = geometry.clone().applyMatrix4(options.matrix ?? new Matrix4().makeTranslation(...at))
  return {
    id,
    mesh: id,
    label: id,
    object: options.object ?? id,
    positions: new Float32Array(g.attributes.position.array),
    index: g.index ? new Uint32Array(g.index.array) : null,
    material: { ...opaque, ...options.material },
  }
}

const run = (inputs: PieceInput[], poseHistory?: Map<string, PoseTrack>) =>
  analyseMoment(inputs.map((p) => preparePiece(p, camera)), { camera, viewSize, poseHistory })

const sphere = (r = 1) => new SphereGeometry(r, 24, 16)
const ground = () => new PlaneGeometry(20, 20).rotateX(-Math.PI / 2)

describe('intersection audit core', () => {
  it('flags two objects passing through each other, with the depth', () => {
    const found = run([piece('a', sphere(), [0, 1, 0]), piece('b', sphere(), [1.4, 1, 0])])
    const hit = found.find((f) => f.kind === 'penetration')
    expect(hit).toBeDefined()
    expect(hit!.depth).toBeGreaterThan(0.45)
    expect(hit!.depth).toBeLessThan(0.7)
  })

  it('leaves a ball resting on the ground alone', () => {
    expect(run([piece('ball', sphere(), [0, 0.995, 0]), piece('ground', ground(), [0, 0, 0])])).toEqual([])
  })

  it('flags a ball sunk into the ground as sinking into a support', () => {
    const hit = run([piece('ball', sphere(), [0, 0.5, 0]), piece('ground', ground(), [0, 0, 0])]).find((f) => f.kind === 'penetration')
    expect(hit?.support).toBe(true)
    expect(hit!.depth).toBeCloseTo(0.5, 1)
  })

  it('flags a piece hidden wholly inside another', () => {
    const found = run([piece('small', new BoxGeometry(0.3, 0.3, 0.3), [0, 1, 0]), piece('big', sphere(), [0, 1, 0])])
    expect(found.map((f) => f.kind)).toContain('contained')
  })

  it('ignores parts of one object unless a pose pushes one deeper than it rests', () => {
    const history = new Map<string, PoseTrack>()
    const body = () => piece('body', sphere(), [0, 1, 0], { object: 'frog' })
    const rest = run([body(), piece('arm', new BoxGeometry(0.4, 0.4, 1.2), [1.05, 1, 0], { object: 'frog' })], history)
    expect(rest).toEqual([])
    const swung = run([body(), piece('arm', new BoxGeometry(0.4, 0.4, 1.2), [0.5, 1, 0], { object: 'frog' })], history)
    expect(swung.map((f) => f.kind)).toEqual(['pose'])
  })

  it('skips a child mesh inside its parent mesh', () => {
    const eye = piece('Group:0/Mesh:0/Mesh:1', sphere(0.3), [0.8, 1, 0])
    const head = piece('Group:0/Mesh:0', sphere(), [0, 1, 0])
    eye.object = 'eye'
    expect(run([eye, head])).toEqual([])
  })

  it('flags a decal lying exactly on a surface, and not once it has a polygon offset', () => {
    const decal = () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const plain = run([piece('decal', decal(), [0, 0, 0], { material: { transparent: true } }), piece('ground', ground(), [0, 0, 0])])
    expect(plain.map((f) => f.kind)).toContain('zfight')
    const offset = run([piece('decal', decal(), [0, 0, 0], { material: { transparent: true, polygonOffset: true } }), piece('ground', ground(), [0, 0, 0])])
    expect(offset.filter((f) => f.kind === 'zfight')).toEqual([])
    const lifted = run([piece('decal', decal(), [0, 0.02, 0], { material: { transparent: true } }), piece('ground', ground(), [0, 0, 0])])
    expect(lifted.filter((f) => f.kind === 'zfight')).toEqual([])
  })

  it('knows which coplanar pairs the depth buffer never compares', () => {
    const decal = { ...opaque, transparent: true, depthWrite: false }
    expect(canFight(opaque, decal)).toBe(true)
    expect(canFight(decal, decal)).toBe(false)
    expect(canFight({ ...opaque, depthTest: false }, opaque)).toBe(false)
    expect(canFight(decal, { ...opaque, transparent: true, renderOrder: 2 })).toBe(false)
  })

  it('finds coplanar overlapping faces inside one merged mesh', () => {
    const merged = mergeGeometries([new PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.3, 0, 0)].map((g) => g.toNonIndexed()))
    expect(run([piece('batch', merged, [0, 0, 0])]).map((f) => f.kind)).toEqual(['zfight'])
  })

  it('checks only what a clipping plane leaves drawn', () => {
    const wall = piece('wall', new BoxGeometry(0.2, 2, 2), [0, 1, 0])
    const shadow = piece('shadow', new PlaneGeometry(4, 1), [0, 1, 0.5])
    expect(run([wall, shadow]).map((f) => f.kind)).toContain('penetration')
    // Keep only x < -0.5: the part of the shadow through the wall is discarded.
    const clipped = clipToPlanes(shadow, [[-1, 0, 0, -0.5]])!
    expect(Math.max(...Array.from(clipped.positions).filter((_, i) => i % 3 === 0))).toBeCloseTo(-0.5, 5)
    expect(run([wall, clipped])).toEqual([])
    expect(clipToPlanes(shadow, [[-1, 0, 0, -3]])).toBeNull()
  })

  it('splits a merged batch into its separate things', () => {
    const merged = mergeGeometries([sphere().translate(-3, 1, 0), sphere().translate(3, 1, 0)].map((g) => g.toNonIndexed()))
    expect(splitComponents(piece('batch', merged, [0, 0, 0])).map((p) => p.id)).toEqual(['batch~0', 'batch~1'])
  })

  it('treats a dome around the camera as the room, not as a solid', () => {
    const dome = piece('sky', new SphereGeometry(60, 16, 12), [0, 0, 0], { material: { side: 1 } })
    expect(run([dome, piece('ball', sphere(), [0, 1, 0])])).toEqual([])
  })

  it('reports a piece inside the near plane and gives depth precision that grows with distance', () => {
    const found = run([piece('close', sphere(0.5), [0, 6, 13.2])])
    expect(found.map((f) => f.kind)).toContain('nearclip')
    expect(depthResolution(new Vector3(0, 0, -30), camera)).toBeGreaterThan(depthResolution(new Vector3(0, 0, 5), camera))
  })
})
