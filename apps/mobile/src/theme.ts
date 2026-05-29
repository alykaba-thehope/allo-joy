export const colors = {
  // Primaire — bleu ciel Allô Joy
  primary:    '#0ea5e9',
  primaryDark:'#0284c7',
  primaryBg:  '#e0f2fe',

  // Succès / statuts
  success:    '#22c55e',
  warning:    '#f59e0b',
  danger:     '#ef4444',
  info:       '#6366f1',

  // Neutres
  bg:         '#f8fafc',
  surface:    '#ffffff',
  border:     '#e2e8f0',
  textPrimary:'#0f172a',
  textSecond: '#64748b',
  textMuted:  '#94a3b8',

  // Overlay
  overlay:    'rgba(15, 23, 42, 0.6)',
} as const

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const

export const radius = {
  sm: 6, md: 12, lg: 16, xl: 24, full: 999,
} as const

export const font = {
  sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30,
} as const

// Statuts tickets
export const STATUS_COLOR: Record<string, string> = {
  OUVERT:          '#f59e0b',
  EN_COURS:        '#0ea5e9',
  MISE_EN_RELATION:'#6366f1',
  RESOLU:          '#22c55e',
  FERME:           '#94a3b8',
  ANNULE:          '#ef4444',
}

export const STATUS_LABEL: Record<string, string> = {
  OUVERT:          'En attente',
  EN_COURS:        'En cours',
  MISE_EN_RELATION:'Prestataire trouvé',
  RESOLU:          'Résolu',
  FERME:           'Fermé',
  ANNULE:          'Annulé',
}

// Catégories avec icônes Ionicons
export const CATEGORY_ICONS: Record<string, string> = {
  plomberie:    'water-outline',
  electricite:  'flash-outline',
  menage:       'home-outline',
  transport:    'car-outline',
  informatique: 'laptop-outline',
  jardinage:    'leaf-outline',
  demenagement: 'cube-outline',
  autre:        'ellipsis-horizontal-outline',
}

export const COMMUNES = [
  'Ratoma', 'Matoto', 'Matam', 'Kaloum', 'Dixinn',
] as const
