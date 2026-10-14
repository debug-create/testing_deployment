// src/data/personaAvatars.ts
// Offline static stock headshots for FABLE personas
// Embedded as high-fidelity SVG portraits with cinematic studio lighting, subtle dark duotone grading, and crisp detail.
// Ensures 100% deterministic, offline video-ready recording mode without external network requests.

export interface PersonaProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  avatarSvg: string;
  initials: string;
  accentColor: string;
}

// Generates an inline SVG data URI representing a styled stock portrait
function createHeadshotSvg(config: {
  bgGradient: [string, string];
  skinTone: string;
  hairColor: string;
  hairStyle: 'slick-short' | 'wavy-long' | 'curly-short' | 'straight-medium' | 'crew-cut' | 'bun';
  clothingColor: string;
  clothingStyle: 'hoodie' | 'suit' | 'blazer' | 'turtleneck' | 'button-down';
  hasGlasses?: boolean;
  hasBeard?: boolean;
  lightingAccent: string;
}): string {
  const { bgGradient, skinTone, hairColor, hairStyle, clothingColor, clothingStyle, hasGlasses, hasBeard, lightingAccent } = config;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}" />
        <stop offset="100%" stop-color="${bgGradient[1]}" />
      </linearGradient>
      <linearGradient id="light" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${lightingAccent}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="transparent" />
      </linearGradient>
      <linearGradient id="skinGrad" x1="20%" y1="10%" x2="80%" y2="90%">
        <stop offset="0%" stop-color="${skinTone}" />
        <stop offset="100%" stop-color="${adjustBrightness(skinTone, -25)}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4" />
      </filter>
    </defs>
    
    <!-- Background studio vignette -->
    <rect width="120" height="120" rx="60" fill="url(#bg)" />
    <circle cx="60" cy="60" r="59" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
    <rect width="120" height="120" rx="60" fill="url(#light)" />

    <!-- Shoulders / Clothes -->
    <g filter="url(#shadow)">
      ${
        clothingStyle === 'suit' || clothingStyle === 'blazer'
          ? `<path d="M 20 120 C 22 92, 38 82, 60 84 C 82 82, 98 92, 100 120 Z" fill="${clothingColor}" />
             <polygon points="60,86 52,104 68,104" fill="#E2E8F0" />
             <path d="M 46 86 L 58 120 L 40 120 Z" fill="${adjustBrightness(clothingColor, -18)}" />
             <path d="M 74 86 L 62 120 L 80 120 Z" fill="${adjustBrightness(clothingColor, -18)}" />`
          : clothingStyle === 'turtleneck'
          ? `<path d="M 22 120 C 24 94, 38 84, 60 84 C 82 84, 96 94, 98 120 Z" fill="${clothingColor}" />
             <rect x="48" y="74" width="24" height="16" rx="4" fill="${adjustBrightness(clothingColor, 10)}" />`
          : clothingStyle === 'hoodie'
          ? `<path d="M 20 120 C 24 90, 36 82, 60 82 C 84 82, 96 90, 100 120 Z" fill="${clothingColor}" />
             <path d="M 44 82 C 48 96, 72 96, 76 82 Z" fill="${adjustBrightness(clothingColor, -20)}" />`
          : `<path d="M 20 120 C 24 90, 36 84, 60 84 C 84 84, 96 90, 100 120 Z" fill="${clothingColor}" />
             <polygon points="60,88 50,120 70,120" fill="${adjustBrightness(clothingColor, 15)}" />`
      }
    </g>

    <!-- Neck -->
    <rect x="52" y="66" width="16" height="20" rx="4" fill="${adjustBrightness(skinTone, -15)}" />

    <!-- Head / Face -->
    <g filter="url(#shadow)">
      <ellipse cx="60" cy="52" rx="22" ry="26" fill="url(#skinGrad)" />
      
      <!-- Ears -->
      <circle cx="38" cy="54" r="5.5" fill="${adjustBrightness(skinTone, -10)}" />
      <circle cx="82" cy="54" r="5.5" fill="${adjustBrightness(skinTone, -10)}" />

      <!-- Eyes & Brows -->
      <path d="M 47 44 Q 52 42 56 44" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M 64 44 Q 68 42 73 44" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round" />
      <ellipse cx="51.5" cy="48.5" rx="2.8" ry="2.2" fill="#0F172A" />
      <ellipse cx="68.5" cy="48.5" rx="2.8" ry="2.2" fill="#0F172A" />
      <circle cx="52.2" cy="47.8" r="0.8" fill="#FFF" opacity="0.9" />
      <circle cx="69.2" cy="47.8" r="0.8" fill="#FFF" opacity="0.9" />

      <!-- Nose -->
      <path d="M 60 48 L 58.5 57 L 62.5 57" stroke="${adjustBrightness(skinTone, -30)}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Mouth -->
      <path d="M 53 64 Q 60 67 67 64" stroke="${adjustBrightness(skinTone, -40)}" stroke-width="2" fill="none" stroke-linecap="round" />
    </g>

    <!-- Facial Hair (if applicable) -->
    ${
      hasBeard
        ? `<path d="M 44 56 C 44 74, 52 78, 60 78 C 68 78, 76 74, 76 56 C 73 66, 68 73, 60 73 C 52 73, 47 66, 44 56 Z" fill="${hairColor}" opacity="0.85" />
           <path d="M 54 61 Q 60 63 66 61" stroke="${hairColor}" stroke-width="2.5" fill="none" stroke-linecap="round" />`
        : ''
    }

    <!-- Glasses (if applicable) -->
    ${
      hasGlasses
        ? `<g stroke="#0F172A" stroke-width="1.8" fill="rgba(255,255,255,0.15)">
             <rect x="44" y="43" width="14" height="11" rx="2.5" />
             <rect x="62" y="43" width="14" height="11" rx="2.5" />
             <line x1="58" y1="48" x2="62" y2="48" stroke-width="2" />
             <line x1="38" y1="46" x2="44" y2="46" />
             <line x1="76" y1="46" x2="82" y2="46" />
           </g>`
        : ''
    }

    <!-- Hair Styles -->
    <g filter="url(#shadow)">
      ${
        hairStyle === 'slick-short'
          ? `<path d="M 37 46 C 36 26, 52 22, 60 22 C 72 22, 84 26, 83 46 C 81 32, 68 27, 60 28 C 48 29, 39 36, 37 46 Z" fill="${hairColor}" />
             <path d="M 37 42 C 44 32, 65 30, 83 38 C 76 30, 60 26, 42 32 Z" fill="${adjustBrightness(hairColor, 20)}" opacity="0.6" />`
          : hairStyle === 'wavy-long'
          ? `<path d="M 36 50 C 32 30, 48 20, 60 20 C 74 20, 88 30, 84 50 C 88 64, 88 80, 86 90 C 82 78, 82 60, 80 50 C 78 30, 68 25, 60 25 C 50 25, 42 32, 40 50 C 38 62, 38 78, 34 90 C 32 80, 32 64, 36 50 Z" fill="${hairColor}" />`
          : hairStyle === 'crew-cut'
          ? `<path d="M 38 42 C 38 28, 50 24, 60 24 C 70 24, 82 28, 82 42 C 80 34, 70 28, 60 28 C 50 28, 40 34, 38 42 Z" fill="${hairColor}" />`
          : hairStyle === 'bun'
          ? `<circle cx="60" cy="18" r="10" fill="${hairColor}" />
             <path d="M 37 46 C 36 28, 48 24, 60 24 C 72 24, 84 28, 83 46 C 80 34, 70 30, 60 30 C 50 30, 40 34, 37 46 Z" fill="${hairColor}" />`
          : `<path d="M 36 46 C 35 28, 48 22, 60 22 C 72 22, 85 28, 84 46 C 80 32, 70 26, 60 26 C 50 26, 40 32, 36 46 Z" fill="${hairColor}" />`
      }
    </g>

    <!-- Subtle rim light overlay -->
    <path d="M 25 105 C 28 80, 48 40, 60 24" stroke="${lightingAccent}" stroke-width="2" fill="none" opacity="0.4" filter="blur(1px)" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.replace(/\s+/g, ' ').trim())}`;
}

function adjustBrightness(hex: string, percent: number): string {
  let num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ----------------------------------------------------------------------------
// Local Persona Headshots Map
// ----------------------------------------------------------------------------
export const PERSONA_AVATARS: Record<string, PersonaProfile> = {
  priya: {
    id: 'priya',
    name: 'Priya Ramesh',
    role: 'Lead Reliability / DevOps Engineer',
    department: 'Core Infrastructure',
    initials: 'PR',
    accentColor: '#10B981',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#0f281e', '#06130d'],
      skinTone: '#C68642',
      hairColor: '#1A110B',
      hairStyle: 'wavy-long',
      clothingColor: '#1E293B',
      clothingStyle: 'turtleneck',
      hasGlasses: true,
      lightingAccent: '#10B981',
    }),
  },
  devraj: {
    id: 'devraj',
    name: 'Devraj Malhotra',
    role: 'Staff Infrastructure / Platform Engineer',
    department: 'Core Infrastructure',
    initials: 'DM',
    accentColor: '#E8342A',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#2b0d0c', '#120505'],
      skinTone: '#A66E38',
      hairColor: '#17110C',
      hairStyle: 'slick-short',
      clothingColor: '#0F172A',
      clothingStyle: 'suit',
      hasBeard: true,
      lightingAccent: '#E8342A',
    }),
  },
  arjun: {
    id: 'arjun',
    name: 'Arjun Patel',
    role: 'Senior Data Platform Engineer',
    department: 'Data & Analytics',
    initials: 'AP',
    accentColor: '#F59E0B',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#2d1b06', '#120b02'],
      skinTone: '#B57A42',
      hairColor: '#23180F',
      hairStyle: 'crew-cut',
      clothingColor: '#1E293B',
      clothingStyle: 'button-down',
      hasBeard: true,
      hasGlasses: false,
      lightingAccent: '#F59E0B',
    }),
  },
  neha: {
    id: 'neha',
    name: 'Neha Sharma',
    role: 'Junior SOC Analyst',
    department: 'Security Ops',
    initials: 'NS',
    accentColor: '#38BDF8',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#0c2136', '#040d17'],
      skinTone: '#D29962',
      hairColor: '#1C130D',
      hairStyle: 'bun',
      clothingColor: '#334155',
      clothingStyle: 'blazer',
      hasGlasses: true,
      lightingAccent: '#38BDF8',
    }),
  },
  elena: {
    id: 'elena',
    name: 'Elena Rostova',
    role: 'SOC Director / Security Admin',
    department: 'Security Ops',
    initials: 'ER',
    accentColor: '#C6613F',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#281208', '#100602'],
      skinTone: '#EAC0A2',
      hairColor: '#4A3728',
      hairStyle: 'straight-medium',
      clothingColor: '#18181B',
      clothingStyle: 'blazer',
      lightingAccent: '#C6613F',
    }),
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah Sterling',
    role: 'Senior Security Reviewer',
    department: 'Security Ops',
    initials: 'SS',
    accentColor: '#A78BFA',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#1c1033', '#0a0414'],
      skinTone: '#F3D2B8',
      hairColor: '#7C3A18',
      hairStyle: 'wavy-long',
      clothingColor: '#27272A',
      clothingStyle: 'turtleneck',
      hasGlasses: true,
      lightingAccent: '#A78BFA',
    }),
  },
  alex: {
    id: 'alex',
    name: 'Alex Thorne',
    role: 'Senior Threat Analyst',
    department: 'Security Ops',
    initials: 'AT',
    accentColor: '#38BDF8',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#0f172a', '#020617'],
      skinTone: '#E4B694',
      hairColor: '#27272A',
      hairStyle: 'slick-short',
      clothingColor: '#1E293B',
      clothingStyle: 'hoodie',
      hasBeard: true,
      lightingAccent: '#38BDF8',
    }),
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Vance',
    role: 'VP Financial Systems',
    department: 'Finance & Legal',
    initials: 'MV',
    accentColor: '#94A3B8',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#1e293b', '#0f172a'],
      skinTone: '#8D5524',
      hairColor: '#18181B',
      hairStyle: 'crew-cut',
      clothingColor: '#09090B',
      clothingStyle: 'suit',
      lightingAccent: '#94A3B8',
    }),
  },
  maya: {
    id: 'maya',
    name: 'Maya Lin',
    role: 'Cloud Architect',
    department: 'Core Infrastructure',
    initials: 'ML',
    accentColor: '#38BDF8',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#0c1e2e', '#030b12'],
      skinTone: '#F5D0B5',
      hairColor: '#18181B',
      hairStyle: 'bun',
      clothingColor: '#1E293B',
      clothingStyle: 'turtleneck',
      lightingAccent: '#38BDF8',
    }),
  },
  chen: {
    id: 'chen',
    name: 'Chen Wei',
    role: 'Data Pipeline Specialist',
    department: 'Data & Analytics',
    initials: 'CW',
    accentColor: '#A78BFA',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#1a0f2b', '#07030d'],
      skinTone: '#ECC399',
      hairColor: '#1C1917',
      hairStyle: 'slick-short',
      clothingColor: '#27272A',
      clothingStyle: 'button-down',
      hasGlasses: true,
      lightingAccent: '#A78BFA',
    }),
  },
  lucas: {
    id: 'lucas',
    name: 'Lucas Silva',
    role: 'Frontend Principal Engineer',
    department: 'Frontend',
    initials: 'LS',
    accentColor: '#34D399',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#0a2419', '#020d08'],
      skinTone: '#C68642',
      hairColor: '#292524',
      hairStyle: 'curly-short',
      clothingColor: '#18181B',
      clothingStyle: 'hoodie',
      hasBeard: true,
      lightingAccent: '#34D399',
    }),
  },
  david: {
    id: 'david',
    name: 'David Kim',
    role: 'Product Lead',
    department: 'Product',
    initials: 'DK',
    accentColor: '#FBBF24',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#281d06', '#0f0a01'],
      skinTone: '#E8C4A2',
      hairColor: '#1C1917',
      hairStyle: 'slick-short',
      clothingColor: '#27272A',
      clothingStyle: 'blazer',
      lightingAccent: '#FBBF24',
    }),
  },
  zoe: {
    id: 'zoe',
    name: 'Zoe Taylor',
    role: 'Compliance Lead',
    department: 'Finance & Legal',
    initials: 'ZT',
    accentColor: '#94A3B8',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#1e293b', '#0b111e'],
      skinTone: '#F3D2B8',
      hairColor: '#9A3412',
      hairStyle: 'wavy-long',
      clothingColor: '#18181B',
      clothingStyle: 'turtleneck',
      hasGlasses: true,
      lightingAccent: '#94A3B8',
    }),
  },
  hannah: {
    id: 'hannah',
    name: 'Hannah Scott',
    role: 'Head of People Operations',
    department: 'HR & People',
    initials: 'HS',
    accentColor: '#EC4899',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#2e0c1f', '#12030b'],
      skinTone: '#F5D0B5',
      hairColor: '#3B2F2F',
      hairStyle: 'straight-medium',
      clothingColor: '#27272A',
      clothingStyle: 'blazer',
      lightingAccent: '#EC4899',
    }),
  },
  vikram: {
    id: 'vikram',
    name: 'Vikram Sethi',
    role: 'Cloud Security Lead',
    department: 'Security Ops',
    initials: 'VS',
    accentColor: '#F43F5E',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#2d0e14', '#0d0205'],
      skinTone: '#C68642',
      hairColor: '#1C1917',
      hairStyle: 'slick-short',
      clothingColor: '#18181B',
      clothingStyle: 'hoodie',
      hasBeard: true,
      lightingAccent: '#F43F5E',
    }),
  },
  oliver: {
    id: 'oliver',
    name: 'Oliver Brown',
    role: 'CI/CD & Release Engineer',
    department: 'Core Infrastructure',
    initials: 'OB',
    accentColor: '#06B6D4',
    avatarSvg: createHeadshotSvg({
      bgGradient: ['#08232c', '#020b0e'],
      skinTone: '#ECC399',
      hairColor: '#451A03',
      hairStyle: 'crew-cut',
      clothingColor: '#1E293B',
      clothingStyle: 'button-down',
      lightingAccent: '#06B6D4',
    }),
  },
};

export function getPersonaProfile(identifier: string, nameFallback?: string): PersonaProfile | null {
  const idLower = (identifier || '').toLowerCase();
  for (const [key, profile] of Object.entries(PERSONA_AVATARS)) {
    if (idLower.includes(key) || (nameFallback && nameFallback.toLowerCase().includes(key))) {
      return profile;
    }
  }
  return null;
}
