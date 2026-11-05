import { expect, test } from 'claude-code/testing'

import { advise, bar, isRecommended, prettyModel } from '../hooks/advice'

const BAND = {
  plugin: 'tokengap',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    isFocused: false,
    scroll: { offset: 0, bodyRows: 10 },
  },
} as const

const NOW = Date.parse('2026-11-05T12:00:00Z')
const inHours = (h: number) => new Date(NOW + h * 3600_000).toISOString()

test('la jauge suit la limite la plus haute', () => {
  expect(advise([], NOW).level).toBe(0)
  expect(advise([{ kind: 'five_hour', percentUsed: 30, resetsAt: inHours(4.9) }], NOW).level).toBe(0)
  expect(advise([{ kind: 'seven_day', percentUsed: 60 }], NOW).level).toBe(1)
  expect(advise([{ kind: 'five_hour', percentUsed: 85 }], NOW).level).toBe(2)
  expect(advise([{ kind: 'five_hour', percentUsed: 97 }], NOW).level).toBe(3)
})

test('un rythme trop rapide monte la jauge d’un cran', () => {
  // 40 % utilisés après 1 h sur 5 h : projection 200 %.
  const a = advise([{ kind: 'five_hour', percentUsed: 40, resetsAt: inHours(4) }], NOW)
  expect(a.windows[0]?.projected).toBe(200)
  expect(a.level).toBe(1)
})

test('la recommandation baisse l’effort quand les limites approchent', () => {
  const low = advise([{ kind: 'five_hour', percentUsed: 10 }], NOW)
  const high = advise([{ kind: 'five_hour', percentUsed: 90 }], NOW)
  expect(low.quality.effort).toBe('max')
  expect(high.quality.effort).toBe('high')
  expect(high.value.effort).toBe('low')
})

test('helpers', () => {
  expect(bar(50, 10)).toBe('█████░░░░░')
  expect(isRecommended('claude-opus-5-5[1m]')).toBe(true)
  expect(isRecommended('claude-sonnet-5-5')).toBe(false)
  expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
})

test('la bande s’affiche avec la jauge', async ($, on) => {
  on('clock.now', () => ({ value: NOW }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] },
  }))
  on('state.get', (_, e) =>
    e.key === 'limits'
      ? { value: { value: [{ kind: 'five_hour', percentUsed: 85, resetsAt: inHours(1) }], version: 1 } }
      : { value: undefined },
  )

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /Qualité/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Ralentis/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /5h 85%/ })).toBeDefined()
    await ui.unmount()
  }
})
