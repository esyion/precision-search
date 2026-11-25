# Operations handbook (excerpt)

## Sessions

Users are signed out after 30 minutes of inactivity. The
session timeout is configured in `config/app.yaml` and can be
overridden per environment through env files.

Stale sessions are evicted from the Redis store nightly.

## Timeouts

Database queries share the generic `db.timeout` value (5s).
HTTP request timeouts are enforced at the edge proxy.
