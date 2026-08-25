## System scope

Components in scope:

- React frontend (user browser)
- ASP.NET Core API (Azure App Service)
- Azure SQL Database
- Azure Key Vault
- Azure Blob Storage (static site)
- GitHub Actions CI/CD pipeline
- JWT token issuance and validation

Trust boundaries:

- Browser ↔ API (HTTPS, JWT bearer)
- API ↔ Database (private connection string, TLS)
- API ↔ Key Vault (managed identity, TLS)
- GitHub Actions ↔ Azure (service principal with scoped Contributor)

---

## STRIDE threat analysis

### S — Spoofing identity

| Threat                                        | Who could be spoofed           | Mitigation                                                              | Status       |
| --------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- | ------------ |
| Unauthenticated user claims to be an Approver | External attacker or Requester | JWT bearer token required; role claim validated on every request        | ✅ Mitigated |
| Token replay after logout                     | Attacker with captured token   | Short JWT lifetime (configurable); stateless design means tokens expire | ✅ Mitigated |
| Forged JWT token                              | Attacker without signing key   | HMAC-SHA256 signature validated; signing key stored in Key Vault        | ✅ Mitigated |

---

### T — Tampering

| Threat                                                     | What could be tampered             | Mitigation                                                                        | Status                         |
| ---------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| Audit event record modified                                | Malicious insider or SQL injection | Audit events are insert-only; no UPDATE or DELETE path exists in the API          | ✅ Mitigated                   |
| Request status set without going through decision workflow | Client bypass                      | Status transitions enforced in API; direct DB access not possible from outside    | ✅ Mitigated                   |
| API deployment replaced with malicious binary              | Supply chain attack                | GitHub Actions uses pinned action versions; Bicep IaC controls App Service config | ⚠️ Partial — no binary signing |

---

### R — Repudiation

| Threat                                | Who could deny an action       | Mitigation                                                                                      | Status                                              |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Approver denies making a decision     | Approver                       | Every decision records actor email, timestamp, decision, and comment in the audit log           | ✅ Mitigated                                        |
| Requester denies submitting a request | Requester                      | Submit event recorded with actor email and timestamp at creation                                | ✅ Mitigated                                        |
| Audit log tampering to cover tracks   | Malicious actor with DB access | Insert-only audit table; no delete API; in production: SQL auditing and Log Analytics retention | ⚠️ Partial — no SQL audit logging enabled currently |

---

### I — Information disclosure

| Threat                                    | What could be disclosed              | Mitigation                                                                       | Status       |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- | ------------ |
| Connection string or JWT key leaked       | Secrets in app config or source code | All secrets stored in Azure Key Vault; Key Vault references only; nothing in git | ✅ Mitigated |
| Request data exposed to unauthorised user | Unauthenticated caller               | All data endpoints require valid JWT; no anonymous access to business data       | ✅ Mitigated |
| Error messages leaking stack traces       | Unhandled exceptions in production   | ASPNETCORE_ENVIRONMENT=Production suppresses detailed errors                     | ✅ Mitigated |
| CORS allowing any origin                  | Cross-origin data access             | CORS locked to known frontend origin in production                               | ✅ Mitigated |

---

### D — Denial of service

| Threat                                      | What could be disrupted                   | Mitigation                                                                                    | Status       |
| ------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- | ------------ |
| Sustained high traffic overwhelming the API | External load or bot traffic              | Autoscale adds instances at >70% CPU; health probes remove unhealthy instances                | ✅ Mitigated |
| Database connection exhaustion              | Many concurrent requests                  | EF Core connection pooling; Basic SQL tier has connection limits but appropriate for workload | ✅ Mitigated |
| Malicious large payload                     | Attacker sending oversized request bodies | ASP.NET Core default request size limits apply                                                | ✅ Mitigated |

---

### E — Elevation of privilege

| Threat                                                 | What privilege could be gained    | Mitigation                                                                              | Status       |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| Requester attempts to approve their own request        | Requester making a decision       | Decision endpoint authorised for Approver role only; Requester returns HTTP 403         | ✅ Mitigated |
| JWT with self-issued Approver role claim               | Token crafted without signing key | Signing key validated on every token; cannot forge without the Key Vault secret         | ✅ Mitigated |
| App Service gaining more Azure permissions than needed | Over-privileged managed identity  | Managed identity has only Key Vault get/list; Contributor scoped to resource group only | ✅ Mitigated |

---

## Residual risks and next steps

| Risk                               | Priority | Proposed mitigation                                                                   |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| No binary signing for deployments  | Medium   | Add artifact signing to GitHub Actions using Sigstore/cosign                          |
| SQL audit logging not enabled      | Medium   | Enable Azure SQL Auditing to Log Analytics for full query-level audit trail           |
| No formal secret rotation schedule | Low      | Configure Key Vault rotation policy with automated rotation every 90 days             |
| Single-region deployment           | Low      | Add geo-redundant SQL failover group and Azure Front Door for multi-region resilience |

---
