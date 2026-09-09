.DEFAULT_GOAL := help
SHELL := bash

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## install deps and bring up the full stack
	pnpm install
	docker compose up -d
	pnpm seed

.PHONY: dev
dev: ## run the app (expects the other services up)
	pnpm dev

.PHONY: up
up: ## start keystone + pulseq + modelgate + postgres
	docker compose up -d

.PHONY: down
down:
	docker compose down

.PHONY: lint
lint: ## eslint + prettier
	pnpm lint

.PHONY: typecheck
typecheck:
	pnpm typecheck

.PHONY: test
test: ## unit + component tests
	pnpm test

.PHONY: e2e
e2e: ## Playwright core-flow (mocked backend)
	pnpm exec playwright install --with-deps chromium
	pnpm e2e

.PHONY: check
check: typecheck lint test ## what CI runs on a PR
