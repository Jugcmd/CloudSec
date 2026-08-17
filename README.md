# CloudSec Assignment Starter

This starter includes:

- React frontend (`frontend`)
- ASP.NET Core Web API backend (`backend/CloudSec.Api`)
- SQL-backed persistence using SQLite via EF Core

## Run locally

### 1) Start backend API

```powershell
cd backend/CloudSec.Api
dotnet run
```

API base URL (default): `http://localhost:5103`

### 2) Start frontend app

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL (default): `http://localhost:5173`

### 3) Run integration tests

```powershell
dotnet test backend/CloudSec.Api.Tests/CloudSec.Api.Tests.csproj
```

## API endpoints

- `GET /api/SecurityExceptionRequests`
- `GET /api/SecurityExceptionRequests/summary`
- `POST /api/SecurityExceptionRequests`
- `POST /api/SecurityExceptionRequests/{id}/decision`
- `GET /healthz`
- `GET /readyz`

## Auth model (JWT)

This starter now uses JWT bearer tokens for API protection.

- Obtain token: `POST /api/Auth/token`
- Send token: `Authorization: Bearer <token>`

Token request payload:

```json
{
  "email": "requester.user@osborneclarke.com",
  "role": "Requester"
}
```

Supported roles:

- `Requester`
- `Approver`

Rules enforced by the API:

- Create request: `Requester` or `Approver`
- Decision endpoint: `Approver` only
- Rejection requires a comment

JWT configuration is in `backend/CloudSec.Api/appsettings.json` under `Jwt`.

Summary endpoint returns operational metrics for dashboards:

- total, pending, approved, rejected requests
- high-risk request count (risk score >= 70)
- average risk score
- decision throughput for the last 7 days
- approval rate percentage

## Data model

The backend persists `SecurityExceptionRequest` records with:

- title, description, requesterEmail, systemName
- dataClassification and derived riskScore
- status lifecycle (`Pending` -> `Approved` or `Rejected`)
- created/updated timestamps
- audit timeline events (submission and review decisions)

## Database schema lifecycle

The API now uses migration-first startup logic:

- applies migrations when migration files exist
- falls back to `EnsureCreated()` for local dev bootstrap when no migrations exist yet

Recommended migration workflow:

```powershell
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project backend/CloudSec.Api --startup-project backend/CloudSec.Api
dotnet ef database update --project backend/CloudSec.Api --startup-project backend/CloudSec.Api
```

## Notes

- Local DB file: `backend/CloudSec.Api/cloudsec.db`
- Change API URL for frontend with `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5103
```

## Suggested next steps

1. Replace local JWT token issuance with Entra ID for production-style identity.
2. Add frontend component tests and API performance/load tests.
3. Add infrastructure and deployment pipeline for your cloud demo.
4. Add cost-governance automation (budgets, alerts, tagging policy checks).

## Azure deployment baseline (added)

This repository now includes:

- Bicep infrastructure template: `infra/main.bicep`
- Bicep parameters file: `infra/main.parameters.json`
- GitHub Actions workflow: `.github/workflows/azure-deploy.yml`

The baseline deploys:

- Azure App Service Plan (Linux) — Standard S1 with autoscale (1–3 instances)
- App Service for API hosting
- Azure SQL Server + Azure SQL Database
- Storage account static website hosting for React frontend
- Log Analytics workspace + Application Insights
- Azure Key Vault for secret storage (JWT key and DB connection string)
- Autoscale rules and CPU metric alert

### Required GitHub secrets

Set these repository secrets before running the workflow:

- `AZURE_CREDENTIALS` (service principal JSON for `azure/login`)
- `SQL_ADMIN_PASSWORD`
- `JWT_SIGNING_KEY`

### Run cloud deployment

1. Open Actions tab and run workflow `Azure Deploy`.
2. Provide values for:

- `resourceGroup`
- `location`
- `namePrefix`

3. Wait for jobs to complete.
4. Collect workflow summary output URLs for API, health, and frontend.

### Recommended post-deploy checks

1. Open the frontend URL and verify login and CRUD flows.
2. Confirm API endpoint health and auth-protected behavior.
3. Inspect Application Insights for request traces and failures.
4. Capture screenshots for:

- deployed resource group topology
- App Service configuration
- SQL database resource
- Application Insights charts
- Key Vault resource and secret references
- Autoscale settings and CPU alert
- successful workflow run output
