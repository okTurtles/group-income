import {
  LineBasicMaterial, LineDashedMaterial, BufferGeometry, CircleGeometry, CylinderGeometry,
  Group, Line, Vector3, MeshLambertMaterial, Mesh, EdgesGeometry, LineSegments, DoubleSide
} from 'three'

class LineMesh extends Line {
  constructor ({
    color = '#000',
    dashed = false,
    dashOpts = {},
    points = []
  }) {
    const geometry = new BufferGeometry().setFromPoints(
      points.map(({ x, y, z }) => new Vector3(x, y, z))
    )
    const material = dashed
      ? new LineDashedMaterial({ color, ...Object.assign({ gapSize: 1, dashSize: 1 }, dashOpts) })
      : new LineBasicMaterial({ color })

    super(geometry, material)
    this.data = { geometry, material }
  }
}

class Axes extends Group {
  constructor ({ length = 50, color = '#000000', dashed = false, dashOpts = {} }) {
    const xAxis = new LineMesh({
      color, dashed, dashOpts, points: [{ x: 0, y: 0, z: 0 }, { x: length, y: 0, z: 0 }]
    })
    const yAxis = new LineMesh({
      color, dashed, dashOpts, points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: length, z: 0 }]
    })
    const zAxis = new LineMesh({
      color, dashed, dashOpts, points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: length }]
    })

    super()
    super.add(xAxis, yAxis, zAxis)
  }
}

class CombineWithEdge extends Group {
  constructor ({
    mesh = null, geometry = null, material = null,
    edgeColor = '#000000', shadow = false
  }) {
    const originalMesh = mesh || new Mesh(geometry, material)
    if (mesh) {
      geometry = mesh.geometry
      material = mesh.material
    }
    originalMesh.castShadow = shadow

    // edges
    const edges = new EdgesGeometry(geometry)
    const edgesMesh = new LineSegments(edges, new LineBasicMaterial({ color: edgeColor }))

    super()
    this.add(originalMesh, edgesMesh)
    this.data = { geometry, material }
  }
}

class Edgify extends LineSegments {
  constructor ({
    color = '#000000', geometry = null
  }) {
    const edgeGeometry = new EdgesGeometry(geometry)
    const material = new LineBasicMaterial({ color })

    super(edgeGeometry, material)
    this.data = { geometry, material }
  }
}

class Column extends Group {
  constructor ({
    sideColor = '#000000',
    faceColor = '#000000',
    edgeColor = '#000000',
    radius = 1,
    height = 1
  }) {
    const MaterialCommon = MeshLambertMaterial

    const faceGeometry = new CircleGeometry(radius, 64, 0, 2 * Math.PI)
    const faceMaterial = new MaterialCommon({
      color: faceColor,
      side: DoubleSide,
      transparent: true,
      opacity: 1
    })
    const faceTop = new CombineWithEdge({ geometry: faceGeometry, material: faceMaterial, edgeColor })
    const faceBottom = new CombineWithEdge({ geometry: faceGeometry, material: faceMaterial })

    faceTop.rotation.x = Math.PI / 2 * -1
    faceTop.position.set(0, height, 0)
    faceBottom.rotation.x = Math.PI / 2 * -1

    const cylinder = new Mesh(
      new CylinderGeometry(radius, radius, height, 64, 1, true),
      new MaterialCommon({ color: sideColor, side: DoubleSide, transparent: true, opacity: 1 })
    )
    cylinder.position.y = height / 2

    super()
    super.add(faceTop, faceBottom, cylinder)
  }
}

function resizeRendererToDisplaySize (renderer) {
  const pixelRatio = window.devicePixelRatio || 1
  const canvasEl = renderer.domElement
  const [desiredWidth, desiredHeight] = [canvasEl.clientWidth * pixelRatio, canvasEl.clientHeight * pixelRatio]
  const needResize = canvasEl.width !== desiredWidth || canvasEl.height !== desiredHeight

  if (needResize) {
    renderer.setSize(desiredWidth, desiredHeight, false)
  }

  return needResize
}

function adjustCameraAspect (canvasEl, camera) {
  camera.aspect = canvasEl.clientWidth / canvasEl.clientHeight
  camera.updateProjectionMatrix()
}

function randomFromMinMax (min = 0, max = 0) {
  return min + (max - min) * Math.random()
}

export {
  resizeRendererToDisplaySize,
  adjustCameraAspect,
  randomFromMinMax,
  LineMesh,
  CombineWithEdge,
  Edgify,
  Column,
  Axes
}
