# cooking-puzzles 🍳🧩

A Claude Code mod: play **Sudoku**, **TTS (teka-teki silang)** or Nokia-style **Snake** in a pane while Claude is cooking.

When you send a prompt, a puzzle pane opens. When Claude finishes, you get a toast — press **Esc** to go back to the prompt. Your game is saved between turns.

Don't want it popping up? `/puzzle off` — the games then only open when you ask (`/sudoku`, `/tts`, `/snake`).

## Install

```
/plugin install cooking-puzzles --marketplace Tamlica/cooking-puzzles-mod
```

Answer `y` to add the marketplace, then pick a scope.

## Play

**Sudoku** — every puzzle has exactly one solution.

| Key | Action |
| --- | --- |
| `w` `a` `s` `d` | move |
| `1`–`9` | fill |
| `0` | erase |
| `n` | new puzzle |
| `g` | switch to TTS |
| `k` | switch to Snake |

**TTS** — every new crossword is written by Claude (Haiku) on a random theme (makanan, hewan, teknologi, sejarah…), avoiding words you've seen recently. If that fails or you turn it off, it uses a built-in list of ~50 Indonesian words. Type the answer and press Enter (empty Enter = next clue). Tab to pick a clue, **petunjuk** reveals a letter.

**Snake** — like the old Nokia, on a 3310-green screen. Walls wrap around (Snake II style), and the snake speeds up as it grows. Click the board to give it the keyboard first.

| Key | Action |
| --- | --- |
| arrows / `w` `a` `s` `d` / `h` `j` `k` `l` | steer (and start) |
| `space` / `p` | pause |
| `r` | restart |

Your best score is kept across sessions.

## Commands

- `/sudoku`, `/tts`, `/snake` — open a game any time
- `/puzzle on|off` — auto-open while Claude works (on by default). Off is fully quiet: no pane, no status line
- `/puzzle sudoku|tts|snake` — which game auto-opens
- `/puzzle` — show the current settings
- `/puzzle ai on|off` — Claude-written TTS words (on by default; each new TTS is one small Haiku call)

Your games in progress, settings and Snake best score are saved, so they carry over to your next session.

To turn the whole mod off, disable or uninstall it from the `/plugin` menu.

## Develop

```
claude --plugin-dir .          # run it from this folder
claude plugin validate .
claude plugin test .
```
