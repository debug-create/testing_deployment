// src/components/Network3DGraph.tsx
// High-polish 3D Force-Directed Telemetry Starburst Graph
// Native WebGL Glow & Additive Bloom with Full React 19 Compatibility
//
// Key Capabilities:
// - Renders the FULL organizational roster (~18-20 entities) across Core Infrastructure, Data & Analytics, Security Ops, Frontend, Product, and Finance & Legal.
// - Departmental sector grouping inside the radiant core constellation mesh.
// - Radial displacement directly proportional to Residual Risk (Contract v2.0.0 / v2.4.1):
//   * Dense calm baseline core (residual <= 25, ~14-15 entities).
//   * Minor elevated blips (residual 28-32, e.g. Kavita, Chen) sit just outside the core with mild outward force.
//   * Devraj (residual 98.4, fully unexplained) is an isolated high-risk red outlier at the tip of the elongated Singapore branch.
//   * Arjun (residual 42, partially explained) sits on an amber mid-branch.
//   * Priya (residual 25, coverage 100%) sits firmly in the calm green core.
//   * Neha (residual 25, indeterminate) sits on the boundary ring in glowing cyan.
// - Multi-tier glowing curved bezier edges with animated data pulses and additive bloom rendering.
// - Generous hit-testing and universal click navigation to Case Detail pages.

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Entity } from '../types';
import {
  RotateCcw,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { PersonaAvatar } from './PersonaAvatar';

// Dev-only controls flag (hidden from visible product UI by default)
const SHOW_DEV_CONTROLS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_RESEED === 'true';

interface Network3DGraphProps {
  entities: Entity[];
  onSelectEntity: (entityId: string) => void;
  onOpenCase: (caseId: string) => void;
  onReseed?: () => void;
  selectedEntityId?: string | null;
  departmentFilter?: string;
  theme?: 'dark' | 'light';
}

export interface SimNode {
  id: string;
  name: string;
  role: string;
  department: string;
  residualRisk: number;
  rawScore: number;
  coverage: number;
  caseStatus: string;
  statusType: 'escalated' | 'hold' | 'cleared' | 'indeterminate' | 'baseline' | 'elevated' | 'core_hub';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  color: string;
  glowColor: string;
  isOutlier: boolean;
  branchAngle: number;
  isSyntheticNode?: boolean;
  isCoreHub?: boolean;
}

export interface SimEdge {
  id: string;
  source: string;
  target: string;
  statusType: 'escalated' | 'hold' | 'cleared' | 'indeterminate' | 'baseline' | 'elevated' | 'core_hub';
  color: string;
  glowColor: string;
  curveElevation: number;
  pulse?: boolean;
  pulseSpeed?: number;
  pulseColor?: string;
  lineWidth?: number;
}

// Fixed seed random generator for 100% deterministic layout
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate smooth radial glow texture for high-performance bloom sprites
function createGlowTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Department cluster angles (radians in XZ plane)
const DEPT_ANGLES: Record<string, number> = {
  'Core Infrastructure': 0.0, // 0 deg
  Frontend: 1.05, // 60 deg
  Product: 2.09, // 120 deg
  'Data & Analytics': 3.14, // 180 deg
  'Security Ops': 4.19, // 240 deg
  'Finance & Legal': 5.24, // 300 deg
};

// Department theme colors
const DEPT_COLORS: Record<string, { color: string; glow: string }> = {
  'Core Infrastructure': { color: '#38BDF8', glow: '#0284C7' },
  'Data & Analytics': { color: '#A78BFA', glow: '#7C3AED' },
  'Security Ops': { color: '#F43F5E', glow: '#E11D48' },
  Frontend: { color: '#34D399', glow: '#059669' },
  Product: { color: '#FBBF24', glow: '#D97706' },
  'Finance & Legal': { color: '#94A3B8', glow: '#475569' },
};

// ----------------------------------------------------------------------------
// Physics Simulation Engine with Full Roster & Starburst Constellation
// ----------------------------------------------------------------------------
function computeForceLayout(
  entities: Entity[],
  departmentFilter: string
): { nodes: SimNode[]; edges: SimEdge[] } {
  const filtered =
    departmentFilter === 'all'
      ? entities
      : entities.filter((e) => e.department === departmentFilter);

  const nodes: SimNode[] = [];
  const edges: SimEdge[] = [];
  const nodeMap = new Map<string, SimNode>();

  // 1. Central Radiant Core Hub (The Luminous Sun Anchor)
  const sunHub: SimNode = {
    id: 'center_starburst_hub',
    name: 'IKORI Ingestion Mesh',
    role: 'Root Telemetry Ingestion Hub',
    department: 'Core Infrastructure',
    residualRisk: 0,
    rawScore: 0,
    coverage: 100,
    caseStatus: 'Normal Baseline',
    statusType: 'core_hub',
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    size: 0.85,
    color: '#E0F2FE',
    glowColor: '#38BDF8',
    isOutlier: false,
    branchAngle: 0,
    isSyntheticNode: true,
    isCoreHub: true,
  };
  nodes.push(sunHub);
  nodeMap.set(sunHub.id, sunHub);

  // 2. Departmental Sector Hub Anchors inside Core Cluster
  const X_STRETCH = 2.15;
  const hubDist = 6.2;

  const deptHubs = [
    { id: 'hub_infra', name: 'Bastion & IAM Relay', dept: 'Core Infrastructure', angle: DEPT_ANGLES['Core Infrastructure'] },
    { id: 'hub_frontend', name: 'UI & Gateway Hub', dept: 'Frontend', angle: DEPT_ANGLES['Frontend'] },
    { id: 'hub_product', name: 'Product Analytics Relay', dept: 'Product', angle: DEPT_ANGLES['Product'] },
    { id: 'hub_data', name: 'Data Pipeline Hub', dept: 'Data & Analytics', angle: DEPT_ANGLES['Data & Analytics'] },
    { id: 'hub_secops', name: 'SIEM Correlation Grid', dept: 'Security Ops', angle: DEPT_ANGLES['Security Ops'] },
    { id: 'hub_finlegal', name: 'Audit & Compliance Mesh', dept: 'Finance & Legal', angle: DEPT_ANGLES['Finance & Legal'] },
  ];

  deptHubs.forEach((hub, i) => {
    const hubNode: SimNode = {
      id: hub.id,
      name: hub.name,
      role: 'Internal Sector Mesh',
      department: hub.dept,
      residualRisk: 4,
      rawScore: 5,
      coverage: 100,
      caseStatus: 'Operational',
      statusType: 'baseline',
      pos: new THREE.Vector3(
        Math.cos(hub.angle) * hubDist * X_STRETCH,
        (pseudoRandom(i * 11) - 0.5) * 0.5,
        Math.sin(hub.angle) * hubDist * 0.85
      ),
      vel: new THREE.Vector3(0, 0, 0),
      size: 0.38,
      color: DEPT_COLORS[hub.dept]?.color || '#38BDF8',
      glowColor: DEPT_COLORS[hub.dept]?.glow || '#0284C7',
      isOutlier: false,
      branchAngle: hub.angle,
      isSyntheticNode: true,
    };
    nodes.push(hubNode);
    nodeMap.set(hubNode.id, hubNode);

    // Radiate from Center Sun to Dept Hubs
    edges.push({
      id: `edge-sun-${hub.id}`,
      source: sunHub.id,
      target: hub.id,
      statusType: 'baseline',
      color: DEPT_COLORS[hub.dept]?.color || '#38BDF8',
      glowColor: DEPT_COLORS[hub.dept]?.glow || '#0EA5E9',
      curveElevation: 0.15,
      lineWidth: 2,
    });
  });

  // 3. Connect Inter-Department Mesh Ring for Structural Integrity
  for (let i = 0; i < deptHubs.length; i++) {
    const nextIdx = (i + 1) % deptHubs.length;
    edges.push({
      id: `edge-dept-ring-${i}`,
      source: deptHubs[i].id,
      target: deptHubs[nextIdx].id,
      statusType: 'baseline',
      color: '#38BDF833',
      glowColor: '#0284C722',
      curveElevation: 0.1,
      lineWidth: 1,
    });
  }

  // 4. Outlier Exfiltration Staging / Bridge Nodes
  // Devraj's Singapore Exfiltration Relays (creating the long isolated tree branch on right wing)
  const devrajRelay1: SimNode = {
    id: 'branch_devraj_sg_gw',
    name: 'Singapore Transit Gateway',
    role: 'Unregistered Ingress ASN',
    department: 'Core Infrastructure',
    residualRisk: 88,
    rawScore: 92,
    coverage: 0,
    caseStatus: 'Flagged',
    statusType: 'escalated',
    pos: new THREE.Vector3(16.5, 0.9, 2.8),
    vel: new THREE.Vector3(0, 0, 0),
    size: 0.34,
    color: '#FF3B30',
    glowColor: '#E8342A',
    isOutlier: true,
    branchAngle: 0.25,
    isSyntheticNode: true,
  };
  nodes.push(devrajRelay1);
  nodeMap.set(devrajRelay1.id, devrajRelay1);

  const devrajRelay2: SimNode = {
    id: 'branch_devraj_vault_dump',
    name: 'Vault Key Export Pipe',
    role: 'Exfiltration Channel',
    department: 'Core Infrastructure',
    residualRisk: 96,
    rawScore: 98,
    coverage: 0,
    caseStatus: 'Active Breach Stage',
    statusType: 'escalated',
    pos: new THREE.Vector3(23.5, 1.5, 4.2),
    vel: new THREE.Vector3(0, 0, 0),
    size: 0.38,
    color: '#FF3B30',
    glowColor: '#FF2A1A',
    isOutlier: true,
    branchAngle: 0.25,
    isSyntheticNode: true,
  };
  nodes.push(devrajRelay2);
  nodeMap.set(devrajRelay2.id, devrajRelay2);

  // Arjun's Migration Bridge (Amber Mid-Branch on left wing)
  const arjunBridge: SimNode = {
    id: 'branch_arjun_migration_bridge',
    name: 'Snowflake Migration Relay',
    role: 'Partial Context Resource',
    department: 'Data & Analytics',
    residualRisk: 46,
    rawScore: 100,
    coverage: 59,
    caseStatus: 'Hold Active',
    statusType: 'hold',
    pos: new THREE.Vector3(-16.0, 0.8, -2.2),
    vel: new THREE.Vector3(0, 0, 0),
    size: 0.34,
    color: '#F59E0B',
    glowColor: '#FBBF24',
    isOutlier: true,
    branchAngle: 3.14,
    isSyntheticNode: true,
  };
  nodes.push(arjunBridge);
  nodeMap.set(arjunBridge.id, arjunBridge);

  // 5. Full Roster Entities Layout & Positioning
  // Group entities by department to apply sector offsets
  const deptEntityCounts: Record<string, number> = {};

  filtered.forEach((ent, idx) => {
    const isDevraj = ent.id.includes('devraj') || ent.caseId === '104';
    const isPriya = ent.id.includes('priya') || ent.caseId === '101';
    const isArjun = ent.id.includes('arjun') || ent.caseId === '107';
    const isNeha = ent.id.includes('neha') || ent.caseId === '112';

    const baseDeptAngle = DEPT_ANGLES[ent.department] ?? (idx * 0.4);
    const countInDept = deptEntityCounts[ent.department] || 0;
    deptEntityCounts[ent.department] = countInDept + 1;

    let statusType: SimNode['statusType'] = 'baseline';
    let color = '#38BDF8';
    let glowColor = '#0284C7';
    let size = 0.36;
    let residualRisk = ent.details?.residualRiskScore ?? ent.riskScore ?? 4.0;
    let branchAngle = baseDeptAngle + (countInDept - 1.5) * 0.32;
    let initialPos = new THREE.Vector3();

    if (isDevraj) {
      statusType = 'escalated';
      color = '#FF3B30';
      glowColor = '#FF2A1A';
      size = 0.72;
      residualRisk = 98.4;
      branchAngle = 0.25;
      initialPos.set(29.5, 2.0, 5.6); // Far isolated outer tip on right wing
    } else if (isArjun) {
      statusType = 'hold';
      color = '#F59E0B';
      glowColor = '#FBBF24';
      size = 0.56;
      residualRisk = 42.0;
      branchAngle = 3.14;
      initialPos.set(-22.8, 1.2, -3.4); // Mid-radius outlier branch on left wing
    } else if (isPriya) {
      statusType = 'cleared';
      color = '#10B981';
      glowColor = '#34D399';
      size = 0.48;
      residualRisk = 25.0;
      branchAngle = 0.15;
      initialPos.set(8.5, -0.3, 1.2); // Calm green core
    } else if (isNeha) {
      statusType = 'indeterminate';
      color = '#38BDF8';
      glowColor = '#7DD3FC';
      size = 0.44;
      residualRisk = 25.0;
      branchAngle = 1.05;
      initialPos.set(-6.2, 0.4, 2.8); // Calm transition ring
    } else if (residualRisk > 25) {
      // Minor elevated blip entity (Kavita, Chen)
      statusType = 'elevated';
      color = '#F59E0B';
      glowColor = '#D97706';
      size = 0.42;
      const radius = 8.5 + (residualRisk / 100) * 3.8;
      initialPos.set(
        Math.cos(branchAngle) * radius * X_STRETCH,
        (pseudoRandom(idx * 17) - 0.5) * 0.8,
        Math.sin(branchAngle) * radius * 0.85
      );
    } else {
      // Calm dense core entity: distributed comfortably across department sector
      statusType = 'baseline';
      const deptColors = DEPT_COLORS[ent.department];
      color = deptColors?.color || '#38BDF8';
      glowColor = deptColors?.glow || '#0284C7';
      size = 0.34;
      const radius = 4.2 + ((idx * 3) % 4) * 1.2 + pseudoRandom(idx * 7) * 1.0;
      initialPos.set(
        Math.cos(branchAngle) * radius * X_STRETCH,
        (pseudoRandom(idx * 13) - 0.5) * 1.0,
        Math.sin(branchAngle) * radius * 0.85
      );
    }

    const node: SimNode = {
      id: ent.id,
      name: ent.name,
      role: ent.role,
      department: ent.department,
      residualRisk,
      rawScore: ent.details?.rawDeviationScore ?? (isNeha ? 25 : ent.riskScore),
      coverage: ent.details?.contextCoverageScore ?? (isPriya ? 100 : isArjun ? 59 : 95),
      caseStatus: ent.caseStatus || (residualRisk > 25 ? 'Reviewing' : 'Cleared'),
      statusType,
      pos: initialPos,
      vel: new THREE.Vector3(0, 0, 0),
      size,
      color,
      glowColor,
      isOutlier: isDevraj || isArjun,
      branchAngle,
    };

    nodes.push(node);
    nodeMap.set(node.id, node);

    // 6. Connect Roster Node to its Department Sector Hub & Center Hub
    const matchingDeptHub = deptHubs.find((h) => h.dept === ent.department) || deptHubs[0];

    if (!isDevraj && !isArjun) {
      // Connect to Department Hub
      edges.push({
        id: `edge-hub-${node.id}`,
        source: matchingDeptHub.id,
        target: node.id,
        statusType,
        color: isPriya ? '#10B981' : isNeha ? '#38BDF8' : statusType === 'elevated' ? '#F59E0B' : '#38BDF866',
        glowColor: isPriya ? '#34D399' : isNeha ? '#7DD3FC' : statusType === 'elevated' ? '#FDE68A' : '#0284C7',
        curveElevation: (pseudoRandom(idx) - 0.5) * 0.3,
        pulse: isPriya || isNeha || statusType === 'elevated',
        pulseSpeed: 1.0,
        lineWidth: isPriya || isNeha || statusType === 'elevated' ? 2 : 1,
      });

      // Also connect directly to Center Sun Hub if close
      if (pseudoRandom(idx * 3) > 0.4 || isPriya) {
        edges.push({
          id: `edge-sun-${node.id}`,
          source: sunHub.id,
          target: node.id,
          statusType,
          color: isPriya ? '#34D39988' : '#38BDF844',
          glowColor: isPriya ? '#6EE7B7' : '#0EA5E9',
          curveElevation: (pseudoRandom(idx * 5) - 0.5) * 0.2,
          lineWidth: 1,
        });
      }
    }
  });

  // 7. Connect Primary Outliers with Glowing Curved Multi-Segment Tree Branches
  // Devraj: Core -> SG Relay 1 -> SG Relay 2 -> Devraj Outlier Node
  edges.push({
    id: 'edge-core-devraj-1',
    source: 'hub_infra',
    target: devrajRelay1.id,
    statusType: 'escalated',
    color: '#FF3B30',
    glowColor: '#FF6B6B',
    curveElevation: 0.6,
    pulse: true,
    pulseSpeed: 1.8,
    pulseColor: '#FF6B6B',
    lineWidth: 2.5,
  });
  edges.push({
    id: 'edge-devraj-1-2',
    source: devrajRelay1.id,
    target: devrajRelay2.id,
    statusType: 'escalated',
    color: '#FF3B30',
    glowColor: '#FFA3A3',
    curveElevation: 0.8,
    pulse: true,
    pulseSpeed: 2.4,
    pulseColor: '#FFA3A3',
    lineWidth: 3,
  });
  const devrajNode = nodes.find((n) => n.id.includes('devraj'));
  if (devrajNode) {
    edges.push({
      id: 'edge-devraj-2-node',
      source: devrajRelay2.id,
      target: devrajNode.id,
      statusType: 'escalated',
      color: '#FF2A1A',
      glowColor: '#FFFFFF',
      curveElevation: 0.9,
      pulse: true,
      pulseSpeed: 3.2,
      pulseColor: '#FFFFFF',
      lineWidth: 3.5,
    });
  }

  // Arjun: Core -> Data Hub -> Arjun Migration Bridge -> Arjun
  edges.push({
    id: 'edge-core-arjun-bridge',
    source: 'hub_data',
    target: arjunBridge.id,
    statusType: 'hold',
    color: '#F59E0B',
    glowColor: '#FDE68A',
    curveElevation: -0.6,
    pulse: true,
    pulseSpeed: 1.2,
    pulseColor: '#FDE68A',
    lineWidth: 2,
  });
  const arjunNode = nodes.find((n) => n.id.includes('arjun'));
  if (arjunNode) {
    edges.push({
      id: 'edge-arjun-bridge-node',
      source: arjunBridge.id,
      target: arjunNode.id,
      statusType: 'hold',
      color: '#F59E0B',
      glowColor: '#FFFBEB',
      curveElevation: -0.7,
      pulse: true,
      pulseSpeed: 1.5,
      pulseColor: '#FFFBEB',
      lineWidth: 2.5,
    });
  }

  // 8. Force-Directed Radial Simulation (180 Relaxation Steps)
  const iterations = 180;
  const kRepulsion = 4.2;

  for (let step = 0; step < iterations; step++) {
    const temp = Math.max(0.01, 1 - step / iterations);

    // Repulsion between non-synthetic node pairs with elliptical aspect preservation
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === sunHub.id) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].id === sunHub.id) continue;
        const nA = nodes[i];
        const nB = nodes[j];
        const diff = new THREE.Vector3().subVectors(nA.pos, nB.pos);
        diff.x /= X_STRETCH;
        const distSq = diff.lengthSq() + 0.1;
        const force = (kRepulsion / distSq) * temp;
        diff.normalize().multiplyScalar(force);
        diff.x *= X_STRETCH;
        nA.vel.add(diff);
        nB.vel.sub(diff);
      }
    }

    // Radial Target Constraint: distance from (0,0,0) proportional to residualRisk
    nodes.forEach((node) => {
      if (node.id === sunHub.id) return;

      let targetRadius = 4.4;
      if (node.isOutlier && node.residualRisk > 90) {
        targetRadius = 14.8; // Devraj outer detachment on right wing
      } else if (node.isOutlier && node.residualRisk > 40) {
        targetRadius = 11.2; // Arjun mid-branch on left wing
      } else if (node.statusType === 'elevated') {
        targetRadius = 7.8 + (node.residualRisk / 100) * 3.0; // Minor elevated blips
      } else if (node.residualRisk <= 25) {
        targetRadius = 3.8 + pseudoRandom(node.id.length) * 2.4; // Dense calm core
      }

      const currRad = Math.sqrt((node.pos.x / X_STRETCH) ** 2 + (node.pos.z / 0.85) ** 2);
      const radDiff = targetRadius - currRad;

      const radDir = new THREE.Vector3(node.pos.x / X_STRETCH, 0, node.pos.z / 0.85).normalize();
      if (radDir.lengthSq() === 0) {
        radDir.set(Math.cos(node.branchAngle), 0, Math.sin(node.branchAngle));
      }

      radDir.x *= X_STRETCH;
      radDir.z *= 0.85;
      node.vel.add(radDir.multiplyScalar(radDiff * 0.18 * temp));
      node.vel.y -= node.pos.y * 0.25 * temp; // Flatten into disk plane

      // Apply velocity with damping
      node.pos.add(node.vel.clone().multiplyScalar(0.7));
      node.vel.multiplyScalar(0.45);
    });
  }

  return { nodes, edges };
}

// ----------------------------------------------------------------------------
// Curved Glowing 3D Edge with Additive Bloom & Animated Signal Pulses
// ----------------------------------------------------------------------------
function GlowingCurvedEdge({
  edge,
  sourcePos,
  targetPos,
}: {
  edge: SimEdge;
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
}) {
  const pulseMeshRef = useRef<THREE.Mesh>(null);

  // Compute smooth quadratic curve
  const curve = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
    mid.y += edge.curveElevation;
    return new THREE.QuadraticBezierCurve3(sourcePos, mid, targetPos);
  }, [sourcePos, targetPos, edge.curveElevation]);

  const { coreLine, glowLine } = useMemo(() => {
    const points = curve.getPoints(24);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const isHighRisk = edge.statusType === 'escalated';
    const isHold = edge.statusType === 'hold';
    const isCleared = edge.statusType === 'cleared';
    const isElevated = edge.statusType === 'elevated';

    // Sharp luminous core line
    const coreMat = new THREE.LineBasicMaterial({
      color: edge.color,
      transparent: true,
      opacity: isHighRisk ? 0.95 : isHold ? 0.85 : isCleared ? 0.75 : isElevated ? 0.7 : 0.4,
      linewidth: 1,
    });
    const core = new THREE.Line(geometry, coreMat);

    // Soft additive bloom glow line
    const glowMat = new THREE.LineBasicMaterial({
      color: edge.glowColor,
      transparent: true,
      opacity: isHighRisk ? 0.6 : isHold ? 0.45 : isCleared ? 0.35 : isElevated ? 0.35 : 0.2,
      blending: THREE.AdditiveBlending,
      linewidth: 2,
    });
    const glow = new THREE.Line(geometry, glowMat);

    return { coreLine: core, glowLine: glow };
  }, [curve, edge]);

  // Animate traveling data pulse along high-risk / active edges
  useFrame(({ clock }) => {
    if (edge.pulse && pulseMeshRef.current) {
      const speed = edge.pulseSpeed || 1.5;
      const t = (clock.getElapsedTime() * speed * 0.3) % 1.0;
      const pt = curve.getPoint(t);
      pulseMeshRef.current.position.copy(pt);
    }
  });

  return (
    <group>
      <primitive object={coreLine} />
      <primitive object={glowLine} />
      {edge.pulse && (
        <mesh ref={pulseMeshRef}>
          <sphereGeometry args={[edge.statusType === 'escalated' ? 0.16 : 0.11, 16, 16]} />
          <meshBasicMaterial
            color={edge.pulseColor || '#FFFFFF'}
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// 3D Node Mesh with Native Multi-Layer Additive Bloom Sprites & Rings
// ----------------------------------------------------------------------------
function StarburstNodeMesh({
  node,
  isSelected,
  onHover,
  onUnhover,
  onClick,
}: {
  node: SimNode;
  isSelected: boolean;
  onHover: (node: SimNode) => void;
  onUnhover: () => void;
  onClick: (node: SimNode) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);
  const spriteRef = useRef<THREE.Sprite>(null);

  const isEscalated = node.statusType === 'escalated';
  const isHold = node.statusType === 'hold';
  const isCleared = node.statusType === 'cleared';
  const isCoreHub = node.isCoreHub;
  const isElevated = node.statusType === 'elevated';

  // Create soft additive bloom glow sprite texture
  const glowTexture = useMemo(() => {
    return createGlowTexture(node.glowColor);
  }, [node.glowColor]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      if (isEscalated) {
        const s = 1 + Math.sin(t * 6) * 0.25;
        ringRef.current.scale.set(s, s, s);
      } else if (isHold) {
        const s = 1 + Math.sin(t * 3) * 0.15;
        ringRef.current.scale.set(s, s, s);
      } else if (isCoreHub) {
        const s = 1 + Math.sin(t * 2) * 0.1;
        ringRef.current.scale.set(s, s, s);
      }
    }
    if (spriteRef.current && (isEscalated || isCoreHub || isHold)) {
      const pulse = 1 + Math.sin(t * 4) * 0.15;
      const baseScale = node.size * (isCoreHub ? 6.5 : isEscalated ? 5.5 : 4.0);
      spriteRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
    }
  });

  return (
    <group position={node.pos}>
      {/* Generous Invisible Hit Box for Easy Clicking & Hovering in Dense Cluster */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(node);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onUnhover();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!node.isSyntheticNode) {
            onClick(node);
          }
        }}
      >
        <sphereGeometry args={[Math.max(node.size * 2.2, 0.44), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 1. Additive Bloom Glow Sprite */}
      <sprite
        ref={spriteRef}
        scale={[
          node.size * (isCoreHub ? 6.5 : isEscalated ? 5.5 : isHold ? 4.5 : isElevated ? 4.0 : 3.6),
          node.size * (isCoreHub ? 6.5 : isEscalated ? 5.5 : isHold ? 4.5 : isElevated ? 4.0 : 3.6),
          1,
        ]}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={isEscalated ? 0.9 : isCoreHub ? 0.85 : isHold ? 0.7 : hovered ? 0.8 : isElevated ? 0.6 : 0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* 2. Core Solid Sphere Mesh */}
      <mesh>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial
          color={hovered || isSelected ? '#FFFFFF' : node.color}
          emissive={node.glowColor}
          emissiveIntensity={hovered || isSelected ? 3.2 : isEscalated ? 2.5 : isCoreHub ? 2.2 : isElevated ? 1.8 : 1.3}
          roughness={0.15}
          metalness={0.8}
        />
      </mesh>

      {/* 3. Orbiting Alert Ring */}
      {(isEscalated || isHold || isSelected || isCoreHub || isElevated || hovered) && (
        <mesh ref={ringRef}>
          <ringGeometry args={[node.size * 1.35, node.size * 1.65, 32]} />
          <meshBasicMaterial
            color={isEscalated ? '#FF3B30' : isHold ? '#F59E0B' : hovered ? '#FFFFFF' : isElevated ? '#FBBF24' : '#38BDF8'}
            side={THREE.DoubleSide}
            transparent
            opacity={isEscalated ? 0.85 : isCoreHub ? 0.6 : hovered ? 0.9 : 0.55}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Screen-Space Projected 2D Interactive Chips Overlay
// Projects 3D node coordinates onto the 2D overlay plane with 0 hydration conflicts
// ----------------------------------------------------------------------------
function ScreenProjector({
  nodes,
  onPositionsUpdated,
}: {
  nodes: SimNode[];
  onPositionsUpdated: (positions: Record<string, { x: number; y: number; visible: boolean }>) => void;
}) {
  const { camera, size } = useThree();

  useFrame(() => {
    const projected: Record<string, { x: number; y: number; visible: boolean }> = {};

    nodes.forEach((n) => {
      if (n.isSyntheticNode) return;
      const v = n.pos.clone();
      v.project(camera);

      // Check if node is in front of camera
      const isVisible = v.z < 1;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-(v.y * 0.5) + 0.5) * size.height;

      projected[n.id] = { x, y, visible: isVisible };
    });

    onPositionsUpdated(projected);
  });

  return null;
}

// ----------------------------------------------------------------------------
// Responsive Camera Controller: dynamically scales camera distance and frustum
// to frame the entire organization topology edge-to-edge across any viewport
// ----------------------------------------------------------------------------
function ResponsiveCameraController({
  nodes,
  controlsRef,
  resetTrigger,
}: {
  nodes: SimNode[];
  controlsRef: React.RefObject<any>;
  resetTrigger: number;
}) {
  const { camera, size } = useThree();

  const bounds = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        centerX: 2.0,
        centerY: 0,
        centerZ: 0.5,
        width: 54.0,
        height: 6.0,
        depth: 18.0,
      };
    }
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.pos.x);
      maxX = Math.max(maxX, n.pos.x);
      minY = Math.min(minY, n.pos.y);
      maxY = Math.max(maxY, n.pos.y);
      minZ = Math.min(minZ, n.pos.z);
      maxZ = Math.max(maxZ, n.pos.z);
    });
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      centerZ: (minZ + maxZ) / 2,
      width: Math.max(20, maxX - minX),
      height: Math.max(4, maxY - minY),
      depth: Math.max(12, maxZ - minZ),
    };
  }, [nodes]);

  useEffect(() => {
    if (!size.width || !size.height) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const aspect = size.width / size.height;
    const fov = camera.fov || 45;
    const fovRad = (fov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);

    // Padding factor: fills the available width and height of the container edge-to-edge
    const padding = aspect > 2.0 ? 1.04 : aspect > 1.3 ? 1.07 : 1.10;
    const distForWidth = ((bounds.width * padding) / 2) / (tanHalfFov * aspect);

    // Camera pitch ~ 24 degrees looking down
    const pitch = 0.42; // rad
    const effectiveDepth = bounds.depth * Math.cos(pitch) + bounds.height * Math.sin(pitch);
    const distForHeight = ((effectiveDepth * padding) / 2) / tanHalfFov;

    const idealDist = Math.max(distForWidth, distForHeight);
    const clampedDist = Math.max(12, Math.min(65, idealDist));

    const camX = bounds.centerX;
    const camY = bounds.centerY + clampedDist * Math.sin(pitch);
    const camZ = bounds.centerZ + clampedDist * Math.cos(pitch);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(bounds.centerX, bounds.centerY, bounds.centerZ);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.set(bounds.centerX, bounds.centerY, bounds.centerZ);
      controlsRef.current.update();
    }
  }, [size.width, size.height, camera, bounds, controlsRef, resetTrigger]);

  return null;
}

// ----------------------------------------------------------------------------
// Main Network3DGraph Component
// ----------------------------------------------------------------------------
export function Network3DGraph({
  entities,
  onSelectEntity,
  onOpenCase,
  onReseed,
  selectedEntityId,
  departmentFilter = 'all',
  theme = 'dark',
}: Network3DGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [projectedPositions, setProjectedPositions] = useState<
    Record<string, { x: number; y: number; visible: boolean }>
  >({});
  const controlsRef = useRef<any>(null);

  // Compute force-directed physics layout with radial starburst topology across full roster
  const { nodes, edges } = useMemo(() => {
    return computeForceLayout(entities, departmentFilter);
  }, [entities, departmentFilter]);

  const nodePosMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    nodes.forEach((n) => map.set(n.id, n.pos));
    return map;
  }, [nodes]);

  const personaNodes = useMemo(() => {
    return nodes.filter((n) => !n.isSyntheticNode);
  }, [nodes]);

  const handleResetCamera = () => {
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-[640px] lg:h-[700px] xl:h-[740px] rounded-2xl overflow-hidden border border-white/10 bg-[#020206] select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [2.0, 12, 26], fov: 45 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <ResponsiveCameraController
          nodes={nodes}
          controlsRef={controlsRef}
          resetTrigger={resetTrigger}
        />
        <ambientLight intensity={0.6} />
        <pointLight position={[1.75, 0, 0]} intensity={3.5} color="#38BDF8" distance={30} />
        <pointLight position={[16, 16, 12]} intensity={1.5} color="#FFFFFF" />
        <pointLight position={[-16, -8, -12]} intensity={1.2} color="#C6613F" />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          target={[1.75, 0, 0.5]}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.35}
          maxDistance={50}
          minDistance={6}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />

        {/* Curved Glowing Edges */}
        {edges.map((edge) => {
          const srcPos = nodePosMap.get(edge.source);
          const tgtPos = nodePosMap.get(edge.target);
          if (!srcPos || !tgtPos) return null;

          return (
            <GlowingCurvedEdge
              key={edge.id}
              edge={edge}
              sourcePos={srcPos}
              targetPos={tgtPos}
            />
          );
        })}

        {/* Starburst Constellation Nodes */}
        {nodes.map((node) => (
          <StarburstNodeMesh
            key={node.id}
            node={node}
            isSelected={selectedEntityId === node.id}
            onHover={(n) => setHoveredNode(n)}
            onUnhover={() => setHoveredNode(null)}
            onClick={(n) => {
              onSelectEntity(n.id);
            }}
          />
        ))}

        {/* Screen Position Projector */}
        <ScreenProjector nodes={nodes} onPositionsUpdated={setProjectedPositions} />
      </Canvas>

      {/* 2D Projected Persona Billboard Chips Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {personaNodes.map((node) => {
          const pos = projectedPositions[node.id];
          if (!pos || !pos.visible) return null;

          const isSelected = selectedEntityId === node.id;
          const isEscalated = node.statusType === 'escalated';
          const isHold = node.statusType === 'hold';
          const isCleared = node.statusType === 'cleared';
          const isElevated = node.statusType === 'elevated';
          const isPrimaryPersona =
            node.id.includes('devraj') ||
            node.id.includes('arjun') ||
            node.id.includes('priya') ||
            node.id.includes('neha') ||
            isEscalated ||
            isHold ||
            isElevated;

          return (
            <div
              key={node.id}
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y + 24}px, 0) translate(-50%, -50%)`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEntity(node.id);
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`pointer-events-auto absolute cursor-pointer select-none transition-all duration-75 rounded-full text-[10px] font-mono whitespace-nowrap shadow-2xl flex items-center gap-1.5 border backdrop-blur-md ${
                isPrimaryPersona ? 'px-2 py-0.5' : 'px-1.5 py-0.5 opacity-85 hover:opacity-100'
              } ${
                isSelected
                  ? 'bg-zinc-900 border-[#C6613F] text-white ring-2 ring-[#C6613F]/50 scale-105 z-30'
                  : isEscalated
                  ? 'bg-[#180505]/95 border-rose-500 text-rose-100 ring-1 ring-rose-500/40 hover:border-rose-400 z-30'
                  : isHold
                  ? 'bg-[#160e04]/95 border-amber-500/80 text-amber-100 hover:border-amber-400 z-20'
                  : isElevated
                  ? 'bg-[#181105]/95 border-amber-500/60 text-amber-200 hover:border-amber-400 z-20'
                  : isCleared
                  ? 'bg-[#05140c]/95 border-emerald-500/60 text-emerald-100 hover:border-emerald-400 z-10'
                  : 'bg-[#05111c]/95 border-sky-500/60 text-sky-100 hover:border-sky-400 z-10'
              }`}
            >
              <PersonaAvatar
                id={node.id}
                name={node.name}
                size="xs"
                status={node.statusType as any}
                showBorder={false}
              />
              <span className="font-semibold tracking-tight">{node.name.split(' ')[0]}</span>
              <span
                className={`text-[9px] px-1 rounded font-bold ${
                  isEscalated
                    ? 'bg-rose-500/40 text-rose-200'
                    : isHold
                    ? 'bg-amber-500/40 text-amber-200'
                    : isElevated
                    ? 'bg-amber-500/30 text-amber-200'
                    : isCleared
                    ? 'bg-emerald-500/40 text-emerald-200'
                    : 'bg-sky-500/30 text-sky-200'
                }`}
              >
                {Math.round(node.residualRisk)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Graph Floating Controls Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {SHOW_DEV_CONTROLS && onReseed && (
          <button
            onClick={onReseed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all shadow-lg backdrop-blur-md cursor-pointer"
            title="Reseed and restore full pristine prototype dataset"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#C6613F]" />
            <span>Reseed Dataset</span>
          </button>
        )}

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer backdrop-blur-md ${
            autoRotate
              ? 'bg-[#C6613F]/20 border-[#C6613F]/50 text-[#E07B57]'
              : 'bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white'
          }`}
          title="Toggle smooth orbital rotation"
        >
          {autoRotate ? 'Orbit: Active' : 'Orbit: Paused'}
        </button>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer backdrop-blur-md"
          title="Reset Camera Angle"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Radial Physics Drift Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 p-3.5 rounded-xl bg-zinc-950/90 border border-white/10 backdrop-blur-md text-[11px] font-mono max-w-sm space-y-2 shadow-2xl">
        <div className="flex items-center justify-between gap-2 text-zinc-200 font-bold border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
            <span>Organization Telemetry Topology (19 Nodes)</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-normal">Radial Force Layout</span>
        </div>

        <p className="text-[10px] text-zinc-400 leading-snug">
          Distance from radiant core $\propto$ <strong className="text-zinc-200">Residual Risk</strong>. ~15 calm employees cluster in the core grouped by department; anomalous actors push out along isolated branches.
        </p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[10px] text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] ring-2 ring-rose-500/30" />
            <span className="font-semibold text-rose-300">Devraj (Outlier · 98)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-amber-500/30" />
            <span className="font-semibold text-amber-300">Arjun (Hold · 42)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-emerald-500/30" />
            <span className="font-semibold text-emerald-300">Priya (Cleared · 25)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] ring-2 ring-sky-500/30" />
            <span className="font-semibold text-sky-300">Calm Core Cluster</span>
          </div>
        </div>
      </div>

      {/* Hover Node Inspector Detail Card */}
      {hoveredNode && !hoveredNode.isSyntheticNode && (
        <div className="absolute top-4 left-4 z-20 p-4 rounded-xl bg-zinc-950/95 border border-white/15 backdrop-blur-md shadow-2xl text-xs font-mono max-w-xs animate-in fade-in duration-150">
          <div className="flex items-start gap-3 mb-2.5">
            <PersonaAvatar
              id={hoveredNode.id}
              name={hoveredNode.name}
              size="md"
              status={hoveredNode.statusType as any}
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white text-xs truncate">{hoveredNode.name}</h4>
              <p className="text-[10px] text-zinc-400 truncate">{hoveredNode.role}</p>
              <p className="text-[10px] text-zinc-500">{hoveredNode.department}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10px]">
            <div>
              <span className="text-zinc-400">Residual Risk:</span>
              <span
                className={`font-bold ml-1 ${
                  hoveredNode.statusType === 'escalated'
                    ? 'text-rose-400'
                    : hoveredNode.statusType === 'hold' || hoveredNode.statusType === 'elevated'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {Math.round(hoveredNode.residualRisk)}/100
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Coverage:</span>
              <span className="font-bold text-zinc-200 ml-1">{Math.round(hoveredNode.coverage)}%</span>
            </div>
          </div>

          <button
            onClick={() => onOpenCase(hoveredNode.id)}
            className="mt-3 w-full py-1.5 rounded-lg bg-[#C6613F]/20 hover:bg-[#C6613F]/30 text-[#E07B57] border border-[#C6613F]/40 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <span>Inspect Forensic Dossier</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

