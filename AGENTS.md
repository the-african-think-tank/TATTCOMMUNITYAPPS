# AGENTS.md - TATT Community Apps AI Guidelines & Context

Welcome AI Agent! This document provides essential repository context, conventions, commands, and rules for operating on **TATT Community Apps** (The African Think Tank).

---

## 🏗️ Repository Architecture Overview

This monorepo consists of three core packages:

1. **`frontend/`**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Axios, TanStack React Query, Socket.io client.
2. **`server/`**: NestJS 11 backend, TypeScript, Sequelize (PostgreSQL), JWT & OAuth, Socket.io, Swagger documentation, Jest testing.
3. **`infra/`**: AWS CDK infrastructure stack in TypeScript for cloud synthesis and deployment.

---

## 🛠️ Package Manager & Key Commands

> [!IMPORTANT]
> **ALWAYS use `pnpm`** as the package manager across all subdirectories. Do not use `npm` or `yarn`.

### Makefile Operations (Run from workspace root)
- **`make install-all`**: Install dependencies in `frontend`, `server`, and `infra`.
- **`make dev`**: Launch local development services via Docker Compose (`docker-compose.dev.yml`). *Note: do not use `make up`.*
- **`make dev-build`**: Rebuild and start local dev containers.
- **`make down`**: Stop local Docker Compose dev environment.
- **`make logs`**: Tail Docker Compose logs.
- **`make db-deploy`**: Run backend database production migrations (`pnpm run db:deploy`).
- **`make infra-synth`**: Synthesize AWS CDK stack template.
- **`make infra-diff`**: Compare local CDK changes against deployed stack.

### Subdirectory Commands
- **Frontend** (`cd frontend`): `pnpm dev` | `pnpm build` | `pnpm lint`
- **Server** (`cd server`): `pnpm dev` | `pnpm build` | `pnpm test`
- **Infra** (`cd infra`): `pnpm cdk synth` | `pnpm cdk diff`

---

## 🎨 Design System & Styling (Frontend)

- **Brand Aesthetic**: Vibrant dark mode with glassmorphism elements, high-contrast typography, and premium accent colors.
- **Color Palette**:
  - `bg-tatt-black` / `text-tatt-black`: Deep obsidian black (`#000000` / `#0B0C0E`).
  - `text-tatt-lime` / `bg-tatt-lime`: Accent lime green (`#CCFF00` or equivalent brand lime).
  - `bg-surface`: Card / container dark surface.
  - `border-border`: Subtle dark border separator.
  - `text-tatt-gray`: Muted text gray.
- **Icons**: Use `lucide-react` for all UI icons.
- **Components**: Place page components in `frontend/src/app/...` and reusable UI components in `frontend/src/components/...`.

---

## 🛡️ Strict AI Code Guidelines & Best Practices

1. **UX Standards & Cursor Feedback**:
   - Always include `cursor-pointer` on interactive elements (`<button>`, `<Link>`, clickable cards, tab triggers, dropdown items, close icons, overlays).
   - Use `disabled:cursor-not-allowed disabled:opacity-50` for disabled buttons/inputs.
   - Include tactile press feedback (`active:scale-95`), hover transitions (`hover:... transition-all` / `transition-colors`), and accessible focus states (`focus:outline-none focus:ring-2`).
2. **Modern Syntax & Readability**:
   - Always use modern ECMAScript/TypeScript syntax (e.g. optional chaining `?.`, nullish coalescing `??`, modern array methods, async/await).
   - Write clear, intuitive, and modern code. Prioritize readability and legibility over overly dense or obscure expressions.
3. **Clean Code & Modularity**:
   - Keep files small, focused, and clean. Never allow files or components to grow too large or bloated.
   - Break large components and handlers into modular, composable functions, custom hooks, or sub-components.
4. **Check Before Creating**:
   - ALWAYS search the codebase to verify if a utility, hook, component, DTO, or model already exists before creating a new one. Reuse existing implementations.
5. **No Unrequested Git Commits or Pushes**:
   - **NEVER** run `git commit` or `git push` commands unless explicitly requested by the user in the prompt.
6. **Strict Type Safety**: Write strict TypeScript types; avoid `any` when defining API contracts, models, or state objects.
7. **NestJS & Next.js Architecture**: Follow modern NestJS module standards (`module`, `controller`, `service`, `dto`, `model`) and Next.js 16 App Router conventions.
8. **Conditional UI Rendering**: When lists or sections are empty or optional (e.g. FAQs, search results), handle loading states gracefully and hide empty containers completely when appropriate.
9. **No Blind Symptom Patching**: Read full error logs and trace upstream logic before making fixes.
