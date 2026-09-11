# Embedded Job Ingestion Engine in Backend Container

The Job Ingestion Engine will reside directly within the existing NestJS backend application (`server/src/modules/jobs/ingestion/`) rather than running in a separate container or microservice. Daily execution will be triggered via `@nestjs/schedule` and guarded against multi-instance race conditions using PostgreSQL advisory locks.

## Considered Options

- **Option A (Chosen): Embedded in existing NestJS backend** — Zero infrastructure footprint, shares database models and Sequelize connections, easy local DX via `make dev`.
- **Option B: Dedicated worker container with shared codebase** — Complete process isolation, but adds Docker Compose, CI/CD, AWS CDK, and server RAM maintenance overhead.
- **Option C: Standalone microservice (Python/Go)** — Independent scaling, but introduces high operational complexity and duplicated database contracts.

## Consequences

- No changes required to Docker Compose files (`docker-compose.dev.yml`, `docker-compose.ec2.yml`, `docker-compose.ksd.yml`) or CDK infrastructure.
- PostgreSQL advisory locks ensure that if multiple API replicas run behind a load balancer, only one instance executes the harvest at a time.
- The module is strictly decoupled via provider interfaces, allowing straightforward extraction into a standalone worker container in the future if job volume expands significantly.
