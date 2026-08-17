# CloudSec — Demo Diagrams

Diagrams for use during the recorded demo. Show each one at the point indicated in the script. Keep them on screen long enough to talk through the key points — roughly 30–60 seconds each.

---

## 1. Business problem — before vs after

> 📺 Use in: **Segment 1** (0:00–2:00) — show while setting context

```mermaid
flowchart LR
    subgraph BEFORE [Without CloudSec]
        A["Exception requested over email"] --> B["No risk assessment"]
        B --> C["Informal decision, no record"]
        C --> D["No audit trail, no accountability"]
    end

    subgraph AFTER [With CloudSec]
        E["Requester submits via portal"] --> F["Automatic risk scoring"]
        F --> G["Approver decision with comment"]
        G --> H["Immutable audit log - GDPR / PCI evidence"]
    end

    BEFORE --> AFTER
```

---

## 2. System architecture

> 📺 Use in: **Segment 2** (2:00–6:00) — hold for ~60 seconds, then switch to Azure Portal

```mermaid
flowchart TB
    User["User - Requester or Approver"]

    subgraph CICD [CI/CD Pipeline]
        GH["GitHub Actions"]
        BICEP["Bicep IaC - single template"]
        GH --> BICEP
    end

    subgraph AZURE [Microsoft Azure]
        subgraph FRONTEND [Static Hosting]
            FE["React SPA - Blob Storage"]
        end

        subgraph API_TIER [App Service - Standard S1]
            STAGING["Staging slot"]
            PROD["Production slot - ASP.NET Core API"]
            STAGING -->|"health check then swap"| PROD
        end

        subgraph DATA [Data and Secrets]
            DB[("Azure SQL - SQLite in dev")]
            KV["Azure Key Vault - JWT key and DB connection"]
        end

        subgraph OBS [Observability]
            AI["Application Insights - telemetry and custom events"]
            LA["Log Analytics"]
        end

        subgraph GOVN [Cost and Governance]
            BUDGET["Azure Budget - 80% and 100% alerts"]
            SCALE["Autoscale - 1 to 3 instances"]
            TAGS["Resource tags - Application, Environment, Owner, CostCenter"]
        end
    end

    BICEP --> AZURE
    User --> FE
    FE -->|"HTTPS and JWT"| PROD
    PROD --> DB
    PROD -->|"Managed identity"| KV
    PROD --> AI
    AI --> LA
```

---

## 3. Security control flow

> 📺 Use in: **Segment 3** (6:00–10:00) — show briefly while introducing STRIDE

```mermaid
flowchart LR
    U["User request"] -->|"HTTPS, HSTS, TLS 1.2"| API["ASP.NET Core API"]

    API --> JWT["JWT validation - signature verified against Key Vault key"]
    JWT --> RBAC["Role authorisation - Requester: read and submit only, Approver: decide only"]
    RBAC --> BIZ["Business rules - comment required, insert-only audit log"]
    BIZ --> DB[("Database - immutable audit trail")]
    BIZ --> AI["App Insights - custom event per decision"]

    API --> HDR["HTTP security headers - CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy"]

    subgraph INFRA [Infrastructure controls]
        KV["Key Vault - managed identity access only"]
        STOR["Storage - public access disabled"]
        FTPS["App Service - FTPS-only, always HTTPS"]
    end
```

---

## 4. Performance and monitoring

> 📺 Use in: **Segment 5** (14:00–16:30) — show while discussing autoscale

```mermaid
flowchart TB
    subgraph DB_LAYER [Database layer]
        IDX["Explicit indexes - Status, CreatedUtc, RiskScore, RequestId and CreatedUtc composite"]
        PROJ["Single-query EF Core projection - no N+1, no C# mapping"]
        AGG["DB-level aggregation - COUNT and AVG on SQL engine"]
        CACHE["30s output cache on summary endpoint"]
    end

    subgraph APP_LAYER [Application layer]
        HZ["/healthz - liveness probe"]
        RDY["/readyz - readiness, queries DB directly"]
    end

    subgraph AZURE_OBS [Azure observability]
        AI["Application Insights - request rate, latency, errors, custom business events"]
        AS["Autoscale - CPU above 70% scale out, CPU below 30% scale in, max 3 instances"]
        ALT["CPU alert - severity 2 at threshold breach"]
    end

    DB_LAYER --> APP_LAYER --> AZURE_OBS
```

---

## 5. Cost governance

> 📺 Use in: **Segment 6** (16:30–18:30) — show while discussing tags

```mermaid
flowchart LR
    subgraph RESOURCES [Deployed resources]
        R1["App Service - Standard S1 - min autoscale tier"]
        R2["Azure SQL - Basic 5 DTU"]
        R3["Blob Storage - LRS"]
        R4["Key Vault"]
        R5["App Insights and Log Analytics"]
    end

    subgraph TAGS [Resource tags on all resources]
        T1["Application: cloudsec"]
        T2["Environment: dev"]
        T3["Owner: engineering"]
        T4["CostCenter: cloud-module"]
    end

    subgraph CONTROLS [Cost controls]
        AUTO["Autoscale - 1 instance at idle, scales on real load"]
        BUDGET["Azure Budget - 30 USD/month cap, 80% and 100% alerts"]
        FUTURE["Reserved Instances - 72% discount via Azure billing commitment, not Bicep deployable"]
    end

    RESOURCES --> TAGS --> CONTROLS
```

---

## Segment placement guide

| Diagram | Segment | Timestamp | Purpose |
|---|---|---|---|
| Business problem | 1 | 0:00–2:00 | Frame the governance problem |
| System architecture | 2 | 2:00–6:00 | Walk through deployed components |
| Security control flow | 3 | 6:00–10:00 | Introduce STRIDE mitigations |
| Performance & monitoring | 5 | 14:00–16:30 | Show autoscale and observability |
| Cost governance | 6 | 16:30–18:30 | Show tagging and budget controls |
