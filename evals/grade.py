#!/usr/bin/env python3
"""Grade precision-search eval runs against fixture ground truth.

Usage:
    python evals/grade.py <runs-dir>

Expected layout (one result.md per run, any number of configs):

    <runs-dir>/<eval-name>/<config>/outputs/result.md

for example:

    runs/iteration-1/startprocess-callers/with_skill/outputs/result.md
    runs/iteration-1/startprocess-callers/baseline/outputs/result.md

Each result.md should contain the agent's final report for that eval:
the answer (file paths + line numbers / timestamps / values) and, ideally,
the grep patterns it used.

Grading is deliberately forgiving in two directions:

* A1 recall is checked against the WHOLE text, so a target mentioned in
  prose still counts as recalled.
* A3 false positives are checked only against list-item lines
  (`- `, `* `, `1. `), so mentioning a trap in an "excluded" note is not
  punished.

Writes grading.json next to each result.md and prints a summary table.

Ground truth below assumes the exact fixtures shipped in evals/fixtures/.
"""

import json
import re
import sys
from pathlib import Path, PurePosixPath

# --------------------------------------------------------------------------
# Ground truth. Tuples are (fixture-relative posix path, line number).
# --------------------------------------------------------------------------

EVALS = {
    "startprocess-callers": {
        "a1_must": [
            ("src/index.ts", 13),
            ("src/task-engine.ts", 26),
            ("src/routes.ts", 8),
            ("test/task-engine.test.ts", 6),
            ("test/task-engine.test.ts", 11),
        ],
        "a2_must_not": [("src/task-engine.ts", 16)],  # function definition
        "a3_must_not": [("README.md", 8)],  # prose mention, no parens
    },
    "usercard-renders": {
        "a1_must": [
            ("src/features/Dashboard.tsx", 14),
            ("src/features/Profile.tsx", 9),
            ("src/features/Admin.tsx", 11),
        ],
        "a2_must_not": [("src/features/UserCard.tsx", 11)],  # definition
        "a3_must_not": [
            ("src/features/UserCardSkeleton.tsx", 4),  # prefix trap: definition
            ("src/features/Profile.tsx", 5),  # prefix trap: <UserCardSkeleton
        ],
        "a3_must_not_files": ["Feed.tsx"],  # import + string, never rendered
    },
    "dbconnection-instantiations": {
        "a1_must": [
            ("src/index.ts", 9),
            ("src/db/migrator.ts", 9),
            ("src/db/pool.ts", 14),
        ],
        "a2_must_not": [("src/db/connection.ts", 6)],  # class definition
        "a3_must_not": [("src/db/pool.ts", 6)],  # comment mention
    },
    "maxretries-reads": {
        "a1_must": [
            ("src/config/retry.ts", 16),
            ("src/config/retry.ts", 28),
            ("src/config/healthcheck.ts", 25),
        ],
        "a2_must_not": [
            ("src/config/retry.ts", 2),  # interface declaration
            ("src/config/retry.ts", 8),  # defaults object
        ],
        "a3_must_not": [("src/config/retry.ts", 22)],  # maxRetriesLimit comment
    },
    "log-errors": {
        "a1_must": [("logs/app-2026-11-25.log", 7)],  # 02:13:47 ERROR refused
        "a2_must_not": [],
        "a3_must_not": [
            ("logs/app-2026-11-25.log", 12),  # WARN mention
            ("logs/app-2026-11-25.log", 14),  # OOM ERROR, other topic
            ("logs/app-2026-11-24.log", 16),  # INFO postmortem mention
            ("logs/app-2026-11-24.log", 7),   # query timeout ERROR
            ("logs/app-2026-11-24.log", 13),  # query timeout ERROR
        ],
    },
    "session-timeout": {
        "a1_must": [
            ("config/app.yaml", 10),       # timeout: 1800 under session:
            ("env/production.env", 4),     # SESSION_TIMEOUT=3600
        ],
        "a2_mode": "values",               # both values must be reported
        "a2_values": ["1800", "3600"],
        "a3_must_not": [
            ("config/app.yaml", 17),       # db timeout: 5000
            ("config/app.yaml", 20),       # request_timeout: 15000
        ],
    },
}

# Evidence that anchored patterns were used anywhere in the report (A4).
ANCHOR_EVIDENCE = [
    re.compile(r"\\\("),          # escaped paren:      startProcess\(
    re.compile(r"\\\."),          # escaped dot:        \.maxRetries
    re.compile(r"\\b"),           # word boundary:      \bmaxRetries\b
    re.compile(r"\^\S"),          # line-start anchor:  ^ERROR
    re.compile(r"\[[^\]\\]+\]"),  # character class:    [Ss]ession
    re.compile(r"<[A-Z]\w*"),     # JSX anchor:         <UserCard
    re.compile(r'"\w+"\s*:'),     # key-definition:     "maxRetries":
    re.compile(r"\b-F\b"),        # fixed-string mode:  rg -F 'startProcess('
]

# Look-around, which ripgrep's default engine rejects (A5).
LOOKAROUND = [
    re.compile(r"\(\?<[=!]>?"),  # (?<=  (?<!
    re.compile(r"\(\?!"),        # (?!
]

LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s", re.M)


def line_mentioned(text: str, fname: str, line: int) -> bool:
    """The file's basename and the line number both appear in text."""
    base = PurePosixPath(fname).name
    if base not in text:
        return False
    return re.search(rf"(?<![\d.]){line}(?![\d])", text) is not None


def grade(eval_name: str, cfg: dict, text: str):
    checks = []

    # A1 — recall: every true target is reported (whole text).
    missing = [
        f"{f}:{n}"
        for f, n in cfg["a1_must"]
        if not line_mentioned(text, f, n)
    ]
    checks.append({
        "text": f"A1 recall: reports all {len(cfg['a1_must'])} true targets",
        "passed": not missing,
        "evidence": "all reported" if not missing else f"missing: {', '.join(missing)}",
    })

    # A2 — either "definition lines are not listed as targets" or
    # "both conflicting values are reported".
    if cfg.get("a2_mode") == "values":
        missing_vals = [v for v in cfg["a2_values"] if v not in text]
        checks.append({
            "text": f"A2 conflict reported: both values present ({', '.join(cfg['a2_values'])})",
            "passed": not missing_vals,
            "evidence": "both values reported" if not missing_vals
            else f"missing value(s): {', '.join(missing_vals)}",
        })
    else:
        listed = [
            f"{f}:{n}"
            for f, n in cfg["a2_must_not"]
            if line_mentioned(text, f, n)
        ]
        checks.append({
            "text": "A2 discrimination: definition lines not listed as targets",
            "passed": not listed,
            "evidence": "clean" if not listed else f"definition listed as target: {', '.join(listed)}",
        })

    # A3 — noise: trap lines never appear as list-item results.
    list_text = "\n".join(
        line for line in text.splitlines() if LIST_ITEM.match(line)
    )
    hits = [
        f"{f}:{n}"
        for f, n in cfg.get("a3_must_not", [])
        if line_mentioned(list_text, f, n)
    ]
    file_hits = [
        f for f in cfg.get("a3_must_not_files", []) if f in list_text
    ]
    bad = hits + [f"{f} (file)" for f in file_hits]
    checks.append({
        "text": f"A3 noise: no trap lines/files in the results list",
        "passed": not bad,
        "evidence": "clean" if not bad else f"trap reported as result: {', '.join(bad)}",
    })

    # A4 — anchored: report shows anchored patterns were used.
    ev = next((p.pattern for p in ANCHOR_EVIDENCE if p.search(text)), None)
    checks.append({
        "text": "A4 anchored: uses structural anchors, not bare words",
        "passed": ev is not None,
        "evidence": f"anchor evidence: /{ev}/" if ev else "no anchored pattern found in report",
    })

    # A5 — no look-around (unsupported by ripgrep's default engine).
    la = next((p.pattern for p in LOOKAROUND if p.search(text)), None)
    checks.append({
        "text": "A5 portable: no look-around patterns",
        "passed": la is None,
        "evidence": "none used" if la is None else f"look-around found: /{la}/",
    })

    return checks


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    runs = Path(sys.argv[1])
    if not runs.is_dir():
        sys.exit(f"not a directory: {runs}")

    results = []
    for result_md in sorted(runs.rglob("outputs/result.md")):
        run_dir = result_md.parent.parent
        eval_name = run_dir.parent.name
        config = run_dir.name
        if eval_name not in EVALS:
            print(f"skip (no ground truth): {eval_name}")
            continue
        text = result_md.read_text(encoding="utf-8", errors="replace")
        checks = grade(eval_name, EVALS[eval_name], text)
        passed = sum(1 for c in checks if c["passed"])
        grading = {
            "run": f"{eval_name}/{config}",
            "expectations": checks,
            "summary": {
                "pass_rate": passed / len(checks),
                "passed": passed,
                "failed": len(checks) - passed,
                "total": len(checks),
            },
        }
        out = run_dir / "grading.json"
        out.write_text(json.dumps(grading, indent=2, ensure_ascii=False), encoding="utf-8")
        results.append((eval_name, config, passed, len(checks), out))

    if not results:
        sys.exit(f"no <eval>/<config>/outputs/result.md found under {runs}")

    w = max(len(f"{e}/{c}") for e, c, *_ in results) + 2
    print(f"{'run':<{w}} passed")
    print("-" * (w + 10))
    for eval_name, config, passed, total, out in results:
        print(f"{eval_name + '/' + config:<{w}} {passed}/{total}")
    total_passed = sum(p for _, _, p, _, _ in results)
    total_all = sum(t for _, _, _, t, _ in results)
    print("-" * (w + 10))
    print(f"{'TOTAL':<{w}} {total_passed}/{total_all} ({total_passed / total_all:.1%})")


if __name__ == "__main__":
    main()
