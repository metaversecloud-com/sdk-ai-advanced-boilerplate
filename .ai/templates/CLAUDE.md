# Claude Development Guidelines

> This file is auto-loaded by the Claude Code CLI when a session opens in this directory. The canonical rules for every Topia SDK app live in the **[sdk-ai-advanced-boilerplate](../sdk-ai-advanced-boilerplate/)** sibling repo.

## Where to find the rules

The canonical source is [`../sdk-ai-advanced-boilerplate/.ai/`](../sdk-ai-advanced-boilerplate/.ai/). Use the first source you can reach — stop once you've found it; the rest are fallbacks for when the previous source isn't available:

1. **[`../sdk-ai-advanced-boilerplate/.ai/`](../sdk-ai-advanced-boilerplate/.ai/)** — canonical (in the topia-stack monorepo). Read `rules.md`, `sdk-fundamentals.md`, `style-guide.md`, `accessibility.md`; browse `examples/` as needed.
2. **https://github.com/metaversecloud-com/sdk-ai-advanced-boilerplate** — read directly from GitHub if the monorepo copy isn't reachable.
3. **[`./.ai/`](./.ai/)** — this app's local snapshot from when it was cloned. May be out of date; last-resort fallback only.

If multiple sources are reachable and disagree, the **sdk-ai-advanced-boilerplate** copy wins.

## Stack

- React + TypeScript (client), Node + Express (server)
- SDK: [`@rtsdk/topia`](https://metaversecloud-com.github.io/mc-sdk-js/index.html)

## App-specific context

See [`README.md`](README.md) for gameplay, asset requirements, and the API surface.

---

For architecture, SDK usage, protected files, data-object patterns, real-time updates, styling, accessibility, testing, workflow — defer to `../sdk-ai-advanced-boilerplate/.ai/rules.md`.
