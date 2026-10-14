/**
 * Brand & Product Configuration
 * Allows the brand name and messaging to be configured centrally
 * without rewriting UI components.
 */

export interface NavItem {
  label: string
  href: string
  active?: boolean
}

export interface BrandConfig {
  brandName: string
  platformCategory: string
  headlineMain: string
  headlineItalic: string
  headlineEnding: string
  description: string
  location: string
  year: string
  footerSequence: string[]
  navItems: NavItem[]
  primaryCta: string
  secondaryCta: string
  headerCta: string
  technicalAnnotations: {
    title: string
    subtext: string
  }[]
}

export const BRAND_CONFIG: BrandConfig = {
  brandName: 'IKORI',
  platformCategory: 'CYBERSECURITY AI PLATFORM',
  headlineMain: 'See the path',
  headlineItalic: 'before',
  headlineEnding: 'the breach.',
  description:
    'From scattered identity signals to evidence-driven intent, IKORI separates routine work from the paths that become real insider risk.',
  location: 'MANIPAL',
  year: '2026',
  footerSequence: ['EVIDENCE', 'CONTEXT', 'ACTION'],
  navItems: [
    { label: 'PRODUCT', href: '#product', active: true },
    { label: 'ARCHITECTURE', href: '#architecture' },
    { label: 'IMPACT', href: '#impact' },
    { label: 'TEAM', href: '#team' },
  ],
  primaryCta: 'Explore Product',
  secondaryCta: 'Watch Demo',
  headerCta: 'GET STARTED',
  technicalAnnotations: [
    {
      title: 'CONTEXT GRAPH',
      subtext: 'IDENTITY, ACCESS, TELEMETRY & ORGANISATIONAL EVIDENCE',
    },
    {
      title: 'PROBABILISTIC',
      subtext: 'DETERMINISTIC RESIDUAL RISK & CONTEXT ATTENUATION',
    },
    {
      title: 'COST-AWARE',
      subtext: 'SCOPED ACCESS, BLAST RADIUS & PROTECTIVE HOLDS',
    },
    {
      title: 'EXPLAINABLE',
      subtext: 'AUDITABLE SIGNAL ATTRIBUTION & HUMAN APPROVAL GATES',
    },
  ],
}

