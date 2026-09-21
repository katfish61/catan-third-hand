# Catan Third Hand

A companion board so Claude can play the **third seat** in a 2-human game of base Catan.
Physical board + this app on one shared screen.

## Live artifact

https://claude.ai/code/artifact/b4936d92-2085-4648-9813-13f3dff7b37c

Open it **from claude.ai** (not a saved copy) so Claude can make its moves — it uses the
`sample` capability. Otherwise it's a fully manual tracker.

`catan-third-hand.html` in this folder is the source that gets published there.

## What it does

- Tracks the whole game for all 3 players: board, robber, everyone's VP, dev cards,
  longest road, largest army, the win.
- Claude's resource hand + dev cards live only in the browser tab — never drawn on
  screen (only public counts), sent to Claude privately on its turns.
- Dev deck Claude draws from is shuffled once from a seed; SHA-256 fingerprint shown up
  front, seed + order revealed at game end. Dice Claude rolls / steals / 7-discards use
  the same seed and are logged.
- Humans keep physical resource + dev cards; app tracks only their public counts
  (−/+ in the scoreboard to keep them honest).

## House rules / setup supported

- Choose who places first (roll a die at the table, tap the winner, or "Pick randomly").
- Standard snake order: clockwise, last player places twice, snakes back anticlockwise.
- "No 7s for the first N rounds" = **roll again** on a 7 during those rounds.
- Standard A–R number-token spiral (pick start hex + direction).
- No dev card the turn it's bought; one per turn (enforced for Claude exactly, for humans
  via counts). VP cards revealable any time.

## Resuming work later

1. Start a new Claude Code session.
2. Say you want to pick the Catan Third Hand project back up. Memory notes point here.
3. To edit: work on `catan-third-hand.html`, then publish with the Artifact tool passing
   `url: https://claude.ai/code/artifact/b4936d92-2085-4648-9813-13f3dff7b37c` so it
   updates in place. If the local file is behind the live version, read the artifact
   first (`Artifact action: "read"` with that URL) and merge.
4. `git commit` changes here as you go.

## Known issues / notes

- After each publish the CDN takes ~15–30s to serve the new version — a blank page right
  after publishing is just propagation, not a bug.
- Google Fonts must load via `@import` inside `<style>`, NOT a `<link>` tag — a `<link>`
  with the multi-`family` URL made the whole published page render blank.
- No `window.confirm` / `prompt` / `alert` — the published artifact iframe silently
  blocks them. All confirmations/inputs are inline UI.
- If Claude's turn stalls ("its turn is paused"), it's almost always rate-limiting from
  actions firing back-to-back. "Resume Claude's turn" retries without re-rolling;
  "End Claude's turn" hands off.


## Built-in bot & standalone app

- **Who plays the third seat** (header button "Opponent"): *auto* = Claude when the `sample` capability is
  available (inside claude.ai), otherwise the built-in bot; *bot* = always the bot; *claude* = Claude, falling
  back to the bot if a request fails, so a turn can no longer stall on rate limits.
- The bot (`BUILT-IN BOT` section of `catan-third-hand.html`) is a rules-based player: setup placement with
  look-ahead, settlement/city/road/dev priorities (expansion first), road paths toward open spots, bank/port
  trades toward its next goal, trades with the humans, robber and knight choices, smart discards.
- **Standalone / installable app:** `python3 build_standalone.py` writes `docs/` (index.html, manifest,
  service worker, icons). Serve `docs/` over https (e.g. GitHub Pages from `/docs`) and use
  *Share → Add to Home Screen* on iPhone/iPad, or Safari *File → Add to Dock* on a Mac. It works offline after
  the first load and needs no account, key or subscription.
- Local try-out: `cd docs && python3 -m http.server 8000`.
- Headless self-play test: see `tools/sim.js` (needs `npm i jsdom`); plays full games against simple
  human-like players and reports win rate, stalls and errors.
