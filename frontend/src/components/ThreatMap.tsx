// ThreatMap.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Entity, CaseStatus, EntityLocation } from '../types';
import * as topojson from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { IKORI_PERSONAS } from '../data/identityAliases';
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
  onNavigateToAccessRequests: () => void;
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

type LiveMapPhase = 'baseline' | 'anomaly' | 'tracking' | 'contained';

// Map canvas dimensions for Equirectangular projection
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

function getArcGeometry(from: OfficeHub, to: OfficeHub) {
  const dx = to.x - from.x;
  const midX = (from.x + to.x) / 2;
  const curveHeight = Math.min(Math.abs(dx) * 0.26 + Math.abs(to.y - from.y) * 0.08, 105);
  const ctrlY = Math.min(from.y, to.y) - curveHeight;
  return {
    forward: `M ${from.x} ${from.y} Q ${midX} ${ctrlY} ${to.x} ${to.y}`,
    reverse: `M ${to.x} ${to.y} Q ${midX} ${ctrlY} ${from.x} ${from.y}`,
  };
}

export function ThreatMap({
  entities,
  onOpenCaseDetail,
  onUpdateEntityStatus,
  onNavigateToAccessRequests,
}: ThreatMapProps) {
  const [hoveredHubId, setHoveredHubId] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [confirmingRevokeEntity, setConfirmingRevokeEntity] = useState<Entity | null>(null);
  const [isExecutingRevoke, setIsExecutingRevoke] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);
  const [liveMapPhase, setLiveMapPhase] = useState<LiveMapPhase>('baseline');

  useEffect(() => {
    let cycleTimers: Array<ReturnType<typeof setTimeout>> = [];
    let disposed = false;

    const scheduleCycle = () => {
      if (disposed) return;
      cycleTimers = [];
      setLiveMapPhase('baseline');
      cycleTimers.push(
        setTimeout(() => setLiveMapPhase('anomaly'), 5200),
        setTimeout(() => setLiveMapPhase('tracking'), 8500),
        setTimeout(() => setLiveMapPhase('contained'), 10100),
        setTimeout(scheduleCycle, 15000),
      );
    };

    scheduleCycle();
    return () => {
      disposed = true;
      cycleTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

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

  // Ambient city-to-city telemetry routes. These are presentation-only flows
  // between existing monitored hubs and do not assert real incidents.
  const telemetryArcs: TelemetryArc[] = useMemo(() => {
    const byCity = new Map(hubs.map((hub) => [hub.city, hub]));
    const routePairs: Array<[string, string, TelemetryArc['type']]> = [
      ['Seattle', 'Toronto', 'sync'],
      ['San Francisco', 'London', 'sync'],
      ['Austin', 'New York', 'audit'],
      ['New York', 'London', 'sync'],
      ['Toronto', 'Sao Paulo', 'audit'],
      ['Sao Paulo', 'London', 'sync'],
      ['London', 'Amsterdam', 'sync'],
      ['London', 'Dubai', 'audit'],
      ['Amsterdam', 'Mumbai', 'sync'],
      ['Berlin', 'Singapore', 'audit'],
      ['Dubai', 'Bangalore', 'sync'],
      ['Mumbai', 'Singapore', 'sync'],
      ['Bangalore', 'Singapore', 'sync'],
      ['Singapore', 'Seoul', 'audit'],
    ];

    return routePairs.flatMap(([fromCity, toCity, type], index) => {
      const from = byCity.get(fromCity);
      const to = byCity.get(toCity);
      if (!from || !to) return [];
      return [{
        id: `live-${index}-${from.id}-${to.id}`,
        from,
        to,
        type,
        isActive: true,
        label: type === 'audit' ? 'Audit telemetry' : 'Encrypted service telemetry',
      }];
    });
  }, [hubs]);

  const anomalyRoute = useMemo(() => {
    if (hubs.length < 2) return null;
    const origin = hubs.find((hub) => hub.city === 'Bangalore') || hubs.find((hub) => hub.hasEscalated) || hubs[0];
    const target = hubs.find((hub) => hub.city === 'Singapore' && hub.id !== origin.id)
      || [...hubs].filter((hub) => hub.id !== origin.id).sort((a, b) => Math.abs(b.x - origin.x) - Math.abs(a.x - origin.x))[0];
    if (!target) return null;
    return { origin, target, ...getArcGeometry(origin, target) };
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
    setSimulationNotice(`Case reset to Open: ${IKORI_PERSONAS.devraj} (#104) active at Bangalore Hub.`);
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
          <p className="text-xs text-zinc-400 max-w-2xl font-sans">Live anomaly detection and digital-twin interception across monitored hubs.</p>
        </div>

        <button
          onClick={onNavigateToAccessRequests}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-mono font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
        >
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          Intervention Queue
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
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

            {/* Bright digital-twin trace glow */}
            <filter id="blue-trace-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
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
            {telemetryArcs.map((arc, arcIndex) => {
              const pathD = getArcGeometry(arc.from, arc.to).forward;
              const flowColor = arc.type === 'audit' ? '#818CF8' : '#38BDF8';

              return (
                <g key={arc.id} className="pointer-events-none">
                  {/* Subtle static path guide */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={arc.type === 'audit' ? 'rgba(129, 140, 248, 0.18)' : 'rgba(56, 189, 248, 0.16)'}
                    strokeWidth="1"
                  />

                  {/* Flowing animated dash packets */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth="1.35"
                    className="animate-telemetry-flow"
                    opacity="0.64"
                    strokeLinecap="round"
                  />

                  {[0, 1, 2].map((particleIndex) => (
                    <circle
                      key={`${arc.id}-particle-${particleIndex}`}
                      r={particleIndex === 0 ? 2.1 : 1.45}
                      fill={flowColor}
                      opacity={particleIndex === 0 ? 0.95 : 0.7}
                      filter={particleIndex === 0 ? 'url(#blue-trace-glow)' : undefined}
                    >
                      <animateMotion
                        dur={`${2.5 + (arcIndex % 4) * 0.42}s`}
                        begin={`${-(particleIndex * 0.82 + arcIndex * 0.19)}s`}
                        repeatCount="indefinite"
                        path={pathD}
                      />
                    </circle>
                  ))}
                </g>
              );
            })}
          </g>

          {/* Periodic synthetic anomaly and reverse digital-twin interception. */}
          {anomalyRoute && liveMapPhase !== 'baseline' && (
            <g className="pointer-events-none">
              <path
                d={anomalyRoute.forward}
                fill="none"
                stroke="rgba(228, 228, 231, 0.32)"
                strokeWidth="6.5"
                strokeLinecap="round"
              />
              <path
                d={anomalyRoute.forward}
                fill="none"
                stroke="#020204"
                strokeWidth="4.6"
                strokeDasharray="13 9"
                className="animate-anomaly-flow"
                strokeLinecap="round"
              />
              {(liveMapPhase === 'anomaly' || liveMapPhase === 'tracking') && (
                <circle r="5" fill="#020204" stroke="rgba(255,255,255,0.72)" strokeWidth="1.3">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path={anomalyRoute.forward} />
                </circle>
              )}

              {(liveMapPhase === 'tracking' || liveMapPhase === 'contained') && (
                <>
                  <path
                    d={anomalyRoute.reverse}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.18)"
                    strokeWidth="8"
                    filter="url(#blue-trace-glow)"
                  />
                  <path
                    d={anomalyRoute.reverse}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.8"
                    strokeDasharray="9 12"
                    className="animate-twin-trace"
                    strokeLinecap="round"
                    filter="url(#blue-trace-glow)"
                  />
                  <circle r="4.2" fill="#E0F7FF" stroke="#38BDF8" strokeWidth="2" filter="url(#blue-trace-glow)">
                    <animateMotion dur="1.7s" repeatCount="indefinite" path={anomalyRoute.reverse} />
                  </circle>
                </>
              )}

              {liveMapPhase === 'contained' && (
                <>
                  <circle cx={anomalyRoute.origin.x} cy={anomalyRoute.origin.y} r="9" fill="none" stroke="#38BDF8" strokeWidth="2" className="animate-twin-containment" />
                  <circle cx={anomalyRoute.origin.x} cy={anomalyRoute.origin.y} r="5.5" fill="#E0F7FF" stroke="#38BDF8" strokeWidth="2.5" filter="url(#blue-trace-glow)" />
                </>
              )}
            </g>
          )}

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

        {/* Compact incident story: detection, twin response, then human intervention. */}
        {anomalyRoute && (
          <div className="absolute bottom-4 left-4 z-20 w-[340px] max-w-[calc(100%_-_2rem)] rounded-xl border border-cyan-400/25 bg-[#080b11]/95 p-4 font-mono shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${liveMapPhase === 'anomaly' ? 'bg-rose-400' : liveMapPhase === 'tracking' ? 'bg-sky-300' : liveMapPhase === 'contained' ? 'bg-emerald-300' : 'bg-cyan-300'} animate-pulse`} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-white">Digital twin incident</div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">Live simulated response</div>
                </div>
              </div>
              <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[9px] uppercase text-zinc-400">{liveMapPhase}</span>
            </div>

            <div className="space-y-3 py-3 text-xs">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div><div className="text-zinc-500">Detected</div><div className="mt-0.5 text-sm font-semibold text-white">{anomalyRoute.origin.city} → {anomalyRoute.target.city}</div></div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <div><div className="text-zinc-500">Twin action</div><div className="mt-0.5 text-sm text-zinc-200">{liveMapPhase === 'baseline' ? 'Monitoring normal telemetry' : liveMapPhase === 'anomaly' ? 'Unexpected movement flagged' : liveMapPhase === 'tracking' ? 'Tracing signal back to origin' : 'Origin isolated and route contained'}</div></div>
              </div>
            </div>

            <button
              onClick={onNavigateToAccessRequests}
              className="flex w-full items-center justify-between rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2.5 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
            >
              Review intervention steps
              <ChevronRight className="h-4 w-4" />
            </button>
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
            <span className="w-3 h-0.5 bg-zinc-950 ring-1 ring-zinc-500" />
            <span>Anomaly Movement</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span>Digital Twin Trace</span>
          </div>
        </div>
      </div>

      {/* 4. Confirmation Modal for Containment Recommendation */}
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
