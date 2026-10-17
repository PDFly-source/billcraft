/**
 * Tools-section UX preferences: pinned tools + tool search.
 * Pins live in localStorage (tiny UI preference, not business data).
 * Pure helpers are separated so they can be unit-tested without a DOM.
 */

import type { ToolId } from '@/components/tools/BusinessTools';

const PINS_KEY = 'bc-pinned-tools';

export function getPinnedTools(allToolIds: ToolId[] = []): ToolId[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is ToolId => typeof id === 'string' && allToolIds.includes(id as ToolId)
    );
  } catch {
    return [];
  }
}

export function setPinnedTools(pins: ToolId[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch { /* private mode — pins just won't persist */ }
}

export function togglePin(id: ToolId, pins: ToolId[]): ToolId[] {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
}

/** Split tools into [pinned, rest] preserving pinned order, then the base order. */
export function partitionPinned<T extends { id: ToolId }>(
  all: T[],
  pins: ToolId[]
): { pinned: T[]; rest: T[] } {
  const pinned = pins
    .map((p) => all.find((t) => t.id === p))
    .filter((t): t is T => Boolean(t));
  const rest = all.filter((t) => !pins.includes(t.id));
  return { pinned, rest };
}
