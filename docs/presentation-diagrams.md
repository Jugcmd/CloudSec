# CloudSec — Demo Diagrams

Diagrams for use during the recorded demo. Show each one at the point indicated in the script. Keep them on screen long enough to talk through the key points — roughly 30–60 seconds each.

---

## 1. Business problem — before vs after

> 📺 Use in: **Segment 1** (0:00–2:00) — show while setting context

```mermaid
flowchart LR
    subgraph BEFORE ["❌ Without CloudSec"]
        A[Exception requested\nover email / Slack] --> B[No risk assessment]
        B --> C[Informal decision\nno record]
        C --> D[No audit trail\nno accountability]
    end

    subgraph AFTER ["✅ With CloudSec"]
        E[Requester submits\nvia portal] --> F[Automatic risk\nscoring]
        F --> G[Approver decision\nwith comment]
        G --> H[Immutable audit log\nGDPR / PCI evidence]
    end

    BEFORE -->|replaced by| AFTER
```

---

## 2. System architecture

> 📺 Use in: **Segment 2** (2:00–6:00) — hold for ~60 seconds, then switch to Azure Portal

```mermaid
flowchart TB
    User["👤 User\n(Requester / Approver)"]

    subgraph AZURE ["Microsoft Azure"]
        subgraph FRONTEND ["Static Hosting"]
            FE["React SPA\nBlob Storage + CDN"]
        end

        subgraph API_TIER ["App Service (Standard S1)"]
            PROD["Production slot\nASP.NET Core API"]
            STAGING["Staging slot\nBlue/green deployment"]
            STAGING -->|health check → swap| PROD
        end

        subgraph DATA ["Data & Secrets"]
            DB[("Azure SQL\n(SQLite in dev)")]
            KV["Azure Key Vault\nJWT key + DB connection"]
        end

        subgraph OBS ["Observability"]
            AI["Application Insights\nRequest telemetry\nCustom business events"]
            LA["Log Analytics"]
        end

        subgraph COST ["Cost & Governance"]
            BUDGET["Azure Budget\n80% + 100% alerts"]
            SCALE["Autoscale\n1–3 instances"]
            TAGS["Resource tags\nApplication · Environment\nOwner · CostCenter"]
        end
    end

    subgraph CICD ["CI/CD"]
        GH["GitHub Actions"]
        BICEP["Bicep IaC\nsingle template"]
        GH --> BICEP --> AZURE
    end

    User --> FE
    FE -->|"HTTPS + JWT"| PROD
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
    U["👤 Request"] -->|HTTPS + HSTS\nTLS 1.2 min| API["ASP.NET Core API"]

    API --> JWT["JWT validation\nSignature verified\nagainst Key Vault key"]
    JWT --> RBAC["Role authorisation\nRequester → read/submit\nApprover → decide only"]
    RBAC --> BIZ["Business rules\nComment required\nInsert-only audit log"]

    API --> HDR["HTTP security headers\nCSP · X-Frame-Options\nReferrer-Policy\nPermissions-Policy"]

    BIZ --> DB[("Database\nImmutable audit trail")]
    BIZ --> AI["App Insights\nCustom event per decision"]

    subgraph INFRA ["Infrastructure controls"]
        KV["Key Vault\nManaged identity only"]
        STOR["Storage\nPublic access disabled"]
        FTPS["App Service\nFTPS-only · Always HTTPS"]
    end
```

---

## 4. Performance and monitoring

> 📺 Use in: **Segment 5** (14:00–16:30) — show while discussing autoscale

```mermaid
flowchart TB
    subgraph DB_LAYER ["Database layer"]
        IDX["Explicit indexes\nStatus · CreatedUtc\nRiskScore · RequestId+CreatedUtc"]
        PROJ["Single-query EF Core projection\nNo N+1 · No C# mapping"]
        AGG["DB-level aggregation\nCOUNT + AVG on SQL engine"]
        CACHE["30s output cache\non summary endpoint"]
    end

    subgraph APP_LAYER ["Application layer"]
        HZ["/healthz\nLiveness probe"]
        RDY["/readyz\nReadiness — queries DB directly"]
    end

    subgraph AZURE_OBS ["Azure observability"]
        AI["Application Insights\nRequest rate · Latency · Errors\n+ Custom business events"]
        AS["Autoscale\nCPU > 70% → scale out\nCPU < 30% → scale in\nMax 3 instances"]
        ALT["CPU alert\nSeverity 2 at threshold breach"]
    end

    DB_LAYER --> APP_LAYER --> AZURE_OBS
```

---

## 5. Cost governance

> 📺 Use in: **Segment 6** (16:30–18:30) — show while discussing tags

```mermaid
flowchart LR
    subgraph RESOURCES ["Deployed resources"]
        R1["App Service\nStandard S1\n(min autoscale tier)"]
        R2["Azure SQL\nBasic 5 DTU"]
        R3["Blob Storage\nLRS"]
        R4["Key Vault"]
        R5["App Insights\nLog Analytics"]
    end

    subgraph TAGS ["Resource tags (all resources)"]
        T1["Application: cloudsec"]
        T2["Environment: dev"]
        T3["Owner: engineering"]
        T4["CostCenter: cloud-module"]
    end

    subgraph CONTROLS ["Cost controls"]
        AUTO["Autoscale\n1 instance at idle\nscales on real load"]
        BUDGET["Azure Budget\n$30/month cap\n80% + 100% alerts"]
        FUTURE["Future: Reserved Instances\n72% discount (1–3yr commit)\nvia Azure billing — not Bicep"]
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
