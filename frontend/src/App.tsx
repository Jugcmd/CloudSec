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

  return (
    <main className="page">
      <section className="auth-bar">
        <label>
          Acting User
          <input
            type="email"
            value={session.email}
            onChange={(event) =>
              setSession((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Role
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
        </label>

        <div className="auth-actions">
          <button type="button" onClick={() => void authenticate()}>
            Sign In (Get JWT)
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setSession((current) => ({
                ...current,
                accessToken: "",
                expiresUtc: "",
              }))
            }
          >
            Sign Out
          </button>
          <p className="muted auth-status">
            {session.accessToken
              ? `Authenticated as ${session.role}. Token expires ${new Date(session.expiresUtc).toLocaleString()}.`
              : "Not authenticated. Sign in to call protected APIs."}
          </p>
        </div>
      </section>

      <header className="hero">
        <div>
          <p className="eyebrow">CloudSec Pilot</p>
          <h1>Security Exception Request Portal</h1>
          <p className="lede">
            Submit and track exception requests with a simple risk-scoring model
            to support review workflows.
          </p>
        </div>
        <div className="stats">
          <article>
            <span>Total</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </article>
          <article>
            <span>Avg Risk</span>
            <strong>{stats.avgRisk}</strong>
          </article>
          <article>
            <span>High Risk</span>
            <strong>{stats.highRisk}</strong>
          </article>
          <article>
            <span>Decisions 7d</span>
            <strong>{stats.decisionEvents}</strong>
          </article>
          <article>
            <span>Approval Rate</span>
            <strong>{stats.approvalRate}%</strong>
          </article>
        </div>
      </header>

      <section className="content-grid">
        <section className="panel">
          <h2>New Exception Request</h2>
          <form onSubmit={onSubmit} className="form-grid">
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                required
              />
            </label>
            <label>
              System Name
              <input
                value={form.systemName}
                onChange={(event) =>
                  setForm({ ...form, systemName: event.target.value })
                }
                required
              />
            </label>
            <label>
              Data Classification
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
            </label>
            <label className="full-width">
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                required
              />
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="list-header">
            <h2>Current Requests</h2>
            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="request-list">
            {items.length === 0 ? <p>No requests yet.</p> : null}
            {items.map((item) => (
              <article key={item.id} className="request-card">
                <div className="request-card-top">
                  <h3>{item.title}</h3>
                  <span
                    className={`status status-${item.status.toLowerCase()}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p>{item.description}</p>
                <ul>
                  <li>Email: {item.requesterEmail}</li>
                  <li>System: {item.systemName}</li>
                  <li>Classification: {item.dataClassification}</li>
                  <li>Risk score: {item.riskScore}</li>
                </ul>

                {item.status.toLowerCase() === "pending" ? (
                  <div className="decision-actions">
                    {session.role === "Approver" ? (
                      <>
                        <input
                          type="text"
                          value={decisionComments[item.id] ?? ""}
                          placeholder="Approver comment"
                          onChange={(event) =>
                            setDecisionComments((current) => ({
                              ...current,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => void applyDecision(item, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void applyDecision(item, "reject")}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <p className="muted">
                        Switch role to Approver to make a decision.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="timeline">
                  <h4>Timeline</h4>
                  {item.events.length === 0 ? <p>No events recorded.</p> : null}
                  {item.events.map((eventItem) => (
                    <div key={eventItem.id} className="timeline-item">
                      <strong>{eventItem.eventType}</strong>
                      <span>
                        {new Date(eventItem.createdUtc).toLocaleString()} by{" "}
                        {eventItem.actorEmail}
                      </span>
                      <p>
                        {eventItem.fromStatus || "-"} to {eventItem.toStatus}
                        {eventItem.comment ? ` - ${eventItem.comment}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
