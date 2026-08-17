import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type SecurityExceptionRequest = {
  id: number;
  title: string;
  description: string;
  requesterEmail: string;
  systemName: string;
  dataClassification: string;
  status: string;
  riskScore: number;
  createdUtc: string;
  updatedUtc: string;
  events: SecurityExceptionEvent[];
};

type SecurityExceptionEvent = {
  id: number;
  eventType: string;
  fromStatus: string;
  toStatus: string;
  actorEmail: string;
  comment: string;
  createdUtc: string;
};

type CreateRequestInput = {
  title: string;
  description: string;
  systemName: string;
  dataClassification: string;
};

type SessionRole = "Requester" | "Approver";

type TokenResponse = {
  accessToken: string;
  expiresUtc: string;
};

type SecurityExceptionSummary = {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  highRiskRequests: number;
  averageRiskScore: number;
  decisionEventsLast7Days: number;
  approvalRatePercent: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5103";

function App() {
  const [items, setItems] = useState<SecurityExceptionRequest[]>([]);
  const [summary, setSummary] = useState<SecurityExceptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [decisionComments, setDecisionComments] = useState<
    Record<number, string>
  >({});

  const [session, setSession] = useState({
    email: "requester.user@osborneclarke.com",
    role: "Requester" as SessionRole,
    accessToken: "",
    expiresUtc: "",
  });

  const [form, setForm] = useState<CreateRequestInput>({
    title: "",
    description: "",
    systemName: "",
    dataClassification: "Internal",
  });

  const stats = useMemo(() => {
    const total = summary?.totalRequests ?? items.length;
    const pending =
      summary?.pendingRequests ??
      items.filter((item) => item.status.toLowerCase() === "pending").length;
    const avgRisk =
      summary?.averageRiskScore ??
      (total === 0
        ? 0
        : Math.round(
            items.reduce((sum, item) => sum + item.riskScore, 0) / total,
          ));
    const highRisk =
      summary?.highRiskRequests ??
      items.filter((item) => item.riskScore >= 70).length;
    const decisionEvents = summary?.decisionEventsLast7Days ?? 0;
    const approvalRate = summary?.approvalRatePercent ?? 0;

    return { total, pending, avgRisk, highRisk, decisionEvents, approvalRate };
  }, [items, summary]);
  async function loadRequests() {
    if (!session.accessToken) {
      setItems([]);
      setSummary(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [requestResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/SecurityExceptionRequests`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/SecurityExceptionRequests/summary`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }),
      ]);

      if (!requestResponse.ok) {
        throw new Error("Failed to load requests from API.");
      }

      if (!summaryResponse.ok) {
        throw new Error("Failed to load summary metrics from API.");
      }

      const requests =
        (await requestResponse.json()) as SecurityExceptionRequest[];
      const summaryData =
        (await summaryResponse.json()) as SecurityExceptionSummary;

      setItems(requests);
      setSummary(summaryData);
    } catch {
      setError(
        "Could not load protected API data. Sign in and verify the API is running.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, [session.accessToken]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session.accessToken) {
      setError("Sign in first to submit requests.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/SecurityExceptionRequests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save request.");
      }

      setForm({
        title: "",
        description: "",
        systemName: "",
        dataClassification: "Internal",
      });
      await loadRequests();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Request submission failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function authenticate() {
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.email,
          role: session.role,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Token request failed.");
      }

      const tokenPayload = (await response.json()) as TokenResponse;

      setSession((current) => ({
        ...current,
        accessToken: tokenPayload.accessToken,
        expiresUtc: tokenPayload.expiresUtc,
      }));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed.";
      setError(message);
    }
  }

  async function applyDecision(
    item: SecurityExceptionRequest,
    action: "approve" | "reject",
  ) {
    if (!session.accessToken) {
      setError("Sign in first to make decisions.");
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/SecurityExceptionRequests/${item.id}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            action,
            comment: decisionComments[item.id] ?? "",
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Decision update failed.");
      }

      setDecisionComments((current) => ({ ...current, [item.id]: "" }));
      await loadRequests();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update request status.";
      setError(message);
    }
  }

  function riskClass(score: number) {
    if (score >= 80) return "risk-critical";
    if (score >= 60) return "risk-high";
    if (score >= 40) return "risk-medium";
    return "risk-low";
  }

  return (
    <div className="page">
      {/* ── Top navigation bar ─────────────────────── */}
      <nav className="topnav">
        <div className="topnav-brand">
          <div className="topnav-brand-icon">CS</div>
          CloudSec
        </div>

        <div className="topnav-right">
          <div className="topnav-pill">
            <div>
              <label>Acting as</label>
              <input
                type="email"
                value={session.email}
                onChange={(event) =>
                  setSession((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div className="topnav-pill">
            <div>
              <label>Role</label>
              <select
                value={session.role}
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    role: event.target.value as SessionRole,
                  }))
                }
              >
                <option value="Requester">Requester</option>
                <option value="Approver">Approver</option>
              </select>
            </div>
          </div>

          <div className="topnav-pill">
            <div
              className={`auth-status-dot ${session.accessToken ? "active" : ""}`}
            />
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {session.accessToken ? session.role : "Signed out"}
            </span>
          </div>

          {session.accessToken ? (
            <button
              className="btn-nav secondary"
              type="button"
              onClick={() =>
                setSession((current) => ({ ...current, accessToken: "", expiresUtc: "" }))
              }
            >
              Sign Out
            </button>
          ) : (
            <button
              className="btn-nav"
              type="button"
              onClick={() => void authenticate()}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* ── Dashboard header + metrics ──────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <p className="dashboard-eyebrow">Security Governance</p>
            <h1 className="dashboard-title">Exception Request Portal</h1>
            <p className="dashboard-subtitle">
              Submit, track, and approve security exception requests with
              automated risk scoring and full audit trail.
            </p>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <span className="metric-label">Total</span>
            <span className="metric-value">{stats.total}</span>
          </div>
          <div className={`metric-card ${stats.pending > 0 ? "metric-pending" : ""}`}>
            <span className="metric-label">Pending</span>
            <span className="metric-value">{stats.pending}</span>
          </div>
          <div className="metric-card metric-good">
            <span className="metric-label">Approved</span>
            <span className="metric-value">{summary?.approvedRequests ?? 0}</span>
          </div>
          <div className="metric-card metric-alert">
            <span className="metric-label">Rejected</span>
            <span className="metric-value">{summary?.rejectedRequests ?? 0}</span>
          </div>
          <div className={`metric-card ${stats.highRisk > 0 ? "metric-alert" : ""}`}>
            <span className="metric-label">High Risk</span>
            <span className="metric-value">{stats.highRisk}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Avg Risk</span>
            <span className="metric-value">{stats.avgRisk}</span>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────── */}
      <div className="content-area">
        {/* Submit form */}
        <section className="panel">
          <div className="panel-header">
            <h2>New Exception Request</h2>
          </div>
          <div className="panel-body">
            {!session.accessToken && (
              <div className="alert alert-info" style={{ marginBottom: "16px" }}>
                Sign in above to submit a request.
              </div>
            )}
            <form onSubmit={onSubmit} className="form-grid">
              <div className="field">
                <label>Title</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="e.g. TLS 1.1 exception for legacy system"
                  required
                />
              </div>
              <div className="field">
                <label>System Name</label>
                <input
                  value={form.systemName}
                  onChange={(event) => setForm({ ...form, systemName: event.target.value })}
                  placeholder="e.g. Legacy CRM"
                  required
                />
              </div>
              <div className="field">
                <label>Data Classification</label>
                <select
                  value={form.dataClassification}
                  onChange={(event) =>
                    setForm({ ...form, dataClassification: event.target.value })
                  }
                >
                  <option>Public</option>
                  <option>Internal</option>
                  <option>Confidential</option>
                  <option>Restricted</option>
                </select>
              </div>
              <div className="field full-width">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Describe the exception, business justification, and proposed mitigations…"
                  required
                />
              </div>
              <div className="full-width">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting || !session.accessToken}
                  style={{ width: "100%" }}
                >
                  {isSubmitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
            {error ? (
              <div className="alert alert-error" style={{ marginTop: "12px" }}>
                {error}
              </div>
            ) : null}
          </div>
        </section>

        {/* Request list */}
        <section className="panel">
          <div className="panel-header">
            <h2>Exception Requests</h2>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void loadRequests()}
              disabled={isLoading}
            >
              {isLoading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              {session.accessToken
                ? "No requests found. Submit one using the form."
                : "Sign in to view requests."}
            </div>
          ) : (
            <div className="request-list">
              {items.map((item) => (
                <article key={item.id} className="request-card">
                  <div className="request-card-top">
                    <span className="request-card-title">{item.title}</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                      <span className={`risk-badge ${riskClass(item.riskScore)}`}>
                        {item.riskScore}
                      </span>
                      <span className={`status status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="request-card-desc">{item.description}</p>

                  <div className="request-card-meta">
                    <span className="meta-item">
                      <span>👤</span> {item.requesterEmail}
                    </span>
                    <span className="meta-item">
                      <span>🖥</span> {item.systemName}
                    </span>
                    <span className="meta-item">
                      <span>🏷</span> {item.dataClassification}
                    </span>
                    <span className="meta-item">
                      <span>🕐</span>{" "}
                      {new Date(item.createdUtc).toLocaleDateString()}
                    </span>
                  </div>

                  {item.status.toLowerCase() === "pending" && (
                    <div className="decision-panel">
                      <span className="decision-panel-label">Decision</span>
                      {session.role === "Approver" ? (
                        <div className="decision-row">
                          <input
                            type="text"
                            value={decisionComments[item.id] ?? ""}
                            placeholder="Add a comment (optional)"
                            onChange={(event) =>
                              setDecisionComments((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => void applyDecision(item, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => void applyDecision(item, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <p className="muted">
                          Switch to Approver role to make a decision.
                        </p>
                      )}
                    </div>
                  )}

                  {item.events.length > 0 && (
                    <div className="timeline">
                      <p className="timeline-title">Audit Trail</p>
                      <div className="timeline-items">
                        {item.events.map((eventItem) => (
                          <div key={eventItem.id} className="timeline-item">
                            <span className="timeline-event">{eventItem.eventType}</span>
                            <span className="timeline-meta">
                              {new Date(eventItem.createdUtc).toLocaleString()} · {eventItem.actorEmail}
                            </span>
                            {eventItem.fromStatus && (
                              <span className="timeline-comment">
                                {eventItem.fromStatus} → {eventItem.toStatus}
                                {eventItem.comment ? ` · ${eventItem.comment}` : ""}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
