.PHONY: help dev dev-build down logs db-deploy infra-synth infra-deploy infra-diff install-all clean

# Colors for help menu
BLUE := \033[36m
RESET := \033[0m

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  $(BLUE)install-all$(RESET)    Install dependencies for frontend, server, and infra"
	@echo "  $(BLUE)dev$(RESET)            Start local development environment using Docker Compose"
	@echo "  $(BLUE)dev-build$(RESET)      Rebuild and start local development environment"
	@echo "  $(BLUE)down$(RESET)           Stop local Docker Compose services"
	@echo "  $(BLUE)logs$(RESET)           Tail logs for Docker Compose services"
	@echo "  $(BLUE)db-deploy$(RESET)      Run backend production database migration/sync script"
	@echo "  $(BLUE)infra-synth$(RESET)    Synthesize AWS CDK CloudFormation template"
	@echo "  $(BLUE)infra-diff$(RESET)     Compare local AWS CDK changes with deployed stack"
	@echo "  $(BLUE)infra-deploy$(RESET)   Deploy the AWS CDK infrastructure stack"
	@echo "  $(BLUE)clean$(RESET)          Remove node_modules and build artifacts across directories"

install-all:
	@echo "Installing dependencies..."
	cd frontend && pnpm install
	cd server && pnpm install
	cd infra && pnpm install

dev:
	docker compose -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.dev.yml up --build

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

db-deploy:
	cd server && pnpm run db:deploy

infra-synth:
	cd infra && pnpm cdk synth

infra-diff:
	cd infra && pnpm cdk diff

infra-deploy:
	cd infra && pnpm cdk deploy

clean:
	@echo "Cleaning up build artifacts and dependencies..."
	rm -rf frontend/node_modules frontend/.next
	rm -rf server/node_modules server/dist
	rm -rf infra/node_modules infra/cdk.out
