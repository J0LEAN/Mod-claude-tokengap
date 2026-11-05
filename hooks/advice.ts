import type { SessionRateLimit } from 'claude-code'

/**
 * La gamme Opus actuelle, tarifs API publics en $ par million de tokens
 * (entrée / sortie). Opus 5.5 est à la fois le plus capable ET le moins cher
 * de la gamme : c'est donc lui qu'on recommande dans les deux modes, et c'est
 * le niveau d'effort qui fait varier la qualité et la consommation.
 */
export const OPUS = [
  { id: 'claude-opus-5-5', name: 'Opus 5.5', input: 4, output: 20 },
  { id: 'claude-opus-5', name: 'Opus 5', input: 5, output: 25 },
  { id: 'claude-opus-4-8', name: 'Opus 4.8', input: 5, output: 25 },
] as const

export type Level = 0 | 1 | 2 | 3

export const LEVELS = [
  { icon: '🟢', label: 'Large', hint: 'grosses requêtes OK', color: 'success' },
  { icon: '🟡', label: 'Modéré', hint: 'garde les grosses requêtes pour l’essentiel', color: 'warning' },
  { icon: '🟠', label: 'Ralentis', hint: 'requêtes ciblées, effort bas', color: 'warning' },
  { icon: '🔴', label: 'Stop', hint: 'attends la réinitialisation', color: 'error' },
] as const

const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * 3600_000,
  seven_day: 7 * 24 * 3600_000,
}

const SHORT: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7j',
  spend_limit: '$',
}

export type Window = {
  kind: string
  short: string
  used: number
  /** Projection de l'usage en fin de fenêtre au rythme actuel, en %. */
  projected?: number
  resetsIn?: string
}

export type Advice = {
  level: Level
  windows: Window[]
  /** Pourcentage le plus haut, pour la barre. */
  worst: number
  quality: { model: string; effort: string }
  value: { model: string; effort: string }
}

function levelOf(used: number): Level {
  if (used >= 95) return 3
  if (used >= 80) return 2
  if (used >= 50) return 1
  return 0
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'maintenant'
  const min = Math.round(ms / 60_000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h${String(min % 60).padStart(2, '0')}`
  return `${Math.round(h / 24)}j`
}

export function windowOf(limit: SessionRateLimit, now: number): Window {
  const w: Window = {
    kind: limit.kind,
    short: SHORT[limit.kind] ?? limit.kind,
    used: limit.percentUsed,
  }
  const reset = limit.resetsAt ? Date.parse(limit.resetsAt) : NaN
  if (!Number.isNaN(reset)) {
    w.resetsIn = formatDuration(reset - now)
    const span = WINDOW_MS[limit.kind]
    if (span) {
      const elapsed = Math.min(1, Math.max(0, 1 - (reset - now) / span))
      // Trop tôt dans la fenêtre pour une projection fiable.
      if (elapsed >= 0.1) w.projected = Math.round(limit.percentUsed / elapsed)
    }
  }
  return w
}

export function advise(limits: SessionRateLimit[], now: number): Advice {
  const windows = limits.map(l => windowOf(l, now))
  let level: Level = 0
  let worst = 0
  for (const w of windows) {
    worst = Math.max(worst, w.used)
    let l = levelOf(w.used)
    // Au rythme actuel tu dépasses la fenêtre avant sa réinitialisation :
    // on monte d'un cran (sans aller jusqu'à « Stop »).
    if (w.projected !== undefined && w.projected > 100 && l < 2) l = (l + 1) as Level
    if (l > level) level = l
  }

  const quality = {
    model: 'Opus 5.5',
    effort: (['max', 'xhigh', 'high', 'high'] as const)[level],
  }
  const value = {
    model: 'Opus 5.5',
    effort: (['medium', 'medium', 'low', 'low'] as const)[level],
  }
  return { level, windows, worst, quality, value }
}

export function bar(percent: number, cells: number): string {
  const p = Math.max(0, Math.min(100, percent))
  const full = Math.round((p / 100) * cells)
  return '█'.repeat(full) + '░'.repeat(cells - full)
}

/** Le modèle de la session est-il Opus 5.5 ? (alias, id, suffixe [1m]…) */
export function isRecommended(model: string): boolean {
  const m = model.toLowerCase()
  return m === 'opus' || m.startsWith('opus[') || m.includes('opus-5-5')
}

export function prettyModel(model: string): string {
  const m = /claude-(opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d+))?/.exec(model.toLowerCase())
  if (!m || !m[1] || !m[2]) return model
  const name = m[1][0]!.toUpperCase() + m[1].slice(1)
  return m[3] ? `${name} ${m[2]}.${m[3]}` : `${name} ${m[2]}`
}
