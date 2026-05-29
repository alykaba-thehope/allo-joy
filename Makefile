.PHONY: help dev infra-up infra-down setup seed test typecheck build logs clean

# Couleurs
CYAN  := \033[0;36m
NC    := \033[0m

help: ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*##' Makefile | awk 'BEGIN {FS=":.*##"}; {printf "$(CYAN)%-18s$(NC) %s\n", $$1, $$2}'

# ── Infrastructure ────────────────────────────────────────────────────────────
infra-up: ## Démarrer PostgreSQL + Redis + GraphHopper
	docker compose up -d postgres redis graphhopper
	@echo "Attente que les services soient prêts..."
	@docker compose exec postgres pg_isready -U allojoy || sleep 5

infra-down: ## Arrêter l'infrastructure
	docker compose down

setup: infra-up ## Premier démarrage : infra + migrations + seed
	@echo "Exécution des migrations..."
	cd apps/api && npm run db:migrate
	@echo "Chargement des données de test..."
	cd apps/api && npm run db:seed
	@echo "✅ Setup terminé"

asterisk-up: ## Démarrer Asterisk (téléphonie 3030)
	docker compose --profile telephony up -d asterisk

asterisk-logs: ## Logs Asterisk temps réel
	docker compose logs -f asterisk

asterisk-cli: ## Console Asterisk interactive
	docker compose exec asterisk asterisk -r

osm: ## Télécharger les données OSM Guinée (requis pour GraphHopper)
	bash infra/scripts/setup-osm.sh

# ── Développement ─────────────────────────────────────────────────────────────
dev: infra-up ## Lancer l'API en mode dev (tsx watch)
	npm run dev -w @allo-joy/api

dev-agent: ## Lancer l'interface agent (port 5173)
	npm run dev -w @allo-joy/agent-web

dev-supervisor: ## Lancer le dashboard superviseur (port 5174)
	npm run dev -w @allo-joy/supervisor-web

dev-provider: ## Lancer le portail prestataire (port 5175)
	npm run dev -w @allo-joy/provider-web

dev-mobile: ## Lancer l'app mobile (Expo Go)
	npm run start -w @allo-joy/mobile

dev-mobile-android: ## Lancer l'app mobile sur émulateur Android
	npm run android -w @allo-joy/mobile

build-android: ## Build APK preview (EAS)
	cd apps/mobile && npx eas build --platform android --profile preview

build-android-prod: ## Build AAB production (EAS — Google Play)
	cd apps/mobile && npx eas build --platform android --profile production

dev-all: infra-up ## Lancer toute la stack en dev (5 terminaux)
	@echo "Utilisez 5 terminaux séparés ou un multiplexer (tmux/zellij)"
	@echo "  make dev             → API :3000"
	@echo "  make dev-agent       → Agent :5173"
	@echo "  make dev-supervisor  → Superviseur :5174"
	@echo "  make dev-provider    → Prestataire :5175"
	@echo "  make dev-mobile      → Expo Metro (mobile)"

# ── Qualité ───────────────────────────────────────────────────────────────────
test: ## Lancer les tests
	npm test -w @allo-joy/api

test-watch: ## Tests en mode watch
	npm run test:watch -w @allo-joy/api

test-coverage: ## Tests avec couverture
	npm run test:coverage -w @allo-joy/api

typecheck: ## Vérifier les types TS (tous les packages)
	npm run typecheck -w @allo-joy/api
	npm run typecheck -w @allo-joy/agent-web
	npm run typecheck -w @allo-joy/supervisor-web
	npm run typecheck -w @allo-joy/provider-web

# ── Base de données ───────────────────────────────────────────────────────────
db-migrate: ## Appliquer les migrations Prisma
	cd apps/api && npm run db:migrate

db-seed: ## Charger les données de test
	cd apps/api && npm run db:seed

db-studio: ## Ouvrir Prisma Studio
	cd apps/api && npm run db:studio

db-reset: ## ⚠️  Réinitialiser la BDD (efface tout)
	docker compose exec postgres psql -U allojoy -c "DROP DATABASE IF EXISTS allojoy; CREATE DATABASE allojoy;"
	cd apps/api && npm run db:migrate
	cd apps/api && npm run db:seed

# ── Build ─────────────────────────────────────────────────────────────────────
build: ## Build Docker image de l'API
	docker build -f apps/api/Dockerfile -t allojoy-api:latest .

build-all: ## Build toutes les apps web (Vite)
	npm run build -w @allo-joy/agent-web
	npm run build -w @allo-joy/supervisor-web
	npm run build -w @allo-joy/provider-web

# ── Logs ──────────────────────────────────────────────────────────────────────
logs: ## Logs de l'API
	docker compose logs -f api

logs-all: ## Logs de tous les services
	docker compose logs -f

# ── Nettoyage ─────────────────────────────────────────────────────────────────
clean: ## Supprimer les conteneurs et volumes (⚠️  efface les données)
	docker compose down -v
	find . -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
