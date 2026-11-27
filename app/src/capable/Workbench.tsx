import { Component, Fragment, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react'
import { Canvas, createPortal, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import {
  AgXToneMapping, CanvasTexture, CatmullRomCurve3, Color, EquirectangularReflectionMapping, Mesh,
  MeshStandardMaterial, OrthographicCamera, Quaternion, SRGBColorSpace, TextureLoader, Vector3,
  type Camera, type MeshBasicMaterial, type Object3D, type PointLight,
} from 'three'
import { TERMINALS, TEST_POINTS, type ArenaState, type Measurement, type Mode, type Part, type Terminal } from './arena'
import sceneUrl from './assets/practical-arena/practical-arena.glb?url'
import studioUrl from './assets/practical-arena/studio.png?url'
import manifest from './assets/practical-arena/manifest.json'

type View = keyof typeof manifest.cameras
type OrbitController = ComponentRef<typeof OrbitControls>
type Probe = keyof typeof manifest.probes
type Size = [number, number, number]
type Props = { state: ArenaState; watts: number; selected: Terminal | null; tool: 'meter' | 'repair'; mode: Mode;
  reading: Measurement | undefined; probesAttached: boolean; diagnosed: Part | null; locked: boolean;
  onTerminal: (key: Terminal) => void; onCover: () => void; onBreaker: () => void; onSwitch: () => void;
  onRepair: (part: Part) => void; onMode: (mode: Mode) => void }

const directions = { red: new Vector3(-.21, -.28, 1).normalize(), black: new Vector3(.23, -.27, 1).normalize() }
const forward = new Vector3(0, 0, 1)
const SHORT: Record<Terminal, string> = { line: 'L', 'fuse-in': 'F1', 'fuse-out': 'F2', 'switch-out': 'L2', 'lamp-n': 'N2', neutral: 'N', earth: 'PE' }
const vec = (p: number[]) => new Vector3(p[0], p[1], p[2])
const position = (o: Object3D) => o.getWorldPosition(new Vector3())
const warm = new Color('#ffc674')

function rotateToward(node: Object3D, axis: 'x' | 'y' | 'z', angle: number, factor: number) {
  node.rotation[axis] += (angle - node.rotation[axis]) * factor
  return Math.abs(angle - node.rotation[axis])
}

function Hit({ node, size, action }: { node: Object3D; size: Size; action: () => void }) {
  const canvas = useThree((state) => state.gl.domElement)
  const pointer = useRef(false)
  useEffect(() => () => { if (pointer.current) canvas.style.removeProperty('cursor') }, [canvas])
  function click(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.delta < 6) action()
  }
  return createPortal(<mesh onClick={click} onPointerOver={(event) => {
    event.stopPropagation(); pointer.current = true; canvas.style.setProperty('cursor', 'pointer')
  }} onPointerOut={() => { pointer.current = false; canvas.style.removeProperty('cursor') }}>
    <boxGeometry args={size} /><meshBasicMaterial visible={false} />
  </mesh>, node)
}

function CameraRig({ view, preset, controls }: { view: View; preset: { target: Vector3; position: Vector3 }; controls: RefObject<OrbitController | null> }) {
  const { width, height } = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const active = useRef<{ view: View | null; moving: boolean }>({ view: null, moving: false })
  useLayoutEffect(() => { active.current.moving = true; invalidate() }, [view, width, height, invalidate])
  useFrame(({ camera }, delta) => {
    const orbit = controls.current
    if (!orbit || !(camera instanceof OrthographicCamera) || !active.current.moving) return
    const [fitW, fitH] = manifest.cameras[view].fit
    const zoom = Math.min(width / fitW!, height / fitH!)
    const current = active.current
    const first = current.view === null
    current.view = view
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const factor = (first || reduce) ? 1 : 1 - Math.exp(-Math.min(.05, delta) * 11)
    camera.position.lerp(preset.position, factor)
    orbit.target.lerp(preset.target, factor)
    camera.zoom += (zoom - camera.zoom) * factor
    camera.updateProjectionMatrix()
    orbit.update()
    if (camera.position.distanceToSquared(preset.position) + orbit.target.distanceToSquared(preset.target) > .00025 || Math.abs(camera.zoom - zoom) > .12) invalidate()
    else current.moving = false
  }, -0.5)
  return null
}

function Instrument({ position: at, reading, mode }: { position: Vector3; reading: Measurement | undefined; mode: Mode }) {
  const [lcd] = useState(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
    return { canvas, texture, upload: () => { texture.needsUpdate = true } }
  })
  const invalidate = useThree((state) => state.invalidate)
  const display = useRef<MeshBasicMaterial>(null)
  const refresh = useRef(false)
  useEffect(() => () => lcd.texture.dispose(), [lcd])
  useLayoutEffect(() => {
    const context = lcd.canvas.getContext('2d')!
    const suffix = (reading?.mode ?? mode) === 'ac' ? 'V AC' : 'Ω'
    const value = !reading ? '—' : reading.result === 'blocked' ? 'LOCK' : reading.value === null ? 'OL' : reading.value.toFixed(reading.mode === 'ac' ? 1 : 2)
    const gradient = context.createLinearGradient(0, 0, 0, 192)
    gradient.addColorStop(0, '#acb99e'); gradient.addColorStop(1, '#c1caad')
    context.fillStyle = gradient; context.fillRect(0,0,512,192)
    context.fillStyle = '#647258'; context.font = 'bold 23px monospace'
    context.fillText(reading?.result === 'blocked' ? 'INPUT BLOCKED' : 'AUTO RANGE', 28, 39)
    context.textAlign = 'right'; context.font = 'bold 111px monospace'; context.fillStyle = '#233529'
    context.fillText(value, 475, 143)
    context.font = 'bold 27px monospace'; context.fillText(suffix, 475, 176)
    context.textAlign = 'left'
    lcd.upload()
    if (display.current && reading && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      display.current.opacity = .72; refresh.current = true
    }
    invalidate()
  }, [lcd, reading, mode, invalidate])
  useFrame((_, delta) => {
    if (!display.current || !refresh.current) return
    const next = Math.min(1, display.current.opacity + Math.min(.05, delta) * 1.6)
    display.current.opacity = next; refresh.current = next < 1
    if (refresh.current) invalidate()
  })
  return <mesh position={at}><planeGeometry args={[.84, .318]} /><meshBasicMaterial ref={display} map={lcd.texture} transparent toneMapped={false} /></mesh>
}

class BenchLeadCurve extends CatmullRomCurve3 {
  override getPoint(t: number, target?: Vector3) {
    const point = super.getPoint(t, target)
    point.y = Math.max(-1.767, point.y)
    return point
  }
}

function Lead({ start, end, color, resting }: { start: Vector3; end: Vector3; color: string; resting: boolean }) {
  const curve = useMemo(() => {
    const drop = Math.min(start.y, end.y, -1.59)
    return new BenchLeadCurve([
      start, start.clone().add(new Vector3(0, -.13, .15)),
      new Vector3(start.x * .70 + end.x * .30, resting ? -1.755 : drop, 2.68),
      end.clone().add(new Vector3(.045, resting ? 0 : -.18, .17)), end,
    ])
  }, [start, end, resting])
  return <mesh><tubeGeometry args={[curve, 32, .024, 7, false]} /><meshStandardMaterial color={color} roughness={.53} /></mesh>
}

function StatusRing({ at, tone }: { at: Vector3; tone: string }) {
  return <mesh position={[at.x, at.y, at.z + .008]}><ringGeometry args={[.104,.13,24]} />
    <meshBasicMaterial color={tone} depthWrite={false} toneMapped={false} /></mesh>
}

type LabelPositions = Record<string, Vector3>

function BenchScene({ view, placeLabels, ...props }: Props & { view: View; placeLabels: (anchors: LabelPositions, camera: Camera, w: number, h: number) => void }) {
  const { scene: source } = useGLTF(sceneUrl, false, false)
  const studio = useLoader(TextureLoader, studioUrl)
  const assets = useMemo(() => {
    const model = source.clone(true)
    model.updateMatrixWorld(true)
    const node = (name: string) => {
      const value = model.getObjectByName(name)
      if (!value) throw new Error(`Missing workbench node ${name}`)
      return value
    }
    node(manifest.root)
    const parts = Object.fromEntries(Object.entries(manifest.faults).map(([key, name]) => [key, node(name)])) as Record<Part, Object3D>
    const terminals = Object.fromEntries(TERMINALS.map((key) => [key, node(manifest.terminals[key])])) as Record<Terminal, Object3D>
    const geometry = Object.fromEntries(Object.entries(manifest.nodes).map(([key, name]) => [key, node(name)])) as Record<keyof typeof manifest.nodes, Object3D>
    const controls = Object.fromEntries(Object.entries(manifest.controls).map(([key, name]) => [key, node(name)])) as Record<keyof typeof manifest.controls, Object3D>
    const probes = Object.fromEntries((['red', 'black'] as const).map((color) => [color, {
      handle: node(manifest.probes[color].handle), park: position(node(manifest.probes[color].park)),
      socket: position(node(manifest.probes[color].socket)), end: node(manifest.probes[color].end).position.clone(),
      tip: node(manifest.probes[color].tip).position.clone(),
    }])) as Record<Probe, { handle: Object3D; park: Vector3; socket: Vector3; end: Vector3; tip: Vector3 }>
    const lamp = geometry.lamp as Mesh
    if (!(lamp.material instanceof MeshStandardMaterial)) throw new Error('The physical lamp is missing its glass material')
    const bulb = lamp.material = lamp.material.clone()
    bulb.emissive.copy(warm); bulb.emissiveIntensity = 0
    const labels: LabelPositions = { fixture: position(parts.lamp).add(new Vector3(0,-.46,0)) }
    for (const key of TERMINALS) labels[`point-${key}`] = position(terminals[key])
    return { model, node, parts, terminals, geometry, controls, probes, bulb, labels,
      brightness(target: number, factor: number) {
        bulb.emissiveIntensity += (target - bulb.emissiveIntensity) * factor
        return bulb.emissiveIntensity
      },
    }
  }, [source])
  const environment = useMemo(() => {
    const map = studio.clone(); map.colorSpace = SRGBColorSpace; map.mapping = EquirectangularReflectionMapping; map.needsUpdate = true
    return map
  }, [studio])
  useEffect(() => () => { assets.bulb.dispose(); environment.dispose() }, [assets, environment])
  const { state, mode, reading, selected, probesAttached, tool, diagnosed, locked } = props
  const contacts = useMemo(() => {
    const a = state.cover && tool === 'meter' ? selected ?? (probesAttached ? reading?.a : undefined) : undefined
    const b = state.cover && tool === 'meter' && !selected && probesAttached ? reading?.b : undefined
    const data = { red: a, black: b }
    return (['red', 'black'] as const).map((color) => {
      const key = data[color]
      const probe = assets.probes[color]
      const tip = key ? assets.labels[`point-${key}`]! : probe.park
      const rotation = new Quaternion().setFromUnitVectors(forward, key ? directions[color] : forward)
      const origin = tip.clone().sub(probe.tip.clone().applyQuaternion(rotation))
      const end = probe.end.clone().applyQuaternion(rotation).add(origin)
      return { color, key, tip, origin, rotation, end, socket: probe.socket }
    })
  }, [assets, state.cover, tool, selected, probesAttached, reading])
  const preset = useMemo(() => ({ target: vec(manifest.cameras[view].target), position: position(assets.node(manifest.cameras[view].anchor)) }), [assets, view])
  const invalidate = useThree((s) => s.invalidate)
  const orbit = useRef<OrbitController>(null)
  const lampLight = useRef<PointLight>(null)
  const movable = useRef(false)
  useLayoutEffect(() => {
    contacts.forEach(({ color, origin, rotation }) => { assets.probes[color].handle.position.copy(origin); assets.probes[color].handle.quaternion.copy(rotation) })
    movable.current = true
    invalidate()
  }, [contacts, view, state.cover, state.breaker, state.switchOn, mode, props.watts, invalidate, assets])

  useFrame(({ camera, size }, delta) => {
    if (movable.current) {
      const factor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1 - Math.exp(-Math.min(.05, delta) * 15)
      const { door, exteriorLever, interiorLever, wallRocker, selector } = assets.geometry
      const motion = rotateToward(door, 'y', state.cover ? -1.94 : 0, factor)
        + rotateToward(exteriorLever, 'x', state.breaker ? -.31 : .34, factor)
        + rotateToward(interiorLever, 'x', state.breaker ? -.43 : .34, factor)
        + rotateToward(wallRocker, 'x', state.switchOn ? -.22 : .22, factor)
        + rotateToward(selector, 'z', mode === 'ac' ? .60 : -.63, factor)
      const actual = props.watts > 45 ? Math.min(2.8, props.watts / 27) : 0
      const brightness = assets.brightness(actual, factor)
      if (lampLight.current) lampLight.current.intensity = brightness * 9
      if (motion + Math.abs(actual-brightness) > .008) invalidate()
      else movable.current = false
    }
    camera.updateMatrixWorld()
    placeLabels(assets.labels, camera, size.width, size.height)
  })

  const focus = diagnosed && view !== 'multimeter' ? TEST_POINTS[diagnosed].filter(() => state.cover) : []
  return <>
    <color attach="background" args={['#2a2924']} />
    <primitive attach="environment" object={environment} />
    <hemisphereLight args={['#e1e9ec','#736953', 1.06]} />
    <directionalLight position={[-4.1, 7.4, 7.7]} color="#fff0dc" intensity={2.35} />
    <directionalLight position={[5.5,3.6,1.3]} color="#c8e2ed" intensity={.76} />
    <primitive object={assets.model} />
    <Instrument position={position(assets.geometry.display)} reading={reading} mode={mode} />
    <pointLight ref={lampLight} position={[2.37,.72,1.01]} color={warm} distance={3.2} decay={2} intensity={0} />
    {contacts.map(({ color, key, tip, end, socket }) => <Fragment key={color}>
      <Lead start={socket} end={end} color={color === 'red' ? '#ad392f' : '#222831'} resting={!key} />
      {key && <StatusRing at={tip} tone={reading?.result === 'blocked' && !selected ? '#f2ae60' : color === 'red' ? '#ed7669' : '#ced6ce'} />}
    </Fragment>)}
    {focus.map((key) => <StatusRing key={key} at={assets.labels[`point-${key}`]!} tone="#edbd66" />)}
    {diagnosed && (diagnosed === 'switch' || diagnosed === 'lamp' || state.cover) &&
      <StatusRing at={position(assets.parts[diagnosed])} tone="#edbd66" />}
    {!locked && <>
      <Hit node={assets.controls.cover} size={[3.19,2.53,.06]} action={props.onCover} />
      <Hit node={state.cover ? assets.controls.breakerInternal : assets.controls.breakerExternal} size={[.44,.43,.13]} action={props.onBreaker} />
      {tool === 'meter' && <>
        <Hit node={assets.controls.switch} size={[.63,.75,.16]} action={props.onSwitch} />
        <Hit node={assets.controls.mode} size={[.55,.60,.12]} action={() => props.onMode(mode === 'ac' ? 'ohm' : 'ac')} />
        {state.cover && TERMINALS.map((key) => <Hit key={key} node={assets.terminals[key]} size={[.43,.39,.11]} action={() => props.onTerminal(key)} />)}
      </>}
      {tool === 'repair' && (['fuse', 'neutral', 'switch', 'lamp'] as const).filter((key) => state.cover || key === 'switch' || key === 'lamp').map((key) =>
        <Hit key={key} node={assets.parts[key]} size={key === 'neutral' ? [.86,.34,.18] : key === 'lamp' ? [.72,.75,.28] : [.75,.55,.21]} action={() => props.onRepair(key)} />)}
    </>}
    <OrbitControls ref={orbit} enablePan={false} enableZoom={false} minAzimuthAngle={-.46} maxAzimuthAngle={.58}
      minPolarAngle={1.14} maxPolarAngle={1.73} rotateSpeed={.55} onChange={() => invalidate()} />
    <CameraRig view={view} preset={preset} controls={orbit} />
  </>
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export default function Workbench(props: Props) {
  const fallback = <p className="c2-viewport-fallback">3D is unavailable on this device. Use the workbench controls below.</p>
  const [view, setView] = useState<View>('overview')
  const overlay = useRef<HTMLDivElement>(null)
  const projected = useMemo(() => new Vector3(), [])
  function placeLabels(anchors: LabelPositions, camera: Camera, width: number, height: number) {
    for (const label of overlay.current?.children ?? []) {
      const element = label as HTMLElement
      const point = anchors[element.dataset.point ?? '']
      if (!point) continue
      projected.copy(point).project(camera)
      const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
      const shown = Math.abs(projected.x) < .95 && Math.abs(projected.y) < .90
      element.style.visibility = shown ? 'visible' : 'hidden'
      element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%)`
      element.dataset.hitX = x.toFixed(2); element.dataset.hitY = y.toFixed(2)
    }
  }
  return <SceneBoundary fallback={fallback}>
    <div className="c2-canvas-root" data-bench-view={view}>
      <p className="c2-viewport-fallback c21-preparing" aria-hidden="true">Preparing the workbench…</p>
      <Canvas orthographic camera={{ position: [3.6,2.65,12.8], near: .1, far: 80 }} frameloop="demand" dpr={[1, 1.45]}
        gl={{ toneMapping: AgXToneMapping, toneMappingExposure: 1.21, powerPreference: 'low-power' }} fallback={fallback} resize={{ debounce: 0 }}>
        <Suspense><BenchScene {...props} view={view} placeLabels={placeLabels} /></Suspense>
      </Canvas>
      <div ref={overlay} className="c2-bench-labels" aria-hidden="true">
        <span className="c2-scene-label" data-point="fixture">Lamp</span>
        {props.state.cover && TERMINALS.map((key) => <span className="c2-scene-terminal" data-point={`point-${key}`} key={key}>{SHORT[key]}</span>)}
      </div>
      <div className="c21-viewbar" role="group" aria-label="Camera view">
        {(Object.keys(manifest.cameras) as View[]).map((key) => <button type="button" key={key} aria-label={`${manifest.cameras[key].label} view`} aria-pressed={key === view} onClick={() => setView(key)}>{manifest.cameras[key].label}</button>)}
      </div>
    </div>
  </SceneBoundary>
}
