// ── 60-30-10 Color System ──────────────────────────────────────────────────
// 60% Base/Canvas — light neutral slate (#F8FAFC backgrounds, #FFFFFF cards)
// 30% Structural — deep navy/midnight (#0F172A / #1E293B text, headers, borders)
// 10% Accent/CTA — electric indigo (#4F46E5 / #2563EB buttons, selection, badges)

export const COLORS = {
  // 60% Canvas + surfaces (light slate). `forest` keeps its legacy nesting so
  // existing screens can migrate gradually; values now follow the light theme.
  forest: {
    950: '#F8FAFC', // screen background
    900: '#FFFFFF', // card surface (also white text-on-accent)
    800: '#F1F5F9', // inputs, secondary surfaces, bubbles
    700: '#E2E8F0', // border (light)
    600: '#CBD5E1', // border (medium)
    500: '#94A3B8', // muted text
    400: '#64748B', // muted text / placeholders
    300: '#475569', // secondary text
    100: '#0F172A', // primary text (navy-900)
  },
  // 30% Structural navy — dark text, headers, borders.
  cream: {
    50: '#0F172A', // primary heading/body text
    100: '#334155', // secondary primary text
    200: '#1E293B', // labels
  },
  // 10% Accent — electric indigo for CTAs, active states, badges.
  saffron: {
    500: '#4338CA', // active day bg / borders
    400: '#4F46E5', // primary CTA bg, accent text, active borders
    300: '#6366F1', // active/highlight text
  },
  crimson: {
    500: '#DC2626',
  },
  // Semantic aliases for new components.
  accent: '#4F46E5',
  accentSoft: 'rgba(79, 70, 229, 0.12)',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  nav: '#0F172A',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
}

export const FONTS = {
  display: { fontFamily: 'Fraunces-Regular' as string },
}
