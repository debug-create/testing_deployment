// ShiftMapGraph.tsx
import React, { useState, useMemo } from 'react';
import { ShiftMapData, BehaviorClassification, ShiftMapNode, ShiftMapEdge } from '../types';
import {
  User,
  Laptop,
  Database,
  Globe,
  Lock,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Server,
  Terminal,
  Activity,
  Filter,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShiftMapGraphProps {
  data: ShiftMapData;
  actorName: string;
}

export function ShiftMapGraph({ data, actorName }: ShiftMapGraphProps) {
  const { nodes, edges, change_point_timestamp, change_point_description } = data;

  // Filter state for outcome classification
  const [filter, setFilter] = useState<'all' | 'unexplained' | 'explained' | 'change-point'>('all');

  // Selected item state (either an edge index or a node id)
  const defaultSelectedEdgeIndex = useMemo(() => {
    const cpIndex = edges.findIndex(
      (e) => e.isChangePoint || e.timestamp === change_point_timestamp
    );
    return cpIndex >= 0 ? cpIndex : 0;
  }, [edges, change_point_timestamp]);

  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(
    edges.length > 0 ? defaultSelectedEdgeIndex : null
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Categorize nodes into 4 horizontal architectural lanes
  const lanes = useMemo(() => {
    const identityNodes = nodes.filter((n) => n.type === 'identity');
    const deviceNodes = nodes.filter((n) => n.type === 'device');
    const resourceNodes = nodes.filter((n) => n.type === 'resource');
    const destinationNodes = nodes.filter((n) => n.type === 'destination');

    return [
      { id: 'identity', title: '01. Identity & Credentials', icon: User, nodes: identityNodes },
      { id: 'device', title: '02. Ingress & Gateways', icon: Laptop, nodes: deviceNodes },
      { id: 'resource', title: '03. Targeted Resources', icon: Database, nodes: resourceNodes },
      { id: 'destination', title: '04. Destination & Egress', icon: Globe, nodes: destinationNodes },
    ];
  }, [nodes]);

  // Extract unique chronological timestamps for the horizontal time axis
  const timelineTicks = useMemo(() => {
    const times = Array.from(new Set(edges.map((e) => e.timestamp)));
    return times;
  }, [edges]);

  // Filtered edges based on selected filter
  const displayedEdges = useMemo(() => {
    if (filter === 'unexplained') {
      return edges.filter((e) => e.status === 'unexplained');
    }
    if (filter === 'explained') {
      return edges.filter((e) => e.status === 'explained');
    }
    if (filter === 'change-point') {
      return edges.filter(
        (e) => e.isChangePoint || e.timestamp === change_point_timestamp
      );
    }
    return edges;
  }, [edges, filter, change_point_timestamp]);

  // Color mapping helper
  const getStatusTheme = (status: BehaviorClassification) => {
    switch (status) {
      case 'explained':
        return {
          stroke: '#C6613F',
          border: 'border-[#C6613F]/50',
          bg: 'bg-[#C6613F]/10',
          text: 'text-[#C6613F]',
          badge: 'bg-[#C6613F]/20 text-[#C6613F] border-[#C6613F]/40',
          glow: 'rgba(198, 97, 63, 0.4)',
        };
      case 'partial':
        return {
          stroke: '#F59E0B',
          border: 'border-amber-500/50',
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          glow: 'rgba(245, 158, 11, 0.4)',
        };
      case 'unexplained':
        return {
          stroke: '#E8342A',
          border: 'border-[#E8342A]/60',
          bg: 'bg-[#E8342A]/15',
          text: 'text-[#E8342A]',
          badge: 'bg-[#E8342A]/20 text-[#E8342A] border-[#E8342A]/50',
          glow: 'rgba(232, 52, 42, 0.5)',
        };
      case 'indeterminate':
      default:
        return {
          stroke: '#71717A',
          border: 'border-zinc-700',
          bg: 'bg-zinc-800/60',
          text: 'text-zinc-400',
          badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          glow: 'rgba(113, 113, 122, 0.2)',
        };
    }
  };

  // Node icon helper
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'identity':
        return <User className="w-4 h-4 text-zinc-200" />;
      case 'device':
        return <Laptop className="w-4 h-4 text-zinc-200" />;
      case 'resource':
        return <Database className="w-4 h-4 text-zinc-200" />;
      case 'destination':
        return <Globe className="w-4 h-4 text-zinc-200" />;
      default:
        return <Server className="w-4 h-4 text-zinc-200" />;
    }
  };

  // Currently inspected item detail
  const currentEdge = selectedEdgeIndex !== null ? edges[selectedEdgeIndex] : null;
  const currentNode = selectedNodeId !== null ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* 1. Header with Change-Point Callout & Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#140d09] via-[#0e0c10] to-[#09090d] border border-[#C6613F]/30 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="relative mt-0.5">
              <div className="w-9 h-9 rounded-xl bg-[#C6613F]/20 border border-[#C6613F]/40 flex items-center justify-center text-[#ff7e54]">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
                  Continuous Intent Shift Map
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8342A]/20 text-[#E8342A] border border-[#E8342A]/40 font-semibold">
                  Forensic Time-Axis Graph
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-3xl">
                {change_point_description ||
                  `Observed telemetry transitions at ${change_point_timestamp} when authenticated access decoupled from approved role baselines.`}
              </p>
            </div>
          </div>

          {/* Change-point timestamp pill */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">Change-Point:</span>
            <span className="text-amber-300 font-bold">{change_point_timestamp}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Outcome Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-[11px] font-mono w-fit">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-zinc-800 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Transitions ({edges.length})
          </button>
          <button
            onClick={() => setFilter('unexplained')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'unexplained'
                ? 'bg-[#E8342A]/20 text-[#E8342A] border border-[#E8342A]/40 font-semibold'
                : 'text-zinc-400 hover:text-[#E8342A]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#E8342A]" />
            <span>Unexplained</span>
          </button>
          <button
            onClick={() => setFilter('explained')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'explained'
                ? 'bg-[#C6613F]/20 text-[#C6613F] border border-[#C6613F]/40 font-semibold'
                : 'text-zinc-400 hover:text-[#C6613F]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#C6613F]" />
            <span>Explained</span>
          </button>
          <button
            onClick={() => setFilter('change-point')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === 'change-point'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-zinc-400 hover:text-amber-300'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Change-Point Only</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6613F]" />
            <span>Explained</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8342A]" />
            <span>Unexplained</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
            <span>Indeterminate</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Change-Point</span>
          </div>
        </div>
      </div>

      {/* 3. CENTERPIECE FORENSIC EVIDENCE GRAPH CANVAS */}
      <div className="relative rounded-2xl bg-[#09090d] border border-white/[0.08] p-5 overflow-x-auto shadow-2xl">
        {/* Subtle dot matrix / grid canvas pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none rounded-2xl"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Horizontal Time Axis Bar at Top */}
        <div className="relative z-10 mb-6 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-[#C6613F]" />
              <span className="font-semibold uppercase tracking-wider">Session Timeline Axis</span>
            </div>
            <span className="text-[10px] text-zinc-500">Left-to-Right Progression →</span>
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {timelineTicks.map((time, idx) => {
              const isChangePoint = time === change_point_timestamp;
              return (
                <div
                  key={`${time}-${idx}`}
                  className={`flex flex-col items-center shrink-0 ${
                    isChangePoint ? 'text-amber-400 font-bold' : 'text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isChangePoint && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                    <span className="text-[11px] font-mono">{time}</span>
                  </div>
                  <div
                    className={`h-2 w-[1px] mt-1 ${
                      isChangePoint ? 'bg-amber-400 h-3 w-[2px]' : 'bg-white/[0.15]'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* The 4 Architectural Lanes Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[760px]">
          {lanes.map((lane) => {
            const LaneIcon = lane.icon;

            return (
              <div
                key={lane.id}
                className="flex flex-col rounded-xl bg-zinc-900/40 border border-white/[0.05] p-3 space-y-3"
              >
                {/* Lane Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <LaneIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                      {lane.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {lane.nodes.length}
                  </span>
                </div>

                {/* Nodes inside this Lane */}
                <div className="space-y-2.5 flex-1">
                  {lane.nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const isTargetOfCurrentEdge = currentEdge && currentEdge.to === node.id;
                    const isSourceOfCurrentEdge = currentEdge && currentEdge.from === node.id;

                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          // Find edge involving this node
                          const edgeIdx = edges.findIndex(
                            (e) => e.from === node.id || e.to === node.id
                          );
                          if (edgeIdx >= 0) setSelectedEdgeIndex(edgeIdx);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                          isSelected
                            ? 'bg-[#181214] border-[#C6613F] ring-1 ring-[#C6613F] shadow-lg shadow-[#C6613F]/20'
                            : isTargetOfCurrentEdge || isSourceOfCurrentEdge
                            ? 'bg-[#131118] border-white/30 ring-1 ring-white/20'
                            : node.protectiveHold
                            ? 'bg-[#180f0c]/90 border-amber-500/50 hover:border-amber-400'
                            : 'bg-zinc-900/80 border-white/[0.08] hover:border-white/20 hover:bg-zinc-800/80'
                        }`}
                      >
                        {/* Node Type and Badges */}
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                              {getNodeIcon(node.type)}
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              {node.type}
                            </span>
                          </div>

                          {node.critical && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
                              Critical
                            </span>
                          )}
                        </div>

                        {/* Node Label */}
                        <div className="font-mono text-xs font-semibold text-white break-all leading-snug">
                          {node.label}
                        </div>

                        {/* Protective Hold Flag if applicable */}
                        {node.protectiveHold && (
                          <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] font-mono text-amber-300">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Export blocked (Hold)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Change-Point Visual Banner Divider */}
        <div className="relative z-10 mt-6 p-3.5 rounded-xl bg-[#180e08]/90 border border-amber-500/40 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5 text-amber-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span className="font-bold uppercase tracking-wide">
              Observed Intent Decoupling Point: {change_point_timestamp}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Telemetry before this point was contextualized; subsequent hops were unapproved
          </span>
        </div>
      </div>

      {/* 4. CHRONOLOGICAL FORENSIC TRANSITION STREAM (Edges between Nodes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#C6613F]" />
            <span className="font-semibold uppercase tracking-wider">
              Forensic Access Transitions ({displayedEdges.length})
            </span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Click any transition card to inspect raw telemetry & validation reasoning
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {displayedEdges.map((edge, idx) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            const theme = getStatusTheme(edge.status);
            const isChangePoint =
              edge.isChangePoint || edge.timestamp === change_point_timestamp;
            const isSelected = selectedEdgeIndex === edges.indexOf(edge);

            return (
              <div
                key={`${edge.from}-${edge.to}-${idx}`}
                onClick={() => {
                  setSelectedEdgeIndex(edges.indexOf(edge));
                  setSelectedNodeId(null);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#150f11] border-white/40 ring-1 ring-white/30 shadow-lg'
                    : isChangePoint
                    ? 'bg-[#150d09]/90 border-amber-500/60 shadow-md shadow-amber-950/20 hover:border-amber-400'
                    : 'bg-[#0c0c12] border-white/[0.06] hover:border-white/[0.15] hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${theme.badge}`}
                    >
                      {edge.status}
                    </span>

                    {/* Change-point pulse badge */}
                    {isChangePoint && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>CHANGE-POINT DETECTED</span>
                      </span>
                    )}

                    {edge.label && (
                      <span className="text-xs font-mono text-zinc-300 font-medium">
                        "{edge.label}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{edge.timestamp}</span>
                  </div>
                </div>

                {/* Transition flow visual row */}
                <div className="flex items-center gap-3 pt-3 flex-wrap sm:flex-nowrap">
                  {/* Source Node */}
                  <div className="flex-1 min-w-[140px] p-2.5 rounded-lg bg-zinc-900/80 border border-white/[0.06] flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      {fromNode ? getNodeIcon(fromNode.type) : <User className="w-3.5 h-3.5 text-zinc-300" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                        Source ({fromNode?.type || 'Actor'})
                      </span>
                      <span className="text-xs font-mono font-semibold text-white truncate block">
                        {fromNode?.label || edge.from}
                      </span>
                    </div>
                  </div>

                  {/* Flow Arrow & Vector */}
                  <div className="flex flex-col items-center justify-center px-1 shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="h-[2px] w-6" style={{ backgroundColor: theme.stroke }} />
                      <ArrowRight className="w-4 h-4" style={{ color: theme.stroke }} />
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400 mt-1">
                      Transition Hop
                    </span>
                  </div>

                  {/* Target Node */}
                  <div
                    className={`flex-1 min-w-[140px] p-2.5 rounded-lg border flex items-center gap-2.5 ${
                      toNode?.protectiveHold
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-zinc-900/80 border-white/[0.06]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                      {toNode ? getNodeIcon(toNode.type) : <Database className="w-3.5 h-3.5 text-zinc-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                          Target ({toNode?.type || 'Destination'})
                        </span>
                        {toNode?.critical && (
                          <span className="text-[8px] font-mono uppercase tracking-wider text-rose-400 font-bold px-1 rounded bg-rose-500/15">
                            Restricted
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-semibold text-white truncate block">
                        {toNode?.label || edge.to}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Protective Hold Callout */}
                {(toNode?.protectiveHold || edge.resource?.protectiveHold) && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/50 px-2.5 py-1 rounded-md font-semibold">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>🔒 Protective hold — bulk export blocked, pending SOC review</span>
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      Protected Target: {toNode?.label || edge.resource?.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. INTERACTIVE FORENSIC DETAIL PANEL */}
      {(currentEdge || currentNode) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#0e0e14] border border-white/[0.1] shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#C6613F]/15 border border-[#C6613F]/30 flex items-center justify-center text-[#C6613F]">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Forensic Inspector Panel
                </span>
                <h4 className="text-xs font-mono font-bold text-white">
                  {currentEdge
                    ? `Inspecting Transition: ${currentEdge.label || `${currentEdge.from} → ${currentEdge.to}`}`
                    : `Inspecting Node: ${currentNode?.label}`}
                </h4>
              </div>
            </div>

            {currentEdge && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                    getStatusTheme(currentEdge.status).badge
                  }`}
                >
                  {currentEdge.status}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {currentEdge.timestamp}
                </span>
              </div>
            )}
          </div>

          {currentEdge && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Source Entity
                </span>
                <span className="text-white font-semibold mt-1 block truncate">
                  {currentEdge.from}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Destination Target
                </span>
                <span className="text-white font-semibold mt-1 block truncate">
                  {currentEdge.to}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Change-Point Status
                </span>
                <span
                  className={`font-semibold mt-1 block truncate ${
                    currentEdge.isChangePoint ||
                    currentEdge.timestamp === change_point_timestamp
                      ? 'text-amber-300'
                      : 'text-zinc-400'
                  }`}
                >
                  {currentEdge.isChangePoint ||
                  currentEdge.timestamp === change_point_timestamp
                    ? '⚡ Active Change-Point'
                    : 'Baseline Telemetry'}
                </span>
              </div>
            </div>
          )}

          {/* Contextualized Analysis Reasoning */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono text-zinc-300 leading-relaxed">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#C6613F]" />
              <span>Contextual Validation Reasoning</span>
            </div>
            {currentEdge?.status === 'unexplained' ? (
              <p>
                This transition decoupled from the historical 90-day baseline. No active Jira sprint ticket, PagerDuty on-call shift, or manager authorization covers this direct query to isolated production replicas.
              </p>
            ) : currentEdge?.status === 'partial' ? (
              <p>
                Transition partially supported by departmental tooling entitlements, but lacks verified ticket scope for external network destination routing.
              </p>
            ) : (
              <p>
                Activity aligns with designated role baseline and valid authentication tokens. Normal corporate engineering workflow verified.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
