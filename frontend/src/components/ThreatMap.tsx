// ThreatMap.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Entity, CaseStatus, EntityLocation } from '../types';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { StatusBadge } from './StatusBadge';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Lock,
  ArrowUpRight,
  Sparkles,
  Layers,
  Radio,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Maximize2,
  MapPin,
  ExternalLink,
  ChevronRight,
  X,
  Play,
  Info,
} from 'lucide-react';

interface ThreatMapProps {
  entities: Entity[];
  onOpenCaseDetail: (entityId: string) => void;
  onUpdateEntityStatus: (entityId: string, status: CaseStatus) => void;
}

interface OfficeHub {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  entities: Entity[];
  highestRiskEntity: Entity;
  maxRiskScore: number;
  hasEscalated: boolean;
  hasReviewing: boolean;
  isAllCleared: boolean;
  hasRevoked: boolean;
}

interface TelemetryArc {
  id: string;
  from: OfficeHub;
  to: OfficeHub;
  type: 'exfil' | 'sync' | 'audit';
  isActive: boolean;
  label: string;
}

// Map canvas dimensions for Equirectangular projection
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

export function ThreatMap({
  entities,
  onOpenCaseDetail,
  onUpdateEntityStatus,
}: ThreatMapProps) {
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [confirmingRevokeEntity, setConfirmingRevokeEntity] = useState<Entity | null>(null);
  const [isExecutingRevoke, setIsExecutingRevoke] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  // Set up d3 equirectangular projection
  const { projection, landPath } = useMemo(() => {
    // Equirectangular projection scaled to 1000 x 520
    const proj = geoEquirectangular()
      .fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'Sphere' });

    const pathGen = geoPath().projection(proj);
    // Extract land feature collection from topojson
    const landFeature = topojson.feature(
      worldData as any,
      (worldData as any).objects.land
    );
    const path = pathGen(landFeature) || '';

    return { projection: proj, landPath: path };
  }, []);

  // Compute office hubs and assign coordinates
  const hubs: OfficeHub[] = useMemo(() => {
    const hubMap = new Map<string, Entity[]>();

    entities.forEach((entity) => {
      const key = `${entity.location.city}_${entity.location.country}`;
      if (!hubMap.has(key)) {
        hubMap.set(key, []);
      }
      hubMap.get(key)!.push(entity);
    });

    const result: OfficeHub[] = [];

    hubMap.forEach((hubEntities, key) => {
      const first = hubEntities[0];
      const coords = projection([first.location.lng, first.location.lat]) || [
        MAP_WIDTH / 2,
        MAP_HEIGHT / 2,
      ];

      // Sort by riskScore descending
      const sorted = [...hubEntities].sort((a, b) => b.riskScore - a.riskScore);
      const highest = sorted[0];

      const hasEscalated = hubEntities.some(
        (e) => e.riskLevel === 'escalated' || e.caseStatus === 'Open'
      );
      const hasReviewing = hubEntities.some(
        (e) => e.caseStatus === 'Reviewing'
      );
      const isAllCleared = hubEntities.every(
        (e) => e.caseStatus === 'Cleared' || e.riskLevel === 'calm'
      );
      const hasRevoked = hubEntities.some(
        (e) => e.caseStatus === 'Containment Recommended'
      );

      result.push({
        id: first.location.city.toLowerCase().replace(/\s+/g, '-'),
        city: first.location.city,
        country: first.location.country,
        lat: first.location.lat,
        lng: first.location.lng,
        x: coords[0],
        y: coords[1],
        entities: sorted,
        highestRiskEntity: highest,
        maxRiskScore: highest.riskScore,
        hasEscalated,
        hasReviewing,
        isAllCleared,
        hasRevoked,
      });
    });

    return result;
  }, [entities, projection]);

  // Telemetry connection arcs
  const telemetryArcs: TelemetryArc[] = useMemo(() => {
    const bangalore = hubs.find((h) => h.city === 'Bangalore');
    const london = hubs.find((h) => h.city === 'London');
    const sf = hubs.find((h) => h.city === 'San Francisco');
    const ny = hubs.find((h) => h.city === 'New York');
    const stockholm = hubs.find((h) => h.city === 'Stockholm');
    const sydney = hubs.find((h) => h.city === 'Sydney');
    const singapore = hubs.find((h) => h.city === 'Singapore');

    const arcs: TelemetryArc[] = [];

    // 1. Bangalore -> London (Critical exfil route for Devraj when active)
    if (bangalore && london) {
      arcs.push({
        id: 'arc-blr-lon',
        from: bangalore,
        to: london,
        type: bangalore.hasEscalated ? 'exfil' : 'sync',
        isActive: true,
        label: bangalore.hasEscalated
          ? 'Off-hours DB Replica Stream [ANOMALY]'
          : 'Encrypted Telemetry Sync',
      });
    }

    // 2. Bangalore -> Singapore
    if (bangalore && singapore) {
      arcs.push({
        id: 'arc-blr-sin',
        from: bangalore,
        to: singapore,
        type: 'sync',
        isActive: true,
        label: 'APAC Regional Replication',
      });
    }

    // 3. London -> Stockholm
    if (london && stockholm) {
      arcs.push({
        id: 'arc-lon-sto',
        from: london,
        to: stockholm,
        type: 'sync',
        isActive: true,
        label: 'EMEA Canary Token Ingestion',
      });
    }

    // 4. US SF -> London
    if (sf && london) {
      arcs.push({
        id: 'arc-sf-lon',
        from: sf,
        to: london,
        type: 'sync',
        isActive: true,
        label: 'Global IAM & Identity Mesh',
      });
    }

    // 5. US NY -> Sydney
    if (ny && sydney) {
      arcs.push({
        id: 'arc-ny-syd',
        from: ny,
        to: sydney,
        type: 'audit',
        isActive: true,
        label: 'Compliance Audit Sync',
      });
    }

    return arcs;
  }, [hubs]);

  // Currently focused hub
  const activeHub = useMemo(() => {
    if (selectedHubId) {
      return hubs.find((h) => h.id === selectedHubId) || null;
    }
    if (hoveredHubId) {
      return hubs.find((h) => h.id === hoveredHubId) || null;
    }
    // Default to the escalated hub (Bangalore) if present so analyst sees the threat immediately
    const escalatedHub = hubs.find((h) => h.hasEscalated);
    return escalatedHub || hubs[0] || null;
  }, [hubs, selectedHubId, hoveredHubId]);

  // Devraj entity reference for threat simulation
  const devrajEntity = entities.find((e) => e.id === 'devraj');
  const isDevrajEscalated = devrajEntity?.caseStatus === 'Open';
  const isDevrajRevoked = devrajEntity?.caseStatus === 'Containment Recommended';

  // Human-Confirmed Action Handlers (Investigate and Recommend Containment)
  const handleInvestigateCase = (entityId: string) => {
    const ent = entities.find((e) => e.id === entityId);
    if (ent && (ent.caseStatus === 'Open' || ent.riskLevel === 'escalated')) {
      onUpdateEntityStatus(entityId, 'Reviewing');
    }
    onOpenCaseDetail(entityId);
    setSimulationNotice(
      `Case #${ent?.caseId || '104'} moved to Active Investigation. Opening forensic dossier.`
    );
    setTimeout(() => setSimulationNotice(null), 5000);
  };

  const handleInitiateRevoke = (entity: Entity) => {
    setConfirmingRevokeEntity(entity);
  };

  const handleConfirmRevoke = () => {
    if (!confirmingRevokeEntity) return;
    setIsExecutingRevoke(true);
    setTimeout(() => {
      onUpdateEntityStatus(confirmingRevokeEntity.id, 'Containment Recommended');
      setIsExecutingRevoke(false);
      const targetName = confirmingRevokeEntity.name;
      setConfirmingRevokeEntity(null);
      setSimulationNotice(
        `Human confirmation verified: Containment recommendation logged for ${targetName}. Protective hold logged at Bangalore Hub.`
      );
      setTimeout(() => setSimulationNotice(null), 6000);
    }, 600);
  };

  // Handle Reset Simulation
  const handleResetSimulation = () => {
    onUpdateEntityStatus('devraj', 'Open');
    setSimulationNotice('Case reset to Open: Devraj Malhotra (#104) active at Bangalore Hub.');
    setTimeout(() => setSimulationNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Threat Map Header & Action Control Bar */}
      <div className="p-5 rounded-2xl bg-[#0a090e] border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8342A] animate-pulse" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#E8342A]">
              Live Geographic Threat Telemetry
            </span>
            <span className="text-zinc-600 font-mono text-xs">•</span>
            <span className="text-xs font-mono text-zinc-400">
              8 Global Office Hubs Monitored
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Global SOC Threat & Intercept Map
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl font-sans leading-relaxed">
            Split-second localization of organizational anomalies. Muted baseline nodes conserve analyst
            cognitive budget; escalated nodes emit real-time radar signatures.
          </p>
        </div>

        {/* Human-Confirmed Decision Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isDevrajEscalated ? (
            <div className="flex items-center gap-2">
              {/* Button 1: Investigate (available immediately, not gated) */}
              <button
                onClick={() => handleInvestigateCase('devraj')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-zinc-900 border border-white/[0.15] text-zinc-100 hover:text-white hover:bg-zinc-800 hover:border-white/30 transition-all cursor-pointer shadow-sm group"
                title="Immediately investigate open Case #104 in forensic drawer"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Investigate</span>
                <span className="text-[10px] text-zinc-400 font-normal">(#104)</span>
              </button>

              {/* Button 2: Revoke Access (available immediately, human-confirmed) */}
              <button
                onClick={() => devrajEntity && handleInitiateRevoke(devrajEntity)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-all shadow-lg shadow-[#E8342A]/20 cursor-pointer group"
                title="Initiate human-confirmed emergency access revocation"
              >
                <Lock className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
                <span>Revoke Access</span>
              </button>
            </div>
          ) : isDevrajRevoked ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-rose-800/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Access Revoked (Human-Confirmed)</span>
              </div>
              <button
                onClick={() => onOpenCaseDetail('devraj')}
                className="px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-300 bg-zinc-900 border border-white/[0.1] hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Dossier (#104)
              </button>
              <button
                onClick={handleResetSimulation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-zinc-900 border border-white/[0.1] text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Reset case to Open to test Investigate and Revoke Access flows"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reopen Case</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Under Investigation</span>
              </div>
              <button
                onClick={() => onOpenCaseDetail('devraj')}
                className="px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-300 bg-zinc-900 border border-white/[0.1] hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Dossier (#104)
              </button>
              <button
                onClick={() => devrajEntity && handleInitiateRevoke(devrajEntity)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-all shadow-md shadow-[#E8342A]/20 cursor-pointer"
                title="Initiate human-confirmed emergency access revocation"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>Revoke Access</span>
              </button>
              <button
                onClick={handleResetSimulation}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action / Simulation Feedback Alert */}
      {simulationNotice && (
        <div className="p-3.5 rounded-xl bg-[#120f17] border border-white/[0.15] text-zinc-200 text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C6613F] shrink-0" />
            <span>{simulationNotice}</span>
          </div>
          <button
            onClick={() => setSimulationNotice(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Primary World Map Container */}
      <div className="relative rounded-2xl bg-[#07060a] border border-white/[0.08] overflow-hidden shadow-2xl">
        {/* Subtle Map Ambient Lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#181324]/30 via-transparent to-transparent pointer-events-none" />

        {/* SVG World Canvas */}
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-auto block select-none"
          style={{ minHeight: '440px' }}
        >
          <defs>
            {/* Dot Matrix Pattern for Landmasses (Identical to user reference image) */}
            <pattern
              id="fable-land-dots"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="4" cy="4" r="1.1" fill="rgba(255, 255, 255, 0.28)" />
            </pattern>

            {/* Land Outline Mask for Dot Pattern */}
            <mask id="land-mask">
              <path d={landPath} fill="white" />
            </mask>

            {/* Red Alert Radar Glow Filter */}
            <filter id="threat-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Amber Alert Glow Filter */}
            <filter id="amber-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ocean Background & Subtle Lat/Long Grid Matrix */}
          <g className="map-grid" opacity="0.45">
            {/* Longitude Meridians */}
            {[-120, -60, 0, 60, 120].map((lng) => {
              const x = ((lng + 180) / 360) * MAP_WIDTH;
              return (
                <line
                  key={`meridian-${lng}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={MAP_HEIGHT}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="0.75"
                  strokeDasharray="3 6"
                />
              );
            })}

            {/* Latitude Parallels */}
            {[-60, -30, 0, 30, 60].map((lat) => {
              const y = ((90 - lat) / 180) * MAP_HEIGHT;
              return (
                <line
                  key={`parallel-${lat}`}
                  x1={0}
                  y1={y}
                  x2={MAP_WIDTH}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="0.75"
                  strokeDasharray="3 6"
                />
              );
            })}
          </g>

          {/* Base Continents Landmass Silhouette (Near-black / Muted Dark) */}
          <path
            d={landPath}
            fill="#121019"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.8"
          />

          {/* Dotted Grid Matrix Pattern strictly clipped inside the continents */}
          <rect
            x="0"
            y="0"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            fill="url(#fable-land-dots)"
            mask="url(#land-mask)"
            opacity="0.8"
          />

          {/* Telemetry Connection Arcs */}
          <g className="telemetry-arcs">
            {telemetryArcs.map((arc) => {
              // Calculate quadratic Bézier curve control point
              const dx = arc.to.x - arc.from.x;
              const dy = arc.to.y - arc.from.y;
              const midX = (arc.from.x + arc.to.x) / 2;
              // Arc upwards based on horizontal distance
              const curveHeight = Math.min(Math.abs(dx) * 0.32, 110);
              const ctrlY = Math.min(arc.from.y, arc.to.y) - curveHeight;

              const pathD = `M ${arc.from.x} ${arc.from.y} Q ${midX} ${ctrlY} ${arc.to.x} ${arc.to.y}`;

              const isExfil = arc.type === 'exfil';

              return (
                <g key={arc.id} className="pointer-events-none">
                  {/* Subtle static path guide */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isExfil ? 'rgba(232, 52, 42, 0.25)' : 'rgba(198, 97, 63, 0.15)'}
                    strokeWidth={isExfil ? 2 : 1}
                  />

                  {/* Flowing animated dash packets */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isExfil ? '#E8342A' : '#C6613F'}
                    strokeWidth={isExfil ? 2.5 : 1.5}
                    className="animate-telemetry-flow"
                    opacity={isExfil ? 0.9 : 0.6}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Office Hub Markers & Interactive Radar Pins */}
          <g className="office-hubs">
            {hubs.map((hub) => {
              const isSelected = selectedHubId === hub.id;
              const isHovered = hoveredHubId === hub.id;
              const isEscalated = hub.hasEscalated;
              const isReviewing = hub.hasReviewing;
              const isRevoked = hub.hasRevoked;

              return (
                <g
                  key={hub.id}
                  transform={`translate(${hub.x}, ${hub.y})`}
                  className="cursor-pointer group"
                  onClick={() => {
                    setSelectedHubId(isSelected ? null : hub.id);
                  }}
                  onMouseEnter={() => setHoveredHubId(hub.id)}
                  onMouseLeave={() => setHoveredHubId(null)}
                >
                  {/* ESCALATED RADAR PULSING RINGS (Bangalore - Devraj) */}
                  {isEscalated && (
                    <>
                      {/* Primary Expanding Pulse Circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r="8"
                        fill="none"
                        stroke="#E8342A"
                        className="animate-radar-pulse"
                      />
                      {/* Secondary Staggered Expanding Pulse Circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r="8"
                        fill="none"
                        stroke="#E8342A"
                        className="animate-radar-secondary"
                      />
                      {/* Ambient Warning Glow Aura */}
                      <circle
                        cx="0"
                        cy="0"
                        r="18"
                        fill="rgba(232, 52, 42, 0.25)"
                        filter="url(#threat-glow)"
                      />
                    </>
                  )}

                  {/* Reviewing / Elevated Subtle Pulse */}
                  {isReviewing && !isEscalated && (
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="rgba(217, 119, 6, 0.2)"
                      filter="url(#amber-glow)"
                    />
                  )}

                  {/* Outer Marker Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isEscalated ? 8 : 6}
                    fill={
                      isEscalated
                        ? '#E8342A'
                        : isReviewing
                        ? '#D97706'
                        : isRevoked
                        ? '#3f3f46'
                        : '#C6613F'
                    }
                    stroke="#ffffff"
                    strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                    className="transition-all duration-200"
                  />

                  {/* Center Dot */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isEscalated ? 3.5 : 2.5}
                    fill="#ffffff"
                  />

                  {/* City Label Badge */}
                  <g transform="translate(0, -14)" className="pointer-events-none select-none">
                    <rect
                      x={-hub.city.length * 3.4 - 8}
                      y="-12"
                      width={hub.city.length * 6.8 + 16}
                      height="16"
                      rx="4"
                      fill={
                        isEscalated
                          ? 'rgba(232, 52, 42, 0.95)'
                          : isSelected || isHovered
                          ? 'rgba(28, 25, 38, 0.95)'
                          : 'rgba(18, 16, 24, 0.85)'
                      }
                      stroke={
                        isEscalated
                          ? '#E8342A'
                          : isSelected || isHovered
                          ? 'rgba(255, 255, 255, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)'
                      }
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-2"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      letterSpacing="0.05em"
                    >
                      {hub.city.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* 3. Floating Interactive HUD Card for Focused/Hovered Hub */}
        {activeHub && (
          <div
            className={`absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 rounded-xl bg-[#0c0b12]/95 border shadow-2xl p-4 text-xs font-sans backdrop-blur-md transition-all duration-200 z-20 ${
              activeHub.hasEscalated
                ? 'border-[#E8342A]/60 shadow-[#E8342A]/20'
                : activeHub.hasReviewing
                ? 'border-amber-500/40 shadow-amber-500/10'
                : 'border-white/[0.1]'
            }`}
          >
            {/* Popover Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    activeHub.hasEscalated
                      ? 'bg-[#E8342A]/20 border-[#E8342A]/40 text-[#E8342A]'
                      : activeHub.hasReviewing
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-800 border-white/[0.1] text-zinc-300'
                  }`}
                >
                  {activeHub.hasEscalated ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white">
                      {activeHub.city}
                    </h3>
                    <span className="text-zinc-500">•</span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {activeHub.country}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400">
                    {activeHub.entities.length} monitored personnel
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                  activeHub.hasEscalated
                    ? 'bg-[#E8342A]/20 border-[#E8342A]/50 text-[#E8342A]'
                    : activeHub.hasReviewing
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {activeHub.hasEscalated
                  ? 'CRITICAL ALERT'
                  : activeHub.hasReviewing
                  ? 'UNDER REVIEW'
                  : 'CALM BASELINE'}
              </div>
            </div>

            {/* Personnel & Compromised Entity Details */}
            <div className="py-3 space-y-2 max-h-48 overflow-y-auto">
              {activeHub.entities.map((ent) => {
                const isCompromised =
                  ent.riskLevel === 'escalated' || ent.caseStatus === 'Open';

                return (
                  <div
                    key={ent.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isCompromised
                        ? 'bg-[#180c0c] border-[#E8342A]/40'
                        : 'bg-zinc-900/60 border-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs text-white block truncate">
                          {ent.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate block">
                          {ent.role} • {ent.department}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xs font-mono font-bold ${
                            isCompromised
                              ? 'text-[#E8342A]'
                              : ent.riskScore > 40
                              ? 'text-amber-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {ent.riskScore}/100
                        </span>
                        <StatusBadge
                          status={ent.caseStatus}
                          riskLevel={ent.riskLevel}
                          riskScore={ent.riskScore}
                          classification={ent.classification}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Threat vector snippet if compromised */}
                    {ent.accessVector && (
                      <p className="text-[10px] font-mono text-zinc-300 truncate mt-1 pt-1 border-t border-white/[0.04]">
                        Vector: {ent.accessVector}
                      </p>
                    )}

                    {/* Quick action buttons per entity - Both available immediately */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleInvestigateCase(ent.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Investigate case in forensic dossier"
                      >
                        <Activity className="w-2.5 h-2.5 text-amber-400" />
                        <span>Investigate</span>
                      </button>

                      {ent.caseStatus !== 'Containment Recommended' && ent.caseStatus !== 'Cleared' && (
                        <button
                          onClick={() => handleInitiateRevoke(ent)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-colors flex items-center gap-1 cursor-pointer shadow-sm shadow-[#E8342A]/20"
                          title="Recommend emergency containment protocol"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Recommend Containment</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Popover Footer summary */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>Coordinates: {(activeHub.lat ?? 0).toFixed(2)}°, {(activeHub.lng ?? 0).toFixed(2)}°</span>
              <span className="text-zinc-400">IKORI Passive Ingestion</span>
            </div>
          </div>
        )}

        {/* Map Legend Overlay in Top-Right */}
        <div className="absolute top-4 right-4 bg-[#0c0b12]/85 border border-white/[0.08] rounded-xl p-3 text-[10px] font-mono backdrop-blur-md hidden sm:block space-y-2 pointer-events-none">
          <div className="text-zinc-400 uppercase tracking-wider font-bold mb-1">
            Map Threat Matrix
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#E8342A] animate-pulse" />
            <span>Escalated Incident (Radar Ping)</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Elevated / Under Review</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#C6613F]" />
            <span>Cleared / Baseline Calm</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 pt-1 border-t border-white/[0.06]">
            <span className="w-3 h-0.5 bg-[#E8342A]" />
            <span>Anomalous Egress Telemetry</span>
          </div>
        </div>
      </div>

      {/* 4. Human-Confirmed Decision Architecture Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#09080d] border border-white/[0.07] space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8342A]/15 border border-[#E8342A]/30 flex items-center justify-center text-[#E8342A]">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
            1. Anomaly Triangulation
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Bangalore hub telemetry matched off-hours database access and foreign ASN ingress. Context coverage is 0.0%, triggering priority queue escalation.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#09080d] border border-white/[0.07] space-y-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
            2. Discrete Case Investigation
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            "Investigate" and "Recommend Containment" are both available directly from the priority queue without arbitrary gating.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#09080d] border border-white/[0.07] space-y-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
            3. Containment Recommendation
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Critical containment recommendations are logged to the audit ledger with full blast-radius visibility for the incident response team.
          </p>
        </div>
      </div>

      {/* 5. Confirmation Modal for Containment Recommendation */}
      {confirmingRevokeEntity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-2xl bg-[#0e0c14] border border-[#E8342A]/50 shadow-2xl shadow-[#E8342A]/15 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-zinc-100">
            {/* Header with Warning Icon */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8342A]/20 border border-[#E8342A]/40 flex items-center justify-center text-[#E8342A] shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#E8342A]">
                  Containment Recommendation
                </div>
                <h3 className="text-base font-bold text-white">
                  Confirm Containment Protocol
                </h3>
              </div>
            </div>

            {/* Target Identity & Vector Box */}
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target Entity:</span>
                <span className="text-white font-semibold">{confirmingRevokeEntity.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Role & Dept:</span>
                <span className="text-zinc-200">
                  {confirmingRevokeEntity.role} • {confirmingRevokeEntity.department}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Hub Location:</span>
                <span className="text-zinc-200">
                  {confirmingRevokeEntity.location.city}, {confirmingRevokeEntity.location.country}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Residual Risk:</span>
                <span className="text-[#E8342A] font-bold">
                  {confirmingRevokeEntity.riskScore}/100
                </span>
              </div>
              {confirmingRevokeEntity.accessVector && (
                <div className="pt-2 border-t border-white/[0.06] text-[11px] text-zinc-300">
                  <span className="text-zinc-500 block text-[10px]">Detected Vector:</span>
                  <span>{confirmingRevokeEntity.accessVector}</span>
                </div>
              )}
            </div>

            {/* Verification Checklist */}
            <div className="space-y-1.5 text-xs text-zinc-300">
              <div className="text-[11px] font-mono uppercase text-zinc-400 font-semibold">
                Containment Recommendation Scope:
              </div>
              <ul className="space-y-1 text-[11px] font-sans text-zinc-300 list-disc list-inside">
                <li>Recommend terminating active Bastion SSH sessions.</li>
                <li>Recommend severing replica connection pools.</li>
                <li>Recommend invalidating ephemeral cloud STS credentials.</li>
                <li>Log recommendation to immutable audit ledger.</li>
              </ul>
            </div>

            {/* Actions: Cancel vs Confirm */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setConfirmingRevokeEntity(null)}
                disabled={isExecutingRevoke}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-white/[0.1] hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmRevoke}
                disabled={isExecutingRevoke}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-all shadow-lg shadow-[#E8342A]/25 cursor-pointer disabled:opacity-50"
              >
                {isExecutingRevoke ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting Recommendation...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Recommend Containment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
