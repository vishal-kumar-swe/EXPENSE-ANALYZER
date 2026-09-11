// ===================================================================
// CATEGORY COLOR PALETTE - utils/categoryColors.js
// ===================================================================
// Single source of truth for "which color is this category" so the
// donut chart segments and the category list dots always match.
//
// The app's theme (App.css :root) only defines a handful of semantic
// colors (primary/success/warning/danger) - not enough distinct hues
// for 9 expense categories. This palette is built around the existing
// --primary-color (#4f46e5) so it still reads as "this app's colors",
// just extended out to a full categorical set.
// ===================================================================

export const CATEGORY_COLORS = {
  'Food & Dining': '#4f46e5',
  'Transportation': '#0ea5e9',
  'Shopping': '#ec4899',
  'Entertainment': '#f59e0b',
  'Utilities': '#14b8a6',
  'Health & Fitness': '#22c55e',
  'Education': '#8b5cf6',
  'Subscriptions': '#ef4444',
  'Other': '#64748b',
};

// Fallback cycle for any category not in the map above (e.g. a custom
// category typed into an old expense that predates this palette).
const FALLBACK_PALETTE = Object.values(CATEGORY_COLORS);

export function getCategoryColor(category, fallbackIndex = 0) {
  return CATEGORY_COLORS[category] || FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}
