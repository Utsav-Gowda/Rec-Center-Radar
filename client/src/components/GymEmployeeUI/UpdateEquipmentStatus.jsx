import React, { useEffect, useState } from 'react';
import { apiUrl } from '../../api.js';

const STATUS_OPTIONS = ['Operational', 'Under Maintenance', 'Out of Order'];

export default function UpdateEquipmentStatus({ refreshKey = 0, onUpdated }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('Operational');
  const [statusNote, setStatusNote] = useState('');
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/api/equipment'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const list = Array.isArray(payload.data) ? payload.data : [];
        if (controller.signal.aborted) return;
        setItems(list);
        setLoadError('');
        if (list.length > 0) {
          const current = list.find((entry) => entry._id === selectedId) || list[0];
          setSelectedId(current._id);
          setStatus(current.status || 'Operational');
          setStatusNote(current.statusNote || '');
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError('Could not load equipment list.');
      });
    return () => controller.abort();
  }, [refreshKey]);

  function handleMachineChange(event) {
    const nextId = event.target.value;
    setSelectedId(nextId);
    setSubmitError('');
    setFieldErrors({});
    setSuccessMessage('');
    const chosen = items.find((entry) => entry._id === nextId);
    if (chosen) {
      setStatus(chosen.status || 'Operational');
      setStatusNote(chosen.statusNote || '');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedId || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    setFieldErrors({});
    setSuccessMessage('');

    try {
      const response = await fetch(apiUrl(`/api/equipment/${selectedId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-role': 'employee',
        },
        body: JSON.stringify({ status, statusNote }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(payload.error || 'Could not update equipment status.');
        setFieldErrors(payload.errors || {});
        return;
      }

      const updated = payload.data;
      setItems((prev) => prev.map((entry) => (entry._id === updated._id ? updated : entry)));
      setStatus(updated.status);
      setStatusNote(updated.statusNote || '');
      setSuccessMessage(`Updated ${updated.name} to ${updated.status}.`);
      if (onUpdated) onUpdated(updated);
    } catch {
      setSubmitError('Could not reach server to update status.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="employee-panel" aria-labelledby="update-status-heading">
      <h2 id="update-status-heading">Update equipment mechanical condition</h2>
      {loadError ? <p role="alert" className="field-error">{loadError}</p> : null}
      <form className="registration-form" onSubmit={handleSubmit} noValidate>
        <fieldset disabled={submitting || items.length === 0}>
          <legend>Record inspection status and optional maintenance notes</legend>

          <label htmlFor="status-equipment-select">Equipment</label>
          <select
            id="status-equipment-select"
            value={selectedId}
            onChange={handleMachineChange}
          >
            {items.length === 0 ? (
              <option value="">No equipment available</option>
            ) : (
              items.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} ({item.status})
                </option>
              ))
            )}
          </select>

          <label htmlFor="equipment-status-select">Mechanical condition</label>
          <select
            id="equipment-status-select"
            value={status}
            aria-invalid={fieldErrors.status ? 'true' : undefined}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {fieldErrors.status ? <p role="alert" className="field-error">{fieldErrors.status}</p> : null}

          <label htmlFor="equipment-status-note">Maintenance note (optional)</label>
          <input
            id="equipment-status-note"
            type="text"
            maxLength={500}
            placeholder="e.g., Left cable frayed; replacement part ordered."
            aria-invalid={fieldErrors.statusNote ? 'true' : undefined}
            value={statusNote}
            onChange={(event) => setStatusNote(event.target.value)}
          />
          {fieldErrors.statusNote ? <p role="alert" className="field-error">{fieldErrors.statusNote}</p> : null}

          {submitError ? <p role="alert" className="field-error">{submitError}</p> : null}
          {successMessage ? <p role="status" className="success-message">{successMessage}</p> : null}

          <button type="submit">
            {submitting ? 'Updating status…' : 'Update equipment status'}
          </button>
        </fieldset>
      </form>
    </section>
  );
}