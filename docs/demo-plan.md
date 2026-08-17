# CloudSec — Recording Script

**Format:** Screen recording + voiceover. No camera required.  
**Length:** 20 minutes max.  
**Goal:** 80–100% across all rubric criteria.

---

## RUBRIC AT A GLANCE

| Criterion | Weight | What top band requires |
|---|---|---|
| Knowledge & understanding | 15% | Depth, nuance, academic references, Azure rationale |
| Design & architecture | 35% | IaC, three-tier, blue/green, Key Vault, justified choices |
| Security & compliance | 10% | STRIDE model, JWT, RBAC, headers, GDPR/PCI mapping |
| Performance optimisation | 20% | Health checks, App Insights, autoscale, DB indexes, caching |
| Cost management | 20% | Tags, right-sizing, autoscale, Budget alert, reserved instances |

---

## BEFORE YOU START — PREP CHECKLIST

Open all of these before hitting record. Tab-switching mid-recording loses time.

**Azure Portal (pre-open these tabs):**
- [ ] Resource group → all resources visible
- [ ] App Service → Configuration (HTTPS only, health check path)
- [ ] App Service → Identity (system-assigned managed identity ON)
- [ ] Key Vault → Secrets (names visible, values hidden)
- [ ] App Service Plan → Scale out (autoscale rules visible)
- [ ] Monitor → Alerts (CPU alert listed)
- [ ] Application Insights → Requests chart or Live Metrics
- [ ] Cost Management → Cost analysis (resource group scope)
- [ ] Any resource → Tags tab (all four tags visible)
- [ ] Cost Management → Budgets (monthly budget alert)

**Browser tabs:**
- [ ] Live app URL (signed in as Requester)
- [ ] `/healthz` endpoint → JSON response
- [ ] `/readyz` endpoint → JSON response
- [ ] Dev tools open on an API call (security headers visible in Network tab)

**Terminal / Postman (ready to run):**
- [ ] `curl` with no token → 401
- [ ] `curl` approve as Requester role → 403
- [ ] `curl` reject with empty comment → 400

**Code (VS Code or editor):**
- [ ] `docs/threat-model.md` open
- [ ] `backend/CloudSec.Api/Data/AppDbContext.cs` open (indexes visible)
- [ ] Architecture diagram from `docs/presentation-diagrams.md` rendered

---

## SEGMENT 1 — Context and problem `0:00–2:00`

**SHOW:** Architecture diagram — 30 seconds, then switch to running app

---

> "This is CloudSec — a cloud-based security exception management application I designed and built for an internal governance use case at a professional services organisation.
>
> The problem is real. Teams need to request temporary exceptions to security controls — firewall rules, privileged access grants, data handling deviations. At a firm handling confidential client data, these decisions carry legal weight. Without a governed process they are handled informally, with no audit trail, no consistent risk scoring, no accountability.
>
> CloudSec replaces that with a controlled, auditable, cloud-native workflow deployed entirely on Microsoft Azure — with all infrastructure defined as code. The choice of Azure reflects its position as the leading enterprise cloud platform for regulated UK industries. Gartner (2023) positions Microsoft as a leader in the cloud infrastructure magic quadrant, and Azure holds over 100 compliance certifications relevant to a professional services context."

**Criteria:** Knowledge & understanding · Design & architecture

---

## SEGMENT 2 — Architecture walkthrough `2:00–6:00`

**SHOW:**
1. Architecture diagram — 60 seconds
2. Azure Portal → Resource group (all resources listed)

---

> "The architecture is a classic three-tier model: React frontend, ASP.NET Core API, and a database. This separation of concerns is a fundamental cloud architecture pattern described by Fowler (2002) in Patterns of Enterprise Application Architecture.
>
> In development I use SQLite for simplicity. In production, the configuration layer automatically switches to Azure SQL. This is the twelve-factor app methodology (Wiggins, 2017) — factor three, config in the environment, not the codebase.
>
> **On Azure I deploy:**
> - App Service on Standard S1 — the minimum tier supporting production autoscaling
> - Azure SQL Database — a fully managed, patched relational store
> - Azure Blob Storage — serverless static hosting for the React app; no web server to manage
> - Application Insights and Log Analytics — full observability stack
> - Azure Key Vault — no credentials touch source code or app settings; ever
> - GitHub Actions with Bicep — fully automated, reproducible, version-controlled deployments
> - A staging deployment slot — zero-downtime blue/green deployments
>
> **Three design choices I want to highlight:**
>
> First: a zero-secret architecture. The JWT signing key and database connection string live only in Key Vault. The App Service fetches them via managed identity at runtime. This directly addresses OWASP Secrets Management guidance (OWASP, 2021).
>
> Second: infrastructure as code with Bicep. Any engineer with the right credentials can reproduce this environment exactly. The deployment is not a manual procedure — it is a version-controlled, auditable artefact. Kim et al. (2016) describe this as a core DevOps principle in The DevOps Handbook.
>
> Third: blue/green deployment via staging slots. New code deploys to staging, is health-checked, then swapped to production with zero downtime. Humble and Farley (2010) describe this pattern in Continuous Delivery — it is simply not possible in traditional on-premises environments.
>
> On environmental impact: by using PaaS rather than self-managed VMs, and autoscaling to avoid idle over-provisioning, this architecture minimises compute waste. Microsoft (2023) reports Azure workloads can be up to 93% more energy efficient than equivalent on-premises deployments."

**SHOW:** Azure Portal → resource group at this point

**Criteria:** Design & architecture · Knowledge & understanding · Cost management

---

## SEGMENT 3 — Security and compliance `6:00–10:00`

**SHOW:**
1. `docs/threat-model.md` — open briefly in editor (10 seconds)
2. App Service → Configuration: HTTPS-only, FTPS-only, TLS 1.2 min
3. Key Vault → Secrets (names visible, values hidden)
4. App Service → Identity → system-assigned ON
5. Browser dev tools → Network tab → API response headers
6. Terminal: `curl` no token → **401**
7. Terminal: `curl` approve as Requester → **403**
8. Terminal: `curl` reject, empty comment → **400**

---

> "Security is backend-enforced and threat-modelled — not cosmetic.
>
> Before implementation I produced a STRIDE threat model — a structured methodology developed at Microsoft (Shostack, 2014) for identifying threats across six categories.
>
> **[Show threat-model.md briefly]**
>
> - **Spoofing:** JWT bearer tokens are required on all protected endpoints. Signatures are validated against a key held only in Key Vault. A forged token without that key is cryptographically invalid.
>
> - **Tampering:** The audit log is insert-only. There is no UPDATE or DELETE path for audit events in the API. A decision cannot be altered — the trail is immutable by design.
>
> - **Repudiation:** Every action records the actor's email, timestamp, and context. An approver cannot credibly deny a decision. It is attributed at the database level.
>
> - **Information disclosure:** All secrets in Key Vault. Nothing in source code or app settings. CORS locked to the known frontend origin. Error responses suppress stack traces in production.
>
> - **Denial of service:** Autoscale handles traffic spikes. Health probes remove unhealthy instances automatically.
>
> - **Elevation of privilege:** The decision endpoint is authorised for the Approver role only. A Requester calling it receives HTTP 403.
>
> **[Show the 401 / 403 / 400 live]**
>
> The API emits a full set of HTTP security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy, and Permissions-Policy — reducing the browser-based attack surface across the OWASP Top Ten (OWASP, 2021).
>
> Infrastructure controls: HTTPS enforced with HSTS. TLS 1.2 minimum. FTPS-only. Storage with public access disabled. Key Vault with managed identity access only.
>
> This maps to:
> - GDPR Article 25 — data protection by design
> - PCI DSS v4.0 requirement 7 — restrict access to system components
> - ISO 27001 Annex A — access control, cryptography, operations security
> - NCSC cloud security principles 2, 3, and 6 (NCSC, 2023)"

**Criteria:** Security & compliance

---

## SEGMENT 4 — Live app demo `10:00–14:00`

**SHOW:** Running deployed application throughout — stay in the browser

---

> "I will now walk through the full workflow on the live deployed system.
>
> **[Show app loading]** I sign in as a Requester. The API issues a JWT containing the user's role claim. The dashboard loads with the protected request list and summary metrics.
>
> **[Submit a request]** I submit a security exception request. System: Litigation Ops Portal. Description: temporary outbound access for a matter export. Classification: Confidential. The API derives a risk score of 70 from the data classification — business logic, not just data storage. The request appears as Pending and an audit event is immediately recorded.
>
> **[Try to reject with no comment]** The API returns 400 Bad Request. A comment is mandatory — enforced at the API level, not the UI.
>
> **[Switch to Approver]** I sign in as an Approver. I can see the request. I approve it with a comment. Status moves to Approved. Another audit event is recorded — who decided, when, and what they said. This timeline provides the traceability required for governance and compliance.
>
> **[Show dashboard metrics]** Total requests, pending, approved, high-risk count, average risk score, approval rate — all live from the deployed system.
>
> This end-to-end flow demonstrates a working, deployed cloud application with real business logic, database persistence, and role-based access control. Not a prototype."

**Criteria:** All — this is the deployment artefact demonstration

---

## SEGMENT 5 — Performance and monitoring `14:00–16:30`

**SHOW:**
1. App Service → Configuration → Health check path `/healthz`
2. Browser → `/healthz` and `/readyz` — show JSON responses
3. Application Insights → Requests chart (real traffic visible)
4. App Service Plan → Scale out → autoscale rules
5. Monitor → Alerts → CPU alert
6. `AppDbContext.cs` in editor — indexes visible (10 seconds)

---

> "Performance and resilience are addressed at four levels: database, application code, caching, and infrastructure.
>
> **Database:** I have defined explicit indexes on every field that drives a query — Status for filtered counts, CreatedUtc for ordering, RiskScore for high-risk aggregation, and a composite index on RequestId and CreatedUtc for event timeline retrieval. This follows the principle that query performance should be designed in, not tuned reactively (Ramakrishnan and Gehrke, 2003).
>
> **[Show AppDbContext.cs — indexes]**
>
> **API layer:** The GetAll endpoint uses a single projected EF Core query — projection happens in SQL, not in C# memory. The summary endpoint uses database-level aggregation: COUNT and AVG run on the SQL engine. It is also wrapped in a 30-second output cache. A governance dashboard does not need sub-second freshness — 30 seconds means the database is queried at most twice per minute regardless of concurrent users.
>
> **Health checks:** The API exposes `/healthz` and `/readyz`. The readiness endpoint queries the database directly — it only returns healthy when the full stack is functional. App Service uses `/healthz` as its health probe, providing automatic removal of unhealthy instances.
>
> **[Show /healthz and /readyz]**
>
> **Observability:** Application Insights captures request telemetry, dependency calls, failure rates, latency, and custom business events — including a metric for every exception request submitted and every decision made. This gives the three golden signals from Google's SRE book (Beyer et al., 2016): rate, errors, latency.
>
> **[Show App Insights]**
>
> **Autoscale:** scales out above 70% CPU for 5 minutes; scales in below 30% for 10 minutes; maximum 3 instances. This is proactive, metric-driven scaling — not schedule-based. The system responds to real demand patterns."

**Criteria:** Performance optimisation

---

## SEGMENT 6 — Cost management `16:30–18:30`

**SHOW:**
1. Azure Cost Management → cost analysis (resource group scope)
2. Any resource → Tags tab (all four tags visible)
3. App Service Plan → Pricing tier (S1 shown)
4. Cost Management → Budgets (monthly budget alert)

---

> "Cost management is a first-class engineering concern here — not bolted on after deployment.
>
> **Tagging:** Every resource carries four tags — Application, Environment, Owner, CostCenter. In Azure Cost Management these power cost attribution, chargeback, and budget enforcement. The FinOps Foundation (2023) identifies tagging as the foundational practice for cost governance — without it, cloud spend cannot be allocated or controlled at scale.
>
> **[Show tags]**
>
> **Right-sizing:**
> - App Service Standard S1 — the minimum tier with autoscale support; dropping below this loses the ability to respond to load dynamically
> - Azure SQL Basic — 5 DTUs is sufficient for internal governance tooling at this scale
> - Storage Standard LRS — adequate redundancy for static hosting at the lowest cost point
>
> **Autoscale as cost control:** the system operates at one instance at idle. It scales only under real load, avoiding permanently provisioned but underused compute. The environmental cost of idle compute is not zero — autoscaling back to one instance is both a cost and a sustainability control.
>
> **Budget alert:** I have deployed an Azure Budget in the Bicep template — a monthly cap with alerts at 80% and 100% of actual spend against this resource group. The team is notified before spend becomes a problem, not after.
>
> **[Show budget]**
>
> For a production workload with a predictable baseline, I would apply Azure Reserved Instances on the App Service Plan. Microsoft offers up to 72% discount over pay-as-you-go for one or three-year commitments (Microsoft Azure, 2024). For any batch processing extensions, Azure Spot Instances offer further savings at up to 90% discount.
>
> Together: tagged resources, right-sized tiers, autoscale, a budget alert, and a clear path to reserved capacity — a comprehensive, FinOps-aligned cost governance model."

**Criteria:** Cost management

---

## SEGMENT 7 — Risks, trade-offs, and roadmap `18:30–19:30`

**SHOW:** Return to architecture diagram briefly, or keep clean browser view

---

> "A credible engineering assessment includes an honest account of limitations and trade-offs.
>
> **Identity:** The current JWT model is application-issued. Appropriate for a demonstration, but in production I would replace it with Microsoft Entra ID — enterprise SSO, MFA, conditional access, and Privileged Identity Management for just-in-time approver access. This would elevate the identity posture significantly.
>
> **Resilience:** The deployment is single-region. For a compliance system handling sensitive decisions, I would add geo-redundant SQL with failover groups and Azure Front Door for global routing — a Recovery Time Objective in the range of minutes rather than hours.
>
> **Secrets rotation:** Key Vault is in place and secrets are referenced correctly. The next step is automated rotation on a schedule using Key Vault's native rotation policy, with diagnostic logging on every secret access event.
>
> **Data governance:** A formal retention and archival policy for resolved requests would strengthen the GDPR Article 5(1)(e) storage limitation compliance story.
>
> These are not failures — they are the honest roadmap of a well-scoped MVP. The architecture is designed to accommodate every one of these extensions without structural rework."

**Criteria:** Design & architecture · Knowledge & understanding

---

## SEGMENT 8 — Conclusion `19:30–20:00`

**SHOW:** Live application dashboard — a clean final view

---

> "CloudSec is small by design. But it is not a toy.
>
> It demonstrates cloud architecture through a defensible three-tier design deployed on Azure with infrastructure as code. It demonstrates security through backend-enforced access control, encrypted secrets, HTTPS, and explicit compliance mapping to GDPR and PCI DSS. It demonstrates performance through health-checked endpoints, Application Insights telemetry, and production autoscaling. It demonstrates cost management through right-sized services, resource tagging, autoscale controls, and a clear path to reserved capacity.
>
> Every decision has a rationale. Every control has evidence. And the entire system is live, deployed, and working."

**Criteria:** All

---

## KEY PHRASES — use these naturally during narration

These signal top-band thinking to the examiner:

- *"The choice of PaaS over IaaS reduces operational overhead and shifts patching responsibility to Microsoft — a strategic decision consistent with the shared responsibility model (Microsoft, 2023)."*
- *"This follows the principle of least privilege — the managed identity has only get and list permissions on Key Vault, not the ability to create or delete secrets."*
- *"The separation of IaC from application code means a security team could review infrastructure changes independently of feature development."*
- *"This design would support ISO 27001 certification — the audit log is immutable by design because events are insert-only."*
- *"The autoscale configuration responds to CPU — the metric that matters for this workload — rather than schedule-based scaling."*
- *"The environmental cost of idle compute is not zero — autoscaling back to one instance at low load is both a cost and a sustainability control."*

---

## REFERENCES — cite verbally as (Author, Year)

- Armbrust, M. et al. (2010) 'A view of cloud computing', *Communications of the ACM*, 53(4), pp. 50–58.
- Beyer, B. et al. (2016) *Site Reliability Engineering*. Sebastopol: O'Reilly Media.
- FinOps Foundation (2023) *FinOps Framework*. Available at: https://www.finops.org/framework/
- Fowler, M. (2002) *Patterns of Enterprise Application Architecture*. Boston: Addison-Wesley.
- Gartner (2023) *Magic Quadrant for Cloud Infrastructure and Platform Services*. Stamford: Gartner.
- Humble, J. and Farley, D. (2010) *Continuous Delivery*. Boston: Addison-Wesley.
- Kim, G. et al. (2016) *The DevOps Handbook*. Portland: IT Revolution Press.
- Microsoft (2023) *Microsoft Cloud for Sustainability*. Available at: https://azure.microsoft.com/en-us/explore/global-infrastructure/sustainability/
- Microsoft Azure (2024) *Azure Reserved VM Instances*. Available at: https://azure.microsoft.com/en-us/pricing/reserved-vm-instances/
- NCSC (2023) *Cloud Security Guidance*. Available at: https://www.ncsc.gov.uk/collection/cloud
- OWASP (2021) *OWASP Top Ten*. Available at: https://owasp.org/www-project-top-ten/
- OWASP (2021) *Secrets Management Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Ramakrishnan, R. and Gehrke, J. (2003) *Database Management Systems*. 3rd edn. New York: McGraw-Hill.
- Shostack, A. (2014) *Threat Modeling: Designing for Security*. Indianapolis: Wiley.
- Wiggins, A. (2017) *The Twelve-Factor App*. Available at: https://12factor.net/
- Information Commissioner's Office (2024) *Guide to the UK GDPR*. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
