---
name: make-commands
description: >-
  Guide and reference for running workspace commands via the root Makefile.
  Use when starting dev servers, building staging/prod images, running database deployments, or running CDK synth/diff.
---

# Makefile Commands Guide

Use the root Makefile to manage development, build, deployment, and infrastructure tasks across the monorepo.

## Primary Development Commands

- **Start Local Dev Environment**:
  ```bash
  make dev
  ```
  *(Launches Docker Compose using `docker-compose.dev.yml`)*

- **Rebuild and Start Dev Environment**:
  ```bash
  make dev-build
  ```

- **Stop Dev Services**:
  ```bash
  make down
  ```

- **Tail Container Logs**:
  ```bash
  make logs
  ```

- **Install All Dependencies**:
  ```bash
  make install-all
  ```
  *(Runs `pnpm install` in `frontend/`, `server/`, and `infra/`)*

## Database & Infrastructure Commands

- **Run Production Database Deploy/Migration**:
  ```bash
  make db-deploy
  ```

- **AWS CDK Infrastructure Commands**:
  - Synthesize CloudFormation template: `make infra-synth`
  - Compare stack changes: `make infra-diff`
  - Deploy infrastructure: `make infra-deploy`

## Staging & Production Deployment

- **Build & Push Staging**:
  ```bash
  make build-push-staging
  ```

- **Deploy Staging on VM**:
  ```bash
  make deploy-staging
  ```

- **Build & Push Production**:
  ```bash
  make build-push-prod
  ```
