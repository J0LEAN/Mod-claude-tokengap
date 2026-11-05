import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limits } from '../types'
import { LEVELS, advise, bar, isRecommended, prettyModel } from './advice'

const limits = atom({ plugin: 'tokengap', key: 'limits' } as const, [] as Limits)
const lastLevel = atom({ plugin: 'tokengap', key: 'lastLevel' } as const, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const usage = await $.session.usage()
    await update($, limits, () => usage.rateLimits)
    return result
  })

  // Le moteur pousse les nouvelles mesures : après chaque tour, et dès qu'une
  // fenêtre de limite bouge d'un point.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limits, () => e.rateLimits)
      const { level } = advise(e.rateLimits, await $.clock.now())
      const previous = await read($, lastLevel)
      if (level >= 2 && level > previous) {
        const l = LEVELS[level]
        $.ui.toast(`${l.icon} Limites Claude : ${l.label} — ${l.hint}`)
      }
      if (level !== previous) await update($, lastLevel, () => level)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const [current, now] = await Promise.all([$.session.model(), $.clock.now()])
    const a = advise(await read($, limits), now)
    const lvl = LEVELS[a.level]
    const narrow = e.props.bodyColumns < 70
    const onTrack = isRecommended(current)

    const gauge =
      a.windows.length === 0 ? (
        <Text dimColor size="caption">
          Jauge : pas encore de mesure (abonnement Claude requis, arrive après la 1re réponse)
        </Text>
      ) : (
        <Text size="caption" wrap="truncate-end">
          <Text color={lvl.color}>
            {lvl.icon} {bar(a.worst, narrow ? 8 : 12)} {lvl.label}
          </Text>
          <Text dimColor>
            {'  '}
            {a.windows
              .map(
                w =>
                  `${w.short} ${Math.round(w.used)}%` +
                  (w.projected !== undefined && w.projected > 100 ? ' ↗' : '') +
                  (w.resetsIn ? ` (reset ${w.resetsIn})` : ''),
              )
              .join(' · ')}
            {narrow ? '' : `  — ${lvl.hint}`}
          </Text>
        </Text>
      )

    return (
      <Box flexDirection="column">
        <Text size="caption" wrap="truncate-end">
          <Text dimColor>🏆 Qualité : </Text>
          <Text weight="semibold">
            {a.quality.model} · effort {a.quality.effort}
          </Text>
          <Text dimColor>{'   💰 Qualité/coût : '}</Text>
          <Text weight="semibold">
            {a.value.model} · effort {a.value.effort}
          </Text>
          {narrow ? null : (
            <Text dimColor>
              {'   actuel : '}
              {prettyModel(current)}
            </Text>
          )}
          {narrow ? null : (
            <Text color={onTrack ? 'success' : 'warning'}>{onTrack ? ' ✓' : ' → /model opus'}</Text>
          )}
        </Text>
        {gauge}
      </Box>
    )
  })
}
