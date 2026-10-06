import { expect, mock, test } from 'claude-code/testing'

import { answerTts, countSolutions, newSudoku, newTts, parseEntries, wordCells } from '../hooks/games'

const PANE = {
  component: 'Pane',
  requestId: 'puzzle',
  props: {
    title: 'Sudoku',
    isFocused: true,
    bodyColumns: 100,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 22 },
    view: {},
  },
} as const

test('sudoku has exactly one solution and matches it', async () => {
  const s = newSudoku()
  expect(countSolutions([...s.puzzle])).toBe(1)
  expect(s.puzzle.every((d, i) => d === 0 || d === s.solution[i])).toBe(true)
  expect(s.puzzle.filter(d => d === 0).length).toBeGreaterThan(30)
})

test('tts words agree where they cross', async () => {
  for (let k = 0; k < 20; k++) {
    const t = newTts()
    expect(t.words.length).toBeGreaterThanOrEqual(5)
    const seen = new Map<string, string>()
    for (const w of t.words)
      for (const x of wordCells(w)) {
        const id = `${x.r},${x.c}`
        expect(seen.get(id) ?? x.ch).toBe(x.ch)
        seen.set(id, x.ch)
      }
    const w = t.words[0]!
    expect(answerTts(t, w.answer.toLowerCase()).isRight).toBe(true)
    expect(answerTts(t, 'salah').isRight).toBe(false)
  }
})

test('the pane plays sudoku and switches to tts', async ($, on) => {
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'cooking-puzzles', surface, ...PANE })
    if (await ui.find({ key: 'start' })) await ui.press({ key: 'start' })
    expect(await ui.find({ key: 'n5' })).toBeDefined()
    await ui.press({ key: 'right' })
    await ui.press({ key: 'n5' })
    await ui.press({ key: 'switch' })
    if (await ui.find({ key: 'start' })) await ui.press({ key: 'start' })
    expect(await ui.find({ key: 'answer' })).toBeDefined()
    await ui.input({ key: 'answer', text: 'zzz' })
    await ui.press({ key: 'switch' })
    expect(await ui.find({ key: 'n5' })).toBeDefined()
    await ui.unmount()
  }
})

const REPLY = JSON.stringify([
  ['KAKI', 'Untuk berjalan'], ['TANGAN', 'Untuk memegang'], ['MATA', 'Untuk melihat'],
  ['TELINGA', 'Untuk mendengar'], ['HIDUNG', 'Untuk mencium'], ['MULUT', 'Untuk makan'],
  ['RAMBUT', 'Tumbuh di kepala'], ['JANTUNG', 'Pemompa darah'], ['PARU', 'Untuk bernapas'],
  ['GIGI', 'Untuk mengunyah'], ['LIDAH', 'Untuk mengecap'], ['KUKU', 'Di ujung jari'],
  ['bad word', 'dropped'], ['TULANG', 'kerangka TULANG'],
].map(([answer, clue]) => ({ answer, clue })))

test('model replies are parsed and bad entries dropped', async () => {
  const entries = parseEntries('Ini dia:\n' + REPLY + '\nSemoga membantu')
  expect(entries.length).toBe(12)
  expect(parseEntries('no json here')).toEqual([])
})

test('a new TTS uses words Claude wrote, and is saved to the store', async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.get', ($, e) => ({ value: stored[e.key] }))
  on('store.set', ($, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('model.complete', () => ({
    value: { isAnswered: true, text: REPLY, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } },
  }))
  const ui = await $.ui.mount({ plugin: 'cooking-puzzles', surface: 'terminal', ...PANE })
  if (await ui.find({ key: 'start' })) await ui.press({ key: 'start' })
  if (await ui.find({ key: 'switch' })) await ui.press({ key: 'switch' })
  await ui.press({ key: 'newtts' })
  expect(await ui.find({ type: 'Text', text: /Tema: .* \(dibuat Claude\)/ })).toBeDefined()
  const saved = stored.tts as { words: { answer: string }[] }
  const mine = new Set(parseEntries(REPLY).map(e => e.answer))
  expect(saved.words.every(w => mine.has(w.answer))).toBe(true)
  await ui.unmount()
})
