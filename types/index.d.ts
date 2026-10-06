export type Game = 'sudoku' | 'tts' | 'snake'

export type Sudoku = {
  puzzle: number[]
  solution: number[]
  board: number[]
  cursor: number
}

export type Word = {
  n: number
  r: number
  c: number
  dir: 'across' | 'down'
  answer: string
  clue: string
  solved: boolean
  hints: number
}

export type Tts = { rows: number; cols: number; words: Word[]; sel: number; theme?: string }

declare module 'claude-code' {
  interface PluginState {
    'cooking-puzzles': {
      game: Game
      sudoku: Sudoku | null
      tts: Tts | null
      auto: boolean
      cooking: boolean
      draft: string
      snakeBest: number
      ttsAi: boolean
      ttsLoading: boolean
    }
  }
}
