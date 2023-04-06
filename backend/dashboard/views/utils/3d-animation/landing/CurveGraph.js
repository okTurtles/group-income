import {
  MeshLambertMaterial, CatmullRomCurve3, SphereGeometry, TubeGeometry,
  Mesh, Group, DoubleSide
} from 'three'
import GraphBackground from './GraphBackground.js'

export default class CurveGraph extends Group {
  constructor ({
    points = [],
    tubeColor = '#000000',
    sphereColor = '#000000',
    edgeColor = '#000000',
    tubeRadius = 0.5,
    sphereRadius = 1
  }) {
    const bgThickness = 0.1
    const MaterialCommon = MeshLambertMaterial
    const curve = new CatmullRomCurve3(points, false)

    // graph itself
    const tubeGeometry = new TubeGeometry(curve, 120, tubeRadius, 3, false)
    const tubeMaterial = new MaterialCommon({ color: tubeColor, side: DoubleSide })
    const tubeMesh = new Mesh(tubeGeometry, tubeMaterial)
    tubeMesh.position.x = bgThickness * -1

    // points on the graph
    const spheres = new Group()
    const sphereGeometry = new SphereGeometry(sphereRadius, 64, 32)
    const sphereMaterial = new MaterialCommon({ color: sphereColor })

    spheres.add(
      ...points.map(point => {
        const dot = new Mesh(sphereGeometry, sphereMaterial)
        dot.position.copy(point)

        return dot
      })
    )
    spheres.position.x = bgThickness * -1

    // bg
    const bgMesh = new GraphBackground({ lineCount: 6, bgThickness })

    super()
    super.add(tubeMesh, spheres, bgMesh)
  }
}
