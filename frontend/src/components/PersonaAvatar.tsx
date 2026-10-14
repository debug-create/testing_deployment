// src/components/PersonaAvatar.tsx
// High-polish stock headshot photo avatar with duotone studio lighting and initials fallback
// 100% offline & deterministic: uses bundled static SVG portraits

import React from 'react';
import { getPersonaProfile } from '../data/personaAvatars';

interface PersonaAvatarProps {
  id?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'escalated' | 'hold' | 'cleared' | 'indeterminate' | 'baseline';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-5 h-5', text: 'text-[9px]', img: 20 },
  sm: { box: 'w-7 h-7', text: 'text-[10px]', img: 28 },
  md: { box: 'w-9 h-9', text: 'text-xs', img: 36 },
  lg: { box: 'w-12 h-12', text: 'text-sm', img: 48 },
  xl: { box: 'w-16 h-16', text: 'text-base', img: 64 },
};

export function PersonaAvatar({
  id = '',
  name = '',
  size = 'md',
  status,
  className = '',
  showBorder = true,
}: PersonaAvatarProps) {
  const profile = getPersonaProfile(id, name);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : profile?.initials || '??';

  const statusBorderClass = (() => {
    if (!showBorder) return 'border-transparent';
    if (status === 'escalated') return 'border-rose-500/80 ring-2 ring-rose-500/20';
    if (status === 'hold') return 'border-amber-500/80 ring-2 ring-amber-500/20';
    if (status === 'cleared') return 'border-emerald-500/70 ring-2 ring-emerald-500/20';
    if (status === 'indeterminate') return 'border-sky-500/60 ring-2 ring-sky-500/15';
    return 'border-white/10 group-hover:border-white/25';
  })();

  if (profile?.avatarSvg) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden border transition-all duration-200 ${sizeConfig.box} ${statusBorderClass} ${className}`}
        title={`${profile.name} (${profile.role})`}
      >
        <img
          src={profile.avatarSvg}
          alt={profile.name}
          className="w-full h-full object-cover select-none"
          loading="eager"
          referrerPolicy="no-referrer"
        />
        {status === 'escalated' && (
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-black" />
        )}
      </div>
    );
  }

  // Fallback to initials
  return (
    <div
      className={`relative shrink-0 rounded-full flex items-center justify-center font-mono font-bold border transition-all duration-200 bg-white/5 text-zinc-300 ${sizeConfig.box} ${sizeConfig.text} ${statusBorderClass} ${className}`}
    >
      {initials}
      {status === 'escalated' && (
        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-black" />
      )}
    </div>
  );
}
