import {
  BoxGeometry, Group, MeshLambertMaterial, Mesh, Vector3,
  LineBasicMaterial, BufferGeometry, Line, DoubleSide
} from 'three'

export default class GraphBackground extends Group {
  constructor ({
    width = 28,
    height = 16,
    bgThickness = 0.1,
    bgColor = '#ffffff',
    lineColor = '#000000',
    lineCount = 4
  } = {}) {
    // background plane
    const bgGeometry = new BoxGeometry(bgThickness, height, width)
    const bgMaterial = new MeshLambertMaterial({ color: bgColor, side: DoubleSide, transparent: true, opacity: 0.25 })
    const bgMesh = new Mesh(bgGeometry, bgMaterial)
    bgMesh.position.y = height / 2
    bgMesh.position.x = (bgThickness + 0.05) * -1

    // lines
    const lineMaterial = new LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.1 })
    const lineGap = height / (lineCount + 1)
    const halfW = width / 2
    const lineEnds = []
    const lineMeshes = new Group()

    for (let i = 1; i <= lineCount; i++) {
      lineEnds.push([
        new Vector3(0, lineGap * i, halfW),
        new Vector3(0, lineGap * i, halfW * -1)
      ])
    }
    lineMeshes.add(
      ...lineEnds.map((endPoints) => {
        const lineMesh = new Line(
          new BufferGeometry().setFromPoints(endPoints),
          lineMaterial
        )

        return lineMesh
      })
    )
    const lineMeshesClone = lineMeshes.clone(true)
    lineMeshesClone.position.x = -1 * (bgThickness + 0.2)
    console.log('clone: ', lineMeshesClone)
    super()
    this.add(bgMesh, lineMeshes, lineMeshesClone)
  }
}
