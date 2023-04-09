import * as Three from 'three'
import { throttle } from '@common/cdLodash.js'
import {
  resizeRendererToDisplaySize, adjustCameraAspect, degreeToRadian, Edgify
} from '../animation-utils.js'
import CurveGraph from './CurveGraph.js'
import BarGraphs from './BarGraphs.js'

const {
  WebGLRenderer, Scene, Group, PerspectiveCamera,
  BoxGeometry, Vector2, Vector3, AmbientLight
} = Three

// constants & settings
const PLANE_HEIGHT = 0.5
const SCENE_ROTATION_SPEED = degreeToRadian(0.35) * -1 // per frame
const COLORS = {
  bg_0: '#f7f9fb',
  grey_0: '#414141',
  tube: '#95a4fc',
  sphere: '#baedbd',
  bar_1: '#95a4fc',
  bar_2: '#baedbd',
  ambLight: '#f7f9fb'
}
const pointer = new Vector2(0, 0)
const cameraSettings = { pos: { x: 0, y: 15, z: 46 }, lookAt: new Vector3(0, -2.5, 0) }
let animationId

function initAnimation (canvasEl) {
  addPointerMoveListener()

  // create a scene & root
  const scene = new Scene()
  const root = new Group() // root object that contains all meshes
  root.position.y = -10
  scene.add(root)
  scene.root = root

  // create a camera
  const camera = new PerspectiveCamera(75, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 1000)
  camera.position.set(cameraSettings.pos.x, cameraSettings.pos.y, cameraSettings.pos.z)
  camera.lookAt(cameraSettings.lookAt)
  camera.updateProjectionMatrix()

  // create a renderer
  const renderer = new WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true })
  const renderScene = () => renderer.render(scene, camera)
  resizeRendererToDisplaySize(renderer)

  // light
  const ambLight = new AmbientLight(COLORS.ambLight, 1)
  scene.add(ambLight)

  // --- add objects to the scene --- //

  // box
  const boxDepth = 20
  const box = new Edgify({
    geometry: new BoxGeometry(18, boxDepth, 38),
    color: COLORS.grey_0
  })
  box.position.y = boxDepth / 2 + PLANE_HEIGHT + 0.15
  scene.root.add(box)

  // curve-graph
  const curveGraph = new CurveGraph({
    points: [
      new Vector3(0, 12.25, 12.25),
      new Vector3(0, 8.5, 8.25),
      new Vector3(0, 9.75, 4.25),
      new Vector3(0, 7.25, -0.25),
      new Vector3(0, 10.25, -4.25),
      new Vector3(0, 7.75, -8.25),
      new Vector3(0, 3.75, -12.25)
    ],
    tubeRadius: 0.325,
    sphereRadius: 0.85,
    tubeColor: COLORS.tube,
    sphereColor: COLORS.sphere
  })
  curveGraph.position.x = -2.5
  scene.root.add(curveGraph)

  // bar-graphs
  const barGraphs = new BarGraphs({
    pairColors: [COLORS.bar_1, COLORS.bar_2],
    pairCount: 8
  })
  barGraphs.position.set(2.5, PLANE_HEIGHT, 0)
  scene.root.add(barGraphs)

  function animate () {
    if (resizeRendererToDisplaySize(renderer)) {
      adjustCameraAspect(canvasEl, camera)
    }

    root.rotation.y += SCENE_ROTATION_SPEED

    scene.rotation.z = degreeToRadian(8) * pointer.x
    scene.rotation.x = degreeToRadian(8) * pointer.y

    renderScene()
    animationId = requestAnimationFrame(animate)
  }

  animate()
}

const onPointerMove = throttle(e => {
  const { clientX, clientY } = e
  const halfX = innerWidth / 2
  const halfY = innerHeight / 2

  pointer.set(
    (clientX - halfX) / halfX,
    (clientY - halfY) / halfY
  )
}, 10)

function terminateAnimation () {
  cancelAnimationFrame(animationId)
  window.removeEventListener('pointermove', onPointerMove)
}

function addPointerMoveListener () {
  window.addEventListener('pointermove', onPointerMove)
}

export {
  initAnimation,
  terminateAnimation
}
