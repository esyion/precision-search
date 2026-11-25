# taskflow

A small workflow engine used by the platform team to model
multi-step business processes (onboarding, refunds, KYC checks).

## Overview

The engine is driven by templates. Calling `startProcess` kicks off
a run: the template is validated, a first task node is created, and
downstream work is scheduled through the event bus. Processes fan out
into child tasks, each retried independently.

## Layout

- `src/` — engine, HTTP routes, config loaders
- `test/` — vitest suites
- `docs/` — design notes

## Quick start

```bash
npm install
npm test
```
