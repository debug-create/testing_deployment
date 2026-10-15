// src/components/Network3DGraph.tsx
// High-polish 3D Force-Directed Telemetry Starburst Graph
// Native WebGL Glow & Additive Bloom with Full React 19 Compatibility
//
// Key capabilities:
// - Loads the selected Attack Path Compiler model_input scenario on demand.
// - Renders only supplied assets and candidate relationships; no synthetic graph links are added.
// - Uses evidence basis and prior probability for deliberately restrained edge treatment.
// - Resolves raw event aliases only when an identifier or alias maps uniquely.
// - Preserves the existing WebGL renderer, orbit controls, projected labels, and selection model.

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Entity } from '../types';
import { RotateCcw, RefreshCw, ShieldCheck } from 'lucide-react';
import { PersonaAvatar } from './PersonaAvatar';
import {
  formatScenarioAssetName,
  formatScenarioTimestamp,
  loadScenarioGraphData,
  RelationshipEvidenceBasis,
  ScenarioAssetType,
  ScenarioGraphAsset,
  ScenarioGraphData,
  ScenarioGraphEvent,
} from '../data/model_input/loadScenarioIntelligence';

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
  scenarioId: string;
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
  assetType: ScenarioAssetType;
  asset: ScenarioGraphAsset;
  isIdentity: boolean;
  isEntryPoint: boolean;
  isCriticalTarget: boolean;
  connectedEdgeIds: string[];
  events: ScenarioGraphEvent[];
  investigationEvents: ScenarioGraphEvent[];
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
  relationshipType: string;
  evidenceBasis: RelationshipEvidenceBasis;
  priorProbability: number;
  events: ScenarioGraphEvent[];
}

type SimulationPhase = 'idle' | 'telemetry' | 'anomaly' | 'tracking' | 'contained';

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

const IDENTITY_TYPES = new Set<ScenarioAssetType>([
  'user_identity',
  'privileged_identity',
  'cloud_identity',
]);

const INVESTIGATION_EVENT_TYPES = new Set([
  'authentication_anomaly',
  'suspicious_process',
  'malware_detected',
  'secret_exposure_detected',
  'sensitive_resource_access',
  'unusual_request_rate',
  'privilege_change',
  'port_exposure_change',
  'service_exposed',
  'vulnerability_detected',
  'login_failure',
]);

const ASSET_STYLE: Record<ScenarioAssetType, { color: string; glow: string; size: number }> = {
  user_identity: { color: '#38BDF8', glow: '#0EA5E9', size: 0.52 },
  privileged_identity: { color: '#C084FC', glow: '#A855F7', size: 0.6 },
  cloud_identity: { color: '#67E8F9', glow: '#06B6D4', size: 0.52 },
  endpoint: { color: '#34D399', glow: '#10B981', size: 0.43 },
  application: { color: '#FBBF24', glow: '#F59E0B', size: 0.45 },
  server: { color: '#94A3B8', glow: '#64748B', size: 0.46 },
  database: { color: '#FB7185', glow: '#E11D48', size: 0.5 },
  security_infrastructure: { color: '#818CF8', glow: '#6366F1', size: 0.48 },
  external_entry: { color: '#F97316', glow: '#EA580C', size: 0.52 },
};

const EVIDENCE_STYLE: Record<RelationshipEvidenceBasis, { color: string; glow: string; opacity: number }> = {
  configured: { color: '#7DD3FC', glow: '#38BDF8', opacity: 0.72 },
  inferred: { color: '#C4B5FD', glow: '#8B5CF6', opacity: 0.52 },
  weak: { color: '#FCD34D', glow: '#D97706', opacity: 0.36 },
  unsupported: { color: '#71717A', glow: '#52525B', opacity: 0.2 },
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function normalizeAlias(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function buildEventResolution(data: ScenarioGraphData) {
  const assetIds = new Set(data.assets.map((asset) => asset.asset_id));
  const aliasCandidates = new Map<string, Set<string>>();

  data.assets.forEach((asset) => {
    [asset.display_name, asset.email, asset.hostname, asset.ip_address].forEach((alias) => {
      const normalized = normalizeAlias(alias);
      if (!normalized) return;
      const candidates = aliasCandidates.get(normalized) || new Set<string>();
      candidates.add(asset.asset_id);
      aliasCandidates.set(normalized, candidates);
    });
  });

  const resolve = (raw?: string): string | null => {
    if (!raw) return null;
    if (assetIds.has(raw)) return raw;
    const matches = aliasCandidates.get(normalizeAlias(raw));
    return matches?.size === 1 ? [...matches][0] : null;
  };

  return data.events.map((event) => ({
    event,
    sourceId: resolve(event.source_entity_raw),
    targetId: resolve(event.target_entity_raw),
  }));
}

function computeForceLayout(data: ScenarioGraphData): { nodes: SimNode[]; edges: SimEdge[]; unresolvedAliases: number } {
  const resolvedEvents = buildEventResolution(data);
  const assetById = new Map(data.assets.map((asset) => [asset.asset_id, asset]));
  const relationshipsByNode = new Map<string, string[]>();
  const eventsByNode = new Map<string, ScenarioGraphEvent[]>();

  resolvedEvents.forEach(({ event, sourceId, targetId }) => {
    [sourceId, targetId].forEach((assetId) => {
      if (!assetId) return;
      const list = eventsByNode.get(assetId) || [];
      list.push(event);
      eventsByNode.set(assetId, list);
    });
  });

  data.relationships.forEach((relationship) => {
    [relationship.source_id, relationship.target_id].forEach((assetId) => {
      const list = relationshipsByNode.get(assetId) || [];
      list.push(relationship.edge_id);
      relationshipsByNode.set(assetId, list);
    });
  });

  const hubAssetId = [...data.assets]
    .sort((left, right) => {
      const degreeDelta = (relationshipsByNode.get(right.asset_id)?.length || 0) - (relationshipsByNode.get(left.asset_id)?.length || 0);
      return degreeDelta || right.criticality - left.criticality || left.asset_id.localeCompare(right.asset_id);
    })[0]?.asset_id;

  const nodes: SimNode[] = data.assets.map((asset, index) => {
    const style = ASSET_STYLE[asset.asset_type];
    const seed = hashString(`${data.scenario_id}:${asset.asset_id}`);
    const angle = (index / Math.max(1, data.assets.length)) * Math.PI * 2 + pseudoRandom(seed) * 0.7;
    const radius = 4.5 + (index % 5) * 0.9 + pseudoRandom(seed + 13) * 1.8;
    const events = eventsByNode.get(asset.asset_id) || [];
    const isEntryPoint = data.entry_points.includes(asset.asset_id);
    const isCriticalTarget = data.critical_targets.includes(asset.asset_id);
    const isCoreHub = asset.asset_id === hubAssetId;
    const connectedEdgeIds = relationshipsByNode.get(asset.asset_id) || [];
    return {
      id: asset.asset_id,
      name: formatScenarioAssetName(asset),
      role: asset.asset_type.replaceAll('_', ' '),
      department: asset.zone,
      residualRisk: 0,
      rawScore: 0,
      coverage: Math.round(asset.evidence_coverage * 100),
      caseStatus: 'Candidate graph entity',
      statusType: isCoreHub ? 'core_hub' : isEntryPoint ? 'elevated' : isCriticalTarget ? 'hold' : IDENTITY_TYPES.has(asset.asset_type) ? 'cleared' : 'baseline',
      pos: isCoreHub
        ? new THREE.Vector3(0, 0, 0)
        : new THREE.Vector3(
            Math.cos(angle) * radius * 1.5,
            (pseudoRandom(seed + 29) - 0.5) * 1.4,
            Math.sin(angle) * radius * 0.8,
          ),
      vel: new THREE.Vector3(),
      size: (style.size + asset.criticality * 0.022) * (isCoreHub ? 1.55 : 0.9),
      color: isCoreHub ? '#DDFBFF' : style.color,
      glowColor: isCoreHub ? '#67E8F9' : style.glow,
      isOutlier: isEntryPoint,
      branchAngle: angle,
      isCoreHub,
      assetType: asset.asset_type,
      asset,
      isIdentity: IDENTITY_TYPES.has(asset.asset_type),
      isEntryPoint,
      isCriticalTarget,
      connectedEdgeIds,
      events,
      investigationEvents: events.filter((event) => INVESTIGATION_EVENT_TYPES.has(event.event_type)),
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: SimEdge[] = data.relationships
    .filter((relationship) => nodeById.has(relationship.source_id) && nodeById.has(relationship.target_id))
    .map((relationship) => {
      const style = EVIDENCE_STYLE[relationship.evidence_basis];
      const matchingEvents = resolvedEvents
        .filter(({ sourceId, targetId }) => sourceId === relationship.source_id && targetId === relationship.target_id)
        .map(({ event }) => event);
      return {
        id: relationship.edge_id,
        source: relationship.source_id,
        target: relationship.target_id,
        statusType: 'baseline',
        color: style.color,
        glowColor: style.glow,
        curveElevation: (pseudoRandom(hashString(relationship.edge_id)) - 0.5) * 0.5,
        lineWidth: 0.7 + relationship.prior_probability * 1.4,
        relationshipType: relationship.relationship_type,
        evidenceBasis: relationship.evidence_basis,
        priorProbability: relationship.prior_probability,
        events: matchingEvents,
      };
    });

  // Arrange the supplied topology in concentric hop rings around the most
  // connected asset. This makes the digital twin visually central without
  // inventing links or changing the candidate relationship dataset.
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => adjacency.set(node.id, new Set()));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const depthById = new Map<string, number>();
  if (hubAssetId) {
    depthById.set(hubAssetId, 0);
    const queue = [hubAssetId];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const nextDepth = (depthById.get(current) || 0) + 1;
      adjacency.get(current)?.forEach((neighbor) => {
        if (depthById.has(neighbor)) return;
        depthById.set(neighbor, nextDepth);
        queue.push(neighbor);
      });
    }
  }

  const connectedMaxDepth = Math.max(0, ...depthById.values());
  const outerDepth = connectedMaxDepth + 1;
  const rings = new Map<number, SimNode[]>();
  nodes.forEach((node) => {
    const depth = depthById.get(node.id) ?? outerDepth;
    const ring = rings.get(depth) || [];
    ring.push(node);
    rings.set(depth, ring);
  });

  rings.forEach((ringNodes, depth) => {
    ringNodes.sort((left, right) => {
      const degreeDelta = right.connectedEdgeIds.length - left.connectedEdgeIds.length;
      return degreeDelta || left.id.localeCompare(right.id);
    });
    if (depth === 0) {
      ringNodes[0]?.pos.set(0, 0, 0);
      return;
    }

    const radius = 5.1 + (depth - 1) * 5.25;
    const angleOffset = depth * 0.67;
    ringNodes.forEach((node, index) => {
      const angle = angleOffset + (index / Math.max(1, ringNodes.length)) * Math.PI * 2;
      const seed = hashString(`${data.scenario_id}:${node.id}:radial`);
      node.pos.set(
        Math.cos(angle) * radius * 1.55,
        Math.sin(angle) * radius * 0.68,
        (pseudoRandom(seed) - 0.5) * 2.6,
      );
      node.branchAngle = angle;
    });
  });

  const unresolvedAliases = resolvedEvents.filter(
    ({ event, sourceId, targetId }) =>
      (event.source_entity_raw && !sourceId) || (event.target_entity_raw && !targetId)
  ).length;

  return { nodes, edges, unresolvedAliases };
}

function chooseSimulationRoute(edges: SimEdge[], nodes: SimNode[]): SimEdge[] {
  if (edges.length === 0) return [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const entryIds = new Set(nodes.filter((node) => node.isEntryPoint).map((node) => node.id));
  const ranked = [...edges].sort((left, right) => {
    const edgeLength = (edge: SimEdge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) return 0;
      return source.pos.distanceTo(target.pos) + (entryIds.has(edge.source) || entryIds.has(edge.target) ? 5 : 0);
    };
    return edgeLength(right) - edgeLength(left);
  });

  // Use one long, real candidate edge so the jump and interception read clearly.
  return [ranked[0]];
}

function preventiveMeasureFor(relationshipType: string): string {
  switch (relationshipType) {
    case 'AUTHENTICATES_TO':
    case 'CAN_ASSUME_IDENTITY':
    case 'HAS_PRIVILEGE':
      return 'Session suspended and identity route isolated';
    case 'CAN_ACCESS_DATA':
      return 'Data transfer blocked and access route isolated';
    case 'ADMINISTERS':
    case 'CAN_MODIFY_CONFIGURATION':
      return 'Privileged action suspended for verification';
    case 'TRUSTS_SERVICE':
      return 'Service trust route quarantined for verification';
    default:
      return 'Candidate network route isolated for verification';
  }
}

// ----------------------------------------------------------------------------
// Curved Glowing 3D Edge with Additive Bloom & Animated Signal Pulses
// ----------------------------------------------------------------------------
function GlowingCurvedEdge({
  edge,
  sourcePos,
  targetPos,
  selected,
  trafficActive,
  trafficOffset,
  anomalyStage,
  onSelect,
}: {
  edge: SimEdge;
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  selected: boolean;
  trafficActive: boolean;
  trafficOffset: number;
  anomalyStage: 'none' | 'moving' | 'tracking' | 'contained';
  onSelect: (edge: SimEdge) => void;
}) {
  const trafficRefs = useRef<Array<THREE.Mesh | null>>([]);
  const anomalyRef = useRef<THREE.Mesh>(null);
  const trackerRef = useRef<THREE.Mesh>(null);
  const containmentRingRef = useRef<THREE.Mesh>(null);
  const stageStartedAt = useRef(0);

  useEffect(() => {
    stageStartedAt.current = performance.now() / 1000;
  }, [anomalyStage]);

  // Compute smooth quadratic curve
  const curve = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
    mid.y += edge.curveElevation;
    return new THREE.QuadraticBezierCurve3(sourcePos, mid, targetPos);
  }, [sourcePos, targetPos, edge.curveElevation]);

  const { coreLine, glowLine, hitGeometry } = useMemo(() => {
    const points = curve.getPoints(24);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const evidenceStyle = EVIDENCE_STYLE[edge.evidenceBasis];
    const opacity = Math.min(0.92, evidenceStyle.opacity * (0.7 + edge.priorProbability * 0.55));

    const coreMat = edge.evidenceBasis === 'configured'
      ? new THREE.LineBasicMaterial({
          color: edge.color,
          transparent: true,
          opacity: selected ? 1 : opacity,
        })
      : new THREE.LineDashedMaterial({
          color: edge.color,
          transparent: true,
          opacity: selected ? 0.95 : opacity,
          dashSize: edge.evidenceBasis === 'inferred' ? 0.45 : 0.24,
          gapSize: edge.evidenceBasis === 'unsupported' ? 0.5 : 0.3,
        });
    const core = new THREE.Line(geometry, coreMat);
    if (coreMat instanceof THREE.LineDashedMaterial) core.computeLineDistances();

    const glowMat = new THREE.LineBasicMaterial({
      color: edge.glowColor,
      transparent: true,
      opacity: selected ? 0.6 : opacity * 0.25,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Line(geometry, glowMat);

    return {
      coreLine: core,
      glowLine: glow,
      hitGeometry: new THREE.TubeGeometry(curve, 18, 0.16, 5, false),
    };
  }, [curve, edge, selected]);

  // Small blue particles are illustrative telemetry. Red/cyan particles are the
  // explicitly-labelled synthetic anomaly and digital-twin response.
  useFrame(({ clock }) => {
    if (trafficActive) {
      trafficRefs.current.forEach((mesh, index) => {
        if (!mesh) return;
        const t = (clock.getElapsedTime() * (0.16 + index * 0.016) + trafficOffset + index / 4) % 1;
        mesh.position.copy(curve.getPoint(t));
        const shimmer = 0.78 + Math.sin(clock.getElapsedTime() * 4 + index) * 0.18;
        mesh.scale.setScalar(shimmer);
      });
    }

    const stageElapsed = performance.now() / 1000 - stageStartedAt.current;
    if (anomalyStage === 'moving' && anomalyRef.current) {
      anomalyRef.current.position.copy(curve.getPoint(Math.min(1, stageElapsed / 4.15)));
    }
    if (anomalyStage === 'tracking') {
      anomalyRef.current?.position.copy(targetPos);
      trackerRef.current?.position.copy(curve.getPoint(Math.min(1, stageElapsed / 0.9)));
    }
    if (anomalyStage === 'contained' && containmentRingRef.current) {
      containmentRingRef.current.position.copy(targetPos);
      containmentRingRef.current.rotation.z += 0.018;
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.14;
      containmentRingRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <primitive object={coreLine} />
      <primitive object={glowLine} />
      <mesh
        geometry={hitGeometry}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(edge);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {trafficActive && [0, 1, 2, 3].map((index) => (
        <mesh key={index} ref={(mesh) => { trafficRefs.current[index] = mesh; }}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="#67E8F9" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {(anomalyStage === 'moving' || anomalyStage === 'tracking') && (
        <mesh ref={anomalyRef}>
          <sphereGeometry args={[0.34, 24, 24]} />
          <meshBasicMaterial color="#FB3B57" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
          <pointLight color="#FB3B57" intensity={4.2} distance={5.5} />
        </mesh>
      )}
      {anomalyStage === 'tracking' && (
        <mesh ref={trackerRef}>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} />
          <pointLight color="#22D3EE" intensity={4} distance={5} />
        </mesh>
      )}
      {anomalyStage === 'contained' && (
        <mesh ref={containmentRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.07, 12, 48]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
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
      const baseScale = node.size * (isCoreHub ? 5.2 : isEscalated ? 4.2 : 3.2);
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
          node.size * (isCoreHub ? 5.2 : isEscalated ? 4.2 : isHold ? 3.5 : isElevated ? 3.2 : 2.2),
          node.size * (isCoreHub ? 5.2 : isEscalated ? 4.2 : isHold ? 3.5 : isElevated ? 3.2 : 2.2),
          1,
        ]}
      >
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={isEscalated ? 0.72 : isCoreHub ? 0.68 : isHold ? 0.48 : hovered ? 0.62 : isElevated ? 0.42 : 0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* 2. Unified circular entity mesh; color and hover details carry type. */}
      <mesh>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial
          color={hovered || isSelected ? '#FFFFFF' : node.color}
          emissive={node.glowColor}
          emissiveIntensity={hovered || isSelected ? 2.8 : isEscalated ? 2.1 : isCoreHub ? 1.9 : isElevated ? 1.45 : 0.95}
          roughness={0.28}
          metalness={0.62}
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
      {isCoreHub && (
        <mesh>
          <ringGeometry args={[node.size * 1.88, node.size * 2.04, 48]} />
          <meshBasicMaterial
            color="#67E8F9"
            side={THREE.DoubleSide}
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
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
      const rawX = (v.x * 0.5 + 0.5) * size.width;
      const rawY = (-(v.y * 0.5) + 0.5) * size.height;
      projected[n.id] = {
        x: Math.max(28, Math.min(size.width - 28, rawX)),
        y: Math.max(28, Math.min(size.height - 28, rawY)),
        visible: isVisible,
      };
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
      width: Math.max(12, maxX - minX),
      height: Math.max(3, maxY - minY),
      depth: Math.max(8, maxZ - minZ),
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
    const padding = aspect > 2.0 ? 1.1 : aspect > 1.3 ? 1.14 : 1.2;
    const distForWidth = ((bounds.width * padding) / 2) / (tanHalfFov * aspect);

    // A shallow pitch keeps the topology wide and diagram-like while retaining depth.
    const pitch = 0.32;
    const effectiveDepth = bounds.depth * Math.cos(pitch) + bounds.height * Math.sin(pitch);
    const distForHeight = ((effectiveDepth * padding) / 2) / tanHalfFov;

    const idealDist = Math.max(distForWidth, distForHeight);
    const clampedDist = Math.max(10, Math.min(58, idealDist));

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
  entities: _entities,
  onSelectEntity: _onSelectEntity,
  onOpenCase: _onOpenCase,
  onReseed,
  selectedEntityId,
  departmentFilter: _departmentFilter = 'all',
  theme: _theme = 'dark',
  scenarioId,
}: Network3DGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [graphData, setGraphData] = useState<ScenarioGraphData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedEntityId || null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('telemetry');
  const [projectedPositions, setProjectedPositions] = useState<
    Record<string, { x: number; y: number; visible: boolean }>
  >({});
  const controlsRef = useRef<any>(null);
  const simulationTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearSimulationTimers = () => {
    simulationTimersRef.current.forEach((timer) => clearTimeout(timer));
    simulationTimersRef.current = [];
  };

  useEffect(() => {
    let cancelled = false;
    setGraphData(null);
    setLoadError(null);
    setHoveredNode(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    clearSimulationTimers();
    setSimulationPhase('telemetry');
    loadScenarioGraphData(scenarioId)
      .then((data) => {
        if (!cancelled) setGraphData(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
      clearSimulationTimers();
    };
  }, [scenarioId]);

  const { nodes, edges, unresolvedAliases } = useMemo(
    () => graphData ? computeForceLayout(graphData) : { nodes: [], edges: [], unresolvedAliases: 0 },
    [graphData],
  );

  const nodePosMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    nodes.forEach((n) => map.set(n.id, n.pos));
    return map;
  }, [nodes]);

  const simulationRoute = useMemo(() => chooseSimulationRoute(edges, nodes), [edges, nodes]);
  const simulationRouteIndex = useMemo(
    () => new Map(simulationRoute.map((edge, index) => [edge.id, index])),
    [simulationRoute],
  );
  const trafficEdgeIds = useMemo(() => {
    return new Set(edges.map((edge) => edge.id));
  }, [edges]);

  const simulationRouteKey = simulationRoute.map((edge) => edge.id).join(':');

  useEffect(() => {
    clearSimulationTimers();
    if (!graphData || simulationRoute.length === 0) return;

    const scheduleCycle = () => {
      simulationTimersRef.current = [];
      setSimulationPhase('telemetry');
      simulationTimersRef.current.push(
        setTimeout(() => setSimulationPhase('anomaly'), 6000),
        setTimeout(() => setSimulationPhase('tracking'), 10500),
        setTimeout(() => setSimulationPhase('contained'), 11800),
        setTimeout(scheduleCycle, 18000),
      );
    };

    scheduleCycle();
    return clearSimulationTimers;
  }, [graphData, scenarioId, simulationRouteKey]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  );
  const inspectedNode = hoveredNode || selectedNode;
  const assetName = (assetId: string) => nodes.find((node) => node.id === assetId)?.name || assetId;
  const containmentEdge = simulationRoute[simulationRoute.length - 1] || null;
  const containmentTarget = containmentEdge ? nodes.find((node) => node.id === containmentEdge.target) || null : null;
  const phasePresentation: Record<SimulationPhase, { label: string; detail: string; tone: string; dot: string }> = {
    idle: { label: 'Digital twin ready', detail: 'Waiting for topology', tone: 'text-zinc-300', dot: 'bg-zinc-500' },
    telemetry: { label: 'Live telemetry exchange', detail: 'Learning normal movement across the twin', tone: 'text-cyan-200', dot: 'bg-cyan-300' },
    anomaly: { label: 'Anomaly moving', detail: 'Unexpected transfer detected · one jump observed', tone: 'text-rose-200', dot: 'bg-rose-400' },
    tracking: { label: 'Twin interceptor deployed', detail: 'Blue twin is closing on the anomaly', tone: 'text-sky-200', dot: 'bg-sky-300' },
    contained: { label: 'Movement contained', detail: 'Origin identified · preventive measure applied', tone: 'text-emerald-200', dot: 'bg-emerald-300' },
  };
  const currentPhase = phasePresentation[simulationPhase];

  const handleResetCamera = () => {
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="relative w-full h-[600px] lg:h-[640px] xl:h-[680px] rounded-2xl overflow-hidden border border-white/10 bg-[#020206] select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 10, 24], fov: 42 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onPointerMissed={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
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
          target={[0, 0, 0]}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.35}
          maxDistance={65}
          minDistance={6}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />

        {/* Curved Glowing Edges */}
        {edges.map((edge) => {
          const srcPos = nodePosMap.get(edge.source);
          const tgtPos = nodePosMap.get(edge.target);
          if (!srcPos || !tgtPos) return null;

          return (
            <React.Fragment key={edge.id}>
              <GlowingCurvedEdge
                edge={edge}
                sourcePos={srcPos}
                targetPos={tgtPos}
                selected={edge.id === selectedEdgeId}
                trafficActive={trafficEdgeIds.has(edge.id)}
                trafficOffset={(hashString(edge.id) % 100) / 100}
                anomalyStage={(() => {
                  const routeIndex = simulationRouteIndex.get(edge.id);
                  if (routeIndex === undefined) return 'none';
                  if (simulationPhase === 'anomaly' && routeIndex === 0) return 'moving';
                  if (simulationPhase === 'tracking' && routeIndex === simulationRoute.length - 1) return 'tracking';
                  if (simulationPhase === 'contained' && routeIndex === simulationRoute.length - 1) return 'contained';
                  return 'none';
                })()}
                onSelect={(nextEdge) => {
                  setSelectedEdgeId(nextEdge.id);
                  setSelectedNodeId(null);
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Starburst Constellation Nodes */}
        {nodes.map((node) => (
          <React.Fragment key={node.id}>
            <StarburstNodeMesh
              node={node}
              isSelected={selectedNodeId === node.id}
              onHover={(n) => setHoveredNode(n)}
              onUnhover={() => setHoveredNode(null)}
              onClick={(n) => {
                setSelectedNodeId(n.id);
                setSelectedEdgeId(null);
              }}
            />
          </React.Fragment>
        ))}

        {/* Screen Position Projector */}
        <ScreenProjector nodes={nodes} onPositionsUpdated={setProjectedPositions} />
      </Canvas>

      {/* Projected labels preserve the employee treatment while distinguishing infrastructure. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {nodes.map((node) => {
          const pos = projectedPositions[node.id];
          if (!pos || !pos.visible) return null;

          const isHovered = hoveredNode?.id === node.id;
          if (!isHovered && !node.isIdentity) return null;

          if (!isHovered) {
            return (
              <div
                key={node.id}
                style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)` }}
                className="pointer-events-none absolute z-10 rounded-full bg-[#07101a]/90 p-0.5 shadow-[0_0_14px_rgba(56,189,248,0.28)] ring-1 ring-sky-400/35"
              >
                <PersonaAvatar id={node.id} name={node.name} size="xs" status="baseline" showBorder={false} />
              </div>
            );
          }

          const isSelected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y + 25}px, 0) translate(-50%, -50%)`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              className={`pointer-events-auto absolute cursor-pointer select-none transition-all duration-100 rounded-full text-[10px] font-mono whitespace-nowrap shadow-[0_8px_26px_rgba(0,0,0,0.6)] flex items-center gap-1.5 border backdrop-blur-md px-2 py-1 ${
                isSelected
                  ? 'bg-zinc-900 border-[#C6613F] text-white ring-2 ring-[#C6613F]/50 scale-105 z-30'
                  : node.isEntryPoint
                  ? 'bg-[#181005]/95 border-orange-500/80 text-orange-100 hover:border-orange-400 z-20'
                  : node.isCriticalTarget
                  ? 'bg-[#160e04]/95 border-amber-500/80 text-amber-100 hover:border-amber-400 z-20'
                  : node.isIdentity
                  ? 'bg-[#05111c]/95 border-sky-500/60 text-sky-100 hover:border-sky-400 z-20'
                  : 'bg-[#05111c]/95 border-sky-500/60 text-sky-100 hover:border-sky-400 z-10'
              }`}
            >
              {node.isIdentity ? (
                <PersonaAvatar id={node.id} name={node.name} size="xs" status="baseline" showBorder={false} />
              ) : (
                <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold">
                  {node.assetType === 'database' ? 'DB' : node.assetType === 'external_entry' ? 'IN' : node.assetType.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="font-semibold tracking-tight max-w-32 truncate">{node.name}</span>
              {node.investigationEvents.length > 0 && (
                <span className="text-[9px] px-1 rounded font-bold bg-amber-500/25 text-amber-200">
                  {node.investigationEvents.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Persistent narrative makes the autonomous detection loop legible in a demo. */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[410px] max-w-[calc(100%_-_24rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-black/75 px-4 py-2.5 font-mono shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${currentPhase.dot} animate-pulse shadow-[0_0_14px_currentColor]`} />
            <div className="min-w-0">
              <div className={`truncate text-[10px] font-bold uppercase tracking-[0.14em] ${currentPhase.tone}`}>{currentPhase.label}</div>
              <div className="mt-0.5 truncate text-[9px] text-zinc-400">{currentPhase.detail}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[7px] uppercase tracking-wider text-zinc-600">
            {(['telemetry', 'anomaly', 'tracking', 'contained'] as SimulationPhase[]).map((phase, index) => (
              <React.Fragment key={phase}>
                {index > 0 && <span className="h-px w-3 bg-white/10" />}
                <span className={`h-1.5 w-1.5 rounded-full ${simulationPhase === phase ? phasePresentation[phase].dot : 'bg-zinc-700'}`} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Graph Floating Controls Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono bg-black/70 border border-white/10 text-zinc-300 backdrop-blur-md">
          {scenarioId} · {nodes.length} entities · {edges.length} candidates
        </span>
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

      {simulationPhase === 'contained' && containmentEdge && containmentTarget && (
        <div className="absolute bottom-4 right-4 z-20 w-[360px] max-w-[calc(100%_-_2rem)] overflow-hidden rounded-xl border border-emerald-400/25 bg-zinc-950/95 font-mono shadow-[0_0_40px_rgba(16,185,129,0.08)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.16em] text-emerald-400">Preventive measure applied</div>
              <div className="mt-1 text-[11px] font-semibold text-zinc-100">{preventiveMeasureFor(containmentEdge.relationshipType)}</div>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="mb-3 truncate text-[9px] text-zinc-500">
              {assetName(containmentEdge.source)} → {containmentTarget.name}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-2.5">
                <div className="text-[8px] uppercase tracking-wider text-zinc-500">Risk score</div>
                <div className="mt-1 text-sm font-bold text-zinc-300">Not scored</div>
                <div className="mt-1 text-[8px] text-rose-300/80">Candidate prior {Math.round(containmentEdge.priorProbability * 100)}%</div>
              </div>
              <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] p-2.5">
                <div className="text-[8px] uppercase tracking-wider text-zinc-500">Trust score</div>
                <div className="mt-1 text-sm font-bold text-zinc-300">Not scored</div>
                <div className="mt-1 text-[8px] text-cyan-300/80">Evidence coverage {Math.round(containmentTarget.asset.evidence_coverage * 100)}%</div>
              </div>
            </div>
            <div className="mt-2.5 text-[8px] leading-relaxed text-zinc-600">
              Automated response is simulated. Scores remain unassigned until supplied by the backend model.
            </div>
          </div>
        </div>
      )}

      {/* Candidate relationship legend */}
      <div className="absolute bottom-4 left-4 z-20 p-3.5 rounded-xl bg-zinc-950/90 border border-white/10 backdrop-blur-md text-[11px] font-mono max-w-sm space-y-2 shadow-2xl">
        <div className="flex items-center justify-between gap-2 text-zinc-200 font-bold border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>Attack Path Candidate Graph</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-normal">Prior estimates</span>
        </div>

        <p className="text-[10px] text-zinc-400 leading-snug">
          Lines are candidate relationships, not confirmed or feasible attacker moves. Weight and opacity reflect the supplied prior probability and evidence basis.
        </p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[10px] text-zinc-300">
          <span className="text-sky-300">━━ configured</span>
          <span className="text-violet-300">┅┅ inferred</span>
          <span className="text-amber-300">┅┅ weak</span>
          <span className="text-zinc-500">┅┅ unsupported</span>
        </div>
        {unresolvedAliases > 0 && <p className="text-[9px] text-zinc-500">{unresolvedAliases} event aliases remain conservatively unresolved.</p>}
      </div>

      {(inspectedNode || selectedEdge) && (
        <div className="absolute top-4 left-4 z-20 w-[300px] max-w-[calc(100%_-_2rem)] rounded-xl border border-white/15 bg-zinc-950/95 p-4 font-mono shadow-2xl backdrop-blur-md animate-in fade-in duration-150">
          {selectedEdge ? (
            <>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-violet-300">Candidate connection</div>
              <h4 className="text-base font-bold text-white">{selectedEdge.relationshipType.replaceAll('_', ' ')}</h4>
              <p className="mt-1 text-sm leading-snug text-zinc-300">{assetName(selectedEdge.source)} → {assetName(selectedEdge.target)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-xs">
                <div><span className="text-zinc-500">Evidence</span><div className="mt-1 text-zinc-200">{selectedEdge.evidenceBasis}</div></div>
                <div><span className="text-zinc-500">Prior estimate</span><div className="mt-1 text-zinc-200">{Math.round(selectedEdge.priorProbability * 100)}%</div></div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">Prior estimate only · {selectedEdge.events.length} matching events</p>
            </>
          ) : inspectedNode ? (
            <>
          <div className="mb-3 flex items-center gap-3">
            {inspectedNode.isIdentity ? <PersonaAvatar id={inspectedNode.id} name={inspectedNode.name} size="md" status="baseline" /> : <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold">{inspectedNode.assetType.slice(0, 3).toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-base font-bold text-white">{inspectedNode.name}</h4>
              <p className="text-xs capitalize text-zinc-400">{inspectedNode.assetType.replaceAll('_', ' ')} · {inspectedNode.asset.zone}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs">
            <div><span className="text-zinc-500">Exposure</span><div className="mt-1 capitalize text-zinc-100">{inspectedNode.asset.exposure}</div></div>
            <div><span className="text-zinc-500">Criticality</span><div className="mt-1 text-zinc-100">{inspectedNode.asset.criticality}/5</div></div>
            <div><span className="text-zinc-500">Links</span><div className="mt-1 text-zinc-100">{inspectedNode.connectedEdgeIds.length}</div></div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="mb-2 text-xs text-zinc-400">Connected paths</div>
            {edges.filter((edge) => inspectedNode.connectedEdgeIds.includes(edge.id)).slice(0, 2).map((edge) => (
              <button
                key={edge.id}
                onClick={() => {
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                  setHoveredNode(null);
                }}
                className="mb-1.5 w-full cursor-pointer rounded-lg bg-white/[0.04] p-2.5 text-left hover:bg-white/[0.08]"
              >
                <div className="text-xs text-zinc-100">{edge.relationshipType.replaceAll('_', ' ')}</div>
                <div className="mt-1 truncate text-[10px] text-zinc-500">Prior {Math.round(edge.priorProbability * 100)}% · {assetName(edge.target)}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <span className="text-zinc-400">Signals for review</span>
            <span className={inspectedNode.investigationEvents.length ? 'text-amber-300' : 'text-emerald-300'}>{inspectedNode.investigationEvents.length}</span>
          </div>
            </>
          ) : null}
        </div>
      )}

      {!graphData && !loadError && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020206]/70 text-xs font-mono text-zinc-400">Loading {scenarioId} graph data…</div>}
      {loadError && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020206]/90 text-xs font-mono text-rose-300">{loadError}</div>}
    </div>
  );
}

