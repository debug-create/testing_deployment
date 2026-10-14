// OrgOverview.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Entity, CaseStatus } from '../types';
import { ComparisonStrip } from './ComparisonStrip';
import { StatusBadge } from './StatusBadge';
import { ContextualizedDrawer } from './ContextualizedDrawer';
import { EscalationToast } from './EscalationToast';
import { CaseDetailDrawer } from './CaseDetailDrawer';
import { ThreatMap } from './ThreatMap';
import { Network3DGraph } from './Network3DGraph';
import { PersonaAvatar } from './PersonaAvatar';
import { soundEngine, playAnomalyChime } from '../utils/audioAlert';
import { useAppMode } from '../caseHooks';
import { useTheme } from '../useTheme';
import { AccessRequestsView } from './AccessRequestsView';
import { JITNotificationToast } from './JITNotificationToast';
import { RECORDING_MODE_BADGE } from '../constants';
import {
  Bell,
  Shield,
  Layers,
  Search,
  ArrowUpRight,
  Server,
  Database,
  ShieldAlert,
  Code2,
  Boxes,
  Scale,
  Activity,
  CheckCircle2,
  Globe,
  MapPin,
  Flame,
  Lock,
  Zap,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  Laptop,
  Box,
  Volume2,
  VolumeX,
  RotateCcw,
  Key,
  Clock,
  BarChart3,
} from 'lucide-react';
import { SCENARIO_INTELLIGENCE_CATALOG } from '../data/model_input/loadScenarioIntelligence';

// Dev-only controls flag (hidden from visible product UI by default)
const SHOW_DEV_CONTROLS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_RESEED === 'true';

interface OrgOverviewProps {
  entities: Entity[];
  onNavigateHome: () => void;
  onUpdateEntityCaseStatus: (entityId: string, status: CaseStatus) => void;
  onNavigateToCase?: (caseId: string) => void;
  onNavigateResults?: () => void;
  initialView?: '3d-graph' | 'threat-map' | 'matrix' | 'access-requests';
}

// Department metadata with refined iconography and colors
const DEPARTMENT_META: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  'Core Infrastructure': {
    icon: <Server className="w-3.5 h-3.5" />,
    color: '#38BDF8',
    label: 'Core Infrastructure',
  },
  'Data & Analytics': {
    icon: <Database className="w-3.5 h-3.5" />,
    color: '#A78BFA',
    label: 'Data & Analytics',
  },
  'Security Ops': {
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: '#F43F5E',
    label: 'Security Operations',
  },
  Frontend: {
    icon: <Code2 className="w-3.5 h-3.5" />,
    color: '#34D399',
    label: 'Frontend Engineering',
  },
  Product: {
    icon: <Boxes className="w-3.5 h-3.5" />,
    color: '#FBBF24',
    label: 'Product & Design',
  },
  'Finance & Legal': {
    icon: <Scale className="w-3.5 h-3.5" />,
    color: '#94A3B8',
    label: 'Finance & Legal',
  },
};

export function OrgOverview({
  entities,
  onNavigateHome,
  onUpdateEntityCaseStatus,
  onNavigateToCase,
  onNavigateResults,
  initialView = '3d-graph',
}: OrgOverviewProps) {
  const { isDemoMode, setDemoMode, persona, setPersona, identity, resetSimulation } = useAppMode();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // View mode switcher: '3d-graph' | 'threat-map' | 'matrix' | 'access-requests'
  const [activeView, setActiveView] = useState<'3d-graph' | 'threat-map' | 'matrix' | 'access-requests'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === '3d-graph' || viewParam === '3d') return '3d-graph';
      if (viewParam === 'threat-map' || viewParam === 'map') return 'threat-map';
      if (viewParam === 'matrix' || viewParam === 'topology') return 'matrix';
      if (viewParam === 'access-requests' || viewParam === 'jit' || viewParam === 'access') return 'access-requests';
    }
    return initialView;
  });
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    SCENARIO_INTELLIGENCE_CATALOG.default_scenario_id
  );

  // Audio alert mute toggle state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => soundEngine.getMuted());

  const handleToggleMute = () => {
    const newState = soundEngine.toggleMuted();
    setIsAudioMuted(newState);
    if (!newState) {
      // Play brief test chime on unmute
      playAnomalyChime();
    }
  };

  // Notification system states: fired conditionally after data resolves if a qualifying case exists
  const [toastVisible, setToastVisible] = useState(false);
  const [jitToastVisible, setJitToastVisible] = useState(false);
  const [hasEscalationFired, setHasEscalationFired] = useState(false);
  const [isBellPulsing, setIsBellPulsing] = useState(false);
  const [notificationBellOpen, setNotificationBellOpen] = useState(false);

  // Selected Entity for Right-Side Slide-in Drawer
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Contextualized silent drawer
  const [isContextualizedDrawerOpen, setIsContextualizedDrawerOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Identify the first qualifying escalated case (Devraj)
  const qualifyingEscalatedEntity = useMemo(() => {
    return (
      entities.find(
        (e) =>
          e.id.includes('devraj') ||
          e.riskScore >= 70 ||
          (e.riskLevel === 'escalated' && e.caseStatus === 'Open')
      ) || null
    );
  }, [entities]);

  // Wait for entity data, check for qualifying case, then fire toast once per session
  useEffect(() => {
    if (!qualifyingEscalatedEntity || hasEscalationFired) return;

    const timer = setTimeout(() => {
      setToastVisible(true);
      setHasEscalationFired(true);
      setIsBellPulsing(true);

      const pulseTimeout = setTimeout(() => {
        setIsBellPulsing(false);
      }, 1600);

      return () => clearTimeout(pulseTimeout);
    }, 1200);

    return () => clearTimeout(timer);
  }, [qualifyingEscalatedEntity, hasEscalationFired]);

  // Alert reviewer / analyst about Priya's paused sensitive access request
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeView !== 'access-requests') {
        setJitToastVisible(true);
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [activeView]);

  // Sync URL when switching views
  const handleSwitchView = (view: '3d-graph' | 'threat-map' | 'matrix' | 'access-requests') => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Check if any entity is currently escalated
  const hasEscalatedEntity = useMemo(() => {
    return entities.some(
      (e) => e.riskLevel === 'escalated' || e.caseStatus === 'Containment Recommended'
    );
  }, [entities]);

  // Bell badge count: Requirement is EXACTLY 1 after escalation fires
  const notificationCount = hasEscalationFired ? 1 : 0;

  // Currently open entity for the drawer
  const activeDrawerEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

  // Filtered entities for topology view
  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entity.location?.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        selectedDepartment === 'all' || entity.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [entities, searchQuery, selectedDepartment]);

  // Grouped departments
  const departments = [
    'Core Infrastructure',
    'Data & Analytics',
    'Security Ops',
    'Frontend',
    'Product',
    'Finance & Legal',
  ] as const;

  const handleOpenEntityCase = (entityId: string) => {
    const found = entities.find((e) => e.id === entityId || e.caseId === entityId);
    const targetCaseId = found?.caseId || entityId;
    if (onNavigateToCase) {
      onNavigateToCase(targetCaseId);
    } else {
      setSelectedEntityId(entityId);
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-[#C6613F]/30 selection:text-white transition-colors duration-200 ${
      resolvedTheme === 'dark' ? 'bg-[#060608] text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* 1. Page Header with View Switcher, Role Switcher, Theme Toggle & Notification Bell */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        resolvedTheme === 'dark' ? 'bg-[#060608]/90 border-white/[0.06]' : 'bg-white/90 border-zinc-200 shadow-xs'
      }`}>
        <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand + Navigation Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 group outline-none cursor-pointer"
              title="Return to IKORI Home"
            >
              <div className="w-7 h-7 rounded-lg bg-[#C6613F]/15 border border-[#C6613F]/30 flex items-center justify-center text-[#C6613F] group-hover:border-[#C6613F] transition-colors">
                <Shield className="w-4 h-4" />
              </div>
              <span className={`font-bold text-sm tracking-wider group-hover:text-[#C6613F] transition-colors ${
                resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
              }`}>
                IKORI
              </span>
            </button>

            <span className="text-zinc-500 font-mono text-xs">/</span>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`font-medium ${resolvedTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>SOC Console</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                resolvedTheme === 'dark' ? 'bg-white/[0.04] text-zinc-400 border-white/[0.06]' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}>
                {entities.length} nodes
              </span>
            </div>
          </div>

          {/* Center: View Switcher (3D Topology vs Threat Map vs Org Matrix vs Access Requests) */}
          <div className={`flex items-center p-1 rounded-xl border text-xs font-mono shadow-inner ${
            resolvedTheme === 'dark' ? 'bg-zinc-900/90 border-white/[0.08]' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              onClick={() => handleSwitchView('3d-graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === '3d-graph'
                  ? 'bg-[#C6613F] text-black font-semibold shadow-sm'
                  : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Graph</span>
              {hasEscalatedEntity && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8342A] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => handleSwitchView('threat-map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'threat-map'
                  ? 'bg-[#C6613F] text-black font-semibold shadow-sm'
                  : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Threat Map</span>
            </button>

            <button
              onClick={() => handleSwitchView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'matrix'
                  ? 'bg-[#C6613F] text-black font-semibold shadow-sm'
                  : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Org Matrix</span>
            </button>

            <button
              onClick={() => handleSwitchView('access-requests')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'access-requests'
                  ? 'bg-[#C6613F] text-black font-semibold shadow-sm'
                  : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Access Requests</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                1 Paused
              </span>
            </button>

            <button
              onClick={onNavigateResults}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Open Results & Evaluation"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Results</span>
            </button>
          </div>

          {/* Right: Mode Indicator, Role Switcher, Theme Switcher, Notifications */}
          <div className="flex items-center gap-2">
            {/* Simulation Banner Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-[10px] text-amber-500 tracking-wider">
                {RECORDING_MODE_BADGE}
              </span>
            </div>

            {/* Role Switcher with separation of duties badge */}
            <div className="flex items-center gap-1.5">
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as any)}
                className={`border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#C6613F] cursor-pointer ${
                  resolvedTheme === 'dark' ? 'bg-zinc-900 border-white/10 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                }`}
                title="Switch role persona (Separation of Duties)"
              >
                <option value="analyst">Analyst: Alex Thorne (Propose)</option>
                <option value="reviewer">Reviewer: Sarah Sterling (Approve)</option>
                <option value="admin">Admin: Elena Rostova (Enforce)</option>
              </select>
            </div>

            {/* Theme Toggle (Dark / Light / System) */}
            <div className={`flex items-center p-0.5 rounded-lg border ${
              resolvedTheme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <button
                onClick={() => setTheme('dark')}
                title="Dark theme"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#C6613F] text-black'
                    : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('light')}
                title="Light theme"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  theme === 'light'
                    ? 'bg-[#C6613F] text-black'
                    : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                title="System preference"
                className={`p-1 rounded cursor-pointer transition-colors ${
                  theme === 'system'
                    ? 'bg-[#C6613F] text-black'
                    : resolvedTheme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reseed Prototype Benchmark State (Dev-only, hidden from visible product UI) */}
            {SHOW_DEV_CONTROLS && (
              <button
                onClick={resetSimulation}
                className="px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Reseed and reset all case data to pristine benchmark state"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C6613F]" />
                <span className="hidden sm:inline">Reseed</span>
              </button>
            )}

            {/* Sound Effects Mute Toggle */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:text-zinc-300'
                  : resolvedTheme === 'dark'
                  ? 'bg-[#C6613F]/15 border-[#C6613F]/40 text-[#E07B57] hover:bg-[#C6613F]/25'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title={isAudioMuted ? 'Unmute anomaly sound chime' : 'Mute anomaly sound chime'}
              aria-label={isAudioMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                id="escalation-notification-bell"
                onClick={() => setNotificationBellOpen(!notificationBellOpen)}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer ${
                  notificationBellOpen
                    ? 'bg-zinc-800/90 border-white/20 text-white'
                    : resolvedTheme === 'dark'
                    ? 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-zinc-100'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                } ${isBellPulsing ? 'animate-bell-pulse border-[#E8342A]/80 text-[#E8342A]' : ''}`}
                aria-label="Escalation alerts"
              >
                <Bell className={`w-4 h-4 ${isBellPulsing ? 'text-[#E8342A]' : ''}`} />
                {notificationCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8342A] text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-md shadow-[#E8342A]/40 ${
                      isBellPulsing ? 'animate-ping' : ''
                    }`}
                  >
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown */}
              {notificationBellOpen && (
                <div className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-2xl p-4 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-150 ${
                  resolvedTheme === 'dark' ? 'bg-[#09090d] border-white/[0.1]' : 'bg-white border-zinc-200'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-3">
                    <span className="font-mono uppercase text-[11px] font-semibold text-zinc-300">
                      System Escalations & Access
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {(hasEscalationFired ? 1 : 0) + 1} Active
                    </span>
                  </div>

                  {/* 1. Priya Ramesh Paused Access Request */}
                  <div
                    onClick={() => {
                      setNotificationBellOpen(false);
                      handleSwitchView('access-requests');
                    }}
                    className="p-3 rounded-lg bg-[#141009] border border-amber-500/30 hover:border-amber-400 hover:bg-[#1c140c] transition-all cursor-pointer group mb-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>AR-203 — Sensitive Access Paused</span>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-snug">
                      <strong>Priya Ramesh</strong>: Emergency access to Payments Bastion paused before exposure. Reviewer authorization required.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span className="text-amber-400 font-medium">Review JIT Access →</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">15m TTL Scoped</span>
                    </div>
                  </div>

                  {/* 2. Devraj Malhotra Containment */}
                  {hasEscalationFired && (
                    <div
                      onClick={() => {
                        setNotificationBellOpen(false);
                        handleOpenEntityCase('104');
                      }}
                      className="p-3 rounded-lg bg-[#140b0b] border border-[#E8342A]/30 hover:border-[#E8342A] hover:bg-[#1a0e0e] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-[#E8342A] mb-1">
                        <span>Case #104 — Containment Recommended</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-snug">
                        <strong>Devraj Malhotra</strong>: Residual risk 100/100. Singapore ASN ingress + Vault master key read + 4.8 GB S3 dump.
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                        <span>Scoped upload hold active</span>
                        <span className="text-[#C6613F] font-medium">Open Dossier →</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-white/[0.04] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>Simulated enforcement</span>
                    <span>Contract 2.0.0</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-8">
        {/* Section 1: Scenario Intelligence and graph share one model_input scenario. */}
        <ComparisonStrip
          scenarioId={selectedScenarioId}
          onScenarioChange={setSelectedScenarioId}
        />

        {/* Section 2: Visual Topology / Threat Map Switcher */}
        {activeView === '3d-graph' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h3 className={`text-sm font-bold tracking-tight ${resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                  3D Telemetry Graph & Identity Topology
                </h3>
                <p className="text-xs text-zinc-400">
                  Selected compiler scenario with candidate relationships and raw event context. Rotate, hover, or select nodes and edges to investigate.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg border border-white/10 bg-zinc-900 text-xs font-mono text-zinc-300">
                Dataset graph: {selectedScenarioId}
              </span>
            </div>

            <Network3DGraph
              entities={entities}
              onSelectEntity={handleOpenEntityCase}
              onOpenCase={handleOpenEntityCase}
              onReseed={SHOW_DEV_CONTROLS ? resetSimulation : undefined}
              selectedEntityId={selectedEntityId}
              departmentFilter={selectedDepartment}
              theme={resolvedTheme}
              scenarioId={selectedScenarioId}
            />
          </div>
        )}

        {activeView === 'threat-map' && (
          <div className="space-y-4">
            <ThreatMap
              entities={entities}
              onOpenCaseDetail={handleOpenEntityCase}
              onUpdateEntityStatus={onUpdateEntityCaseStatus}
            />
          </div>
        )}

        {activeView === 'matrix' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C6613F]" />
                <h2 className={`text-xs font-mono font-semibold uppercase tracking-wider ${
                  resolvedTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                }`}>
                  Organization Matrix ({filteredEntities.length} Total Nodes)
                </h2>
              </div>

              {/* Search & Department Filters */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter entity, role, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs placeholder-zinc-500 focus:outline-none focus:border-[#C6613F]/60 transition-colors w-44 sm:w-60 ${
                      resolvedTheme === 'dark' ? 'bg-zinc-900/60 border-white/[0.08] text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                    }`}
                  />
                </div>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                    resolvedTheme === 'dark' ? 'bg-zinc-900/60 border-white/[0.08] text-zinc-300' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department Sections */}
            <div className="space-y-8">
              {departments.map((dept) => {
                const deptEntities = filteredEntities.filter((e) => e.department === dept);
                if (deptEntities.length === 0) return null;
                const meta = DEPARTMENT_META[dept];

                return (
                  <div key={dept} className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-1.5 border-b border-white/[0.04]">
                      <div className="flex items-center gap-2 font-medium">
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center border border-white/[0.06] bg-white/[0.02]"
                          style={{ color: meta.color }}
                        >
                          {meta.icon}
                        </span>
                        <span className={`font-semibold tracking-wide ${
                          resolvedTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                        }`}>
                          {dept}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {deptEntities.length} entities
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {deptEntities.map((entity) => {
                        const isEscalated = entity.riskLevel === 'escalated';
                        const isHold = entity.details?.protective_hold_active;
                        const isResolved = entity.riskLevel === 'resolved';

                        return (
                          <div
                            key={entity.id}
                            onClick={() => handleOpenEntityCase(entity.id)}
                            className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left hover:-translate-y-0.5 ${
                              isEscalated
                                ? 'bg-[#120808]/90 border-rose-500/40 hover:border-rose-500 hover:shadow-lg'
                                : isHold
                                ? 'bg-[#0f0d0b]/90 border-amber-500/35 hover:border-amber-500 hover:shadow-md'
                                : isResolved
                                ? 'bg-[#090f0c]/90 border-emerald-500/25 hover:border-emerald-500 hover:shadow-md'
                                : resolvedTheme === 'dark'
                                ? 'bg-[#09090d]/80 border-white/[0.05] hover:border-white/[0.18]'
                                : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PersonaAvatar
                                  id={entity.id}
                                  name={entity.name}
                                  size="sm"
                                  status={isEscalated ? 'escalated' : isHold ? 'hold' : isResolved ? 'cleared' : 'baseline'}
                                />
                                <div className="min-w-0">
                                  <h4 className={`font-semibold text-xs truncate ${
                                    resolvedTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                                  }`}>
                                    {entity.name}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 truncate">
                                    {entity.role}
                                  </p>
                                </div>
                              </div>
                              <StatusBadge
                                status={entity.caseStatus}
                                riskLevel={entity.riskLevel}
                                riskScore={entity.riskScore}
                                size="sm"
                              />
                            </div>

                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                              {entity.summary}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] font-mono text-zinc-400">
                              <span>Active {entity.lastActive}</span>
                              <span className="flex items-center gap-1 text-[#C6613F] font-semibold">
                                <span>Inspect</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2D: Context-Aware Just-in-Time Access */}
        {activeView === 'access-requests' && (
          <AccessRequestsView
            currentPersona={persona}
            onSwitchPersona={setPersona}
            onNavigateToCase={handleOpenEntityCase}
          />
        )}
      </main>

      {/* 3. Toast Notifications Stack (Stacked vertically one below the other without overlap) */}
      <aside
        aria-label="Active Security Notifications"
        className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none w-[420px] max-w-[calc(100vw-2rem)]"
      >
        <EscalationToast
          isVisible={toastVisible && Boolean(qualifyingEscalatedEntity)}
          caseId={qualifyingEscalatedEntity?.caseId || '104'}
          actorName={qualifyingEscalatedEntity?.name || 'Devraj Malhotra'}
          residualRisk={qualifyingEscalatedEntity?.riskScore || 100}
          primaryCause="Unapproved Singapore ASN ingress + Vault master key read + 4.8 GB S3 dump"
          onReview={() => {
            setToastVisible(false);
            if (qualifyingEscalatedEntity) {
              handleOpenEntityCase(qualifyingEscalatedEntity.caseId || qualifyingEscalatedEntity.id);
            }
          }}
          onDismiss={() => setToastVisible(false)}
        />

        <JITNotificationToast
          isVisible={jitToastVisible}
          requestId="AR-203"
          employeeName="Priya Ramesh"
          resourceName="Payments Production Bastion"
          onReview={() => {
            setJitToastVisible(false);
            handleSwitchView('access-requests');
          }}
          onDismiss={() => setJitToastVisible(false)}
        />
      </aside>

      {/* 4. Contextualized / Under Review Drawer */}
      <ContextualizedDrawer
        isOpen={isContextualizedDrawerOpen}
        onClose={() => setIsContextualizedDrawerOpen(false)}
        entities={entities}
        onSelectCase={(entityId) => {
          setIsContextualizedDrawerOpen(false);
          handleOpenEntityCase(entityId);
        }}
      />

      {/* 5. Slide-In Case Detail Drawer */}
      {!onNavigateToCase && activeDrawerEntity && (
        <CaseDetailDrawer
          entity={activeDrawerEntity}
          isOpen={Boolean(activeDrawerEntity)}
          onClose={() => setSelectedEntityId(null)}
          onUpdateStatus={(entityId, newStatus) => {
            onUpdateEntityCaseStatus(entityId, newStatus);
          }}
        />
      )}
    </div>
  );
}

