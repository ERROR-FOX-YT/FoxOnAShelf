export const THEMES = {
  parchment: { bg: '#F5E9D4', fg: '#1F2937', border: '#7B4B27' },
  sepia:     { bg: '#E8DCC0', fg: '#3E2C1C', border: '#8B6F47' },
  night:     { bg: '#1A1A1A', fg: '#E6E7E8', border: '#C8A26B' },
  snow:      { bg: '#FAFAFA', fg: '#111111', border: '#666666' },
  forest:    { bg: '#2A3B2D', fg: '#E8E0CC', border: '#A8B5A0' }
};

export const FONTS = {
  serif:   { label: 'Serif',   stack: 'Georgia, "Times New Roman", serif' },
  sans:    { label: 'Sans',    stack: '-apple-system, system-ui, sans-serif' },
  mono:    { label: 'Mono',    stack: '"Fira Code", Consolas, monospace' },
  dyslexic:{ label: 'Dyslexic', stack: 'Open Dyslexic, sans-serif' }
};

export const WIDTHS = {
  narrow: { value: 36, label: 'Estrecha' },
  medium: { value: 44, label: 'Media' },
  wide:   { value: 54, label: 'Ancha' }
};

export const FONT_SIZES = [
  { value: 14, label: 'XS' },
  { value: 18, label: 'S' },
  { value: 22, label: 'M' },
  { value: 26, label: 'L' },
  { value: 30, label: 'XL' }
];

export const LINE_HEIGHTS = {
  compact: { value: 1.5,  label: 'Compacto' },
  normal:  { value: 1.75, label: 'Normal' },
  wide:    { value: 2.0,  label: 'Amplio' }
};

export const GUTTER_SPACING = {
  beat:   200,
  escena: 600,
  salto:  1500
};

// OUTERS eliminado — los bordes de "libro" ya no se usan
export const OUTERS = {};

export const DARK_THEMES = ['night', 'forest'];
