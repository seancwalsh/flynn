# Flynn AAC Backend - Developer Commands
# 
# Quick Start:
#   make setup    - First time setup
#   make dev      - Start everything and run dev server
#   make test     - Run tests
#   make stop     - Stop all services

.PHONY: setup dev test stop clean logs db-shell help

# Default target
help:
	@echo "Flynn AAC Backend - Available Commands:"
	@echo ""
	@echo "  make setup     - First time setup (docker + deps + migrations)"
	@echo "  make dev       - Start docker services + dev server"
	@echo "  make test      - Start test DB + run tests"
	@echo "  make stop      - Stop all docker services"
	@echo "  make logs      - Show docker logs"
	@echo "  make db-shell  - Open psql shell to dev database"
	@echo "  make clean     - Stop services and remove volumes"
	@echo ""

# First time setup
setup:
	@echo "📦 Installing dependencies..."
	bun install
	@echo "🐳 Starting docker services..."
	docker compose up -d
	@echo "⏳ Waiting for postgres to be ready..."
	@sleep 3
	@echo "🗃️  Running migrations..."
	bun run db:migrate
	@echo "✅ Setup complete! Run 'make dev' to start developing."

# Start docker and dev server
dev:
	@docker compose up -d postgres redis
	@echo "⏳ Waiting for services..."
	@sleep 2
	bun run dev

# Run tests (with test database)
test:
	@docker compose up -d postgres-test
	@echo "⏳ Waiting for test database..."
	@sleep 2
	bun test

# Run tests in watch mode
test-watch:
	@docker compose up -d postgres-test
	@sleep 2
	bun test --watch

# Stop all services
stop:
	docker compose down

# View logs
logs:
	docker compose logs -f

# Open database shell
db-shell:
	docker compose exec postgres psql -U postgres -d flynn_aac

# Clean everything (including volumes)
clean:
	docker compose down -v
	@echo "🧹 Cleaned up docker volumes"

# Run migrations
migrate:
	bun run db:migrate

# Generate migration from schema changes
migrate-gen:
	bun run db:generate
