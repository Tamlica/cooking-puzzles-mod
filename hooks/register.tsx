import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Game, Sudoku, Tts } from '../types'
import {
  answerTts,
  hintTts,
  isSudokuSolved,
  moveCursor,
  newSudoku,
  newTts,
  nextUnsolved,
  parseEntries,
  pickTheme,
  ttsPrompt,
  wordCells,
} from './games'

const PANE = 'puzzle'

const game = atom({ plugin: 'cooking-puzzles', key: 'game' } as const, 'sudoku' as Game)
const sudoku = atom({ plugin: 'cooking-puzzles', key: 'sudoku' } as const, null as Sudoku | null)
const tts = atom({ plugin: 'cooking-puzzles', key: 'tts' } as const, null as Tts | null)
const auto = atom({ plugin: 'cooking-puzzles', key: 'auto' } as const, true)
const cooking = atom({ plugin: 'cooking-puzzles', key: 'cooking' } as const, false)
const draft = atom({ plugin: 'cooking-puzzles', key: 'draft' } as const, '')
const snakeBest = atom({ plugin: 'cooking-puzzles', key: 'snakeBest' } as const, 0)
const ttsAi = atom({ plugin: 'cooking-puzzles', key: 'ttsAi' } as const, true)
const ttsLoading = atom({ plugin: 'cooking-puzzles', key: 'ttsLoading' } as const, false)

// Writes of the values saved to the plugin's store, so they outlive the session
type $ = EngineInterface
const setGame = async ($: $, fn: (v: Game) => Game) => $.store.set('game', await update($, game, fn))
const setAuto = async ($: $, fn: (v: boolean) => boolean) => $.store.set('auto', await update($, auto, fn))
const setAi = async ($: $, fn: (v: boolean) => boolean) => $.store.set('ttsAi', await update($, ttsAi, fn))
const setBest = async ($: $, fn: (v: number) => number) => $.store.set('snakeBest', await update($, snakeBest, fn))
const setSudoku = async ($: $, fn: (v: Sudoku | null) => Sudoku | null) =>
  $.store.set('sudoku', await update($, sudoku, fn))
const setTts = async ($: $, fn: (v: Tts | null) => Tts | null) => $.store.set('tts', await update($, tts, fn))

/** A new TTS: words Claude writes on a random theme, else the built-in list. */
const startTts = async ($: EngineInterface) => {
  if (await read($, ttsLoading)) return
  await update($, ttsLoading, () => true)
  try {
    const recent = ((await $.store.get('ttsRecent')) as string[] | undefined) ?? []
    let puzzle: Tts | null = null
    if (await read($, ttsAi)) {
      const theme = pickTheme()
      try {
        const reply = await $.model.complete({
          model: 'haiku',
          prompt: ttsPrompt(theme, recent.slice(-40)),
          maxTokens: 2000,
          timeoutMs: 45000,
        })
        const entries = reply.isAnswered ? parseEntries(reply.text) : []
        if (entries.length >= 8) {
          const made = newTts(8, entries)
          if (made.words.length >= 5) puzzle = { ...made, theme }
        }
      } catch {}
      if (!puzzle) $.ui.toast('Claude gagal bikin soal baru, pakai soal bawaan')
    }
    const t = puzzle ?? newTts()
    await setTts($, () => t)
    await $.store.set('ttsRecent', [...recent, ...t.words.map(w => w.answer)].slice(-60))
  } finally {
    await update($, ttsLoading, () => false)
  }
}

const TITLE: Record<Game, string> = { sudoku: 'Sudoku', tts: 'TTS', snake: 'Snake' }
const ROWS: Record<Game, number> = { sudoku: 18, tts: 22, snake: 17 }
const isGame = (x: string): x is Game => x in TITLE

const openPane = async ($: EngineInterface, which?: Game) => {
  if (which) await setGame($, () => which)
  const g = await read($, game)
  if (g === 'sudoku' && !(await read($, sudoku))) await setSudoku($, () => newSudoku())
  if (g === 'tts' && !(await read($, tts))) void startTts($).catch(() => {})
  return $.ui.open({ id: PANE, title: TITLE[g], focus: true, rows: ROWS[g] })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'sudoku', description: 'Play Sudoku in a pane' })
    await $.command.register({ name: 'tts', description: 'Main teka-teki silang (TTS) di pane' })
    await $.command.register({ name: 'snake', description: 'Play Nokia-style Snake in a pane' })
    await $.command.register({
      name: 'puzzle',
      description: 'Puzzle while Claude cooks: on | off | sudoku | tts | snake | ai on | ai off',
      argumentHint: 'on | off | sudoku | tts | snake | ai on | ai off',
    })
    await update($, cooking, () => false)
    await update($, ttsLoading, () => false)
    // put back what an earlier session saved
    const was = async (key: string) => $.store.get(key).catch(() => undefined)
    const savedGame = await was('game')
    if (typeof savedGame === 'string' && isGame(savedGame)) await update($, game, () => savedGame)
    const savedAuto = await was('auto')
    if (typeof savedAuto === 'boolean') await update($, auto, () => savedAuto)
    const savedAi = await was('ttsAi')
    if (typeof savedAi === 'boolean') await update($, ttsAi, () => savedAi)
    const savedBest = await was('snakeBest')
    if (typeof savedBest === 'number') await update($, snakeBest, cur => Math.max(cur, savedBest))
    const savedSudoku = await was('sudoku')
    if (savedSudoku && !(await read($, sudoku))) await update($, sudoku, () => savedSudoku as Sudoku)
    const savedTts = await was('tts')
    if (savedTts && !(await read($, tts))) await update($, tts, () => savedTts as Tts)

    return next(e)
  })

  on('command.run', { command: 'sudoku' }, async $ => {
    await openPane($, 'sudoku')
    return { text: 'Sudoku opened. w/a/s/d move, 1-9 fill, 0 erase, Esc to leave.' }
  })

  on('command.run', { command: 'tts' }, async $ => {
    await openPane($, 'tts')
    return { text: 'TTS dibuka. Ketik jawaban lalu Enter; Tab untuk pilih soal.' }
  })

  on('command.run', { command: 'snake' }, async $ => {
    await openPane($, 'snake')
    return { text: 'Snake opened. Click the board, then arrows/WASD. Space pauses, Esc leaves.' }
  })

  // the snake board posts a new best score when a game ends
  on('ui.message', { requestId: PANE }, async ($, e, next) => {
    const best = (e.data as { best?: unknown } | null)?.best
    if (typeof best === 'number') await setBest($, cur => Math.max(cur, best))
    return next(e)
  })

  on('command.run', { command: 'puzzle' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await setAuto($, () => arg === 'on')
      return { text: `Auto-open while Claude cooks: ${arg}` }
    }
    if (arg === 'ai on' || arg === 'ai off') {
      await setAi($, () => arg === 'ai on')
      return { text: `TTS words written by Claude: ${arg.slice(3)}` }
    }
    if (isGame(arg)) {
      await setGame($, () => arg)
      return { text: `Auto-open game: ${TITLE[arg]}` }
    }
    const [isOn, g] = [await read($, auto), await read($, game)]
    return { text: `Auto-open: ${isOn ? 'on' : 'off'}, game: ${TITLE[g]}. TTS by Claude: ${(await read($, ttsAi)) ? 'on' : 'off'}. Usage: /puzzle on|off|sudoku|tts|snake|ai on|ai off` }
  })

  // Claude starts cooking: open the puzzle.
  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    if (e.origin.kind === 'composer' && !e.text.startsWith('/') && !('drop' in result)) {
      // never let the game get in the way of the prompt
      try {
        await update($, cooking, () => true)
        // auto off: stay quiet; the games still open by command
        if (await read($, auto)) {
          $.ui.status('🍳 Claude is cooking… puzzle time')
          void openPane($).catch(() => {})
        }
      } catch {}
    }
    return result
  })

  // Claude is done: tell the player.
  on('turn.complete', async ($, e, next) => {
    if (await read($, cooking)) {
      await update($, cooking, () => false)
      $.ui.status(undefined)
      const isUp = (await $.ui.panes()).some(p => p.id === PANE)
      if (isUp) $.ui.toast('🍽️  Claude is done! Esc to return to the prompt (your game is saved)')
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Input = 'Input' in els ? els.Input : undefined
    const g = await read($, game)
    const isCooking = await read($, cooking)

    const banner = (
      <Text color={isCooking ? 'warning' : 'success'}>
        {isCooking ? '🍳 Claude is cooking…' : '✅ Claude is done — Esc to go back'}
      </Text>
    )
    const switcher = (
      <Button
        key="switch"
        plain
        hotkey="g"
        label={g === 'sudoku' ? 'switch to TTS' : 'switch to Sudoku'}
        onPress={() => openPane($, g === 'sudoku' ? 'tts' : 'sudoku')}
      />
    )

    if (g === 'snake') {
      const Client = 'Client' in els ? els.Client : undefined
      return (
        <Box flexDirection="column">
          {banner}
          {Client ? (
            <Client key="snake" module="./snake.tsx" props={{ best: await read($, snakeBest) }} />
          ) : (
            <Text dimColor>Snake needs the terminal or the desktop app.</Text>
          )}
          <Box flexDirection="row">
            <Button key="tosudoku" label="Sudoku" onPress={() => openPane($, 'sudoku')} />
            <Text> </Text>
            <Button key="totts" label="TTS" onPress={() => openPane($, 'tts')} />
          </Box>
        </Box>
      )
    }

    if (g === 'sudoku') {
      const s = await read($, sudoku)
      if (!s) {
        return (
          <Box flexDirection="column">
            {banner}
            <Button key="start" autoFocus hotkey="n" label="Start Sudoku" onPress={() => setSudoku($, () => newSudoku())} />
          </Box>
        )
      }
      const set = (fn: (s: Sudoku) => Sudoku) => setSudoku($, cur => (cur ? fn(cur) : cur))
      const move = (dr: number, dc: number) => set(x => ({ ...x, cursor: moveCursor(x.cursor, dr, dc) }))
      const put = (d: number) =>
        set(x => {
          if (x.puzzle[x.cursor] !== 0) return x
          const board = [...x.board]
          board[x.cursor] = d
          return { ...x, board }
        })
      const isDone = isSudokuSolved(s)
      const filled = s.board.filter(Boolean).length

      const rule = (l: string, m: string, r: string) => (
        <Text dimColor>{l + '───────' + m + '───────' + m + '───────' + r}</Text>
      )
      const row = (r: number) => (
        <Box key={`r${r}`} flexDirection="row">
          {[...Array(9).keys()].flatMap(c => {
            const i = r * 9 + c
            const d = s.board[i]
            const isGiven = s.puzzle[i] !== 0
            const isWrong = !isGiven && d !== 0 && d !== s.solution[i]
            const parts = []
            if (c % 3 === 0) parts.push(<Text dimColor>{c === 0 ? '│' : ' │'}</Text>)
            parts.push(<Text> </Text>)
            parts.push(
              <Text
                bold={isGiven}
                color={isWrong ? 'error' : isGiven ? undefined : 'suggestion'}
                inverse={i === s.cursor && !isDone}
              >
                {d === 0 ? '·' : String(d)}
              </Text>,
            )
            if (c === 8) parts.push(<Text dimColor> │</Text>)
            return parts
          })}
        </Box>
      )

      return (
        <Box flexDirection="column">
          {banner}
          <Box flexDirection="row">
            <Box flexDirection="column" marginRight={2}>
              {rule('┌', '┬', '┐')}
              {row(0)}{row(1)}{row(2)}
              {rule('├', '┼', '┤')}
              {row(3)}{row(4)}{row(5)}
              {rule('├', '┼', '┤')}
              {row(6)}{row(7)}{row(8)}
              {rule('└', '┴', '┘')}
            </Box>
            <Box flexDirection="column">
              {isDone ? <Text color="success" bold>🎉 Solved!</Text> : <Text dimColor>{filled}/81 filled</Text>}
              <Text> </Text>
              <Box flexDirection="row">
                <Button key="up" plain hotkey="w" label="↑" onPress={() => move(-1, 0)} />
                <Text> </Text>
                <Button key="left" plain hotkey="a" label="←" onPress={() => move(0, -1)} />
                <Text> </Text>
                <Button key="down" plain hotkey="s" label="↓" onPress={() => move(1, 0)} />
                <Text> </Text>
                <Button key="right" plain hotkey="d" label="→" onPress={() => move(0, 1)} />
              </Box>
              <Box flexDirection="row">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                  <Button key={`n${d}`} hotkey={String(d)} label={String(d)} onPress={() => put(d)} />
                ))}
              </Box>
              <Button key="erase" plain hotkey="0" label="erase" onPress={() => put(0)} />
              <Button key="new" plain hotkey="n" label="new puzzle" onPress={() => setSudoku($, () => newSudoku())} />
              {switcher}
              <Button key="tosnake" plain hotkey="k" label="play Snake" onPress={() => openPane($, 'snake')} />
              <Text> </Text>
              <Text dimColor>Press the keys shown.</Text>
              <Text dimColor>Ctrl+X Tab focuses the pane.</Text>
            </Box>
          </Box>
        </Box>
      )
    }

    // ---- TTS ----
    const t = await read($, tts)
    if (!t) {
      return (
        <Box flexDirection="column">
          {banner}
          {(await read($, ttsLoading)) ? (
            <Text color="claude">✍️  Claude lagi bikin TTS baru…</Text>
          ) : (
            <Button key="start" autoFocus hotkey="n" label="Mulai TTS" onPress={() => startTts($)} />
          )}
        </Box>
      )
    }
    const text = await read($, draft)
    const sel = t.words[t.sel]

    const shown = new Map<string, string>()
    const starts = new Map<string, number>()
    const inSel = new Set<string>()
    for (const w of t.words) {
      wordCells(w).forEach((x, k) => {
        const id = `${x.r},${x.c}`
        if (w.solved || k < w.hints) shown.set(id, x.ch)
        if (!shown.has(id)) shown.set(id, '')
        if (k === 0) starts.set(id, w.n)
        if (w === sel) inSel.add(id)
      })
    }
    const isAllDone = t.words.every(w => w.solved)
    const isMaking = await read($, ttsLoading)

    const grid = [...Array(t.rows).keys()].map(r => (
      <Box key={`g${r}`} flexDirection="row">
        {[...Array(t.cols).keys()].map(c => {
          const id = `${r},${c}`
          if (!shown.has(id)) return <Text>{'  '}</Text>
          const letter = shown.get(id)
          const n = starts.get(id)
          const glyph = letter || (n !== undefined && n < 10 ? String(n) : '·')
          return (
            <Text
              color={letter ? 'success' : undefined}
              dimColor={!letter && n === undefined}
              inverse={inSel.has(id) && !isAllDone}
            >
              {' ' + glyph}
            </Text>
          )
        })}
      </Box>
    ))

    const clueButton = (i: number) => {
      const w = t.words[i]
      return (
        <Button
          key={`clue${i}`}
          plain
          dimColor={w.solved}
          label={`${i === t.sel ? '▶' : ' '} ${w.n}. ${w.clue} (${w.answer.length})${w.solved ? ' ✓' : ''}`}
          onPress={() => setTts($, cur => (cur ? { ...cur, sel: i } : cur))}
        />
      )
    }
    const across = t.words.map((w, i) => (w.dir === 'across' ? i : -1)).filter(i => i >= 0)
    const down = t.words.map((w, i) => (w.dir === 'down' ? i : -1)).filter(i => i >= 0)

    const submit = async (value: string) => {
      await update($, draft, () => '')
      const cur = await read($, tts)
      if (!cur) return
      if (value.trim() === '') {
        const next = nextUnsolved(cur, cur.sel)
        if (next >= 0) await setTts($, () => ({ ...cur, sel: next }))
        return
      }
      const { tts: after, isRight } = answerTts(cur, value)
      if (isRight) await setTts($, () => after)
      else $.ui.toast(`❌ "${value}" belum tepat, coba lagi`)
    }

    return (
      <Box flexDirection="column">
        {banner}
        <Text dimColor>{t.theme ? `Tema: ${t.theme} (dibuat Claude)` : 'Soal bawaan'}</Text>
        {isMaking && <Text color="claude">✍️  Claude lagi bikin TTS baru…</Text>}
        <Box flexDirection="row">
          <Box flexDirection="column" marginRight={3}>
            {grid}
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            <Text bold>Mendatar</Text>
            {across.map(clueButton)}
            <Text bold>Menurun</Text>
            {down.map(clueButton)}
          </Box>
        </Box>
        {isAllDone ? (
          <Text color="success" bold>🎉 Semua terjawab!</Text>
        ) : !Input ? (
          <Text dimColor>Typing answers needs the terminal or desktop.</Text>
        ) : (
          <Input
            key="answer"
            autoFocus
            label={`${sel.n} ${sel.dir === 'across' ? 'mendatar' : 'menurun'}: `}
            placeholder="ketik jawaban, Enter (kosong = soal berikutnya)"
            value={text}
            submitLabel="jawab"
            onInput={(value: string) => update($, draft, () => value)}
            onSubmit={(value: string) => void submit(value)}
          />
        )}
        <Box flexDirection="row">
          <Button key="hint" label="petunjuk" onPress={() => setTts($, cur => (cur ? hintTts(cur) : cur))} />
          <Text> </Text>
          <Button key="newtts" label="TTS baru" onPress={() => startTts($)} />
          <Text> </Text>
          <Button key="switch" label="Sudoku" onPress={() => openPane($, 'sudoku')} />
          <Text> </Text>
          <Button key="tosnake" label="Snake" onPress={() => openPane($, 'snake')} />
        </Box>
      </Box>
    )
  })
}
