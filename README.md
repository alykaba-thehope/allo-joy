# Allô Joy — Plateforme de Services Citoyens

Plateforme multi-canal pour connecter les citoyens de Conakry à des prestataires de services (plomberie, électricité, ménage, transport…).

**Canaux** : Phone 3030 · WhatsApp · Android · USSD `*384#`

---

## Stack

| Couche | Technologie |
|--------|-------------|
| API | Fastify 4 + TypeScript |
| Base de données | PostgreSQL 16 + PostGIS 3.4 |
| ORM | Prisma |
| Cache / Files | Redis 7 + BullMQ |
| Routage | GraphHopper (OSM Guinée) |
| Cartographie | MapLibre GL + tuiles OSM |
| Frontend | React 18 + Vite + Tailwind CSS |
| État client | Zustand + TanStack Query |
| Auth | OTP SMS (Africa's Talking) + JWT (15min/30d) |
| Infra | AWS af-south-1 (Cape Town) |
| IaC | Terraform ≥ 1.6 |
| CI/CD | GitHub Actions |

---

## Structure du monorepo

```
.
├── apps/
│   ├── agent-web/       # Interface agent centre d'appels  (port 5173)
│   ├── supervisor-web/  # Dashboard superviseur            (port 5174)
│   ├── provider-web/    # Portail prestataire (PWA)        (port 5175)
│   └── api/             # Fastify API REST + WebSocket     (port 3000)
├── packages/
│   └── types/           # Types partagés (@allo-joy/types)
├── infra/
│   ├── terraform/       # Infrastructure AWS complète
│   └── graphhopper/     # Config GraphHopper + données OSM
├── .github/workflows/
│   ├── ci.yml           # PR checks (typecheck + tests)
│   └── deploy.yml       # Déploiement automatique sur push main
├── docker-compose.yml
├── docker-compose.override.yml  # Overrides dev (tsx watch, volumes)
└── Makefile
```

---

## Démarrage rapide (développement)

### Prérequis

- Node.js ≥ 20
- Docker + Docker Compose
- Make

### 1. Cloner et installer

```bash
git clone git@github.com:your-org/allojoy.git
cd allojoy
npm install
```

### 2. Configurer l'environnement

```bash
cp apps/api/.env.example apps/api/.env
# Éditer apps/api/.env — au minimum DATABASE_URL, REDIS_URL, JWT_SECRET
```

### 3. Lancer l'infrastructure et migrer

```bash
make setup
# Démarre postgres + redis + graphhopper, joue les migrations et le seed
```

### 4. Lancer les apps

```bash
# API + worker (terminal 1)
make dev

# Interfaces web (terminaux séparés)
make dev-agent       # http://localhost:5173
make dev-supervisor  # http://localhost:5174
make dev-provider    # http://localhost:5175
```

### Commandes Make disponibles

```
make setup           Infra Docker + migrations + seed
make dev             API avec tsx watch (hot reload)
make dev-agent       Vite agent-web  :5173
make dev-supervisor  Vite supervisor-web :5174
make dev-provider    Vite provider-web :5175
make typecheck       TypeScript strict sur tous les packages
make test            Jest avec couverture
make db-reset        Drop + recréer + migrer + seed
make build           Build Docker image API
make infra-up        docker compose up -d postgres redis graphhopper
make infra-down      docker compose down
```

---

## Contournement auth (développement)

Chaque frontend utilise Zustand `persist`. Pour bypasser la page de login :

### Interface agent (`agent-web`)

```javascript
localStorage.setItem('allo-joy-agent', JSON.stringify({
  state: { accessToken: 'dev-token', prenom: 'Dev' },
  version: 0
}))
location.reload()
```

### Dashboard superviseur (`supervisor-web`)

```javascript
localStorage.setItem('allo-joy-supervisor', JSON.stringify({
  state: { accessToken: 'dev-token', prenom: 'Dev' },
  version: 0
}))
location.reload()
```

Puis dans la console : `window.__supDev.seed()` pour pré-remplir les données.

### Portail prestataire (`provider-web`)

```javascript
localStorage.setItem('allo-joy-provider', JSON.stringify({
  state: { accessToken: 'dev-token', prenom: 'Ousmane', nomFamille: 'Baldé' },
  version: 0
}))
location.reload()
```

Puis dans la console :
- `window.__provDev.seed()` — données de démo (3 missions aujourd'hui, 5 historiques)
- `window.__provDev.simulateIncoming()` — simule une mission entrante (plomberie/Ratoma)
- `window.__provDev.clearIncoming()` — efface la mission entrante

---

## API REST

Base URL : `http://localhost:3000`

### Auth

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/otp/request` | Demande OTP (SMS) |
| POST | `/api/auth/otp/verify` | Vérifie OTP → JWT |
| POST | `/api/auth/refresh` | Renouvelle l'access token |
| POST | `/api/auth/logout` | Révoque le refresh token |

**Body `otp/request`** :
```json
{ "telephone": "+224620100001", "role": "agent" }
```
`role` : `"agent"` | `"superviseur"` | `"prestataire"`

### Tickets

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/tickets` | Créer un ticket (agent) |
| GET | `/api/tickets` | Liste paginée |
| GET | `/api/tickets/:id` | Détail d'un ticket |
| PUT | `/api/tickets/:id/status` | Changer le statut |

### Supervisor (rôle superviseur/admin/directeur)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/supervisor/kpi` | KPIs temps réel (appels, résolution, durée moy.) |
| GET | `/api/supervisor/agents` | Liste agents avec tickets du jour |
| GET | `/api/supervisor/queue` | File d'attente ouverte |
| GET | `/api/supervisor/alerts` | Alertes actives (longs appels, longue attente) |

### Prestataires

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/providers` | Liste + matching géographique |
| GET | `/api/providers/me` | Profil du prestataire connecté |
| PUT | `/api/providers/me/status` | Changer statut (disponible/occupe/hors_ligne) |
| GET | `/api/providers/me/missions` | Missions paginées |

### WebSocket

```
ws://localhost:3000/ws?token=<JWT>
```

Rôles et événements :

| Événement | Direction | Destinataire |
|-----------|-----------|-------------|
| `ticket:created` | Server → client | superviseurs |
| `ticket:dispatched` | Server → client | superviseurs |
| `provider:status` | Server → client | superviseurs |
| `mission:incoming` | Server → client | prestataire ciblé |
| `agent:status` | Client → server | broadcast superviseurs |
| `mission:response` | Client → server | broadcast superviseurs |

---

## Infrastructure AWS

Région : **af-south-1** (Cape Town — la plus proche d'Afrique de l'Ouest)

### Architecture

```
Internet → CloudFront (3 distributions) → S3 (3 buckets)
Internet → ALB (HTTPS 443) → ECS Fargate → RDS PostgreSQL
                                          → ElastiCache Redis
ECS → SSM Parameter Store (secrets)
ECS → ECR (images Docker)
```

### Déploiement Terraform

#### Pré-requis AWS (une seule fois)

```bash
# 1. Créer le bucket S3 pour le state Terraform
aws s3api create-bucket \
  --bucket allojoy-terraform-state \
  --region af-south-1 \
  --create-bucket-configuration LocationConstraint=af-south-1

aws s3api put-bucket-versioning \
  --bucket allojoy-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket allojoy-terraform-state \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 2. Créer la table DynamoDB pour les locks
aws dynamodb create-table \
  --table-name allojoy-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region af-south-1
```

#### Appliquer l'infrastructure

```bash
cd infra/terraform

# Initialiser
terraform init

# Planifier (vérifier avant d'appliquer)
terraform plan \
  -var="db_password=<mot-de-passe-fort>" \
  -var="jwt_secret=<secret-256-bits>" \
  -var="africastalking_api_key=<cle-at>" \
  -var="africastalking_username=sandbox"

# Appliquer
terraform apply \
  -var="db_password=<mot-de-passe-fort>" \
  -var="jwt_secret=<secret-256-bits>" \
  -var="africastalking_api_key=<cle-at>" \
  -var="africastalking_username=sandbox"
```

Après l'apply, récupérer les sorties :

```bash
terraform output
# alb_dns_name            → CNAME pour api.allojoy.gn
# ecr_repository_url      → URL pour docker push
# cloudfront_domains      → domaines CDN (à mapper dans Route53)
# cloudfront_distribution_ids → IDs pour l'invalidation CI/CD
```

#### Variables sensibles (recommandé : AWS Secrets Manager ou tfvars)

```bash
# Fichier local non versionné (gitignored)
cat > terraform.tfvars <<EOF
db_password            = "..."
jwt_secret             = "..."
africastalking_api_key = "..."
EOF
```

### GitHub Actions — Secrets requis

Configurer ces secrets dans **Settings → Secrets → Actions** :

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `ECR_REPOSITORY` | URL ECR (depuis `terraform output ecr_repository_url`) |
| `ECS_CLUSTER` | Nom du cluster ECS |
| `ECS_SERVICE` | Nom du service ECS |
| `CF_DIST_AGENT` | ID distribution CloudFront agent-web |
| `CF_DIST_SUPERVISOR` | ID distribution CloudFront supervisor-web |
| `CF_DIST_PROVIDER` | ID distribution CloudFront provider-web |
| `S3_AGENT` | Nom bucket S3 agent-web |
| `S3_SUPERVISOR` | Nom bucket S3 supervisor-web |
| `S3_PROVIDER` | Nom bucket S3 provider-web |

---

## Seed de données

Le seed crée :

**Agents / Superviseurs**
- `+224620100001` — Fatoumata Diallo (agent)
- `+224620100002` — Ibrahima Barry (agent)
- `+224620100010` — Aissatou Bah (superviseur)
- `+224620100020` — Admin (admin)

**Prestataires**
- `+224620200001` — Ousmane Baldé (plomberie, note 4.8)
- `+224620200002` — Mamadou Kouyaté (électricité, note 4.5)
- `+224620200003` — Aminata Soumah (ménage, note 4.9)
- `+224620200004` — Sékou Traoré (transport, note 4.3)
- `+224620200005` — Mariama Diallo (plomberie, note 3.9)

---

## Roadmap

- [x] API Fastify (auth OTP, tickets, providers, supervisor, WebSocket)
- [x] Interface agent (`agent-web`)
- [x] Dashboard superviseur (`supervisor-web`)
- [x] Portail prestataire PWA (`provider-web`)
- [x] Dockerfile multi-stage + docker-compose
- [x] CI/CD GitHub Actions
- [x] Terraform AWS (af-south-1)
- [x] App Android (Expo SDK 50 / RN 0.73, offline-first SQLite, MapLibre, OTP auth)
- [x] WhatsApp Business Cloud API (bot conversationnel, sessions Redis, création/suivi tickets)
- [x] Asterisk ARI (téléphonie 3030, IVR multilingue, file d'attente agents, AGI webhooks, rappels)
- [x] USSD `*384#` (menu Africa's Talking, création ticket, numéros d'urgence)
