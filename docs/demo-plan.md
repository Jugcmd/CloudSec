# CloudSec — Recording Script

**Format:** Screen recording + voiceover. No camera.
**Length:** 20 minutes max.

---

## RUBRIC AT A GLANCE

| Criterion                 | Weight | Top band needs                                                                         |
| ------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Knowledge & understanding | 15%    | Depth, nuance, referenced choices, Azure rationale                                     |
| Design & architecture     | 35%    | IaC, three-tier, blue/green, Key Vault, justified decisions, **environmental impact**  |
| Security & compliance     | 10%    | STRIDE model, JWT/RBAC, headers, GDPR/PCI mapping, **IAM, encryption at rest/transit** |
| Performance optimisation  | 20%    | Health checks, App Insights, autoscale, DB indexes, caching, **automated backups**     |
| Cost management           | 20%    | Tags, right-sizing, autoscale, Budget alert, **reserved/spot instance rationale**      |

---

## BEFORE YOU START — PREP CHECKLIST

Open everything before hitting record. Switching tabs while talking loses flow.

**Azure Portal tabs:**

- [ ] Resource group → all resources visible
- [ ] App Service → Configuration (HTTPS only, health check path `/healthz`)
- [ ] App Service → Identity (system-assigned managed identity ON)
- [ ] Key Vault → Secrets (names visible, values hidden)
- [ ] App Service Plan → Scale out (autoscale rules visible)
- [ ] Monitor → Alerts (CPU alert listed)
- [ ] Application Insights → Requests chart or Live Metrics
- [ ] Cost Management → Cost analysis (resource group scope)
- [ ] Any resource → Tags tab (all four tags visible)
- [ ] Cost Management → Budgets

**Browser tabs:**

- [ ] Live app URL (signed in as Requester)
- [ ] `/healthz` response open
- [ ] `/readyz` response open
- [ ] Dev tools → Network tab on an API call (security headers visible)

**Terminal / Postman (pre-loaded, ready to run):**

- [ ] Request with no token → will return 401
- [ ] Approve request as Requester role → will return 403
- [ ] Reject with empty comment → will return 400

**Code editor:**

- [ ] `docs/threat-model.md` open
- [ ] `backend/CloudSec.Api/Data/AppDbContext.cs` open (scroll to HasIndex calls)
- [ ] Architecture diagram from `docs/presentation-diagrams.md` rendered

---

## SEGMENT 1 — Context and the problem `0:00–2:00`

> Delivery note: use this as a conversational prompt rather than reading it word-for-word. Leave brief pauses while switching views and keep the full recording between 18:30 and 19:00 to preserve the 20-minute hard cap.

---

> 📺 **Show:** Architecture diagram

"So — this is CloudSec. It's a cloud-based security exception management application I designed and built for an internal governance use case at a professional services firm.

The problem it solves is something most organisations deal with but handle badly. Teams need to request temporary exceptions to security controls — a firewall rule, a privileged access grant, a deviation from a data handling policy. At a law firm handling confidential client matters, those decisions carry legal and regulatory weight. But in most places they're handled over email, in spreadsheets, or just informally — no consistent risk assessment, no audit trail, nothing you could produce if you needed to demonstrate compliance.

CloudSec replaces that with a governed, auditable workflow, deployed entirely on Azure with all infrastructure defined as code. I chose Azure deliberately — Gartner (2023) positions Microsoft as a leader in the cloud infrastructure and platform services magic quadrant, and Azure holds over 100 compliance certifications that are directly relevant to a regulated UK professional services context."

> 📺 **Switch to:** Running live application

---

## SEGMENT 2 — Architecture `2:00–6:00`

---

> 📺 **Show:** Architecture diagram — hold for about 60 seconds while speaking

"The architecture follows a three-tier model — React frontend, ASP.NET Core API, and a database. That separation of concerns is a foundational cloud architecture pattern. Fowler (2002) describes it in Patterns of Enterprise Application Architecture as the standard baseline for maintainable, scalable applications.

One design decision worth calling out early: in development I use SQLite for simplicity and fast iteration. In production, the configuration layer automatically switches to Azure SQL. That's the twelve-factor app methodology — specifically factor three, which says config belongs in the environment, not the codebase. Wiggins (2017) articulates this as one of the core principles of building software as a service.

> 📺 **Switch to:** Azure Portal → Resource group → all resources visible

So here's what's actually deployed. I'll walk through the key components.

App Service on Standard S1 — that's the minimum tier that supports production autoscaling. Azure SQL Database for a fully managed relational store. Blob Storage for the React static site — no web server to manage, serverless hosting. Application Insights and Log Analytics for observability. And Azure Key Vault, which I'll come back to in a moment.

There are three design choices I want to highlight specifically, because they demonstrate cloud-native engineering rather than just cloud hosting.

**First: a zero-secret architecture.** The JWT signing key and the database connection string never appear in source code, configuration files, or environment variables. They live only in Key Vault. The App Service retrieves them via its system-assigned managed identity at runtime. Access is granted through Azure Key Vault RBAC using the least-privilege Key Vault Secrets User role, rather than legacy access policies. This aligns with modern Azure security guidance and means the identity can read secrets without managing or deleting them. This directly addresses OWASP Secrets Management guidance (OWASP, 2021).

**Second: infrastructure as code with Bicep.** The entire environment — every resource you can see in this resource group — is defined in a single Bicep template and deployed through a GitHub Actions pipeline. Bicep is the human-readable authoring language; during deployment it transpiles to an ARM JSON template, which Azure Resource Manager executes through ARM APIs. Any engineer with the right Azure credentials can reproduce this environment exactly. The deployment isn't a manual procedure, it's a version-controlled, auditable artefact. Kim et al. (2016) describe this as a core DevOps principle in The DevOps Handbook — making deployments repeatable and the infrastructure reviewable independently of application code.

**Third: blue/green deployment via App Service staging slots.** New code deploys to a staging slot, gets health-checked, and is only swapped to production once it's confirmed healthy. Zero downtime. Humble and Farley (2010) describe this pattern in Continuous Delivery — and it's simply not achievable in a traditional on-premises environment without significant additional infrastructure.

One more thing worth mentioning here: environmental impact. By using PaaS managed services rather than self-managed VMs, and by autoscaling back to a single instance at low load, this architecture avoids idle compute waste. Microsoft (2023) reports that Azure workloads can be up to 93% more energy efficient than equivalent on-premises deployments. That's not just a cost consideration — it's a sustainability one."

---

## SEGMENT 3 — Security and compliance `6:00–10:00`

---

> 📺 **Show:** Diagram 3 — Security Controls, then `docs/threat-model.md` — hold the diagram briefly before opening the threat model

"Security in this application is backend-enforced and threat-modelled. Before writing any implementation code I produced a STRIDE threat model — a structured methodology developed at Microsoft and described by Shostack (2014) in Threat Modeling: Designing for Security. It covers six threat categories, and I want to walk through each one and show how the implementation responds.

> 📺 **Switch to:** App Service → Configuration → HTTPS-only, FTPS-only, TLS 1.2 minimum visible

**Spoofing** — can someone impersonate another user? Every protected endpoint requires a JWT bearer token. The token signature is validated against a key that lives only in Key Vault. Without that key, a forged token is cryptographically invalid. There's no other way in.

**Tampering** — can someone alter a decision after the fact? The audit log is insert-only. There is no UPDATE or DELETE path for audit events anywhere in the API. Once a decision is recorded, it can't be changed. The trail is immutable by design, which is exactly what you need for a compliance-grade governance tool.

> 📺 **Switch to:** Key Vault → Secrets (names visible, values hidden)

**Repudiation** — can someone deny having made a decision? Every action records the actor's email, a timestamp, and the full context. An approver can't credibly deny a decision — it's attributed and timestamped at the database level.

**Information disclosure** — what happens if something leaks? All secrets are in Key Vault, nothing in source code or app settings. CORS is locked to the known frontend origin. Error responses in production suppress stack traces entirely.

> 📺 **Switch to:** App Service → Identity → system-assigned managed identity ON

**Denial of service** — autoscale absorbs traffic spikes, and health probes remove unhealthy instances automatically from the load balancer rotation.

**Elevation of privilege** — the decision endpoint is authorised for the Approver role only. Let me show that.

> 📺 **Run:** `curl` with no auth token → 401 response

No token — 401. As expected.

> 📺 **Run:** `curl` approve endpoint as Requester role → 403 response

Valid token, wrong role — 403. The authorisation is enforced at the API layer, not the UI.

> 📺 **Run:** `curl` reject with empty comment → 400 response

And a reject with no comment — 400. Business rules enforced server-side.

> 📺 **Switch to:** Browser dev tools → Network tab → API response headers

The API also emits a full set of HTTP security headers on every response — X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy, and Permissions-Policy. These reduce the browser-based attack surface across the OWASP Top Ten (OWASP, 2021).

**At the infrastructure level, I am using Azure Identity and Access Management—or IAM—via system-assigned managed identities. This ensures the App Service can access Key Vault natively without embedded credentials, strictly controlling infrastructure access.**

**For data protection, encryption in transit is enforced via HTTPS with HSTS and a TLS 1.2 minimum. Crucially, encryption at rest is also fully implemented: Azure SQL uses Transparent Data Encryption (TDE) by default, and Blob Storage encrypts the static frontend assets at rest using 256-bit AES encryption.**

This implementation maps directly to GDPR Article 25 — data protection by design and by default. PCI DSS v4.0 requirement 7 — restricting access to system components. ISO 27001 Annex A controls on access control, cryptography, and operations security. And NCSC cloud security principles 2, 3, and 6 (NCSC, 2023)."

---

## SEGMENT 4 — Live application demo `10:00–14:00`

---

> 📺 **Show:** Live deployed application in the browser

"I'll walk through the full workflow on the live deployed system now.

> 📺 **Action:** Enter email, select Requester, click Sign In

I'm signing in as a Requester. The API issues a JWT containing the user's role claim — that claim is what drives authorisation throughout the application. The dashboard loads with the protected request list and the summary metrics.

> 📺 **Action:** Fill in and submit a new exception request — System: Litigation Ops Portal, Classification: Confidential

I'll submit an exception request. System is Litigation Ops Portal, classification is Confidential, description is a temporary outbound access request for a matter export. When I submit this, the API derives a risk score automatically — in this case 70, based on the data classification. That's business logic in the application layer, not just data storage. And the request appears immediately as Pending, with an audit event already recorded.

> 📺 **Action:** Switch to Approver role, sign in

Now I'll switch to an Approver. Same sign-in flow, different role claim in the token.

> 📺 **Action:** Try to reject with the comment field empty

If I try to reject without adding a comment — the API returns 400. A comment is mandatory for any decision. That rule is enforced at the API level, not the UI — you can't bypass it by calling the endpoint directly.

> 📺 **Action:** Add a comment and approve the request

I'll add a comment and approve. Status moves to Approved. Another audit event is recorded — who made the decision, when they made it, and what comment they provided. That full timeline is the traceability a governance process requires.

> 📺 **Show:** Dashboard metrics updating

And the dashboard metrics update — total requests, pending, approved, high-risk count, average risk score, approval rate. All live from the deployed system.

This is a working, deployed cloud application with real business logic, real database persistence, and role-based access control. Not a mock."

---

## SEGMENT 5 — Performance and monitoring `14:00–16:30`

---

> 📺 **Show:** App Service → Configuration → Health check path set to `/healthz`

"Performance and resilience are addressed at four levels — database, application code, caching, and infrastructure. Let me go through each one.

Starting at the database. I've defined explicit indexes on every field that drives a query in this application.

> 📺 **Switch to:** VS Code → `AppDbContext.cs` → scroll to HasIndex calls

Status, for filtered counts. CreatedUtc, for ordered listing. RiskScore, for high-risk aggregation. And a composite index on RequestId and CreatedUtc for the event timeline query. Ramakrishnan and Gehrke (2003) argue in Database Management Systems that query performance should be designed in from the start — not tuned reactively once you have a problem. That's the approach here.

At the API layer, the GetAll endpoint uses a single projected EF Core query — projection happens in SQL, not in C# memory. No N+1 queries, no unnecessary data transfer between the database and the application server. The summary endpoint — which powers the dashboard and is the most frequently called read path — uses database-level aggregation. COUNT and AVG run on the SQL engine. It's also wrapped in a 30-second output cache. A governance dashboard doesn't need sub-second freshness. 30 seconds means the database gets queried at most twice per minute regardless of how many users are on the screen simultaneously.

There is also a deliberate scalability boundary here. EF Core and the SQL client use connection pooling per App Service instance, while Azure SQL Basic has constrained compute and concurrency capacity. Under high concurrency, connection waits or database resource pressure could become the bottleneck. I would monitor pool exhaustion, wait times, and DTU usage, then tune the pool or move to a higher tier based on measured workload.

**Beyond query speed, database resilience is handled natively by Azure SQL's automated backups, providing Point-in-Time Restore capabilities out of the box to protect against accidental data loss or corruption without requiring manual administrative overhead.**

> 📺 **Switch to:** Browser → `/healthz` endpoint → JSON response

The `/healthz` endpoint gives a simple liveness signal. App Service uses this as its health probe — any instance that stops responding is automatically removed from the load balancer.

> 📺 **Switch to:** Browser → `/readyz` endpoint → JSON response

The `/readyz` endpoint goes further — it queries the database directly. It only returns healthy when the full stack is functional, including the database connection. This is the liveness versus readiness distinction that Kubernetes popularised, and it's now a standard pattern in cloud-native application design.

> 📺 **Switch to:** Application Insights → Requests chart

For observability, Application Insights captures request telemetry, dependency calls, failure rates, and latency in real time. I've also instrumented custom business events — a metric fires for every exception request submitted and for every approval or rejection decision. That gives the three golden signals Beyer et al. (2016) describe in Site Reliability Engineering: request rate, error rate, and latency. But because the custom events track business actions rather than just HTTP calls, you can observe governance activity directly — not just infrastructure health.

> 📺 **Switch to:** App Service Plan → Scale out → autoscale rules

The autoscale configuration scales out when CPU exceeds 70% for five sustained minutes, and scales back in below 30% for ten minutes — maximum of three instances. Scaling out is primarily a performance and availability control: it adds capacity when demand rises. Scaling back in during off-peak periods is the cost control, because it removes idle instances. It responds to real demand, not a calendar schedule.

> 📺 **Switch to:** Monitor → Alerts → CPU alert rule

And a severity-2 alert fires at threshold breach, so the operator gets a notification before the situation becomes critical. Proactive, not reactive."

---

## SEGMENT 6 — Cost management `16:30–18:30`

---

> 📺 **Show:** Azure Portal → Cost Management → Cost analysis → scoped to this resource group

"Cost management is a first-class concern in this deployment — it's not bolted on after the fact. Everything in this cost analysis is attributable because every single resource carries four tags.

> 📺 **Switch to:** Any resource → Tags tab — Application, Environment, Owner, CostCenter visible

Application, Environment, Owner, and CostCenter. Those tags flow directly into Cost Management for attribution, chargeback reporting, and budget enforcement. The FinOps Foundation (2023) identifies tagging as the foundational practice for cloud cost governance — without it, you can see how much you're spending but you can't control or allocate it.

> 📺 **Switch to:** App Service Plan → Overview → Pricing tier: Standard S1

The resource choices are right-sized by design, not over-provisioned as a default. App Service Standard S1 is the minimum tier that supports autoscaling — drop below it and you lose the ability to respond to load dynamically. Azure SQL Basic at 5 DTUs is appropriate for the read-write pattern of an internal governance tool. Storage Standard LRS gives adequate redundancy for static frontend hosting at the lowest cost point.

Autoscaling does not make peak capacity free; its cost benefit comes from capping how long that extra capacity remains provisioned. At idle, the system returns to a single instance instead of paying continuously for peak capacity. The environmental cost of idle compute isn't zero, so scaling back down is both a financial and a sustainability control. That connects back to the Microsoft (2023) energy efficiency point from earlier.

> 📺 **Switch to:** Cost Management → Budgets → monthly budget alert visible

This budget is defined in the Bicep template — it's not manually configured in the portal, it's deployed alongside the application. A monthly cap with alerts at 80% and 100% of actual spend against this resource group. The team gets notified before spend becomes a problem.

Two further cost controls are worth addressing directly. Reserved Instances and Spot Instances are both explicitly relevant here. Reserved Instances aren't configurable at the infrastructure level — they're a billing commitment made against a subscription, not a resource you deploy in Bicep. For this workload running on a student Azure subscription, that commitment isn't available. But for a production deployment with a predictable baseline, applying a Reserved Instance to the App Service Plan would give up to 72% discount over pay-as-you-go for a one or three-year term — Microsoft Azure (2024). Spot Instances are a VM and AKS concept; because this architecture uses PaaS App Service rather than VMs, Spot pricing doesn't apply directly. For any batch processing extension added later, Spot would be the right choice at up to 90% discount with graceful eviction handling.

So: tagged resources, right-sized tiers, autoscale as a cost and sustainability control, a budget alert deployed as infrastructure code, and a clear path to reserved capacity. That's a FinOps-aligned cost governance model."

---

## SEGMENT 7 — Trade-offs and roadmap `18:30–19:30`

---

> 📺 **Show:** Architecture diagram, or keep a clean browser view

"I want to be honest about the limitations and the trade-offs in this implementation, because a credible engineering assessment has to include that.

On identity: the JWT model here is application-issued. For a demo, that's fine — it shows the pattern clearly. But in production I'd replace it with Microsoft Entra ID. Enterprise SSO, MFA, conditional access policies, and Privileged Identity Management for just-in-time approver access. That single change would substantially elevate the identity posture and remove the need for any application-managed credentials.

On resilience: this is a single-region deployment. For a compliance system handling sensitive decisions at scale, I'd add geo-redundant SQL with failover groups and Azure Front Door for global routing — taking the Recovery Time Objective from hours down to minutes.

On secrets rotation: Key Vault is in place and working correctly. The natural next step is automated rotation on a schedule using Key Vault's native rotation policy, with diagnostic logging on every secret access event as compliance evidence.

On data governance: a formal retention and archival policy for resolved requests would strengthen the GDPR Article 5(1)(e) storage limitation story — defining how long approved and rejected requests are held before archival or deletion.

None of these are failures. They're the honest roadmap of a well-scoped MVP. The architecture has been designed so that every one of these extensions can be added without structural rework."

---

## SEGMENT 8 — Conclusion `19:30–20:00`

---

> 📺 **Show:** Live application dashboard — clean view, close any terminal or editor windows

"CloudSec is a small application. But it demonstrates real cloud engineering.

Architecture: a three-tier design deployed on Azure, fully reproducible from a single Bicep template, with zero-downtime blue/green deployments.

Security: backend-enforced access control, secrets in Key Vault via managed identity, HTTPS with HSTS, HTTP security headers, and explicit compliance mapping to GDPR, PCI DSS, ISO 27001, and NCSC cloud principles — backed by a STRIDE threat model.

Performance: health-checked endpoints, Application Insights telemetry with custom business metrics, database indexes designed for this workload's query patterns, and autoscaling that responds to real demand.

Cost: right-sized service tiers, resource tagging for attribution and chargeback, autoscale as both a cost and sustainability control, and a budget alert deployed as infrastructure code.

Every decision has a rationale. Every control has evidence. The system is live, deployed, and working."
