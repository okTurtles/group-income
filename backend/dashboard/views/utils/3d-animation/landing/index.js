import * as Three from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  resizeRendererToDisplaySize, adjustCameraAspect, Axes, Column, Edgify
} from '../animation-utils.js'
import CurveGraph from './CurveGraph.js'
import BarGraphs from './BarGraphs.js'

const {
  WebGLRenderer, Scene, Group, PerspectiveCamera,
  BoxGeometry, Vector3, AmbientLight, DirectionalLight
} = Three

// constants & settings
const PLANE_HEIGHT = 0.5
const COLORS = {
  bg_0: '#f7f9fb',
  black_0: '#1c1c1c',
  black_1: '#2a2a2a',
  grey_0: '#414141',
  grey_1: '#848484',
  grey_2: '#f2f2f2',
  dim_purple: '#e5ecf6',
  tube: '#FFE999',
  sphere: '#ff4747',
  ambLight: '#f7f9fb',
  dirLight: '#f7f9fb'
}
const cameraSettings = { pos: { x: 30, y: 30, z: 30 }, lookAt: [0, 0, 0] }
let animationId

function initAnimation (canvasEl) {
  // create a scene
  const scene = new Scene()
  const root = new Group() // root object that contains all meshes
  scene.add(root)
  scene.root = root

  // create a camera
  const camera = new PerspectiveCamera(75, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 1000)
  camera.position.set(cameraSettings.pos.x, cameraSettings.pos.y, cameraSettings.pos.z)
  camera.lookAt(...cameraSettings.lookAt)

  // create a renderer
  const renderer = new WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true })
  const renderScene = () => renderer.render(scene, camera)
  resizeRendererToDisplaySize(renderer)

  // add objects to the scene
  const axes = new Axes({
    length: 100,
    dashed: true,
    dashOpts: { dashSize: 0.5, gapSize: 0.175 }
  })
  scene.add(axes)

  // lights
  const ambLight = new AmbientLight(COLORS.ambLight, 1)
  const dirLight = new DirectionalLight(COLORS.dirLight, 0.725)
  dirLight.position.set(40, 40, 0)
  dirLight.target.position.set(0, 2, 0)
  scene.add(ambLight, dirLight)

  // --- add objects to the scene --- //

  // a flat cylinder
  const plane = new Column({
    radius: 25,
    faceColor: COLORS.grey_2,
    sideColor: COLORS.grey_0,
    edgeColor: COLORS.grey_0,
    height: PLANE_HEIGHT
  })
  scene.root.add(plane)

  // box
  const boxDepth = 18
  const box = new Edgify({
    geometry: new BoxGeometry(14, boxDepth, 30),
    color: COLORS.grey_0
  })
  box.position.y = boxDepth / 2 + PLANE_HEIGHT + 0.15
  scene.root.add(box)

  // curve-graph
  const curveGraph = new CurveGraph({
    points: [
      new Vector3(0, 5.75, 10.25),
      new Vector3(0, 9.75, 3.25),
      new Vector3(0, 7.75, -4.25),
      new Vector3(0, 12.25, -11)
    ],
    tubeRadius: 0.5,
    sphereRadius: 1.325,
    tubeColor: COLORS.tube,
    sphereColor: COLORS.sphere
  })
  curveGraph.position.x = 4
  scene.root.add(curveGraph)

  // bar-graphs
  const barGraphs = new BarGraphs({
    pairColors: ['#ff0000', '#0000ff'],
    pairCounts: 5
  })
  barGraphs.position.y = PLANE_HEIGHT
  scene.root.add(barGraphs)

  // add orbit-controls
  const orbitControl = new OrbitControls(camera, canvasEl)
  orbitControl.enableDamping = true

  function animate () {
    if (resizeRendererToDisplaySize(renderer)) {
      adjustCameraAspect(canvasEl, camera)
    }

    orbitControl.update()
    renderScene()
    animationId = requestAnimationFrame(animate)
  }

  animate()
}

function terminateAnimation () {
  cancelAnimationFrame(animationId)
}

export {
  initAnimation,
  terminateAnimation
}
