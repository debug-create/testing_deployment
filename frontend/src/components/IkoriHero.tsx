"use client"

import * as React from "react"
import { AmbientSoundscape } from "./audio/AmbientSoundscape"
import { BRAND_CONFIG } from "../config/brandConfig"
import { useTheme } from "../context/ThemeContext"
import { ArrowUpRight, Sparkles, Shield } from "lucide-react"

// ---------------------------------------------------------------------------
// TYPES & MATH UTILITIES
// ---------------------------------------------------------------------------
type V3 = [number, number, number]

type Curve = {
  pts: V3[]
  /** 0 = broad sculpted petal ribbon, 1 = stamen tube / droplet, 2 = stem / scape */
  kind: 0 | 1 | 2
  w: number
  t: number
  lat: V3
  twist: number
  bulb: boolean
  phase: number
  stagger: number
  base: V3
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

const clamp01 = (x: number) => (x <= 0 ? 0 : x > 1 ? 1 : x)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const rng = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Camera focus point: heart of the flower umbel */
const HEART: V3 = [0, 0.26, 0]

/**
 * Procedural Sculptural Lily Geometry
 * Accurately reconstructed as a true three-dimensional botanical sculpture:
 * - Solid calyx & receptacle core eliminating visible gaps or planar flat spots
 * - Non-coplanar tiered whorls:
 *   1. Deep Cascading Lower Petals (7 asymmetrical petals with 3D depth and torsion)
 *   2. Mid-Tier Radiating Cup Petals (8 staggered petals forming expansive volume)
 *   3. Upper Upright Canopy Petals (6 arching petals flaring at apex)
 *   4. Signature Top Ribbon Loop Petal (high-arching open ribbon curl at apex)
 * - Transverse parabolic camber with physical thickness (convex upper face, concave underbelly)
 * - 44 high-fountain stamen filaments with liquid teardrop droplet anthers
 * - 32 erect stamen needles in the center floral receptacle
 * - 28 suspended liquid metal droplet particles in 3D space
 * - Seamless polished vertical stem anatomically emerging from the calyx
 */
const buildSculpturalLily = (seed: number = 42) => {
  const r = rng(seed)
  const curves: Curve[] = []
  const up: V3 = [0, 1, 0]

  // 1. STRAIGHT POLISHED VERTICAL STEM
  const stem: V3[] = []
  const stemSteps = 44
  for (let k = 0; k <= stemSteps; k++) {
    const s = k / stemSteps
    // Perfectly vertical rod from calyx down to -4.6
    const y = 0.08 - s * 4.6
    stem.push([0, y, 0])
  }
  curves.push({
    pts: stem,
    kind: 2,
    w: 0.046,
    t: 0,
    lat: [1, 0, 0],
    twist: 0,
    bulb: false,
    phase: 0,
    stagger: 0,
    base: [0, 0, 0],
  })

  // Calyx Receptacle Collar & Inner Basin (seamlessly joins stem and petal bases)
  const calyx: V3[] = []
  for (let k = 0; k <= 16; k++) {
    const s = k / 16
    const y = -0.08 + s * 0.22
    calyx.push([0, y, 0])
  }
  curves.push({
    pts: calyx,
    kind: 2,
    w: 0.11,
    t: 0,
    lat: [1, 0, 0],
    twist: 0,
    bulb: false,
    phase: 0,
    stagger: 0,
    base: [0, 0, 0],
  })

  // 2. TIER 1: DEEP CASCADING LOWER PETALS (7 Asymmetrical 3D Petals)
  // Deep downward-draping petals forming a volumetric bell canopy around the stem
  const LOWER_COUNT = 7
  for (let i = 0; i < LOWER_COUNT; i++) {
    // Deliberate angular spacing with slight organic offset
    const phi = (i / LOWER_COUNT) * Math.PI * 2 + (r() - 0.5) * 0.08
    const cosP = Math.cos(phi)
    const sinP = Math.sin(phi)
    const radial: V3 = [cosP, 0, sinP]
    const base: V3 = [radial[0] * 0.11, 0.06 + Math.sin(phi * 2) * 0.02, radial[2] * 0.11]
    const lat = norm(cross(radial, up))
    const phase = r() * Math.PI * 2

    // Asymmetric depth: foreground petals reach forward, flank petals twist outward, rear petals arch back
    const isFront = cosP > 0.2
    const isRear = cosP < -0.2
    const reach = 1.75 + (isFront ? 0.15 : isRear ? -0.1 : 0.05) + (r() - 0.5) * 0.1
    const droopDepth = 0.72 + (isFront ? 0.08 : 0.0) + (r() - 0.5) * 0.08

    const pts: V3[] = [base]
    const steps = 52
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      // Arch: rises slightly from calyx, peaks around s=0.30 at y=0.38, cascades down past calyx
      const horiz = Math.pow(s, 0.86) * reach
      const vert = base[1] + Math.sin(s * Math.PI * 0.82) * 0.38 - Math.pow(s, 2.05) * droopDepth
      // Natural recurve hook at the tip
      const tipCurl = Math.pow(Math.max(0, s - 0.82) / 0.18, 2.3) * 0.13

      // Slight lateral curvature
      const sideWave = Math.sin(s * Math.PI * 1.5 + phase) * 0.03 * s
      pts.push([
        radial[0] * horiz + lat[0] * sideWave,
        vert + tipCurl,
        radial[2] * horiz + lat[2] * sideWave,
      ])
    }

    // Natural torsion (twist) gives lateral flank petals full thickness from the side view
    const twistFactor = 0.22 * (Math.abs(sinP) > 0.4 ? (sinP > 0 ? 1 : -1) : 0.5)

    curves.push({
      pts,
      kind: 0,
      w: 0.39 + r() * 0.04, // Broad luscious ribbon petal
      t: 0.026,
      lat,
      twist: twistFactor,
      bulb: false,
      phase,
      stagger: i / LOWER_COUNT,
      base,
    })
  }

  // 3. TIER 2: MID-TIER RADIATING CUP PETALS (8 Staggered Petals)
  // Radiating outwards at a gentle downward angle, filling the volumetric midsection
  const MID_COUNT = 8
  for (let i = 0; i < MID_COUNT; i++) {
    const phi = (i / MID_COUNT) * Math.PI * 2 + Math.PI / MID_COUNT + (r() - 0.5) * 0.07
    const cosP = Math.cos(phi)
    const sinP = Math.sin(phi)
    const radial: V3 = [cosP, 0, sinP]
    const base: V3 = [radial[0] * 0.09, 0.10 + Math.cos(phi * 2) * 0.015, radial[2] * 0.09]
    const lat = norm(cross(radial, up))
    const phase = r() * Math.PI * 2

    const reach = 1.68 + (r() - 0.5) * 0.12
    const pts: V3[] = [base]
    const steps = 50
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      const horiz = Math.pow(s, 1.04) * reach
      const vert = base[1] + Math.sin(s * Math.PI * 0.70) * 0.54 - Math.pow(s, 2.3) * 0.40
      const sideWave = Math.sin(s * Math.PI * 1.8 + phase) * 0.025 * s

      pts.push([
        radial[0] * horiz + lat[0] * sideWave,
        vert,
        radial[2] * horiz + lat[2] * sideWave,
      ])
    }

    curves.push({
      pts,
      kind: 0,
      w: 0.34 + r() * 0.03,
      t: 0.023,
      lat,
      twist: 0.14 * (sinP > 0 ? 1 : -1),
      bulb: false,
      phase,
      stagger: i / MID_COUNT,
      base,
    })
  }

  // 4. TIER 3: UPPER UPRIGHT CANOPY PETALS (6 Petals)
  // Arching upward with high curvature (60°-70° elevation), flaring outward at tips
  const UPPER_COUNT = 6
  for (let i = 0; i < UPPER_COUNT; i++) {
    const phi = (i / UPPER_COUNT) * Math.PI * 2 + Math.PI / 6 + (r() - 0.5) * 0.08
    const cosP = Math.cos(phi)
    const sinP = Math.sin(phi)
    const radial: V3 = [cosP, 0, sinP]
    const base: V3 = [radial[0] * 0.07, 0.13, radial[2] * 0.07]
    const lat = norm(cross(radial, up))

    const pts: V3[] = [base]
    const steps = 48
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      const horiz = Math.pow(s, 1.32) * 1.25
      const vert = base[1] + Math.sin(s * Math.PI * 0.65) * 0.88 - Math.pow(Math.max(0, s - 0.70) / 0.30, 1.8) * 0.22
      pts.push([radial[0] * horiz, vert, radial[2] * horiz])
    }

    curves.push({
      pts,
      kind: 0,
      w: 0.29 + r() * 0.025,
      t: 0.021,
      lat,
      twist: 0.12 * (sinP > 0 ? 1 : -1),
      bulb: false,
      phase: i * 1.2,
      stagger: i / UPPER_COUNT,
      base,
    })
  }

  // 5. TIER 4: SIGNATURE TOP RECURVED RIBBON PETAL (Iconic Apex Loop from Reference)
  // Sweeps high up from the center umbel, arches back and loops into an open ribbon curl
  {
    const ribbonPts: V3[] = []
    const ribbonSteps = 56
    const ribbonBase: V3 = [0.02, 0.13, -0.03]
    for (let k = 0; k <= ribbonSteps; k++) {
      const s = k / ribbonSteps
      const x = 0.02 + Math.sin(s * Math.PI * 0.8) * 0.14
      let y: number
      let z: number
      if (s < 0.54) {
        const u = s / 0.54
        y = 0.13 + Math.sin(u * Math.PI * 0.5) * 1.15
        z = -0.03 - Math.pow(u, 1.3) * 0.38
      } else {
        const u = (s - 0.54) / 0.46
        // Loop back over and curl downwards
        y = 1.28 - Math.sin(u * Math.PI * 0.68) * 0.48
        z = -0.41 + Math.sin(u * Math.PI * 0.95) * 0.40
      }
      ribbonPts.push([x, y, z])
    }

    curves.push({
      pts: ribbonPts,
      kind: 0,
      w: 0.25,
      t: 0.020,
      lat: [1, 0, 0],
      twist: 0.24,
      bulb: false,
      phase: 0.5,
      stagger: 0.1,
      base: ribbonBase,
    })
  }

  // 6. EXPANSIVE RADIAL FOUNTAIN STAMEN SPRAY (44 Filaments with Droplet Anthers)
  // Splaying outward and upward into glistening teardrop beads
  const FILAMENT_COUNT = 44
  for (let i = 0; i < FILAMENT_COUNT; i++) {
    const phi = (i / FILAMENT_COUNT) * Math.PI * 2 + (r() - 0.5) * 0.24
    const radial: V3 = [Math.cos(phi), 0, Math.sin(phi)]
    const base: V3 = [radial[0] * 0.05, 0.12, radial[2] * 0.05]
    const lat = norm(cross(radial, up))
    const phase = r() * Math.PI * 2

    const reach = 2.05 + r() * 0.65
    const maxHeight = 0.70 + r() * 0.48
    const droop = 0.38 + r() * 0.42

    const pts: V3[] = [base]
    const steps = 46
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      const horiz = Math.pow(s, 1.08) * reach
      const vert = 0.12 + Math.sin(s * Math.PI * 0.74) * maxHeight - Math.pow(s, 2.2) * droop
      const wave = Math.sin(s * Math.PI * 1.7 + phase) * 0.04 * s
      pts.push([
        radial[0] * horiz + lat[0] * wave,
        vert,
        radial[2] * horiz + lat[2] * wave,
      ])
    }

    curves.push({
      pts,
      kind: 1,
      w: 0.009, // Fine wire filament
      t: 0,
      lat,
      twist: 0,
      bulb: true, // Teardrop liquid bead at tip
      phase,
      stagger: i / FILAMENT_COUNT,
      base,
    })
  }

  // 7. CENTRAL BLOOM CORE ERECT STAMENS (32 Dense Stamens in Floral Core)
  const CORE_STAMENS = 32
  for (let i = 0; i < CORE_STAMENS; i++) {
    const phi = (i / CORE_STAMENS) * Math.PI * 2 + (r() - 0.5) * 0.35
    const radDist = 0.03 + r() * 0.12
    const radial: V3 = [Math.cos(phi), 0, Math.sin(phi)]
    const base: V3 = [radial[0] * radDist, 0.13, radial[2] * radDist]
    const lat = norm(cross(radial, up))
    const h = 0.30 + r() * 0.38

    const pts: V3[] = [base]
    const steps = 26
    for (let k = 1; k <= steps; k++) {
      const s = k / steps
      const horiz = radDist + s * 0.12 * (0.8 + r() * 0.4)
      const vert = 0.13 + s * h
      pts.push([radial[0] * horiz, vert, radial[2] * horiz])
    }

    curves.push({
      pts,
      kind: 1,
      w: 0.0085,
      t: 0,
      lat,
      twist: 0,
      bulb: true,
      phase: i * 0.75,
      stagger: i / CORE_STAMENS,
      base,
    })
  }

  // 8. FLOATING SUSPENDED LIQUID METAL DROPLET PARTICLES (28 Droplets)
  const DROPLET_COUNT = 28
  for (let i = 0; i < DROPLET_COUNT; i++) {
    const phi = (i / DROPLET_COUNT) * Math.PI * 2 + (r() - 0.5) * 0.45
    const dist = 1.15 + r() * 1.45
    const height = -0.22 + r() * 1.25
    const center: V3 = [Math.cos(phi) * dist, height, Math.sin(phi) * dist]
    const lat = norm(cross(center, up))

    const dPts: V3[] = []
    const dSteps = 10
    const dropLen = 0.06 + r() * 0.05
    for (let k = 0; k <= dSteps; k++) {
      const s = k / dSteps
      dPts.push([
        center[0],
        center[1] + (s - 0.5) * dropLen,
        center[2],
      ])
    }

    curves.push({
      pts: dPts,
      kind: 1,
      w: 0.026 + r() * 0.020,
      t: 0,
      lat,
      twist: 0,
      bulb: true,
      phase: r() * Math.PI * 2,
      stagger: i / DROPLET_COUNT,
      base: center,
    })
  }

  // Calculate bounding radius around HEART
  let radius = 0
  for (const c of curves) {
    if (c.kind === 2) continue
    for (const q of c.pts) {
      radius = Math.max(radius, Math.hypot(q[0] - HEART[0], q[1] - HEART[1], q[2] - HEART[2]))
    }
  }

  return { curves, radius }
}

const STRIDE = 13

/**
 * Builds WebGL mesh buffers with parabolic cambered cross-sections
 * and smooth teardrop droplet bulbs for filaments and particles.
 */
const buildMesh = (curves: Curve[]) => {
  const v: number[] = []
  const idx: number[] = []
  let count = 0

  const push = (p: V3, n: V3, s: number, c: Curve) => {
    v.push(p[0], p[1], p[2], n[0], n[1], n[2], s, c.phase, c.kind, c.stagger, c.base[0], c.base[1], c.base[2])
    return count++
  }
  const tangent = (pts: V3[], i: number) =>
    norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]))

  for (const c of curves) {
    const n = c.pts.length

    if (c.kind === 0) {
      // -----------------------------------------------------------------------
      // PARABOLIC CAMBERED SCULPTURAL PETAL: Genuine 3D volume & curvature
      // -----------------------------------------------------------------------
      const rings: number[][] = []
      let first: V3[] = []
      let last: V3[] = []
      let T0: V3 = [0, 1, 0]
      let T1: V3 = [0, 1, 0]

      for (let i = 0; i < n; i++) {
        const s = i / (n - 1)
        const T = tangent(c.pts, i)
        let N = norm(cross(T, c.lat))
        let W = cross(N, T)

        const a = c.twist * Math.sin(Math.PI * s)
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const W2 = add(mul(W, ca), mul(N, sa))
        N = sub(mul(N, ca), mul(W, sa))
        W = W2

        // Broad petal width profile: swells to full width in midsection, tapers to needle-sharp tip
        const profile = Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.65) * (1.0 - 0.16 * s)
        const hw = Math.max(0.008, c.w * profile * (1 + 0.04 * Math.sin(s * 28 + c.phase)))

        // Parabolic camber: convex upper face, concave underbelly
        const camberLift = 0.028 * (1.0 - s * 0.75)
        const midCamber = 0.018 * (1.0 - s * 0.75)
        const p = c.pts[i]

        const kSpineTop = add(p, mul(N, c.t + camberLift))
        const kSpineBottom = sub(p, mul(N, c.t * 0.55))

        const kLeftMid = add(add(p, mul(W, -hw * 0.5)), mul(N, c.t * 0.55 + midCamber))
        const kRightMid = add(add(p, mul(W, hw * 0.5)), mul(N, c.t * 0.55 + midCamber))

        const kLeftEdge = sub(add(p, mul(W, -hw)), mul(N, camberLift * 0.32))
        const kRightEdge = add(add(p, mul(W, hw)), mul(N, -camberLift * 0.32))

        // Surface normals tilted across the camber to produce wide, glistening metallic highlights
        const nSpineLeft = norm(add(N, mul(W, -0.32)))
        const nSpineRight = norm(add(N, mul(W, 0.32)))
        const nLeft = norm(add(N, mul(W, -0.65)))
        const nRight = norm(add(N, mul(W, 0.65)))
        const mW = mul(W, -1)
        const mN = mul(N, -1)

        rings.push([
          push(kSpineTop, nSpineLeft, s, c),
          push(kLeftMid, nLeft, s, c),
          push(kLeftEdge, nLeft, s, c),
          push(kLeftEdge, mW, s, c),
          push(kSpineBottom, mN, s, c),
          push(kRightEdge, W, s, c),
          push(kRightEdge, nRight, s, c),
          push(kRightMid, nRight, s, c),
          push(kSpineTop, nSpineRight, s, c),
        ])

        if (i === 0) {
          first = [kSpineTop, kLeftEdge, kSpineBottom, kRightEdge]
          T0 = T
        }
        if (i === n - 1) {
          last = [kSpineTop, kLeftEdge, kSpineBottom, kRightEdge]
          T1 = T
        }
      }

      for (let i = 0; i < n - 1; i++) {
        const a = rings[i]
        const b = rings[i + 1]
        for (let f = 0; f < 8; f++) {
          idx.push(a[f], a[f + 1], b[f], a[f + 1], b[f + 1], b[f])
        }
        idx.push(a[8], a[0], b[8], a[0], b[0], b[8])
      }

      const cap = (q: V3[], nrm: V3, s: number) => {
        const o = q.map((p) => push(p, nrm, s, c))
        idx.push(o[0], o[1], o[2], o[0], o[2], o[3])
      }
      cap(first, mul(T0, -1), 0)
      cap(last, T1, 1)
    } else {
      // -----------------------------------------------------------------------
      // STAMEN WIRE / DROPLETS / STEM
      // -----------------------------------------------------------------------
      const seg = c.kind === 2 ? 10 : 6
      let N = norm(cross(tangent(c.pts, 0), c.kind === 2 ? [0, 0, 1] : c.lat))
      const rings: number[] = []

      for (let i = 0; i < n; i++) {
        const s = i / (n - 1)
        const T = tangent(c.pts, i)
        N = norm(sub(N, mul(T, dot(N, T))))
        const B = cross(T, N)

        let rad = c.w * (c.kind === 1 ? 1 - 0.25 * s : 1)

        // Liquid teardrop droplet bulb at the tip of stamens
        if (c.bulb && s > 0.84) {
          const u = (s - 0.84) / 0.16
          rad = c.w * (1.0 + 4.8 * Math.sin(u * Math.PI * 0.88) * (1.0 - 0.18 * u))
        }

        rings.push(count)
        for (let k = 0; k <= seg; k++) {
          const a = (k / seg) * Math.PI * 2
          const nr = add(mul(N, Math.cos(a)), mul(B, Math.sin(a)))
          push(add(c.pts[i], mul(nr, rad)), nr, s, c)
        }
      }

      for (let i = 0; i < n - 1; i++) {
        for (let k = 0; k < seg; k++) {
          const a = rings[i] + k
          const b = rings[i + 1] + k
          idx.push(a, a + 1, b, a + 1, b + 1, b)
        }
      }
    }
  }

  return { data: new Float32Array(v), index: new Uint16Array(idx), vertices: count }
}

// ---------------------------------------------------------------------------
// 5 CONTINUOUS STORYTELLING COMPOSITIONS (STRICTLY PRESERVED)
// ---------------------------------------------------------------------------
export type Key = {
  spin: number // turn of the flower about its stem, radians
  el: number // camera elevation, degrees
  size: number // flower radius as fraction of viewport short side
  ox: number // clip space X (-1 to 1)
  oy: number // clip space Y (-1 to 1)
  stem: number // scape stem drawn factor
}

// Desktop Compositions
const KEYS: Key[] = [
  // 01 — Monumental Hero: Central focus, stem drops straight down
  { spin: 0.20, el: 9, size: 0.86, ox: 0.04, oy: 0.18, stem: 1.0 },
  // 02 — Signal Ingestion: Overhead crown view with filament signal markers
  { spin: 1.40, el: 88, size: 0.58, ox: 0.04, oy: 0.02, stem: 0.0 },
  // 03 — Correlation: Low-angle perspective with correlation vectors
  { spin: 2.95, el: -22, size: 0.80, ox: 0.02, oy: -0.22, stem: 0.15 },
  // 04 — Attack Path Compilation: Showcase lateral attack vector
  { spin: 4.15, el: 18, size: 0.92, ox: 0.24, oy: 0.10, stem: 0.70 },
  // 05 — Product Reveal: Prepares viewer for the Operations Console
  { spin: 5.05, el: -65, size: 0.72, ox: 0.02, oy: 0.24, stem: 0.88 },
]

// Portrait / Mobile Compositions
const KEYS_TALL: Partial<Key>[] = [
  { size: 0.84, ox: 0, oy: 0.28 },
  { size: 0.54, ox: 0, oy: 0.04 },
  { size: 0.80, ox: 0, oy: -0.16 },
  { size: 0.76, ox: 0.08, oy: 0.16 },
  { size: 0.74, ox: 0, oy: 0.26 },
]

const SCENES = KEYS.length
const HOLD = 0.22

const keyAt = (coord: number, tall: boolean): Key => {
  const i = Math.max(0, Math.min(SCENES - 1, Math.floor(coord)))
  const j = Math.min(SCENES - 1, i + 1)
  const f = coord - i
  const a = { ...KEYS[i], ...(tall ? KEYS_TALL[i] : {}) }
  const b = { ...KEYS[j], ...(tall ? KEYS_TALL[j] : {}) }
  const l = (x: number, y: number) => x + (y - x) * f
  return {
    spin: l(a.spin, b.spin),
    el: l(a.el, b.el),
    size: l(a.size, b.size),
    ox: l(a.ox, b.ox),
    oy: l(a.oy, b.oy),
    stem: l(a.stem, b.stem),
  }
}

const progressFrom = (top: number, height: number, viewport: number) => {
  const travel = height - viewport
  if (travel <= 0) return 0
  return clamp01(-top / travel)
}

const sceneCoord = (p: number, n: number, hold: number) => {
  if (n <= 1) return 0
  const t = clamp01(p) * (n - 1)
  const i = Math.min(Math.floor(t), n - 2)
  const h = hold / 2
  return i + easeInOut(clamp01((t - i - h) / (1 - 2 * h)))
}

// ---------------------------------------------------------------------------
// MATRIX MATH
// ---------------------------------------------------------------------------
type M4 = Float32Array

const perspective = (fovy: number, aspect: number, near: number, far: number): M4 => {
  const f = 1 / Math.tan(fovy / 2)
  const m = new Float32Array(16)
  m[0] = f / aspect
  m[5] = f
  m[10] = (far + near) / (near - far)
  m[11] = -1
  m[14] = (2 * far * near) / (near - far)
  return m
}

const lookAt = (eye: V3, at: V3): M4 => {
  const z = norm(sub(eye, at))
  const x = norm(cross([0, 1, 0], z))
  const y = cross(z, x)
  const m = new Float32Array(16)
  m[0] = x[0]
  m[4] = x[1]
  m[8] = x[2]
  m[1] = y[0]
  m[5] = y[1]
  m[9] = y[2]
  m[2] = z[0]
  m[6] = z[1]
  m[10] = z[2]
  m[12] = -dot(x, eye)
  m[13] = -dot(y, eye)
  m[14] = -dot(z, eye)
  m[15] = 1
  return m
}

const multiply = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    }
  }
  return o
}

const hexToLinear = (hex: string): V3 => {
  let h = hex.replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0.89, 0.07, 0.17]
  const ch = (v: number) => Math.pow(v / 255, 2.2)
  return [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)]
}

// ---------------------------------------------------------------------------
// SHADERS: Studio-grade Multi-Lobe Chrome Shading (Theme-Adaptive)
// ---------------------------------------------------------------------------
const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec4 a_aux;
attribute vec3 a_base;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_offset;
uniform float u_time;
uniform float u_bloom;
uniform float u_sway;
uniform float u_stem;
varying vec3 v_n;
varying vec3 v_w;
varying float v_s;
varying float v_kind;

void main() {
  vec3 p = a_pos;
  float k = a_aux.z;
  v_kind = k;
  
  if (k < 1.5) {
    float g = clamp(u_bloom * 1.6 - a_aux.w * 0.6, 0.0, 1.0);
    g = 1.0 - pow(1.0 - g, 3.0);
    p = a_base + (p - a_base) * g;
    float amp = (k < 0.5 ? 0.024 : 0.048) * u_sway * a_aux.x * a_aux.x;
    p += amp * vec3(
      sin(u_time * 0.85 + a_aux.y),
      0.45 * sin(u_time * 1.2 + a_aux.y * 1.6),
      cos(u_time * 0.65 + a_aux.y * 1.2)
    );
  } else if (p.y < 0.0) {
    p.y *= u_stem;
  }
  
  vec4 w = u_model * vec4(p, 1.0);
  v_w = w.xyz;
  v_n = (u_model * vec4(a_nrm, 0.0)).xyz;
  v_s = a_aux.x;
  gl_Position = u_vp * w;
  gl_Position.xy += u_offset * gl_Position.w;
}
`

const FRAG = `
precision highp float;
uniform vec3 u_eye;
uniform vec3 u_red;
uniform vec3 u_hot;
uniform vec3 u_shadow;
uniform float u_alpha;
varying vec3 v_n;
varying vec3 v_w;
varying float v_s;
varying float v_kind;

float studio(vec3 r) {
  // Key softbox from top-left
  float key = pow(max(dot(r, normalize(vec3(-0.45, 0.85, 0.35))), 0.0), 20.0) * 3.4;
  // Secondary rim kicker from top-right
  float kicker = pow(max(dot(r, normalize(vec3(0.65, 0.60, 0.40))), 0.0), 34.0) * 2.8;
  // Side strip
  float strip = smoothstep(0.55, 0.82, r.x) * smoothstep(-0.6, 0.35, r.y) * 1.65;
  // Grazing back rim
  float rim = smoothstep(0.50, 0.96, -r.z) * smoothstep(-0.25, 0.55, r.y) * 1.35;
  // Subtle horizontal studio horizon
  float hz = exp(-abs(r.y - 0.05) * 8.0) * 0.5;
  return key + kicker + strip + rim + hz;
}

void main() {
  vec3 n = normalize(v_n);
  vec3 v = normalize(u_eye - v_w);
  if (dot(n, v) < 0.0) n = -n;
  vec3 r = reflect(-v, n);
  
  // Longitudinal micro-grooved sheen
  float micro = 1.0 + 0.06 * sin(v_s * 140.0);
  float e = studio(r) * micro;
  float fr = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  float dif = max(dot(n, normalize(vec3(-0.35, 0.85, 0.55))), 0.0);
  
  // Velvet shadow base in crevices and shadow hollows
  vec3 col = mix(u_shadow, u_red, 0.20 + 0.80 * dif);
  
  // Lustrous metallic studio reflections
  col += u_red * e * 1.38;
  
  // Razor-sharp hot specular peaks
  float hotPeak = pow(e, 3.5) * 0.45;
  if (v_kind > 0.5) {
    // Liquid droplet anthers catch an extra glistening specular glint
    hotPeak += pow(max(dot(r, normalize(vec3(-0.45, 0.85, 0.35))), 0.0), 64.0) * 0.7;
  }
  col += u_hot * hotPeak;
  
  // Radiant Fresnel rim glow
  col += mix(u_red, u_hot, 0.48) * fr * 1.30;
  
  col *= 0.82 + 0.18 * smoothstep(0.0, 0.25, v_s);
  col = col / (1.0 + col);
  col = pow(col, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(col * u_alpha, u_alpha);
}
`

// ---------------------------------------------------------------------------
// 4 ORBITAL TECHNICAL CALLOUTS (CLOCKWISE MOTION SYSTEM)
// ---------------------------------------------------------------------------
interface CalloutItem {
  id: string
  line1: string
  line2: string
  baseAngle: number // Starting angle in radians
}

const CALLOUT_ITEMS: CalloutItem[] = [
  // Box 0: Upper-Left (angle = -135°)
  {
    id: "signals",
    line1: "SIGNALS",
    line2: "INGESTED",
    baseAngle: (-3 * Math.PI) / 4,
  },
  // Box 1: Upper-Right (angle = -45°)
  {
    id: "compiling",
    line1: "ATTACK PATH",
    line2: "COMPILING",
    baseAngle: -Math.PI / 4,
  },
  // Box 2: Lower-Right (angle = +45°)
  {
    id: "insights",
    line1: "ACTIONABLE",
    line2: "INSIGHTS",
    baseAngle: Math.PI / 4,
  },
  // Box 3: Lower-Left (angle = +135°)
  {
    id: "correlation",
    line1: "CORRELATION",
    line2: "IN PROGRESS",
    baseAngle: (3 * Math.PI) / 4,
  },
]

export interface IkoriHeroProps {
  onLaunchCompiler?: () => void
}

export default function IkoriHero({ onLaunchCompiler }: IkoriHeroProps = {}) {
  const { theme, setTheme } = useTheme()
  const themeRef = React.useRef(theme)
  themeRef.current = theme

  const rootRef = React.useRef<HTMLElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const glowRef = React.useRef<HTMLDivElement | null>(null)
  const reticleRef = React.useRef<HTMLDivElement | null>(null)

  // DOM refs for the 4 orbital callouts (updated in RAF loop without React re-renders)
  const calloutRefs = React.useRef<(HTMLDivElement | null)[]>([])

  // Audio system
  const soundscapeRef = React.useRef<AmbientSoundscape | null>(null)
  const [soundActive, setSoundActive] = React.useState(false)
  const soundActiveRef = React.useRef(soundActive)
  soundActiveRef.current = soundActive

  // Current active stage (0 to 4)
  const [activeStage, setActiveStage] = React.useState(0)

  // Entrance animation completion
  const [entered, setEntered] = React.useState(false)

  // Interactive user touch state (for tactile feedback & indicator)
  const [isInteracting, setIsInteracting] = React.useState(false)

  // Reduced motion
  const [reduced, setReduced] = React.useState(false)

  // Scroll progress ref
  const progressRef = React.useRef(0)

  // Soundscape lifecycle
  React.useEffect(() => {
    const sound = new AmbientSoundscape()
    soundscapeRef.current = sound
    return () => {
      sound.destroy()
    }
  }, [])

  const toggleSound = async () => {
    const sound = soundscapeRef.current
    if (!sound) return
    if (soundActive) {
      sound.stop()
      setSoundActive(false)
    } else {
      const ok = await sound.start()
      if (ok) {
        setSoundActive(true)
        sound.triggerFeedback(640)
      }
    }
  }

  // Detect reduced motion
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Trigger entrance sequence
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setEntered(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // ---------------------------------------------------------------------------
  // MAIN SCROLL & WEBGL RENDERING ENGINE
  // ---------------------------------------------------------------------------
  React.useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const glow = glowRef.current
    const reticle = reticleRef.current
    if (!root || !stage || !canvas || !glow) return

    // Build the sculpted botanical lily
    const { curves, radius } = buildSculpturalLily(42)
    const mesh = buildMesh(curves)

    let gl: WebGLRenderingContext | null = null
    let ctx2d: CanvasRenderingContext2D | null = null
    let prog: WebGLProgram | null = null
    let vbo: WebGLBuffer | null = null
    let ibo: WebGLBuffer | null = null
    const loc: Record<string, WebGLUniformLocation | null> = {}

    const initGL = () => {
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
      }) as WebGLRenderingContext | null
      if (!gl) return false

      const compile = (type: number, src: string) => {
        const sh = gl!.createShader(type)!
        gl!.shaderSource(sh, src)
        gl!.compileShader(sh)
        return gl!.getShaderParameter(sh, gl!.COMPILE_STATUS) ? sh : null
      }

      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) return false

      prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false

      gl.useProgram(prog)
      vbo = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW)

      ibo = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW)

      const attr = (n: string, size: number, off: number) => {
        const a = gl!.getAttribLocation(prog!, n)
        if (a < 0) return
        gl!.enableVertexAttribArray(a)
        gl!.vertexAttribPointer(a, size, gl!.FLOAT, false, STRIDE * 4, off * 4)
      }

      attr("a_pos", 3, 0)
      attr("a_nrm", 3, 3)
      attr("a_aux", 4, 6)
      attr("a_base", 3, 10)

      for (const n of [
        "u_vp",
        "u_model",
        "u_offset",
        "u_time",
        "u_bloom",
        "u_sway",
        "u_stem",
        "u_eye",
        "u_red",
        "u_hot",
        "u_shadow",
        "u_alpha",
      ]) {
        loc[n] = gl.getUniformLocation(prog, n)
      }

      gl.enable(gl.DEPTH_TEST)
      gl.clearColor(0, 0, 0, 0)
      return true
    }

    if (!initGL()) {
      gl = null
      ctx2d = canvas.getContext("2d")
    }

    const onLost = (e: Event) => {
      e.preventDefault()
      gl = null
    }
    const onRestored = () => {
      if (!initGL()) gl = null
    }

    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    // Sizing
    let W = 1
    let H = 1
    let DPR = 1
    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = stage.clientWidth
      H = stage.clientHeight
      canvas.width = Math.round(W * DPR)
      canvas.height = Math.round(H * DPR)
    }
    resize()
    window.addEventListener("resize", resize)

    // Interaction pointer state & rotational physics
    let targetPx = 0
    let targetPy = 0
    let px = 0
    let py = 0

    // Autonomous continuous rotation (runs smoothly on its own at ~22s per full 360° turn)
    let autoSpin = 0
    const autoSpeed = 0.28 // rad/s steady, majestic rotation speed

    // Interactive user touch/drag rotation with momentum & flick inertia
    let userYaw = 0
    let userPitch = 0
    let yawVel = 0
    let pitchVel = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let lastFrameTime = performance.now()
    let touchPulse = 0

    const onMove = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      targetPx = Math.max(-1, Math.min(1, nx))
      targetPy = Math.max(-1, Math.min(1, ny))

      if (dragging) {
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY

        // Immediate 1:1 tactile drag response
        const sensitivity = 0.0068
        userYaw += dx * sensitivity
        userPitch -= dy * sensitivity
        // Clamp elevation so the sculpture stays framed cleanly
        userPitch = Math.max(-0.75, Math.min(0.75, userPitch))

        // Track velocity for flick/momentum
        yawVel = dx * sensitivity * 48
        pitchVel = -dy * sensitivity * 48
      }
    }

    const onDown = (e: PointerEvent) => {
      dragging = true
      setIsInteracting(true)
      lastX = e.clientX
      lastY = e.clientY
      yawVel = 0
      pitchVel = 0
      touchPulse = 1.0
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (soundscapeRef.current && soundActiveRef.current) {
        soundscapeRef.current.triggerFeedback(760)
      }
    }

    const onUp = (e: PointerEvent) => {
      if (dragging) {
        dragging = false
        setIsInteracting(false)
        // Cap release velocity to prevent uncontrolled spin
        yawVel = Math.max(-5.5, Math.min(5.5, yawVel))
        pitchVel = Math.max(-2.5, Math.min(2.5, pitchVel))
        try {
          canvas.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
    }

    // Direct touch event handling for mobile devices to prevent scroll conflicts
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        dragging = true
        setIsInteracting(true)
        lastX = t.clientX
        lastY = t.clientY
        yawVel = 0
        pitchVel = 0
        touchPulse = 1.0
        if (soundscapeRef.current && soundActiveRef.current) {
          soundscapeRef.current.triggerFeedback(760)
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (dragging && e.touches.length === 1) {
        e.preventDefault() // Prevent browser scroll while rotating 3D flower
        const t = e.touches[0]
        const dx = t.clientX - lastX
        const dy = t.clientY - lastY
        lastX = t.clientX
        lastY = t.clientY

        const sensitivity = 0.0075
        userYaw += dx * sensitivity
        userPitch -= dy * sensitivity
        userPitch = Math.max(-0.75, Math.min(0.75, userPitch))

        yawVel = dx * sensitivity * 48
        pitchVel = -dy * sensitivity * 48
      }
    }

    const onTouchEnd = () => {
      if (dragging) {
        dragging = false
        setIsInteracting(false)
        yawVel = Math.max(-5.5, Math.min(5.5, yawVel))
        pitchVel = Math.max(-2.5, Math.min(2.5, pitchVel))
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    canvas.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)

    canvas.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)

    // Continuous scroll progress
    let smoothProgress = 0
    let lastStageIdx = -1

    // Animation frame loop
    let raf = 0
    const startT = performance.now()

    const render = (now: number) => {
      raf = requestAnimationFrame(render)

      const nowT = performance.now()
      const dt = Math.min((nowT - lastFrameTime) * 0.001, 0.08)
      lastFrameTime = nowT

      const t = (now - startT) * 0.001
      const bloom = Math.min(1, t / 1.8)

      // Dynamic theme colors evaluated per frame without rebuilding WebGL context
      const isMono = themeRef.current === "professional"
      const colRed = isMono ? hexToLinear("#A4ADB8") : hexToLinear("#D40C26")
      const baseHot = isMono ? hexToLinear("#FFFFFF") : hexToLinear("#FFD2DC")
      const colHot = touchPulse > 0.02
        ? new Float32Array([
            Math.min(1.0, baseHot[0] + touchPulse * 0.25),
            Math.min(1.0, baseHot[1] + touchPulse * 0.20),
            Math.min(1.0, baseHot[2] + touchPulse * 0.20),
          ])
        : baseHot
      const colShadow = isMono
        ? new Float32Array([0.08, 0.09, 0.11])
        : new Float32Array([0.065, 0.003, 0.009])

      // Spring pointer interpolation for subtle camera parallax
      const spring = reduced ? 1 : 0.06
      px += (targetPx - px) * spring
      py += (targetPy - py) * spring

      // Autonomous rotation + Inertia physics
      if (dragging) {
        // Direct tracking while dragging
      } else {
        // Inertia damping
        userYaw += yawVel * dt
        userPitch += pitchVel * dt
        yawVel *= 0.925
        pitchVel *= 0.925

        // Continuous autonomous rotation runs perpetually
        if (!reduced) {
          const autoFactor = Math.max(0.2, 1.0 - Math.min(1.0, Math.abs(yawVel) * 0.7))
          autoSpin += autoSpeed * dt * autoFactor
        }

        // Return userPitch smoothly toward neutral elevation
        userPitch *= 0.985
      }

      touchPulse *= 0.90

      // Evaluate scroll progress relative to runway container
      const rect = root.getBoundingClientRect()
      const rawProgress = progressFrom(rect.top, rect.height, window.innerHeight)
      smoothProgress += (rawProgress - smoothProgress) * 0.12
      progressRef.current = smoothProgress

      // Derive scene coordinate smoothly (0.0 to 4.0)
      const coord = sceneCoord(smoothProgress, SCENES, HOLD)
      const currentStageIdx = Math.min(SCENES - 1, Math.floor(coord + 0.4))
      if (currentStageIdx !== lastStageIdx) {
        lastStageIdx = currentStageIdx
        setActiveStage(currentStageIdx)
      }

      // Camera keyframe interpolation
      const isTall = H > W
      const key = keyAt(coord, isTall)

      // Model orientation:
      // 1. key.spin (scroll-driven 5-stage progression)
      // 2. autoSpin (autonomous continuous rotation on its own)
      // 3. userYaw (touch / drag rotation with momentum)
      // 4. organicFloat (subtle natural floating breathing)
      const organicFloat = reduced ? 0 : Math.sin(t * 0.5) * 0.02
      const spinAngle = key.spin + autoSpin + userYaw + organicFloat
      const elAngle = (key.el * Math.PI) / 180 + userPitch

      // Perspective projection
      const fov = 0.52
      const aspect = (W * DPR) / (H * DPR || 1)
      const matProj = perspective(fov, aspect, 0.1, 40)

      // Camera position
      const camDist = radius / Math.sin(fov / 2) / (key.size || 0.8)
      const eyeY = HEART[1] + camDist * Math.sin(elAngle)
      const eyeDistH = camDist * Math.cos(elAngle)
      const eyeX = HEART[0] + eyeDistH * Math.sin(spinAngle)
      const eyeZ = HEART[2] + eyeDistH * Math.cos(spinAngle)
      const eye: V3 = [eyeX, eyeY, eyeZ]

      const matView = lookAt(eye, HEART)
      const matVP = multiply(matProj, matView)

      // Subtle parallax translation
      const ox = key.ox + px * 0.035
      const oy = key.oy - py * 0.035

      // -----------------------------------------------------------------------
      // CLOCKWISE ORBITAL CALLOUTS & RETICLE POSITIONING
      // -----------------------------------------------------------------------
      const isDesktop = W >= 1024
      const cx = isDesktop ? W * 0.54 : W * 0.50
      const cy = isDesktop ? H * 0.48 : H * 0.46

      // Reticle center
      if (reticle) {
        reticle.style.left = `${cx}px`
        reticle.style.top = `${cy}px`
      }

      // Elliptical orbit radii
      const rx = Math.max(175, Math.min(W * (isDesktop ? 0.24 : 0.38), 335))
      const ry = Math.max(130, Math.min(H * (isDesktop ? 0.27 : 0.28), 235))

      // Clockwise angular advance driven by scroll progress + gentle autonomous precession
      const scrollAdvance = smoothProgress * (Math.PI * 1.35)
      const idleAdvance = reduced ? 0 : autoSpin * 0.12
      const totalAdvance = scrollAdvance + idleAdvance

      // Update callout DOM elements directly for buttery smooth 60fps
      calloutRefs.current.forEach((el, idx) => {
        if (!el) return
        const item = CALLOUT_ITEMS[idx]
        const angle = item.baseAngle + totalAdvance
        const x = cx + rx * Math.cos(angle)
        const y = cy + ry * Math.sin(angle)
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.transform = "translate(-50%, -50%)"
      })

      // Background atmospheric glow tracking
      if (glow) {
        glow.style.transform = `translate(${cx - 260 + px * 30}px, ${cy - 260 + py * 20}px)`
      }

      // -----------------------------------------------------------------------
      // RENDER WEBGL SCULPTURE
      // -----------------------------------------------------------------------
      if (gl && prog) {
        gl.viewport(0, 0, Math.round(W * DPR), Math.round(H * DPR))
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.useProgram(prog)
        gl.uniformMatrix4fv(loc.u_vp, false, matVP)

        // Identity model matrix with origin at [0, 0, 0]
        const matModel = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
        gl.uniformMatrix4fv(loc.u_model, false, matModel)
        gl.uniform2f(loc.u_offset, ox, oy)
        gl.uniform1f(loc.u_time, t)
        gl.uniform1f(loc.u_bloom, bloom)
        gl.uniform1f(loc.u_sway, reduced ? 0 : 1.0)
        gl.uniform1f(loc.u_stem, key.stem)
        gl.uniform3fv(loc.u_eye, eye)
        gl.uniform3fv(loc.u_red, colRed)
        gl.uniform3fv(loc.u_hot, colHot)
        gl.uniform3fv(loc.u_shadow, colShadow)
        gl.uniform1f(loc.u_alpha, 1.0)

        gl.drawElements(gl.TRIANGLES, mesh.index.length, gl.UNSIGNED_SHORT, 0)
      } else if (ctx2d) {
        ctx2d.clearRect(0, 0, W, H)
        ctx2d.save()
        ctx2d.translate(cx, cy)
        ctx2d.strokeStyle = isMono ? "#94A3B8" : "#CF0A24"
        ctx2d.lineWidth = 2
        ctx2d.beginPath()
        ctx2d.arc(0, 0, 80 * (key.size || 0.8), 0, Math.PI * 2)
        ctx2d.stroke()
        ctx2d.restore()
      }
    }

    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      canvas.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      if (gl) {
        if (vbo) gl.deleteBuffer(vbo)
        if (ibo) gl.deleteBuffer(ibo)
        if (prog) gl.deleteProgram(prog)
      }
    }
  }, [reduced])

  // Direct Jump to a specific stage
  const jumpToStage = (stageIdx: number) => {
    const root = rootRef.current
    if (!root) return
    const rootTop = root.offsetTop
    const travel = root.clientHeight - window.innerHeight
    if (travel <= 0) return
    const targetProgress = stageIdx / (SCENES - 1)
    const targetY = rootTop + targetProgress * travel
    window.scrollTo({ top: targetY, behavior: "smooth" })
  }

  // Primary CTA: Explore Product
  const handleExplore = () => {
    if (onLaunchCompiler) {
      onLaunchCompiler()
      return
    }
    const elem = document.getElementById("monograph")
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" })
    } else {
      jumpToStage(1)
    }
  }

  // 5 Stages Definition
  const stages = [
    { num: "01", title: "Monumental Hero" },
    { num: "02", title: "Signal Ingestion" },
    { num: "03", title: "Topological Correlation" },
    { num: "04", title: "Attack Path Compilation" },
    { num: "05", title: "Remediation Discovery" },
  ]

  const isMono = theme === "professional"

  return (
    <section
      ref={rootRef}
      id="hero"
      aria-label="IKORI Hero Experience"
      className="relative w-full h-[500vh] transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]"
    >
      {/* =========================================================================
          STICKY VIEWPORT CONTAINER (Pinned 100svh while user scrolls through runway)
          ========================================================================= */}
      <div
        ref={stageRef}
        className="sticky top-0 left-0 w-full h-[100svh] min-h-[640px] overflow-hidden select-none"
      >
        {/* Subtle radial atmospheric glow behind the artwork (Theme-Adaptive) */}
        <div
          ref={glowRef}
          aria-hidden
          className={`pointer-events-none absolute w-[520px] h-[520px] rounded-full blur-3xl transition-opacity duration-700 ${
            isMono
              ? "bg-radial from-slate-400/20 via-slate-300/10 to-transparent opacity-50"
              : "bg-radial from-[#4a0b12]/30 via-[#26050a]/15 to-transparent opacity-80"
          }`}
          style={{ transform: "translate(50vw, 45vh)" }}
        />

        {/* Delicate edge vignette */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-10 transition-colors duration-500 ${
            isMono
              ? "bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(241,245,249,0.8)_95%)]"
              : "bg-[radial-gradient(ellipse_at_center,transparent_45%,#0d0505_95%)]"
          }`}
        />

        {/* Fine film grain overlay */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-10 opacity-[0.035] ${
            isMono ? "mix-blend-multiply" : "mix-blend-screen"
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* WebGL 3D Flower Canvas (Autonomous Rotation + Touch Interactive) */}
        <canvas
          ref={canvasRef}
          aria-label="Interactive 3D Botanical Sculpture"
          className="absolute inset-0 block w-full h-full max-w-none z-20 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: "none" }}
        />

        {/* =========================================================================
            TECHNICAL RETICLE (Direct visual match to Panel 3 of reference)
            ========================================================================= */}
        <div
          ref={reticleRef}
          className="pointer-events-none absolute z-23 transition-opacity duration-1000 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: "54%",
            top: "48%",
            opacity: entered ? (isMono ? 0.45 : 0.75) : 0,
          }}
        >
          <svg
            width="640"
            height="640"
            viewBox="0 0 640 640"
            className="w-[460px] h-[460px] md:w-[620px] md:h-[620px] max-w-none transition-colors duration-500"
            style={{ color: "var(--reticle-stroke)" }}
            aria-hidden="true"
          >
            {/* Outer dotted radar ring */}
            <circle
              cx="320"
              cy="320"
              r="285"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            {/* Secondary continuous ring */}
            <circle
              cx="320"
              cy="320"
              r="235"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.5"
            />
            {/* Inner target boundary */}
            <circle
              cx="320"
              cy="320"
              r="150"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="6 4"
              opacity="0.3"
            />
            {/* Crosshair lines */}
            <line x1="20" y1="320" x2="620" y2="320" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
            <line x1="320" y1="20" x2="320" y2="620" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
            {/* Cardinal satellite ticks */}
            <circle cx="320" cy="35" r="2.5" fill={isMono ? "#0F172A" : "#E3132B"} />
            <circle cx="320" cy="605" r="2.5" fill={isMono ? "#0F172A" : "#E3132B"} />
            <circle cx="35" cy="320" r="2.5" fill={isMono ? "#0F172A" : "#E3132B"} />
            <circle cx="605" cy="320" r="2.5" fill={isMono ? "#0F172A" : "#E3132B"} />
          </svg>
        </div>

        {/* =========================================================================
            4 ENLARGED CLOCKWISE ORBITAL CALLOUT BOXES
            ========================================================================= */}
        {CALLOUT_ITEMS.map((item, idx) => (
          <div
            ref={(el) => {
              calloutRefs.current[idx] = el
            }}
            key={item.id}
            className={`absolute z-26 pointer-events-none select-none transition-opacity duration-1000 ${
              entered ? "opacity-95" : "opacity-0"
            }`}
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Enlarged Callout Box (~30-40% larger, high contrast, readable technical font) */}
            <div
              className="px-4 py-2.5 md:px-5 md:py-3.5 rounded shadow-xl backdrop-blur-md text-left transition-colors duration-500"
              style={{
                backgroundColor: "var(--callout-bg)",
                borderColor: "var(--callout-border)",
                borderWidth: "1px",
              }}
            >
              <div className="font-mono text-xs md:text-[13px] tracking-[0.16em] uppercase whitespace-nowrap leading-relaxed">
                <div>
                  <span
                    className="font-bold mr-1.5"
                    style={{ color: "var(--callout-bracket)" }}
                  >
                    [
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--callout-text)" }}
                  >
                    {item.line1}
                  </span>
                  <span
                    className="font-bold ml-1.5"
                    style={{ color: "var(--callout-bracket)" }}
                  >
                    ]
                  </span>
                </div>
                <div>
                  <span
                    className="font-bold mr-1.5"
                    style={{ color: "var(--callout-bracket)" }}
                  >
                    [
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--callout-text)" }}
                  >
                    {item.line2}
                  </span>
                  <span
                    className="font-bold ml-1.5"
                    style={{ color: "var(--callout-bracket)" }}
                  >
                    ]
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* =========================================================================
            EDITORIAL LAYER: TOP HEADER, LEFT HERO COLUMN, RIGHT ANNOTATIONS, BOTTOM
            ========================================================================= */}
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-6 md:px-12 md:py-6">
          {/* ---------------- TOP HEADER ---------------- */}
          <header className="flex items-center justify-between gap-4 pointer-events-auto w-full">
            {/* Left: Brand Wordmark + Nav Items */}
            <div className="flex items-center gap-6">
              <span
                style={{ fontFamily: '"Federant", "Cormorant Garamond", Georgia, serif' }}
                className="text-xl md:text-2xl font-normal tracking-wider block leading-none cursor-pointer transition-colors duration-500"
                onClick={() => jumpToStage(0)}
              >
                {BRAND_CONFIG.brandName}
              </span>

              <span className="opacity-40 font-light text-sm" aria-hidden>/</span>

              <nav className="hidden lg:flex items-center gap-8 text-[11px] font-mono tracking-widest uppercase">
                {BRAND_CONFIG.navItems.map((item, idx) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.label === "PRODUCT") onLaunchCompiler?.()
                      else if (item.label === "ARCHITECTURE") jumpToStage(3)
                      else if (item.label === "IMPACT") jumpToStage(4)
                      else jumpToStage(1)
                    }}
                    className={`relative py-1 transition-colors cursor-pointer ${
                      item.active
                        ? "font-semibold text-[var(--text-main)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {idx === 0 && (
                      <span
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: "var(--accent-crimson)" }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right: Theme Switcher + Sound Toggle + GET STARTED Button */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Theme Switcher Segmented Control (Priority 4) */}
              <div
                role="group"
                aria-label="Visual Theme Switcher"
                className="flex items-center p-0.5 rounded-full border text-[10px] font-mono tracking-wider transition-colors duration-500"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setTheme("royal-red")}
                  aria-pressed={theme === "royal-red"}
                  className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    theme === "royal-red"
                      ? "bg-[#E3132B] text-white font-bold shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">ROYAL RED</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("professional")}
                  aria-pressed={theme === "professional"}
                  className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    theme === "professional"
                      ? "bg-[#0F172A] text-white font-bold shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span className="hidden sm:inline">PROFESSIONAL</span>
                </button>
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundActive}
                title={soundActive ? "Mute ambient audio" : "Enable ambient drone"}
                className={`hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[10px] font-mono tracking-wider transition-all duration-300 cursor-pointer ${
                  soundActive
                    ? isMono
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-[#E3132B] bg-[#E3132B]/15 text-[#EDE9D5]"
                    : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <div className="flex items-end gap-[2px] h-3 w-3" aria-hidden>
                  <span
                    className={`w-[2px] bg-current rounded-full transition-all duration-300 ${
                      soundActive ? "animate-[pulse_0.9s_ease-in-out_infinite] h-full" : "h-1"
                    }`}
                  />
                  <span
                    className={`w-[2px] bg-current rounded-full transition-all duration-300 ${
                      soundActive ? "animate-[pulse_1.2s_ease-in-out_infinite_0.2s] h-2/3" : "h-1.5"
                    }`}
                  />
                  <span
                    className={`w-[2px] bg-current rounded-full transition-all duration-300 ${
                      soundActive ? "animate-[pulse_0.7s_ease-in-out_infinite_0.4s] h-full" : "h-1"
                    }`}
                  />
                </div>
                <span>{soundActive ? "SOUND ON" : "SOUND OFF"}</span>
              </button>

              {/* GET STARTED Primary Header CTA */}
              <button
                type="button"
                onClick={onLaunchCompiler || handleExplore}
                className="px-4 py-2 rounded-full border transition-all text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                style={{
                  borderColor: "var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                }}
              >
                <span>{BRAND_CONFIG.headerCta}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* ---------------- MAIN HERO CONTENT AREA (MATCHING REFERENCE COMPOSITION) ---------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto w-full relative z-35">
            {/* Left 5 Columns: Vertical Stage Tracker + Title + Headline + Primary CTA */}
            <div className="lg:col-span-5 flex items-start gap-5 pointer-events-none">
              {/* Vertical Stage Tracker (01 .. 05) */}
              <div className="hidden sm:flex flex-col items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1 shrink-0 pointer-events-auto">
                {stages.map((st, idx) => {
                  const isActive = activeStage === idx
                  return (
                    <button
                      key={st.num}
                      type="button"
                      onClick={() => jumpToStage(idx)}
                      className={`group flex items-center gap-2 cursor-pointer transition-colors ${
                        isActive
                          ? isMono
                            ? "text-slate-900 font-bold"
                            : "text-[#E3132B] font-bold"
                          : "hover:text-[var(--text-main)]"
                      }`}
                      aria-label={`Jump to stage ${st.num} - ${st.title}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          isActive
                            ? isMono
                              ? "bg-slate-900 scale-125"
                              : "bg-[#E3132B] scale-125"
                            : "bg-transparent group-hover:bg-slate-400"
                        }`}
                      />
                      <span>{st.num}</span>
                    </button>
                  )
                })}
              </div>

              {/* Main Content Block */}
              <div className="space-y-4 max-w-lg">
                {/* Status Indicator */}
                <div
                  className={`flex items-center gap-2 transition-all duration-700 ${
                    entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--accent-crimson)" }}
                  />
                  <span className="text-[10px] font-mono tracking-widest uppercase font-medium text-[var(--text-secondary)]">
                    {BRAND_CONFIG.platformCategory}
                  </span>
                </div>

                {/* Oversized Editorial IKORI Wordmark */}
                <div
                  className={`transition-all duration-1000 delay-100 ${
                    entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <h1
                    style={{
                      fontFamily: '"Federant", "Cormorant Garamond", "Cinzel", Georgia, serif',
                      fontSize: "clamp(3.8rem, 8vw, 6.8rem)",
                      lineHeight: "0.92",
                      letterSpacing: "-0.01em",
                      color: "var(--text-main)",
                    }}
                    className="m-0 select-none tracking-tight"
                  >
                    {BRAND_CONFIG.brandName}
                  </h1>
                </div>

                {/* Main Headline: "See the path before the breach." */}
                <div
                  className={`transition-all duration-1000 delay-200 ${
                    entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <h2
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: "clamp(2rem, 3.8vw, 3.4rem)",
                      lineHeight: "1.08",
                      fontWeight: 400,
                      color: "var(--text-main)",
                    }}
                    className="m-0 tracking-tight"
                  >
                    {BRAND_CONFIG.headlineMain}
                    <br />
                    <span className="italic font-normal opacity-85">
                      {BRAND_CONFIG.headlineItalic}
                    </span>{" "}
                    {BRAND_CONFIG.headlineEnding}
                  </h2>
                </div>

                {/* Supporting Description */}
                <div
                  className={`transition-all duration-1000 delay-300 ${
                    entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <p className="text-xs md:text-sm leading-relaxed font-light m-0 max-w-md text-[var(--text-secondary)]">
                    {BRAND_CONFIG.description}
                  </p>
                </div>

                {/* Primary CTA: Explore Product */}
                <div
                  className={`pt-3 flex items-center transition-all duration-1000 delay-400 pointer-events-auto ${
                    entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                >
                  <button
                    type="button"
                    onClick={onLaunchCompiler || handleExplore}
                    className="px-7 py-3.5 rounded-full text-white font-mono text-xs font-semibold tracking-wider flex items-center gap-2.5 cursor-pointer shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      backgroundColor: "var(--accent-crimson)",
                    }}
                  >
                    <span>{BRAND_CONFIG.primaryCta}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle 4 Columns: Reserved space for the 3D flower so typography never collides */}
            <div className="hidden lg:block lg:col-span-4 h-full pointer-events-none" />

            {/* Right 3 Columns: Architectural Technical Annotations (Matching Reference) */}
            <div className="hidden lg:flex lg:col-span-3 flex-col justify-center space-y-8 text-right pointer-events-auto pr-2">
              {BRAND_CONFIG.technicalAnnotations.map((anno, i) => (
                <div
                  key={anno.title}
                  className={`space-y-1 transition-all duration-1000 ${
                    entered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  }`}
                  style={{ transitionDelay: `${300 + i * 120}ms` }}
                >
                  <div
                    style={{ fontFamily: '"Federant", "Cormorant Garamond", Georgia, serif' }}
                    className="text-base font-normal tracking-wide text-[var(--text-main)]"
                  >
                    {anno.title}
                  </div>
                  <div className="text-[9px] font-mono tracking-widest uppercase leading-snug text-[var(--text-muted)]">
                    {anno.subtext}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------------- BOTTOM FOOTER LINE ---------------- */}
          <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto w-full text-[10px] font-mono tracking-widest pt-4 text-[var(--text-muted)]">
            {/* Left: Location / Year */}
            <div className="flex items-center gap-3">
              <span className="uppercase">{BRAND_CONFIG.location}</span>
              <span>/</span>
              <span>{BRAND_CONFIG.year}</span>
            </div>

            {/* Right: EVIDENCE / CONTEXT / ACTION + fine horizontal line */}
            <div className="flex items-center gap-4">
              <span>{BRAND_CONFIG.footerSequence.join("  /  ")}</span>
              <div
                className="w-16 h-px hidden sm:block"
                style={{ backgroundColor: "var(--border-subtle)" }}
              />
            </div>
          </footer>
        </div>

        {/* 3D Touch Interaction & Stage Status Badge */}
        <div
          className={`pointer-events-none absolute bottom-12 md:bottom-14 left-1/2 -translate-x-1/2 z-35 flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[9px] md:text-[10px] font-mono tracking-widest uppercase backdrop-blur-md transition-all duration-300 ${
            entered ? "opacity-90 translate-y-0" : "opacity-0 translate-y-3"
          } ${
            isInteracting
              ? isMono
                ? "border-slate-700 bg-slate-900/95 text-white shadow-xl scale-105"
                : "border-[#E3132B] bg-[#1a0507]/95 text-[#EDE9D5] shadow-[0_0_20px_rgba(227,19,43,0.4)] scale-105"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isInteracting
                ? isMono
                  ? "bg-white animate-ping"
                  : "bg-[#E3132B] animate-ping"
                : "bg-current opacity-60"
            }`}
          />
          <svg
            className={`w-3 h-3 transition-transform duration-500 ${
              isInteracting
                ? "rotate-180 text-[var(--accent-crimson)] scale-110"
                : "animate-[spin_12s_linear_infinite]"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            {isInteracting
              ? "INTERACTIVE ROTATION ACTIVE"
              : activeStage > 0
              ? `Stage 0${activeStage + 1} // ${stages[activeStage].title}`
              : "TOUCH OR DRAG TO ROTATE 3D SPECIMEN"}
          </span>
        </div>
      </div>
    </section>
  )
}

