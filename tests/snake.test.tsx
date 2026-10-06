import { expect, mock, test } from 'claude-code/testing'

import { H, W, newGame, press, step } from '../hooks/snake'
import type { SnakeState } from '../hooks/snake'

const PANE = {
  component: 'Pane',
  requestId: 'puzzle',
  props: {
    title: 'Snake',
    isFocused: true,
    bodyColumns: 100,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 17 },
    view: {},
  },
} as const

test('the snake moves, eats, wraps and dies on itself', async () => {
  let s: SnakeState = { ...newGame(), mode: 'playing' }
  const head = s.snake[0]!
  s = { ...s, food: { x: head.x + 1, y: head.y } }
  s = step(s)
  expect(s.score).toBe(1)
  expect(s.snake.length).toBe(4)

  let w: SnakeState = { ...newGame(), mode: 'playing', snake: [{ x: W - 1, y: 0 }, { x: W - 2, y: 0 }] }
  w = { ...w, food: { x: 5, y: H - 1 } }
  expect(step(w).snake[0]).toEqual({ x: 0, y: 0 })

  // no reversing into yourself
  expect(press(s, { key: 'left' }).queue).toEqual([])

  const loop = {
    ...newGame(),
    mode: 'playing' as const,
    dir: 'up' as const,
    snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }],
  }
  expect(step(press(loop, { key: 'left' })).mode).toBe('over')
})

test('the snake pane runs on the frame clock and takes keys', async ($, on) => {
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'cooking-puzzles', surface, ...PANE })
    if (!(await ui.find({ key: 'snake' }))) {
      if (await ui.find({ key: 'start' })) await ui.press({ key: 'start' })
      await ui.press({ key: 'tosnake' })
    }
    expect(await ui.find({ type: 'Text', text: /click here first/, in: 'snake' })).toBeDefined()
    await ui.key({ key: 'down', in: 'snake' })
    await ui.advance(500)
    expect(await ui.find({ type: 'Text', text: /Space pauses/, in: 'snake' })).toBeDefined()
    await ui.key({ key: 'space', in: 'snake' })
    expect(await ui.find({ type: 'Text', text: /Paused/, in: 'snake' })).toBeDefined()
    await ui.unmount()
  }
})
