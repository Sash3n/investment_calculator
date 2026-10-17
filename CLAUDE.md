# FinCalc ZA

## Setup

Run once per clone (local or cloud) so the commit-msg hook is active:

```sh
git config core.hooksPath .githooks
```

## Git and GitHub rules

- Write commit messages and pull request descriptions in the project's own voice.
- Do NOT add any of these to commits, pull requests, issues or comments:
  - "Co-Authored-By" lines naming Claude or Anthropic
  - "Generated with Claude Code" or any similar footer
  - Links to claude.ai sessions, or any "Claude-Session" line
  - Mentions of Claude, Anthropic or AI assistance
- Use conventional commit prefixes (feat:, fix:, style:, refactor:, docs:, chore:, ci:, test:), in the `type(scope): summary` form already used in the history.
- Do not use em dashes in commit messages or pull request descriptions. Use hyphens or commas.
- Prefer many small commits over one large one.
- Never change calculation logic or tax rules inside a styling or UI commit.
- Name branches with the prefix `feat/`, `style/`, `fix/`, `chore/` or `docs/` followed by a short description, branched off `main`.
- Pull requests target `main`. Never push to or merge into `dev` unless explicitly asked.
- Before opening a pull request, run `npm run build` (this runs `tsc -b`) and `npm test`.
