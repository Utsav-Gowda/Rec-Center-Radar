import React, { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { apiUrl } from '../../../api.js';

// Uses the local Vite proxy or the public API origin supplied to a hosted build.
// onShowOnMap (optional, US2) opens the selected machine on its floor map.
export default function EquipmentList({ refreshKey = 0, onShowOnMap = null }) {
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ query: null, items: [], error: false });
  const searchTerm = query.trim();
  const loading = result.query !== searchTerm;
  const { items, error } = result;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Keep typing responsive while avoiding a request for every keystroke.
    const timer = setTimeout(async () => {
      try {
        const url = searchTerm ? `/api/equipment?q=${encodeURIComponent(searchTerm)}` : '/api/equipment';
        const response = await fetch(apiUrl(url), { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.data)) throw new Error('Invalid equipment response');
        if (active) setResult({ query: searchTerm, items: payload.data, error: false });
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          setResult({ query: searchTerm, items: [], error: true });
        }
      }
    }, searchTerm ? 200 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, attempt, refreshKey]);
  
  // Propagate staff status updates to connected clients within 5 seconds.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (document.hidden) return;
      try {
        const url = searchTerm ? `/api/equipment?q=${encodeURIComponent(searchTerm)}` : '/api/equipment';
        const response = await fetch(apiUrl(url));
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload.data)) {
          setResult((prev) => (prev.query === searchTerm ? { query: searchTerm, items: payload.data, error: false } : prev));
        }
      } catch {
        // Keep current visible list on transient background poll failure.
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [searchTerm]);

  function retry() {
    setResult({ query: null, items: [], error: false });
    setAttempt((value) => value + 1);
  }

  return (
    <section aria-labelledby="equipment-search-heading">
      <h2 id="equipment-search-heading">Find equipment</h2>
      <form role="search" className="equipment-search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="equipment-query">Search equipment</label>
        <p id="equipment-search-help">Search by name, workout type, or muscle group. Try Squat Rack, Strength Training, or Biceps.</p>
        <div className="search-controls">
          <input
            id="equipment-query"
            type="search"
            placeholder="Name, workout type, or muscle group"
            aria-describedby="equipment-search-help"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" onClick={() => setQuery('')} disabled={!query}>Clear search</button>
          <button type="button" onClick={retry} disabled={loading}>Refresh equipment</button>
        </div>
      </form>

      <p className="status-disclaimer">
        <strong>Note:</strong> Equipment status reflects mechanical working order verified by gym staff, not real-time availability or occupancy.
      </p>

      <p role="status" aria-live="polite" aria-atomic="true" className="search-summary">
        {loading ? 'Searching equipment…' : error ? '' : items.length === 0
          ? searchTerm
            ? `No equipment matches “${searchTerm}”. Check your spelling or try different search terms.`
            : 'No equipment available yet.'
          : `${items.length} equipment ${items.length === 1 ? 'item' : 'items'}${searchTerm ? ` matching “${searchTerm}”` : ''}.`}
      </p>
      {!loading && error ? (
        <p role="alert" className="message">
          Could not load equipment. Please try again.{' '}
          <button type="button" onClick={retry}>Retry search</button>
        </p>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <ul className="equipment-grid" aria-label="Equipment results">
          {items.map((e) => {
            const showVerification = e.status === 'Under Maintenance' || e.status === 'Out of Order';
            const verifiedTime = e.lastVerifiedAt && !Number.isNaN(Date.parse(e.lastVerifiedAt))
              ? new Date(e.lastVerifiedAt).toLocaleString()
              : null;

            return (
              <li key={e._id} className="equipment-card">
                <h3>{e.name}</h3>
                <p className="meta">{e.category}{e.workoutType ? ` · ${e.workoutType}` : ''}</p>
                <p className="meta"><strong>Floor:</strong> {e.floor?.name || (e.floor?.floorNumber != null ? `Floor ${e.floor.floorNumber}` : 'Not assigned')}</p>
                <StatusBadge status={e.status} />
                {showVerification ? (
                  <div className="status-details">
                    <p className="meta">
                      <strong>Last verified by staff:</strong>{' '}
                      {verifiedTime || 'Verification time unavailable'}
                    </p>
                    {e.statusNote ? (
                      <p className="meta"><strong>Staff note:</strong> {e.statusNote}</p>
                    ) : null}
                  </div>
                ) : null}
                {onShowOnMap && e.floor?._id ? (
                  <button type="button" className="map-link" aria-label={`Show ${e.name} on floor map`}
                    onClick={() => onShowOnMap(e)}>Show on map</button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}