import type { ClientKeyEvent, ClientModule } from 'claude-code'

// Nokia 3310 screen colors
const LCD = '#c7f0d8'
const INK = '#43523d'

export const W = 20
export const H = 10
const TICK = 40 // ms per frame; the snake moves every few frames

type Dir = 'up' | 'down' | 'left' | 'right'
type Cell = { x: number; y: number }

export type SnakeState = {
  snake: Cell[] // head first
  dir: Dir
  queue: Dir[] // turns typed between moves
  food: Cell
  score: number
  mode: 'ready' | 'playing' | 'paused' | 'over'
  live: { frames: number; best: number } // mutated in place: no redraw needed
}

export type SnakeProps = { best: number }

const STEP: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
const KEYS: Record<string, Dir> = {
  up: 'up', down: 'down', left: 'left', right: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  k: 'up', j: 'down', h: 'left', l: 'right',
}

const randomFood = (snake: Cell[]): Cell => {
  for (;;) {
    const cell = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) }
    if (!snake.some(s => s.x === cell.x && s.y === cell.y)) return cell
  }
}

export const newGame = (): SnakeState => {
  const snake = [{ x: 6, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }]
  return { snake, dir: 'right', queue: [], food: randomFood(snake), score: 0, mode: 'ready', live: { frames: 0, best: 0 } }
}

/** Frames between moves: 4 (160ms) at the start, 2 (80ms) at full speed. */
const framesPerMove = (score: number) => Math.max(2, 4 - Math.floor(score / 5))

/** One move of the snake. Walls wrap around, as in Snake II. */
export const step = (s: SnakeState): SnakeState => {
  const [turn, ...queue] = s.queue
  const dir = turn ?? s.dir
  const head = s.snake[0]!
  const next = {
    x: (head.x + STEP[dir].x + W) % W,
    y: (head.y + STEP[dir].y + H) % H,
  }
  const eats = next.x === s.food.x && next.y === s.food.y
  const body = eats ? s.snake : s.snake.slice(0, -1)
  if (body.some(c => c.x === next.x && c.y === next.y)) {
    return { ...s, dir, queue: [], mode: 'over' }
  }
  const snake = [next, ...body]
  return {
    ...s,
    snake,
    dir,
    queue,
    food: eats ? randomFood(snake) : s.food,
    score: eats ? s.score + 1 : s.score,
  }
}

/** What a key does to the game. */
export const press = (s: SnakeState, e: ClientKeyEvent): SnakeState => {
  const key = e.key.toLowerCase()
  if (key === 'r' || ((key === 'space' || key === ' ' || key === 'return') && s.mode === 'over')) {
    return { ...newGame(), mode: 'playing', live: s.live }
  }
  if (key === 'space' || key === ' ' || key === 'p' || key === 'return') {
    return { ...s, mode: s.mode === 'playing' ? 'paused' : s.mode === 'over' ? s.mode : 'playing' }
  }
  const dir = KEYS[key]
  if (!dir || s.mode === 'over') return s
  const last = s.queue[s.queue.length - 1] ?? s.dir
  if (dir === last || dir === OPPOSITE[last] || s.queue.length >= 2) {
    return s.mode === 'playing' ? s : { ...s, mode: 'playing' }
  }
  return { ...s, queue: [...s.queue, dir], mode: 'playing' }
}

const Snake: ClientModule<SnakeProps, SnakeState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const s = surface.state ?? newGame()
  s.live.best = props.best

  if (surface.state === undefined) {
    surface.setState(s)
    surface.onKey(e => {
      const cur = surface.state ?? s
      const after = press(cur, e)
      if (after !== cur) surface.setState(after)
    })
    surface.onPointer(e => {
      const cur = surface.state ?? s
      if (e.type === 'down' && cur.mode !== 'playing') {
        surface.setState(cur.mode === 'over' ? { ...newGame(), mode: 'playing', live: cur.live } : { ...cur, mode: 'playing' })
      }
    })
    surface.every(TICK, () => {
      const cur = surface.state
      if (!cur || cur.mode !== 'playing') return
      cur.live.frames += 1
      if (cur.live.frames % framesPerMove(cur.score) !== 0) return
      const after = step(cur)
      surface.setState(after)
      if (after.mode === 'over' && after.score > cur.live.best) surface.post({ best: after.score })
    })
  }

  const rows: string[] = []
  for (let y = 0; y < H; y++) {
    let line = ''
    for (let x = 0; x < W; x++) {
      const isHead = s.snake[0]!.x === x && s.snake[0]!.y === y
      const isBody = s.snake.some(c => c.x === x && c.y === y)
      const isFood = s.food.x === x && s.food.y === y
      line += isHead ? '▓▓' : isBody ? '██' : isFood ? '◆ ' : '  '
    }
    rows.push(line)
  }

  const status =
    s.mode === 'ready' ? 'Arrows/WASD to start · click here first'
    : s.mode === 'paused' ? 'Paused · space to resume'
    : s.mode === 'over' ? `Game over! Score ${s.score} · space to restart`
    : 'Space pauses · r restarts'

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" width={W * 2 + 2} justifyContent="space-between">
        <Text bold>{String(s.score).padStart(4, '0')}</Text>
        <Text dimColor>best {Math.max(props.best, s.mode === 'over' ? s.score : 0)}</Text>
      </Box>
      <Box flexDirection="column" borderStyle="bold" borderColor={INK} width={W * 2 + 2}>
        {rows.map(line => (
          <Text color={INK} backgroundColor={LCD}>{line}</Text>
        ))}
      </Box>
      <Text dimColor={s.mode !== 'over'} color={s.mode === 'over' ? 'error' : undefined}>{status}</Text>
    </Box>
  )
}

export default Snake
