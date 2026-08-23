# Code Standards & AI Guidelines for TATT Community Apps

## 1. Modern Syntax & Readability First
- Always use recent, modern TypeScript/JavaScript syntax (`?.`, `??`, modern array methods, async/await, modern React 19/Next 16 idioms).
- Code must be clean, modern, self-documenting, and easy to read. Avoid obsolete patterns or cryptic code structures.

## 2. Clean Code, Modularity & Composability
- Keep files lean and composable. Avoid monolithic files with excessive code.
- Decompose complex UI pages or services into smaller, single-responsibility sub-components, custom hooks, or helper modules.

## 3. Check Before Creating (Reuse First)
- Always search the codebase before creating new helpers, utilities, UI elements, or models to see if a suitable implementation already exists.
- Leverage pre-existing components in `frontend/src/components` and shared utility modules.

## 4. Git Operations Protocol
- Do **NOT** execute `git push` or `git commit` unless explicitly instructed to do so in the user request prompt.

## 5. Package Manager & CLI Tools
- Always use `pnpm` for installing packages and running scripts.
- Root Makefile commands provide shortcut aliases (`make dev`, `make install-all`, `make db-deploy`).

## 6. Frontend & Backend Quality
- **Frontend (Next.js)**: Use TATT brand tokens (`tatt-lime`, `tatt-black`, `tatt-gray`, `surface`, `border`). Clean empty/loading state handling.
- **Backend (NestJS)**: Standard NestJS modules, DTO validation with `class-validator`, clean error handling using NestJS HTTP exceptions.
- **Verification**: Run `pnpm build` or `pnpm test` in `frontend/` or `server/` after non-trivial modifications.
