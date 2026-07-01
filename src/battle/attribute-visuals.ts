export type AttributeVisual = {
  attribute: string
  slug: string
  image: string
  from: string
  to: string
  glow: string
  particle: string
}

export const ATTRIBUTE_VISUALS: Record<string, AttributeVisual> = {
  ほのお: {
    attribute: 'ほのお',
    slug: 'fire',
    image: '/battle/attribute-cards/fire.svg',
    from: '#fb7185',
    to: '#f97316',
    glow: 'rgba(248,113,113,.72)',
    particle: '🔥',
  },
  みず: {
    attribute: 'みず',
    slug: 'water',
    image: '/battle/attribute-cards/water.svg',
    from: '#38bdf8',
    to: '#2563eb',
    glow: 'rgba(56,189,248,.7)',
    particle: '💧',
  },
  かぜ: {
    attribute: 'かぜ',
    slug: 'wind',
    image: '/battle/attribute-cards/wind.svg',
    from: '#86efac',
    to: '#22d3ee',
    glow: 'rgba(134,239,172,.66)',
    particle: '🌪️',
  },
  つち: {
    attribute: 'つち',
    slug: 'earth',
    image: '/battle/attribute-cards/earth.svg',
    from: '#fbbf24',
    to: '#92400e',
    glow: 'rgba(251,191,36,.64)',
    particle: '⛰️',
  },
  ひかり: {
    attribute: 'ひかり',
    slug: 'light',
    image: '/battle/attribute-cards/light.svg',
    from: '#fef08a',
    to: '#f472b6',
    glow: 'rgba(254,240,138,.78)',
    particle: '✨',
  },
  やみ: {
    attribute: 'やみ',
    slug: 'dark',
    image: '/battle/attribute-cards/dark.svg',
    from: '#818cf8',
    to: '#111827',
    glow: 'rgba(129,140,248,.66)',
    particle: '🌑',
  },
  でんき: {
    attribute: 'でんき',
    slug: 'electric',
    image: '/battle/attribute-cards/electric.svg',
    from: '#fde047',
    to: '#06b6d4',
    glow: 'rgba(253,224,71,.76)',
    particle: '⚡',
  },
  こおり: {
    attribute: 'こおり',
    slug: 'ice',
    image: '/battle/attribute-cards/ice.svg',
    from: '#bfdbfe',
    to: '#22d3ee',
    glow: 'rgba(191,219,254,.76)',
    particle: '❄️',
  },
  くさ: {
    attribute: 'くさ',
    slug: 'grass',
    image: '/battle/attribute-cards/grass.svg',
    from: '#bef264',
    to: '#16a34a',
    glow: 'rgba(190,242,100,.66)',
    particle: '🌿',
  },
  はがね: {
    attribute: 'はがね',
    slug: 'steel',
    image: '/battle/attribute-cards/steel.svg',
    from: '#e5e7eb',
    to: '#64748b',
    glow: 'rgba(226,232,240,.7)',
    particle: '⚙️',
  },
  まほう: {
    attribute: 'まほう',
    slug: 'magic',
    image: '/battle/attribute-cards/magic.svg',
    from: '#f0abfc',
    to: '#7c3aed',
    glow: 'rgba(240,171,252,.7)',
    particle: '🔮',
  },
  ドラゴン: {
    attribute: 'ドラゴン',
    slug: 'dragon',
    image: '/battle/attribute-cards/dragon.svg',
    from: '#fdba74',
    to: '#dc2626',
    glow: 'rgba(253,186,116,.7)',
    particle: '🐉',
  },
  ロボ: {
    attribute: 'ロボ',
    slug: 'robot',
    image: '/battle/attribute-cards/robot.svg',
    from: '#67e8f9',
    to: '#475569',
    glow: 'rgba(103,232,249,.68)',
    particle: '🤖',
  },
  スター: {
    attribute: 'スター',
    slug: 'star',
    image: '/battle/attribute-cards/star.svg',
    from: '#fde68a',
    to: '#c084fc',
    glow: 'rgba(253,230,138,.78)',
    particle: '🌟',
  },
  ふしぎ: {
    attribute: 'ふしぎ',
    slug: 'mystery',
    image: '/battle/attribute-cards/mystery.svg',
    from: '#5eead4',
    to: '#a855f7',
    glow: 'rgba(94,234,212,.7)',
    particle: '🌀',
  },
}

export function attributeVisual(attribute: string) {
  return ATTRIBUTE_VISUALS[attribute] ?? ATTRIBUTE_VISUALS.ふしぎ
}
