.PHONY: install dev lint typecheck test build verify infra-up infra-down

install:
	corepack pnpm install

dev:
	corepack pnpm dev

lint:
	corepack pnpm lint

typecheck:
	corepack pnpm typecheck

test:
	corepack pnpm test

build:
	corepack pnpm build

verify:
	corepack pnpm verify

infra-up:
	docker compose up -d postgres redis minio

infra-down:
	docker compose down

