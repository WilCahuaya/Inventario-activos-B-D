/**
 * Breakpoints (Tailwind + preset):
 * - default … <640px   celular
 * - sm      640px+      celular grande
 * - md      768px+      tablet
 * - lg      1024px+     PC
 * - xl      1280px+     PC grande
 * - 2xl     1536px+     PC extragrande
 * - 3xl     1920px+     monitor ultrawide / 4K
 */
export const panelTailwindPreset = {
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
      },
      maxWidth: {
        panel: "1600px",
        "panel-xl": "1720px",
        "panel-3xl": "1920px",
      },
    },
  },
};
