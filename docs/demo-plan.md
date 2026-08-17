# CloudSec — Recorded Demo Plan

**Format:** Screen recording with voice over. No camera required.
**Target duration:** 20 minutes maximum.
**Target band:** 80–100% across all criteria.
**Framing:** This is a demo of cloud engineering principles, not a slide deck. The screen is the
primary medium. Diagrams are used as brief illustration overlays only, not as the main content.

---

## Top band requirements per criterion (from rubric)

To hit 80–100% you must demonstrate ALL of the following clearly:

| Criterion | Weight | What top band looks like |
|-----------|--------|--------------------------|
| Knowledge & understanding | 15% | Exceptional depth and insight. Nuanced understanding of services, deployment models, innovative application. Supported by references. |
| Design & architecture | 35% | Exemplary, highly detailed, innovative. Seamlessly integrated components. Rationale is exceptionally well-justified with deep insight. |
| Security & compliance | 10% | Exemplary protection. State-of-the-art practices, proactive threat detection, innovative solutions. Meticulous compliance mapping. |
| Performance optimisation | 20% | Exemplary. Real-time metrics, automated alerts, proactive tuning. Performs exceptionally under all conditions. |
| Cost management | 20% | Minimal and highly optimised costs. State-of-the-art monitoring, proactive and innovative cost-saving. Maximised efficiency. |

---

## Demo flow — step by step

### SEGMENT 1 — Context and problem (0:00–2:00)

**What to show on screen:**
- The brief architecture diagram (open `docs/presentation-diagrams.md` in a Markdown renderer or
  export to image). Show for 30 seconds max, then switch to the running app.
- Optionally: a brief text slide or note showing the organisation context.

**What to say:**
"This is CloudSec — a cloud-based security exception management application I designed and built
for an internal governance use case at a professional services organisation.

The problem it solves is real: teams need to request temporary exceptions to security controls —
firewall rules, privileged access, data handling deviations. At a firm handling confidential
client data, these decisions carry legal weight. Without a governed process, they are handled
informally, with no audit trail, no consistent risk scoring, and no accountability.

CloudSec replaces that with a controlled, auditable, cloud-native workflow deployed entirely on
Microsoft Azure, with all infrastructure defined as code. The choice of Azure reflects its
position as a leading enterprise cloud platform — Gartner (2023) positions Microsoft as a
leader in the cloud infrastructure magic quadrant — and its strong compliance certifications
relevant to a UK professional services context."

**Rubric served:** Knowledge & understanding, Design & architecture

---

### SEGMENT 2 — Architecture walkthrough (2:00–6:00)

**What to show on screen:**
- Architecture diagram (from `docs/presentation-diagrams.md`) — show for 60–90 seconds
- Then: Azure Portal → Resource Group → show all deployed resources listed

**What to say:**
"The architecture is a classic three-tier model: React frontend, ASP.NET Core API, and a database.
This separation of concerns is a fundamental cloud architecture pattern — as described by Fowler
(2002) in Patterns of Enterprise Application Architecture.

In development I use SQLite for simplicity and developer productivity. In production, the
configuration layer automatically switches to Azure SQL Server. This is an example of
environment-specific configuration managed through the twelve-factor app methodology (Wiggins, 2017)
— specifically factor three, config in the environment — not hardcoded in the codebase.

On Azure, I deploy using:
- App Service on Standard S1 — the minimum tier that supports production autoscaling
- Azure SQL Database for a managed, fully patched relational store
- Azure Blob Storage for the React static site — serverless hosting with no web server to manage
- Application Insights and Log Analytics for full observability
- Azure Key Vault for secret storage — no credentials in source code or app settings
- GitHub Actions with Bicep for fully automated, repeatable infrastructure as code

The entire infrastructure is defined in a single Bicep template and deployed through CI/CD.
This makes the deployment reproducible, auditable, and versionable — a DevOps principle
described by Kim et al. (2016) in The DevOps Handbook.

On environmental impact: by using PaaS managed services rather than self-managed virtual
machines, and by autoscaling to avoid idle over-provisioning, this architecture minimises
compute waste. Microsoft (2023) reports Azure workloads can be up to 93% more energy efficient
than equivalent on-premises deployments. The autoscale configuration I will show later is not
just a cost control — it is also a direct reduction in the environmental footprint of the
running system."

[Show the Azure Portal resource group at this point — all resources visible]

**Rubric served:** Design & architecture (primary), Knowledge & understanding, Cost management

---

### SEGMENT 3 — Security and compliance (6:00–10:00)

**What to show on screen:**
- Security control flow diagram (30 seconds)
- Then: App Service → Configuration → show HTTPS-only, FTPS-only, minimum TLS 1.2
- Then: Key Vault → show secrets exist (not their values)
- Then: App Service → Identity → show system-assigned managed identity is on
- Then: browser dev tools on the running API response → show security headers
- Then: Postman or curl — call a protected endpoint without a token → show 401
- Then: call an approve endpoint as a Requester role → show 403
- Then: call reject without a comment → show 400

**What to say:**
"Security is backend-enforced in this application — it is not cosmetic.

At the transport level: HTTPS is enforced with HSTS. TLS 1.2 is the minimum cipher version.
FTPS-only is set. Storage has public access disabled. These controls align with NCSC (2023)
guidance on secure cloud configuration.

For secrets management: the JWT signing key and database connection string are stored in
Azure Key Vault. The App Service accesses them via Key Vault references using its
system-assigned managed identity. No secret ever appears in source code or application
configuration — this directly addresses OWASP's Secrets Management guidance (OWASP, 2021).

For access control: every API endpoint requires a valid JWT bearer token. Role claims are
validated on every request. Requesters cannot make approval decisions — that returns 403
Forbidden. This is separation of duties, a core principle of the UK GDPR's accountability
requirement (ICO, 2024) and the ISO 27001 access control domain.

Rejection requires a comment — not just in the UI but enforced in the API — returning 400
Bad Request if omitted. This is important for audit trail completeness.

The API emits a full set of HTTP security headers on every response: X-Content-Type-Options,
X-Frame-Options, Referrer-Policy, Content-Security-Policy, and Permissions-Policy. These
reduce the attack surface against common browser-based attacks as catalogued in the OWASP
Top Ten (OWASP, 2021).

From a compliance perspective this maps directly to:
- GDPR Article 5: data minimisation, accountability, integrity and confidentiality
- GDPR Article 25: data protection by design
- PCI DSS v4.0 requirement 7: restrict access to system components and cardholder data
- ISO 27001 Annex A: access control, cryptography, and operations security"

[Show each screen element as you describe it — keep narration and screen in sync]

**Rubric served:** Security & compliance (primary), Knowledge & understanding

---

### SEGMENT 4 — Live application demo (10:00–14:00)

**What to show on screen:**
- The running deployed application in a browser
- Full workflow from login to dashboard

**What to say:**
"I will now walk through the full application workflow on the live deployed system.

[Show] I open the application. I sign in as a Requester — the API issues a JWT token
containing the user's role claim. The dashboard loads with the protected request list and
summary metrics.

[Show] I submit a new security exception request. System: Litigation Ops Portal.
Description: temporary outbound access for a matter export. Data classification: Confidential.
The API processes this and automatically derives a risk score of 70 based on the
data classification — this is the business logic layer. The request appears in the list
with Pending status and an audit event is immediately recorded.

[Show] I attempt to reject the request without a comment. The API returns 400 Bad Request —
the comment is mandatory, enforced at the API level.

[Show] I switch to an Approver account. I can see the request. I approve it with a comment.
The status moves to Approved. Another audit event is recorded — who made the decision, when,
and the comment they provided. This full event timeline provides the traceability required
for governance and compliance.

[Show] The dashboard metrics update in real time: total requests, pending, approved,
high-risk count, average risk score, and approval rate.

This end-to-end flow demonstrates a working, deployed cloud application with genuine
business logic, database persistence, and role-based access — not a prototype."

**Rubric served:** Design & architecture (deployment artefact), all criteria

---

### SEGMENT 5 — Performance and monitoring (14:00–16:30)

**What to show on screen:**
- App Service → Health check → show /healthz configured
- Browser → navigate to /healthz and /readyz → show JSON responses
- Application Insights → Live Metrics or Requests chart
- App Service Plan → Autoscale → show the configured rules
- Monitor → Alerts → show the CPU severity 2 alert

**What to say:**
"Performance and operational resilience are addressed at two levels.

At the application level: the API exposes a /healthz liveness endpoint and a /readyz readiness
endpoint. The readiness endpoint queries the database so it only returns healthy when the full
stack is functional. The App Service health check path is configured to /healthz — the platform
automatically removes unhealthy instances from load balancing rotation, providing self-healing
behaviour with no manual intervention.

[Show /healthz and /readyz responses]

Application Insights is instrumented on the API and captures request telemetry, dependency
calls, failure rates, and latency percentiles in real time. This provides the observability
layer described by the Google SRE Book (Beyer et al., 2016) as essential for production
reliability — specifically request rate, error rate, and latency as core golden signals.

[Show App Insights dashboard]

For scaling: the App Service Plan is Standard S1, the minimum tier supporting autoscale.
The autoscale rules I have configured are:
- Scale out when CPU exceeds 70% for 5 minutes — adds an instance
- Scale in when CPU drops below 30% for 10 minutes — removes an instance
- Maximum 3 instances

This means the system responds to genuine load automatically, without human intervention.
A CPU alert at severity 2 fires when the threshold is breached, alerting an operator to
review whether the autoscale response is working as expected.

For database performance: the queries use Entity Framework Core with proper indexed lookups
on the primary key and status fields. The connection is pooled and managed through the
framework, preventing connection exhaustion under load."

**Rubric served:** Performance optimisation (primary)

---

### SEGMENT 6 — Cost management (16:30–18:30)

**What to show on screen:**
- Azure Portal → Cost Management → show the resource group cost view or cost analysis
- Resources → show resource tags on App Service (Application, Environment, Owner, CostCenter)
- App Service Plan → Pricing tier → show S1 selection
- Azure Pricing Calculator page (briefly) or a simple cost estimate note

**What to say:**
"Cost management was a deliberate constraint in the design of this system, not an afterthought.

Every resource is tagged with Application, Environment, Owner, and CostCenter tags.
In Azure Cost Management these tags enable cost attribution, chargeback reporting, and
budget policy enforcement. This is a FinOps Foundation (2023) best practice — tagging
is the foundation of cost governance at scale.

[Show resource tags]

The resource choices are deliberately right-sized:
- App Service Standard S1 — the minimum tier supporting autoscale. Any tier below this
  loses autoscale capability.
- Azure SQL Basic — appropriate for the read-write pattern of this workload.
- Standard LRS storage — adequate redundancy at the lowest cost tier for static hosting.

Autoscaling is a direct cost control: the system scales to one instance at idle and only
adds capacity under load. This avoids the waste of permanently provisioned but underused
compute.

[Show autoscale rules again briefly]

For a production workload with predictable baseline usage, I would implement Azure Reserved
Instances on the App Service Plan — Microsoft offers up to 72% discount over pay-as-you-go
for one or three year commitments (Microsoft Azure, 2024). For any non-critical batch
processing extensions, Azure Spot Instances would offer further savings at up to 90% discount
with graceful eviction handling.

[Show Azure Cost Management view]

I would also add an Azure Budget alert at 80% of expected monthly spend so that unexpected
cost anomalies are flagged before they become significant. The combination of tagged resources,
right-sizing, autoscaling, reserved capacity planning, and budget alerts represents a
comprehensive FinOps-aligned cost governance approach."

**Rubric served:** Cost management (primary)

---

### SEGMENT 7 — Risks, trade-offs and future direction (18:30–19:30)

**What to show on screen:**
- Return to architecture diagram briefly
- Or keep a clean browser/terminal view while narrating

**What to say:**
"A credible engineering assessment includes an honest account of limitations and trade-offs.

On identity: the current JWT model is application-issued. This is appropriate for a demonstration
but in production I would replace it with Microsoft Entra ID — enterprise SSO, MFA, conditional
access, and Privileged Identity Management for just-in-time approver access. This would elevate
the identity posture significantly.

On resilience: the deployment is single-region. For a production compliance system handling
sensitive decisions, I would add geo-redundant SQL with failover groups and Azure Front Door
for global routing — providing a Recovery Time Objective in the range of minutes rather than
hours.

On secrets rotation: Key Vault is in place and secrets are referenced correctly. The next step
is automated secret rotation on a schedule using Key Vault's native rotation policy, with
diagnostic logging on every secret access event for compliance evidence.

On data governance: a formal retention and archival policy for resolved exception requests
would strengthen the GDPR Article 5(1)(e) storage limitation compliance story.

These are not failures — they are the honest roadmap of a well-scoped MVP. The architecture
has been designed to accommodate all of these extensions without structural rework."

**Rubric served:** Design & architecture, Knowledge & understanding

---

### SEGMENT 8 — Conclusion (19:30–20:00)

**What to show on screen:**
- The running application dashboard — a final clean view of the live deployed system

**What to say:**
"CloudSec is a small application by design — but it is not a toy.

It demonstrates cloud architecture through a defensible three-tier design deployed on Azure
with infrastructure as code. It demonstrates security through backend-enforced access control,
encrypted secrets, HTTPS, and explicit compliance mapping to GDPR and PCI DSS. It demonstrates
performance through health-checked endpoints, Application Insights telemetry, and production
autoscaling. It demonstrates cost management through right-sized services, resource tagging,
autoscale controls, and a path to reserved capacity.

Every decision has a rationale. Every control has evidence. And the entire system is live,
deployed, and working."

**Rubric served:** All

---

## What to have open and ready before recording

Prepare these windows/tabs in advance:

### Azure Portal tabs (pre-open)
- [ ] Resource group — all resources visible
- [ ] App Service → Configuration (HTTPS only, health check path)
- [ ] App Service → Identity (managed identity on)
- [ ] Key Vault → Secrets (secrets listed, values hidden)
- [ ] App Service Plan → Autoscale (rules visible)
- [ ] Monitor → Alerts (CPU alert visible)
- [ ] Application Insights → Live Metrics or Requests chart
- [ ] Cost Management → Cost analysis for the resource group
- [ ] Any resource → Tags (tags visible)

### Browser tabs
- [ ] Live application URL (logged in as Requester)
- [ ] /healthz response
- [ ] /readyz response
- [ ] Browser dev tools open on a protected API call (showing security headers)

### Terminal / Postman
- [ ] One request ready: protected endpoint with no token → shows 401
- [ ] One request ready: approve as Requester → shows 403
- [ ] One request ready: reject with no comment → shows 400

### Diagram
- [ ] Architecture diagram rendered and ready to show (browser or image viewer)

---

## Key phrases that signal top-band thinking

Use these naturally during narration — they show strategic understanding, not just
implementation knowledge:

- "The choice of PaaS over IaaS here reduces operational overhead and shifts patching
  responsibility to Microsoft, which is a strategic decision consistent with the shared
  responsibility model (Microsoft, 2023)."
- "This follows the principle of least privilege — the managed identity has only get and list
  permissions on Key Vault, not the ability to create or delete secrets."
- "The separation of the IaC template from application code means a security team could
  review infrastructure changes independently of feature development."
- "This design would support ISO 27001 certification in a real organisation — the audit log
  is immutable by design because audit events are insert-only."
- "The autoscale configuration responds to the metric that matters for this workload — CPU —
  rather than schedule-based scaling, which means it adapts to real demand patterns."
- "The environmental cost of idle compute is not zero — autoscaling back to one instance at
  low load is both a cost and a sustainability control."

---

## References to cite verbally (Harvard format)

State these as "(Author, Year)" during the relevant segment. Full list for submission document:

- Armbrust, M. et al. (2010) 'A view of cloud computing', *Communications of the ACM*, 53(4), pp. 50–58.
- Beyer, B. et al. (2016) *Site Reliability Engineering*. Sebastopol: O'Reilly Media.
- FinOps Foundation (2023) *FinOps Framework*. Available at: https://www.finops.org/framework/
- Fowler, M. (2002) *Patterns of Enterprise Application Architecture*. Boston: Addison-Wesley.
- Gartner (2023) *Magic Quadrant for Cloud Infrastructure and Platform Services*. Stamford: Gartner.
- Information Commissioner's Office (2024) *Guide to the UK GDPR*. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/
- Kim, G. et al. (2016) *The DevOps Handbook*. Portland: IT Revolution Press.
- Microsoft (2023) *Microsoft Cloud for Sustainability*. Available at: https://azure.microsoft.com/en-us/explore/global-infrastructure/sustainability/
- Microsoft Azure (2024) *Azure Reserved VM Instances*. Available at: https://azure.microsoft.com/en-us/pricing/reserved-vm-instances/
- Microsoft Azure (2024) *Azure Cost Management and Billing*. Available at: https://learn.microsoft.com/en-us/azure/cost-management-billing/
- NCSC (2023) *Cloud Security Guidance*. Available at: https://www.ncsc.gov.uk/collection/cloud/understanding-cloud-services
- OWASP (2021) *OWASP Top Ten*. Available at: https://owasp.org/www-project-top-ten/
- OWASP (2021) *Secrets Management Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Wiggins, A. (2017) *The Twelve-Factor App*. Available at: https://12factor.net
