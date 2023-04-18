import { Group, BoxGeometry, Mesh, MeshLambertMaterial } from 'three'
import { randomFromMinMax, CombineWithEdge } from '../animation-utils.js'
import GraphBackground from './GraphBackground.js'

const BG_WIDTH = 28
const BG_HEIGHT = 16

export default class BarGraphs extends Group {
  constructor ({
    pairColors = ['#000000', '#000000'],
    pairCount = 5,
    isDarkTheme = false
  } = {}) {
    const MaterialCommon = MeshLambertMaterial
    const bgThickness = 0.1
    const bgMesh = new GraphBackground({
      lineCount: 6,
      bgColor: isDarkTheme ? '#1c1c1c' : '#f7f9fb',
      edgeColor: isDarkTheme ? '#e3f5ff' : '#414141',
      lineColor: isDarkTheme ? '#e3f5ff' : '#000000',
      bgThickness
    })

    // graph background - width: 28, height: 16
    const unitW = BG_WIDTH / pairCount
    const choppedW = (unitW / 2) / 5
    const barWidth = choppedW * 2
    const barThickness = 1
    const pairs = new Group()

    for (let i = 0; i < pairCount; i++) {
      const pair = new Group()
      const mat1 = new MaterialCommon({ color: pairColors[0] })
      const mat2 = new MaterialCommon({ color: pairColors[1] })
      const [h1, h2] = [
        randomFromMinMax(BG_HEIGHT / 4, BG_HEIGHT / 4 * 3),
        randomFromMinMax(BG_HEIGHT / 4, BG_HEIGHT / 4 * 3)
      ]
      const geo1 = new BoxGeometry(barThickness, h1, barWidth)
      const geo2 = new BoxGeometry(barThickness, h2, barWidth)
      const mesh1 = new CombineWithEdge({ mesh: new Mesh(geo1, mat1), edgeColor: '#414141' })
      const mesh2 = new CombineWithEdge({ mesh: new Mesh(geo2, mat2), edgeColor: '#414141' })

      mesh1.position.set(0, h1 / 2, -1 * choppedW * 2)
      mesh2.position.set(0, h2 / 2, 1 * choppedW * 2)
      pair.add(mesh1, mesh2)
      pair.position.z = unitW * i

      pairs.add(pair)
    }
    pairs.position.z = BG_WIDTH * -0.435

    super()
    this.add(bgMesh, pairs)
  }
}
