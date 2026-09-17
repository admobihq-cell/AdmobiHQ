## Docs

"Docs" means `docs/api`, `docs/customer`, `docs/driver`, `docs/ops`, `docs/pricing`, and `docs/shared` — the living reference docs for the actual system. When you ship a new feature or behavior that isn't documented anywhere yet, add it there (a new doc, or a short section in the closest existing one) in the same change — don't leave it for someone else to notice later. When a change makes an existing doc factually wrong (a code snippet, a described behavior), fix that doc too, in the same change. `docs/superpowers/` (plans/specs) is different: those are historical records of what shipped at the time — don't rewrite their completed steps; append a dated addendum instead.

## Git

- Never add yourself (Claude) as a co-author on commits, and never sign commit messages with a "Co-Authored-By" trailer.
- Never add a "Generated with Claude Code" (or similar) line to PR descriptions.

## graphify

This project has a local (gitignored) knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships. Rebuild with `graphify update .` if `graphify-out/graph.json` is missing.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
