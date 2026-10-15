import React from 'react';
import { BarChart3, Box, Globe2, KeyRound, Layers3, Shield } from 'lucide-react';
import { ProductView } from '../routing';

type NavigationTarget = ProductView | 'results';

export function ProductHeaderFrame({ children }: { children: React.ReactNode }) {
  return <header className="ikori-product-header sticky top-0 z-40 border-b border-white/[0.06] bg-[#060608]/90 backdrop-blur-md"><div className="mx-auto flex min-h-16 w-full max-w-[1760px] items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 lg:px-8 xl:px-12">{children}</div></header>;
}

export function ProductBrand({ onHome }: { onHome: () => void }) {
  return <button onClick={onHome} className="group flex shrink-0 items-center gap-2.5" aria-label="Go to IKORI home"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#C6613F]/30 bg-[#C6613F]/15 text-[#C6613F] transition-colors group-hover:border-[#C6613F]"><Shield className="h-4 w-4" /></span><strong className="hidden text-sm tracking-wider text-white transition-colors group-hover:text-[#C6613F] xs:inline sm:block">IKORI</strong></button>;
}

const items: Array<{ id: NavigationTarget; label: string; icon: React.ReactNode }> = [
  { id: '3d-graph', label: '3D Graph', icon: <Box className="h-3.5 w-3.5" /> },
  { id: 'threat-map', label: 'Threat Map', icon: <Globe2 className="h-3.5 w-3.5" /> },
  { id: 'matrix', label: 'Org Matrix', icon: <Layers3 className="h-3.5 w-3.5" /> },
  { id: 'access-requests', label: 'Access Requests', icon: <KeyRound className="h-3.5 w-3.5" /> },
  { id: 'results', label: 'Results', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

export function ProductNavigation({ active, onNavigate, hasGraphAlert = false }: { active: NavigationTarget; onNavigate: (target: NavigationTarget) => void; hasGraphAlert?: boolean }) {
  return <nav aria-label="Product navigation" className="ikori-product-nav flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-zinc-900/90 p-1 text-xs font-mono shadow-inner [scrollbar-width:none]">
    {items.map((item) => <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${active === item.id ? 'bg-[#C6613F] font-semibold text-black shadow-sm' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}>{item.icon}<span className="hidden sm:inline">{item.label}</span>{item.id === '3d-graph' && hasGraphAlert && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8342A]" />}{item.id === 'access-requests' && <span className="rounded border border-amber-500/30 bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-400">1</span>}</button>)}
  </nav>;
}
