# precision-search

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [Claude Code](https://code.claude.com) skill that replaces bare-word grep with **syntax-anchored patterns** — one precise hit instead of a dozen noisy matches.

**简体中文** 说明见 [README.zh-CN.md](README.zh-CN.md)。

## The problem

Ask your agent to find where `startProcess` is called, and it greps for `startProcess`. The hits come back drowning in noise:

```
src/index.ts:1        import { startProcess } from './task-engine';   ← import
src/task-engine.ts:16 export async function startProcess(             ← definition
src/task-engine.ts:26       await startProcess(child.template, ...);  ← ✓ a call
src/routes.ts:2       import { startProcess } from './task-engine';   ← import
README.md:8           Calling `startProcess` kicks off a run          ← docs prose
src/config/retry.ts:22 * ...maxRetries may never exceed maxRetriesLimit ← prefix lookalike (different query)
```

The tool is not slow. **The query is too wide.** The agent burns extra turns and tokens reading noise, and on large codebases it starts guessing.

## The idea

One move, applied before every search — code, docs, logs, config, data files, chat exports, anything:

> Ask *"what structural shape does the target have?"* — then write that shape into the pattern.

A call has an open-paren: `startProcess\(`. A JSX render has an opening tag: `<UserCard`. An instantiation has `new`: `new DatabaseConnection\(`. A config key read has a leading dot: `\.maxRetries\b`. A key definition has a trailing colon: `"maxRetries":`. An error log starts the line with a level: `^ERROR.*refused`.

### Quick reference

| You want | ❌ bare word | ✅ anchored |
|---|---|---|
| callers of a function | `startProcess` | `startProcess\(` |
| method calls only | `startProcess` | `\.startProcess\(` |
| JSX render sites | `UserCard` | `<UserCard` |
| instantiations | `DatabaseConnection` | `new DatabaseConnection\(` |
| config key reads | `maxRetries` | `\.maxRetries\b` |
| config key definitions | `maxRetries` | `"maxRetries":` |
| error logs | `connection refused` | `^ERROR.*refused` |
| calls with a specific argument | `production` | `, 'production'\)` |
| implementers of an interface | `UserRepo` | `implements UserRepo\b` |

The full reference — universal anchors, per-language definition patterns, the prefix trap, the search decision flow, and when a bare word is actually fine — lives in [SKILL.md](SKILL.md).

## Install

Copy the skill into your Claude Code skills directory:

```bash
git clone https://github.com/esyion/precision-search.git
mkdir -p ~/.claude/skills/precision-search
cp precision-search/SKILL.md ~/.claude/skills/precision-search/SKILL.md
```

On Windows, use `%USERPROFILE%\.claude\skills\precision-search\` instead of `~/.claude/...`.

That's it. The skill activates automatically: whenever Claude's first step on a task is a search — grep, `rg`, find usages, callers, log triage, config lookup — it reads the skill first and searches with anchors. You can also invoke it explicitly with `/precision-search`.

Works with any coding agent that supports the [Agent Skills](https://agentskills.io) format — not just Claude Code.

## Two rules of thumb

1. **Escape your anchors.** In regex mode, `(` `.` `[` `{` `?` are metacharacters. `startProcess(` is an *invalid regex* — it errors out and costs you a round trip. `startProcess\(` is the search you wanted. (Only exception: `rg -F` / `grep -F` fixed-string mode, where nothing needs escaping.)
2. **Start narrow, then widen.** Build the narrowest pattern the target *must* match; only relax it deliberately (better anchor → add `\b` → bare word last).

And one hard constraint: **ripgrep's default engine does not support look-around** — `(?<!def )foo` and `foo(?!bar)` simply error. Don't reach for it; filter definitions out of an anchored result set instead.

## Evals

Six search tasks over three synthetic repos (a TypeScript codebase, a log directory, an ops config repo), each seeded with traps: definition lines that look like calls, comment mentions, prefix lookalikes, same-phrase-at-other-severity log lines, and a config key with a conflicting env override.

Each run is graded on 5 assertions — recall, definition discrimination, noise avoidance, anchored-pattern usage, no look-around. `with_skill` = agent with this skill installed; `baseline` = same agent, same prompts, no skill.

| iteration | with_skill | baseline | baseline failures |
|---|---|---|---|
| 1 | **30/30 (100%)** | 25.5/30 (85%) | mixed |
| 2 | **30/30 (100%)** | 26/30 (86.7%) | all 4 in A4: searched with bare words |

### What the numbers do — and don't — show

Honest reading: on these *small* fixtures, the baseline also located the right lines most of the time — by bare-word searching, then manually reading each hit to sort signal from noise. Its failures concentrated in the *method* assertion (A4): it searched wide and paid in extra reads. The skill's value is making the anchored method the **default on every search**, and that is what scales: hand-verifying hits works on 20 files, not on 20,000.

Notably, the two non-code tasks (log triage, config audit) scored 100% with the skill and showed real analytical wins — e.g. discovering the `1800` vs `3600` session-timeout conflict between `app.yaml` and `production.env` via a character-class anchor (`[Ss]ession[_-]?[Tt]ime[_-]?[Oo]ut`).

### Reproduce

Fixtures, task prompts, traps, and the grader all ship in [evals/](evals/):

```bash
python evals/grade.py runs/your-iteration
```

See [evals/README.md](evals/README.md) for the layout and assertion definitions.

## License

[MIT](LICENSE) © 2026 esyion
