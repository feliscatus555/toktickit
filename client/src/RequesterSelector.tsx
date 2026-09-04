import { useState, useEffect } from "react";
import { fetchActiveRequesters, RequesterUser } from "./api.js";

interface RequesterSelectorProps {
  onSelectRequester: (requester: RequesterUser) => void;
  onClose?: () => void;
  currentRequesterId?: number;
}

export default function RequesterSelector({
  onSelectRequester,
  onClose,
  currentRequesterId,
}: RequesterSelectorProps) {
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">(currentRequesterId ?? "");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequesters();
  }, []);

  async function loadRequesters() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveRequesters();
      setRequesters(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load active requesters");
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const found = requesters.find((r) => r.id === Number(selectedId));
    if (found) {
      onSelectRequester(found);
      if (onClose) onClose();
    }
  }

  return (
    <div className="card shadow-sm border-0" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="card-header text-white" style={{ backgroundColor: "#006B3C" }}>
        <h4 className="card-title h5 mb-0 py-1">Development Requester Selection</h4>
      </div>

      <div className="card-body p-4" style={{ backgroundColor: "#F5F7F6" }}>
        <div className="alert alert-warning border-warning" role="alert">
          <h6 className="alert-heading fw-bold mb-1">Testing Context Disclaimer</h6>
          <p className="mb-0 small">
            Select a Development Requester to test requester-specific ticket behavior. This is not
            a login screen. Authentication and role-based access will be introduced in Lab 3.
          </p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading active requesters…</span>
            </div>
            <p className="mt-2 text-muted mb-0">Loading active Development Requesters…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            <p className="mb-2">{error}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={loadRequesters}>
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !error && requesters.length === 0 && (
          <div className="alert alert-secondary mt-3" role="alert">
            No active Development Requesters exist in the database.
          </div>
        )}

        {!loading && !error && requesters.length > 0 && (
          <form onSubmit={handleFormSubmit} className="mt-3">
            <div className="mb-3">
              <label htmlFor="requester-select" className="form-label fw-semibold">
                Select Active Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                required
              >
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              {onClose && (
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn text-white px-4 fw-semibold"
                style={{ backgroundColor: "#006B3C" }}
                disabled={!selectedId}
              >
                Continue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
