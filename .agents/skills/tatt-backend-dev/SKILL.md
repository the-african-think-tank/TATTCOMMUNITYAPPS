---
name: tatt-backend-dev
description: >-
  Workflow guide for developing NestJS API routes, Sequelize models, and services in TATT Community Apps backend.
  Use when adding new API endpoints, database models, DTO validations, or authentication handlers.
---

# TATT Backend Development Guide

Guide for backend development inside `server/` using NestJS and Sequelize.

## Folder Structure

```text
server/src/
├── modules/              # Feature modules (auth, support, users, etc.)
│   └── [feature]/
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       ├── [feature].module.ts
│       ├── dto/          # Data Transfer Objects
│       └── models/       # Sequelize models
├── database/             # Migrations and database setup
└── main.ts               # NestJS bootstrap entry point
```

## NestJS Best Practices

1. **Modules & Controllers**: Keep controller methods concise; delegate core business logic to services.
2. **DTOs & Validation**: Annotate DTO fields with `class-validator` and `class-transformer` decorators.
3. **Sequelize Models**: Use `sequelize-typescript` decorators (`@Table`, `@Column`, `@ForeignKey`, `@BelongsTo`, `@HasMany`).
4. **Database Deployments**: Run `make db-deploy` or `pnpm run db:deploy` inside `server/` for database deployment tasks.
5. **Testing**: Execute `pnpm test` inside `server/` to verify backend logic.
