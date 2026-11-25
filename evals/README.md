# Evals

Reproducible test fixtures for the **precision-search** skill: six search
tasks over three synthetic repos, each seeded with traps that separate
anchored search from bare-word search.

## Fixtures

| directory | scenario | seeded traps |
|---|---|---|
| `fixtures/codebase/` | small TypeScript workflow engine | definition lines that look like calls, comment mentions, JSX prefix lookalikes (`UserCardSkeleton`), import/string mentions, prefix identifiers (`maxRetriesLimit`) |
| `fixtures/logrepo/` | two days of app logs | same phrase at other severities (WARN/INFO), ERROR lines about other topics |
| `fixtures/ops-repo/` | YAML config + env overrides + docs | same-prefix keys (`cookie_domain`, `store`), unrelated timeouts (db/http), an env override with a **conflicting value** |

The fixtures are synthetic text for agents to search — they are not
runnable and connect to nothing.

## Tasks

See [evals.json](evals.json) for the six task prompts and their traps:

1. `startprocess-callers` — find call sites of a function (definition + README mention traps)
2. `usercard-renders` — find JSX render sites (import/string/prefix traps)
3. `dbconnection-instantiations` — find `new` instantiations (comment/type-annotation traps)
4. `maxretries-reads` — find runtime reads of a config key (interface/defaults/prefix traps)
5. `log-errors` — find one ERROR line among severity and topic traps
6. `session-timeout` — find a config definition and its conflicting env override

## Grading

Each run is graded on 5 assertions:

- **A1 recall** — every true target line is reported (checked against the whole text)
- **A2 discrimination** — definition lines are not listed as targets; for
  `session-timeout`, both conflicting values (1800, 3600) must be reported
- **A3 noise** — trap lines/files never appear as list-item results
- **A4 anchored** — the report shows anchored patterns (`\(`, `\.`, `\b`,
  `^`, char classes, `<Comp`, `"key":`, `-F`), not bare words
- **A5 portable** — no look-around patterns (ripgrep's default engine rejects them)

## Running an eval yourself

Point an agent (with the skill) and a baseline agent (without it) at the
same prompt from `evals.json`, one `result.md` per run:

```
runs/
└── iteration-1/
    ├── startprocess-callers/
    │   ├── with_skill/outputs/result.md
    │   └── baseline/outputs/result.md
    ├── usercard-renders/
    │   └── ...
    └── ...
```

Then:

```bash
python evals/grade.py runs/iteration-1
```

This writes `grading.json` next to each result and prints a per-run and
total pass table.
