DOCKER_USER ?= yayamamoudou
STAGING_API_URL ?= https://staff.theafricanthinktank.org/api
PROD_API_URL ?= https://community.theafricanthinktank.com/api
STAGING_STRIPE_KEY ?= pk_test_51TrcC0PFrQabPyhVDEB07cQJLylaqBQgRTim936glLCu9ZlUJsl1V8a1CjmUrkE4O2iq7dG6lqUJ8a4CUeQQFAq500naAa01Dt
PROD_STRIPE_KEY ?= pk_live_your_production_stripe_key

.PHONY: help install-all dev dev-build down logs db-deploy infra-synth infra-diff infra-deploy clean \
	build-staging-api build-staging-frontend push-staging build-push-staging \
	build-prod-api build-prod-frontend push-prod build-push-prod

# Colors for help menu
BLUE := \033[36m
RESET := \033[0m

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  $(BLUE)install-all$(RESET)           Install dependencies for frontend, server, and infra"
	@echo "  $(BLUE)dev$(RESET)                   Start local development environment using Docker Compose"
	@echo "  $(BLUE)dev-build$(RESET)             Rebuild and start local development environment"
	@echo "  $(BLUE)down$(RESET)                  Stop local Docker Compose services"
	@echo "  $(BLUE)logs$(RESET)                  Tail logs for Docker Compose services"
	@echo "  $(BLUE)build-staging-api$(RESET)     Build Staging API Docker image"
	@echo "  $(BLUE)build-staging-frontend$(RESET) Build Staging Frontend Docker image"
	@echo "  $(BLUE)push-staging$(RESET)           Push Staging API & Frontend images to Docker Hub"
	@echo "  $(BLUE)build-push-staging$(RESET)     Build & Push both Staging images"
	@echo "  $(BLUE)build-prod-api$(RESET)        Build Production API Docker image"
	@echo "  $(BLUE)build-prod-frontend$(RESET)    Build Production Frontend Docker image"
	@echo "  $(BLUE)push-prod$(RESET)              Push Production API & Frontend images to Docker Hub"
	@echo "  $(BLUE)build-push-prod$(RESET)        Build & Push both Production images"
	@echo "  $(BLUE)db-deploy$(RESET)             Run backend production database migration/sync script"
	@echo "  $(BLUE)infra-synth$(RESET)           Synthesize AWS CDK CloudFormation template"
	@echo "  $(BLUE)infra-diff$(RESET)            Compare local AWS CDK changes with deployed stack"
	@echo "  $(BLUE)infra-deploy$(RESET)          Deploy the AWS CDK infrastructure stack"
	@echo "  $(BLUE)clean$(RESET)                 Remove node_modules and build artifacts across directories"

install-all:
	@echo "Installing dependencies..."
	cd frontend && pnpm install
	cd server && pnpm install
	cd infra && pnpm install

dev:
	docker compose -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.dev.yml up --build --renew-anon-volumes

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

# --- Staging Build & Push Targets ---
build-staging-api:
	docker build --platform linux/amd64 --no-cache -t $(DOCKER_USER)/tatt-api:staging -f server/Dockerfile ./server

build-staging-frontend:
	docker build --platform linux/amd64 --no-cache \
		--build-arg NEXT_PUBLIC_API_URL="$(STAGING_API_URL)" \
		--build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(STAGING_STRIPE_KEY)" \
		-t $(DOCKER_USER)/tatt-frontend:staging \
		-f frontend/Dockerfile ./frontend

push-staging:
	docker push $(DOCKER_USER)/tatt-api:staging
	docker push $(DOCKER_USER)/tatt-frontend:staging

build-push-staging: build-staging-api build-staging-frontend push-staging

# --- Production Build & Push Targets ---
build-prod-api:
	docker build --platform linux/amd64 --no-cache -t $(DOCKER_USER)/tatt-api:production -f server/Dockerfile ./server

build-prod-frontend:
	docker build --platform linux/amd64 --no-cache \
		--build-arg NEXT_PUBLIC_API_URL="$(PROD_API_URL)" \
		--build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(PROD_STRIPE_KEY)" \
		-t $(DOCKER_USER)/tatt-frontend:production \
		-f frontend/Dockerfile ./frontend

push-prod:
	docker push $(DOCKER_USER)/tatt-api:production
	docker push $(DOCKER_USER)/tatt-frontend:production

build-push-prod: build-prod-api build-prod-frontend push-prod

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
