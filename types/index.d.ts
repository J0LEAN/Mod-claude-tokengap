/** Une fenêtre de limite d'usage, telle que Claude Code la rapporte. */
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Limits = Limit[]

declare module 'claude-code' {
  interface PluginState {
    tokengap: {
      /** Dernières fenêtres de limite reçues (five_hour, seven_day, …). */
      limits: Limits
      /** Dernier niveau de jauge annoncé par un toast (0 à 3). */
      lastLevel: number
    }
  }
}
