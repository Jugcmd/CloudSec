## 1. Business problem — before vs after

```mermaid
flowchart LR
    A["Exception over email"] --> B["No risk assessment"]
    B --> C["Informal decision"]
    C --> D["No audit trail"]

    E["Submit via CloudSec"] --> F["Automatic risk score"]
    F --> G["Approver decision with comment"]
    G --> H["Immutable audit log"]

    D -->|"replaced by"| E
```

---

## 2. System architecture

```mermaid
flowchart LR
    USER["User"]
    GH["GitHub Actions"]
    BICEP["Bicep template"]
    FE["React SPA - Blob Storage"]
    STAGING["Staging slot"]
    PROD["Production slot - ASP.NET Core"]
    DB["Azure SQL"]
    KV["Key Vault"]
    AI["Application Insights"]
    LA["Log Analytics"]
    BUDGET["Azure Budget alerts"]
    SCALE["Autoscale 1-3 instances"]
    TAGS["Resource tags"]

    GH --> BICEP
    BICEP -->|"deploys"| PROD
    BICEP -->|"deploys"| FE
    BICEP -->|"deploys"| DB
    BICEP -->|"deploys"| KV

    USER --> FE
    FE -->|"HTTPS and JWT"| PROD
    STAGING -->|"health check then swap"| PROD
    PROD --> DB
    PROD -->|"managed identity"| KV
    PROD --> AI
    AI --> LA

    PROD --- SCALE
    PROD --- BUDGET
    PROD --- TAGS
```

---

## 3. Security controls

```mermaid
flowchart LR
    REQ["Incoming request"]
    TLS["HTTPS - TLS 1.2 minimum - HSTS"]
    JWT["JWT validation - Key Vault signed"]
    RBAC["Role check - Requester or Approver"]
    BIZ["Business rules - comment required"]
    AUDIT["Insert-only audit log"]
    HDRS["Security headers - CSP, X-Frame, Referrer-Policy"]
    KV["Key Vault - managed identity only"]
    STOR["Storage - public access off"]

    REQ --> TLS --> JWT --> RBAC --> BIZ --> AUDIT
    BIZ --> HDRS
    JWT -->|"secret from"| KV
    RBAC -->|"401 if no token"| REQ
    BIZ -->|"403 wrong role"| REQ
    BIZ -->|"400 no comment"| REQ
    KV --- STOR
```

---

## 4. Performance and monitoring

```mermaid
flowchart LR
    IDX["DB indexes - Status, CreatedUtc, RiskScore"]
    PROJ["Single EF Core query - projection in SQL"]
    AGG["DB aggregation - COUNT and AVG on SQL engine"]
    CACHE["30s output cache on summary endpoint"]

    HZ["/healthz - liveness"]
    RDY["/readyz - queries DB directly"]

    AI["Application Insights - rate, latency, errors"]
    EVENTS["Custom events - per request, per decision"]
    AS["Autoscale - CPU above 70 scale out, below 30 scale in"]
    ALT["CPU alert - severity 2"]

    IDX --> PROJ --> AGG --> CACHE
    CACHE --> HZ
    CACHE --> RDY
    HZ --> AI
    RDY --> AI
    AI --> EVENTS
    AI --> AS
    AS --> ALT
```

---

## 5. Cost governance

```mermaid
flowchart LR
    R1["App Service - Standard S1"]
    R2["Azure SQL - Basic 5 DTU"]
    R3["Blob Storage - LRS"]
    R4["Key Vault"]
    R5["App Insights"]

    TAGS["4 tags on every resource - Application, Environment, Owner, CostCenter"]
    CM["Azure Cost Management - attribution and chargeback"]
    BUDGET["Azure Budget - 30 USD/month - alerts at 80 and 100 percent"]
    AUTO["Autoscale - 1 instance at idle - scales on real demand"]
    RI["Reserved Instances - 72 percent discount via billing commitment"]

    R1 --> TAGS
    R2 --> TAGS
    R3 --> TAGS
    R4 --> TAGS
    R5 --> TAGS

    TAGS --> CM
    CM --> BUDGET
    CM --> AUTO
    CM --> RI
```
