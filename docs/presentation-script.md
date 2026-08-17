# CloudSec — Presentation Script

Estimated duration: 20 minutes

---

## Slide 1 — Title (0:00–1:00)

"Good afternoon. I'm presenting CloudSec, a cloud-based security exception management application
I designed and built for a professional services context.

The goal is to replace informal, manual exception processes with a controlled, auditable, cloud-native
workflow — and to demonstrate cloud architecture, security, performance, and cost governance in the process."

---

## Slide 2 — Business problem (1:00–3:00)

[Diagram: Before vs after workflow]

"The business problem is familiar in any organisation that manages access, systems, or sensitive data.
Teams need to request temporary exceptions to security controls — whether that's an outbound firewall rule,
a privileged access grant, or a temporary data handling deviation.

At a firm like Osborne Clarke, which handles confidential client and matter data, these decisions carry
legal and operational weight. If they're managed through emails or spreadsheets, there's no consistent
record, no risk assessment, and no audit trail.

CloudSec solves that by providing a governed workflow: a user submits a request, the system scores it
for risk based on data classification, and an approver makes a recorded decision."

Presenter note:
- The before/after diagram shows the business pain: weak ownership, lack of auditability, inconsistent decisions.
- This is the business case slide; it is not just about software features.

---

## Slide 3 — Solution overview (3:00–5:00)

"The application has two roles: Requester and Approver.

A Requester can sign in, submit a new security exception request with details including a system name,
description, and data classification. The backend automatically derives a risk score.

An Approver can review pending requests and either approve or reject them. If they reject, a comment is
mandatory — that is enforced in the API, not just the UI, which is important for governance.

Every action produces an audit event. The full event timeline is stored for every request, so the system
records not just the outcome, but who made the decision, when, and why."

---

## Slide 4 — Architecture (5:00–8:00)

[Diagram: System architecture overview]

"The architecture follows a standard three-tier model: React frontend, ASP.NET Core API, and a database.

In development I use SQLite for simplicity. In production, the Azure deployment baseline switches
automatically to Azure SQL Server via configuration, which shows the database layer is abstracted
correctly — a principle aligned with the twelve-factor app methodology (Wiggins, 2017).

On Azure, the deployment includes:
- App Service on Standard S1 for the API
- Azure SQL Database for persistence
- Storage Account for the static frontend
- Application Insights and Log Analytics for observability
- Azure Key Vault for secret storage
- Autoscale rules and CPU alerting
- GitHub Actions and Bicep for fully automated, repeatable deployment

I want to highlight two specific design choices. First, the App Service uses a System-Assigned Managed
Identity, and all secrets — the JWT signing key and the database connection string — are stored in
Key Vault. The App Service fetches them at runtime via Key Vault references. No secrets are in
application settings or source code, consistent with OWASP Secrets Management guidance (OWASP, 2021).

Second, the entire infrastructure is defined as code in a single Bicep template. That means the
deployment is reproducible, auditable, and versionable — this is a core DevOps practice described
by Kim et al. (2016) in The DevOps Handbook.

On environmental impact: Azure operates with a commitment to carbon neutrality and runs on
increasingly renewable energy. By using managed PaaS services rather than self-managed VMs,
and by implementing autoscaling to avoid idle over-provisioning, this solution minimises its
compute footprint. Microsoft (2023) reports that cloud workloads on Azure can be up to 93% more
energy efficient than equivalent on-premises deployments. The right-sizing approach used here
directly reduces unnecessary resource consumption."

Presenter note:
- The architecture diagram is the core technical evidence slide.
- It shows the app is not just a frontend; it is a cloud-aware stack with managed services, telemetry, and policy-aligned infrastructure.
- Environmental impact must be mentioned here — it is explicitly called out in the brief.

---

## Slide 5 — Security and compliance (8:00–11:00)

[Diagram: Security control flow]

"Security is central to this application, not an afterthought.

At the API level: JWT bearer tokens are required for all protected endpoints. Role claims are validated
on every request. Requesters cannot make approval decisions — that returns HTTP 403. Rejection requires
a comment — that returns HTTP 400 if omitted. These are backend controls, meaning they cannot be
bypassed by modifying the frontend.

The API also emits a full set of HTTP security headers on every response: X-Content-Type-Options,
X-Frame-Options, Referrer-Policy, Content-Security-Policy, Permissions-Policy, and CORS is locked
to the known frontend origin in production.

On the infrastructure side: HTTPS is enforced across the App Service with HSTS. TLS 1.2 is the
minimum. FTPS is set to FTPS-only. Storage has public access disabled and HTTPS-only. Key Vault stores
secrets and only the App Service managed identity has get and list permissions.

From a compliance perspective, this maps well to GDPR principles: we only collect the operational data
necessary for the workflow, every action is attributable to a named actor, the audit log cannot be
modified, and access is strictly role-based.

While the application does not handle card data, the controls demonstrated here — access control,
auditability, separation of duties, and encryption in transit — are consistent with PCI DSS
principles and the kinds of controls an information security team would require."

Presenter note:
- The security diagram makes the control model easy to explain quickly.
- This is a key slide for showing that governance and enforcement are not just presentation-level features.

---

## Slide 6 — Live demo (11:00–14:30)

"I'll now walk through the application.

[Show] I sign in as a Requester. I provide an email and role, the API issues a JWT, and the dashboard
loads with the protected request list and summary metrics.

[Show] I create a new exception request for a system called 'Litigation Ops Portal' with a
Confidential data classification. The API assigns a risk score of 70. The request appears in the
list with Pending status and an audit event records the submission.

[Show] I switch to an Approver role. I can see the request. I attempt to reject it without a comment
and the API returns 400 Bad Request — comment is required. I then approve it with a comment, and the
request moves to Approved status.

[Show] The summary metrics update: total requests, pending count, approved count, high-risk count,
average risk score, and approval rate are all reflected in the dashboard.

This demonstrates the full governance workflow end to end."

---

## Slide 7 — Performance and monitoring (14:30–16:30)

[Diagram: Monitoring and health / autoscale]

"Performance and observability are addressed at two levels: application and infrastructure.

At the application level, the API now has two dedicated endpoints: /healthz which returns a liveness
signal, and /readyz which confirms the database is reachable. App Service uses /healthz as its
health check path, so the platform automatically routes traffic away from unhealthy instances.

At the infrastructure level, Application Insights is connected to the API and captures request
telemetry, failure rates, response times, and dependency calls. Log Analytics provides a centralised
workspace for querying operational data.

For scaling, the App Service Plan is Standard S1 — which supports autoscaling — and the Bicep
template configures autoscale rules to scale out when CPU exceeds 70 percent for five minutes and
scale back in when it drops below 30 percent for ten minutes. This means the system can respond to
genuine load without manual intervention.

A metric alert fires at severity 2 when CPU consistently exceeds 70 percent, which would allow an
operator to review whether the scale-out is working as expected."

Presenter note:
- The health and autoscale diagram helps explain how the app is managed in production.
- This is a clear operational evidence point and adds credibility to the cloud engineering story.

---

## Slide 8 — Cost management (16:30–18:30)

[Diagram: Cost governance and tagged resources]

"Cost management was a conscious design constraint throughout this project.

The architecture uses right-sized managed services. The App Service Plan is Standard S1 — the
minimum tier that supports autoscale — which keeps base cost low while enabling production-grade
scaling. The SQL Database is Basic tier, appropriate for the workload. Storage uses LRS redundancy.

All resources are tagged with Application, Environment, Owner, and CostCenter tags. This means
every Azure resource in the deployment is identifiable and attributable, which is the foundation
of cost governance. In a real deployment, those tags would feed into Azure Cost Management views,
chargebacks, and budget policies (Microsoft Azure, 2024).

Autoscaling is a direct cost control: the system does not maintain more instances than it needs.
The scale-in rule returns the plan to a single instance when load drops.

For a production deployment I would also consider Reserved Instances for the App Service Plan,
which Microsoft offers at up to 72% discount compared to pay-as-you-go pricing for predictable
baseline workloads (Microsoft Azure, 2024). Spot instances would be appropriate for
non-critical batch processing tasks if the application were extended to include them.

The core pattern here — right-sized baseline, tagged resources, autoscale, with a path to reserved
capacity — demonstrates cost-aware cloud engineering aligned with the FinOps Foundation principles
(FinOps Foundation, 2023)."

Presenter note:
- The cost diagram is useful as a governance argument, not just a technical one.
- It clarifies that the solution is built with operational accountability in mind.
- Must mention reserved/spot instances — the brief explicitly calls these out.

---

## Slide 9 — Risks and future improvements (18:30–19:30)

"The current solution is deliberately scoped as a working proof of concept. There are clear and
acknowledged next steps.

On identity: the current JWT model is application-issued, which is appropriate for a demonstration.
In production, I would replace this with Microsoft Entra ID integration, which would give us
enterprise SSO, MFA, and proper directory-backed role management.

On resilience: the current deployment is single-region. For a production compliance system, a
multi-region deployment with geo-redundant storage and SQL failover groups would be appropriate.

On secrets: Key Vault is already in place with secret references. The logical next step is to
rotate secrets on a schedule and add diagnostic logging on Key Vault access.

On data governance: adding a formal retention and deletion policy, and archival workflow for
resolved requests, would improve the GDPR story further."

---

## Slide 10 — Conclusion (19:30–20:00)

"CloudSec demonstrates a cloud-based application with genuine business value and strong cloud
engineering practice across all five assessment themes.

The architecture is simple but cloud-native and defensible. The security model is backend-enforced,
not cosmetic. The monitoring and scaling configuration is real infrastructure, not aspirational.
The cost posture is deliberate and evidenced. And the deployment is fully automated and reproducible.

It is a small application by design — but it is not a toy. It reflects the kind of internal
governance tooling a professional services organisation would actually build and operate.

Thank you."

---

## References (for submission document — Harvard format)

These should be included in the document you submit to Turnitin alongside the recording link.
Cite them verbally in the recording as "(Author, Year)" when making key claims.

- FinOps Foundation (2023) *FinOps Framework*. Available at: https://www.finops.org/framework/ (Accessed: 17 August 2026).
- Kim, G., Humble, J., Debois, P. and Willis, J. (2016) *The DevOps Handbook*. Portland: IT Revolution Press.
- Microsoft Azure (2023) *Sustainability and Azure*. Available at: https://azure.microsoft.com/en-us/explore/global-infrastructure/sustainability/ (Accessed: 17 August 2026).
- Microsoft Azure (2024) *Azure Reserved VM Instances*. Available at: https://azure.microsoft.com/en-us/pricing/reserved-vm-instances/ (Accessed: 17 August 2026).
- Microsoft Azure (2024) *Azure Cost Management and Billing documentation*. Available at: https://learn.microsoft.com/en-us/azure/cost-management-billing/ (Accessed: 17 August 2026).
- OWASP (2021) *OWASP Cheat Sheet Series: Secrets Management*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html (Accessed: 17 August 2026).
- Wiggins, A. (2017) *The Twelve-Factor App*. Available at: https://12factor.net (Accessed: 17 August 2026).
- National Cyber Security Centre (2023) *10 Steps to Cyber Security*. Available at: https://www.ncsc.gov.uk/collection/10-steps (Accessed: 17 August 2026).
- Information Commissioner's Office (2024) *Guide to the UK GDPR*. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/ (Accessed: 17 August 2026).
- Armbrust, M. et al. (2010) 'A view of cloud computing', *Communications of the ACM*, 53(4), pp. 50–58.
