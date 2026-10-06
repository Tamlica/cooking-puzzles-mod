import type { Sudoku, Tts, Word } from '../types'

const shuffle = <T>(list: T[]): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------- Sudoku ----------

const canPlace = (b: number[], i: number, d: number): boolean => {
  const r = Math.floor(i / 9)
  const c = i % 9
  const br = r - (r % 3)
  const bc = c - (c % 3)
  for (let k = 0; k < 9; k++) {
    if (b[r * 9 + k] === d || b[k * 9 + c] === d) return false
    if (b[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === d) return false
  }
  return true
}

const fill = (b: number[]): boolean => {
  const i = b.indexOf(0)
  if (i < 0) return true
  for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(b, i, d)) {
      b[i] = d
      if (fill(b)) return true
    }
  }
  b[i] = 0
  return false
}

export const countSolutions = (b: number[], limit = 2): number => {
  const i = b.indexOf(0)
  if (i < 0) return 1
  let count = 0
  for (let d = 1; d <= 9 && count < limit; d++) {
    if (canPlace(b, i, d)) {
      b[i] = d
      count += countSolutions(b, limit - count)
    }
  }
  b[i] = 0
  return count
}

/** A puzzle with exactly one solution and up to `holes` empty cells. */
export const newSudoku = (holes = 46): Sudoku => {
  const solution = Array<number>(81).fill(0)
  fill(solution)
  const puzzle = [...solution]
  let removed = 0
  for (const i of shuffle([...Array(81).keys()])) {
    if (removed >= holes) break
    const keep = puzzle[i]
    puzzle[i] = 0
    if (countSolutions([...puzzle]) === 1) removed++
    else puzzle[i] = keep
  }
  return { puzzle, solution, board: [...puzzle], cursor: puzzle.indexOf(0) }
}

export const isSudokuSolved = (s: Sudoku): boolean =>
  s.board.every((d, i) => d === s.solution[i])

export const moveCursor = (cursor: number, dr: number, dc: number): number => {
  const r = (Math.floor(cursor / 9) + dr + 9) % 9
  const c = ((cursor % 9) + dc + 9) % 9
  return r * 9 + c
}

// ---------- TTS (teka-teki silang) ----------

export type Entry = { answer: string; clue: string }

export const BANK: Entry[] = [
  { answer: 'KUCING', clue: 'Hewan peliharaan yang suka mengeong' },
  { answer: 'NASI', clue: 'Makanan pokok orang Indonesia' },
  { answer: 'GORENG', clue: 'Cara memasak dengan minyak panas' },
  { answer: 'SAMBAL', clue: 'Pelengkap pedas dari cabai' },
  { answer: 'RENDANG', clue: 'Masakan daging khas Minang' },
  { answer: 'SATE', clue: 'Daging tusuk yang dibakar' },
  { answer: 'BAKSO', clue: 'Bola daging berkuah' },
  { answer: 'TEMPE', clue: 'Olahan kedelai fermentasi' },
  { answer: 'KOPI', clue: 'Minuman hitam berkafein' },
  { answer: 'TEH', clue: 'Minuman dari daun yang diseduh' },
  { answer: 'GARAM', clue: 'Bumbu asin dari laut' },
  { answer: 'GULA', clue: 'Pemanis dari tebu' },
  { answer: 'WAJAN', clue: 'Alat untuk menggoreng' },
  { answer: 'DAPUR', clue: 'Ruang tempat memasak' },
  { answer: 'KOKI', clue: 'Juru masak profesional' },
  { answer: 'JAKARTA', clue: 'Ibu kota Indonesia (lama)' },
  { answer: 'BALI', clue: 'Pulau Dewata' },
  { answer: 'MONAS', clue: 'Tugu ikonik di Jakarta' },
  { answer: 'GARUDA', clue: 'Lambang negara Indonesia' },
  { answer: 'BATIK', clue: 'Kain bermotif warisan budaya' },
  { answer: 'ANGKLUNG', clue: 'Alat musik bambu dari Jawa Barat' },
  { answer: 'GAMELAN', clue: 'Ansambel musik tradisional Jawa' },
  { answer: 'WAYANG', clue: 'Pertunjukan boneka kulit' },
  { answer: 'KOMODO', clue: 'Kadal raksasa dari NTT' },
  { answer: 'GAJAH', clue: 'Hewan berbelalai' },
  { answer: 'HARIMAU', clue: 'Kucing besar belang dari Sumatra' },
  { answer: 'BURUNG', clue: 'Hewan bersayap dan berbulu' },
  { answer: 'IKAN', clue: 'Hewan yang bernapas dengan insang' },
  { answer: 'LAUT', clue: 'Perairan luas dan asin' },
  { answer: 'GUNUNG', clue: 'Tanah yang menjulang tinggi' },
  { answer: 'HUJAN', clue: 'Air yang turun dari langit' },
  { answer: 'MATAHARI', clue: 'Bintang pusat tata surya' },
  { answer: 'BULAN', clue: 'Satelit alami bumi' },
  { answer: 'BINTANG', clue: 'Berkelip di langit malam' },
  { answer: 'PELANGI', clue: 'Lengkung warna-warni setelah hujan' },
  { answer: 'SEKOLAH', clue: 'Tempat belajar murid' },
  { answer: 'GURU', clue: 'Pahlawan tanpa tanda jasa' },
  { answer: 'BUKU', clue: 'Jendela dunia' },
  { answer: 'PENSIL', clue: 'Alat tulis dari grafit' },
  { answer: 'KOMPUTER', clue: 'Mesin hitung elektronik' },
  { answer: 'KODE', clue: 'Yang ditulis programmer' },
  { answer: 'BUG', clue: 'Kesalahan dalam program' },
  { answer: 'MERDEKA', clue: 'Bebas dari penjajahan' },
  { answer: 'RUPIAH', clue: 'Mata uang Indonesia' },
  { answer: 'SEPEDA', clue: 'Kendaraan roda dua dikayuh' },
  { answer: 'KERETA', clue: 'Kendaraan di atas rel' },
  { answer: 'PANTAI', clue: 'Tepi laut berpasir' },
  { answer: 'DURIAN', clue: 'Raja buah berduri' },
  { answer: 'MANGGA', clue: 'Buah manis, harum manis salah satunya' },
  { answer: 'PISANG', clue: 'Buah kuning kesukaan monyet' },
]

type Placed = { r: number; c: number; dir: Word['dir']; answer: string; clue: string }

const MAX = 15

const cellsOf = (p: Placed) =>
  [...p.answer].map((ch, k) => ({
    r: p.r + (p.dir === 'down' ? k : 0),
    c: p.c + (p.dir === 'across' ? k : 0),
    ch,
  }))

/** Letter at each cell, keyed "r,c". */
const gridOf = (placed: Placed[]) => {
  const grid = new Map<string, string>()
  for (const p of placed) for (const x of cellsOf(p)) grid.set(`${x.r},${x.c}`, x.ch)
  return grid
}

const fits = (placed: Placed[], grid: Map<string, string>, p: Placed): number => {
  const at = (r: number, c: number) => grid.get(`${r},${c}`)
  const [dr, dc] = p.dir === 'across' ? [0, 1] : [1, 0]
  const len = p.answer.length
  if (at(p.r - dr, p.c - dc) || at(p.r + dr * len, p.c + dc * len)) return -1
  let crossings = 0
  for (const x of cellsOf(p)) {
    const here = at(x.r, x.c)
    if (here) {
      if (here !== x.ch) return -1
      crossings++
    } else if (at(x.r + dc, x.c + dr) || at(x.r - dc, x.c - dr)) {
      return -1
    }
  }
  if (crossings === 0 || crossings === len) return -1
  // a crossing must cross a word of the other direction
  for (const q of placed) {
    if (q.dir !== p.dir) continue
    for (const x of cellsOf(q)) if (cellsOf(p).some(y => y.r === x.r && y.c === x.c)) return -1
  }
  // keep within MAX×MAX
  const all = [...grid.keys()].map(k => k.split(',').map(Number))
  for (const x of cellsOf(p)) all.push([x.r, x.c])
  const rs = all.map(a => a[0])
  const cs = all.map(a => a[1])
  if (Math.max(...rs) - Math.min(...rs) >= MAX || Math.max(...cs) - Math.min(...cs) >= MAX) return -1
  return crossings
}

export const newTts = (count = 8, bank: Entry[] = BANK): Tts => {
  for (let attempt = 0; ; attempt++) {
    const pool = shuffle(bank)
    const first = pool.shift()!
    const placed: Placed[] = [{ r: 0, c: 0, dir: 'across', ...first }]
    for (const w of pool) {
      if (placed.length >= count) break
      const grid = gridOf(placed)
      const options: { p: Placed; score: number }[] = []
      for (const [key, ch] of grid) {
        const [r, c] = key.split(',').map(Number)
        for (let k = 0; k < w.answer.length; k++) {
          if (w.answer[k] !== ch) continue
          for (const dir of ['across', 'down'] as const) {
            const p: Placed = {
              r: dir === 'down' ? r - k : r,
              c: dir === 'across' ? c - k : c,
              dir,
              ...w,
            }
            const score = fits(placed, grid, p)
            if (score > 0) options.push({ p, score })
          }
        }
      }
      if (options.length === 0) continue
      const best = Math.max(...options.map(o => o.score))
      const top = options.filter(o => o.score === best)
      placed.push(top[Math.floor(Math.random() * top.length)].p)
    }
    if (placed.length < Math.min(count, 5) && attempt < 20) continue
    return layout(placed)
  }
}

const layout = (placed: Placed[]): Tts => {
  const minR = Math.min(...placed.flatMap(p => cellsOf(p).map(x => x.r)))
  const minC = Math.min(...placed.flatMap(p => cellsOf(p).map(x => x.c)))
  const moved = placed.map(p => ({ ...p, r: p.r - minR, c: p.c - minC }))
  const starts = [...new Set(moved.map(p => p.r * 100 + p.c))].sort((a, b) => a - b)
  const words: Word[] = moved
    .map(p => ({ ...p, n: starts.indexOf(p.r * 100 + p.c) + 1, solved: false, hints: 0 }))
    .sort((a, b) => a.n - b.n || (a.dir === 'across' ? -1 : 1))
  const rows = Math.max(...words.flatMap(w => cellsOf(w).map(x => x.r))) + 1
  const cols = Math.max(...words.flatMap(w => cellsOf(w).map(x => x.c))) + 1
  return { rows, cols, words, sel: 0 }
}

export const wordCells = (w: Word) => cellsOf(w)

export const normalize = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '')

/** Index of the next unsolved word after `from`, or -1 when all are solved. */
export const nextUnsolved = (t: Tts, from: number): number => {
  for (let k = 1; k <= t.words.length; k++) {
    const i = (from + k) % t.words.length
    if (!t.words[i].solved) return i
  }
  return -1
}

/** Answer the selected word; returns the new state and whether it was right. */
export const answerTts = (t: Tts, text: string): { tts: Tts; isRight: boolean } => {
  const w = t.words[t.sel]
  if (!w || normalize(text) !== w.answer) return { tts: t, isRight: false }
  const words = t.words.map((x, i) => (i === t.sel ? { ...x, solved: true } : x))
  const solved = { ...t, words }
  const next = nextUnsolved(solved, t.sel)
  return { tts: { ...solved, sel: next < 0 ? t.sel : next }, isRight: true }
}

export const hintTts = (t: Tts): Tts => ({
  ...t,
  words: t.words.map((w, i) => {
    if (i !== t.sel || w.solved) return w
    const hints = w.hints + 1
    return { ...w, hints, solved: hints >= w.answer.length }
  }),
})

// ---------- TTS words written by Claude ----------

const THEMES = [
  'makanan & minuman', 'hewan', 'alam & cuaca', 'budaya Indonesia', 'kota & tempat di Indonesia',
  'teknologi & pemrograman', 'olahraga', 'pekerjaan', 'rumah & benda sehari-hari', 'musik & film',
  'sains', 'tubuh & kesehatan', 'transportasi', 'sekolah', 'buah & sayur', 'sejarah Indonesia',
]

export const pickTheme = () => THEMES[Math.floor(Math.random() * THEMES.length)]!

export const ttsPrompt = (theme: string, avoid: string[]) =>
  `Buat 16 kata untuk teka-teki silang (TTS) berbahasa Indonesia dengan tema "${theme}".
Aturan:
- Jawaban: satu kata bahasa Indonesia, huruf A-Z saja, 3 sampai 9 huruf, tanpa spasi atau tanda hubung.
- Petunjuk: singkat (maksimal 8 kata), jelas, tidak menyebut jawabannya.
- Campur kata pendek dan panjang, dengan banyak huruf vokal yang umum agar mudah disilangkan.
${avoid.length ? `- Jangan pakai kata-kata ini: ${avoid.join(', ')}\n` : ''}Balas HANYA dengan array JSON, tanpa teks lain:
[{"answer":"KUCING","clue":"Hewan peliharaan yang suka mengeong"}]`

/** The entries a model reply holds, the bad ones dropped. */
export const parseEntries = (text: string): Entry[] => {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Entry[] = []
  for (const item of raw) {
    const answer = typeof item?.answer === 'string' ? item.answer.trim().toUpperCase() : ''
    const clue = typeof item?.clue === 'string' ? item.clue.trim().slice(0, 80) : ''
    if (!/^[A-Z]{3,9}$/.test(answer) || !clue || seen.has(answer)) continue
    if (clue.toUpperCase().includes(answer)) continue
    seen.add(answer)
    out.push({ answer, clue })
  }
  return out
}
