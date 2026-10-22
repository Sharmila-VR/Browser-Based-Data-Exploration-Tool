export const PALETTES = {
  'okabe-ito': {
    name: 'Okabe-Ito (Colorblind-Safe)',
    primary: '#0072B2',
    accent: '#D55E00',
    colors: ['#0072B2', '#D55E00', '#009E73', '#F0E442', '#CC79A7', '#56B4E9', '#E69F00', '#999999'],
  },
  tol: {
    name: 'Paul Tol (High Contrast)',
    primary: '#332288',
    accent: '#CC6677',
    colors: ['#332288', '#88CCEE', '#44AA99', '#117733', '#DDCC77', '#CC6677', '#AA4499', '#882255'],
  },
  viridis: {
    name: 'Viridis (Perceptual)',
    primary: '#2a788e',
    accent: '#fde725',
    colors: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  },
}

export function getColor(paletteKey, index) {
  const p = PALETTES[paletteKey] || PALETTES['okabe-ito']
  return p.colors[index % p.colors.length]
}
