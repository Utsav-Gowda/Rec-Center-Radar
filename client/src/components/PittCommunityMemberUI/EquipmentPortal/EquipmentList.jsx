import React, { useEffect, useMemo, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { apiUrl } from '../../../api.js';

const STATUS_OPTIONS = ['Operational', 'Under Maintenance', 'Out of Order'];
const NO_FILTERS = { floor: '', room: '', category: '', status: '' };

function floorLabel(floor) {
  return floor?.name || (floor?.floorNumber != null ? `Floor ${floor.floorNumber}` : 'Not assigned');
}

// One place builds the request URL so the search fetch and the background poll
// always send the same search term and filters.
function buildUrl(searchTerm, filters) {
  const parts = [];
  if (searchTerm) parts.push(`q=${encodeURIComponent(searchTerm)}`);
  for (const key of ['floor', 'room', 'category', 'status']) {
    if (filters[key]) parts.push(`${key}=${encodeURIComponent(filters[key])}`);
  }
  return parts.length ? `/api/equipment?${parts.join('&')}` : '/api/equipment';
}

// Uses the local Vite proxy or the public API origin supplied to a hosted build.
// onShowOnMap (optional, US2) opens the selected machine on its floor map.
export default function EquipmentList({ refreshKey = 0, onShowOnMap = null }) {
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState(NO_FILTERS);
  // Every machine seen so far, keyed by id. Filter choices come from this set, so
  // applying a filter never makes the other choices disappear.
  const [known, setKnown] = useState({});
  const [result, setResult] = useState({ key: null, items: [], error: false });
  const searchTerm = query.trim();
  const url = buildUrl(searchTerm, filters);
  const loading = result.key !== url;
  const { items, error } = result;
  const activeFilters = Object.values(filters).some(Boolean);

  const options = useMemo(() => {
    const floors = new Map();
    const rooms = new Map();
    const categories = new Set();
    for (const e of Object.values(known)) {
      if (e.floor?._id) floors.set(e.floor._id, { ...e.floor, label: floorLabel(e.floor) });
      if (e.floor?._id && e.room?._id && e.room.name) {
        rooms.set(e.room._id, { id: e.room._id, name: e.room.name, floorId: e.floor._id });
      }
      if (e.category) categories.add(e.category);
    }
    return {
      floors: [...floors.values()].sort((a, b) => (a.floorNumber ?? 0) - (b.floorNumber ?? 0)),
      rooms: [...rooms.values()].sort((a, b) => a.name.localeCompare(b.name)),
      categories: [...categories].sort(),
    };
  }, [known]);
  const visibleRooms = filters.floor ? options.rooms.filter((r) => r.floorId === filters.floor) : options.rooms;

  function remember(list) {
    setKnown((prev) => {
      const next = { ...prev };
      for (const e of list) next[e._id] = e;
      return next;
    });
  }

  function setFilter(name, value) {
    // A room belongs to one floor, so changing the floor drops the room filter.
    setFilters((prev) => ({ ...prev, [name]: value, ...(name === 'floor' ? { room: '' } : {}) }));
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Keep typing responsive while avoiding a request for every keystroke.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(apiUrl(url), { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.data)) throw new Error('Invalid equipment response');
        if (active) {
          remember(payload.data);
          setResult({ key: url, items: payload.data, error: false });
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') {
          setResult({ key: url, items: [], error: true });
        }
      }
    }, searchTerm ? 200 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, searchTerm, attempt, refreshKey]);
  
  // Propagate staff status updates to connected clients within 5 seconds.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (document.hidden) return;
      try {
        const response = await fetch(apiUrl(url));
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload.data)) {
          remember(payload.data);
          setResult((prev) => (prev.key === url ? { key: url, items: payload.data, error: false } : prev));
        }
      } catch {
        // Keep current visible list on transient background poll failure.
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [url]);

  function retry() {
    setResult({ key: null, items: [], error: false });
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

      <fieldset className="equipment-filters">
        <legend>Filter equipment</legend>
        <label htmlFor="filter-floor">Floor</label>
        <select id="filter-floor" value={filters.floor} onChange={(e) => setFilter('floor', e.target.value)}>
          <option value="">All floors</option>
          {options.floors.map((f) => <option key={f._id} value={f._id}>{f.label}</option>)}
        </select>
        <label htmlFor="filter-room">Room</label>
        <select id="filter-room" value={filters.room} onChange={(e) => setFilter('room', e.target.value)}>
          <option value="">All rooms</option>
          {visibleRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <label htmlFor="filter-category">Category</label>
        <select id="filter-category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
          <option value="">All categories</option>
          {options.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label htmlFor="filter-status">Operational condition</label>
        <select id="filter-status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Any condition</option>
          {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
      </fieldset>

      {activeFilters ? (
        <ul className="active-filters" aria-label="Active filters">
          {[
            ['floor', 'Floor', options.floors.find((f) => f._id === filters.floor)?.label],
            ['room', 'Room', options.rooms.find((r) => r.id === filters.room)?.name],
            ['category', 'Category', filters.category],
            ['status', 'Condition', filters.status],
          ].filter(([name]) => filters[name]).map(([name, label, text]) => (
            <li key={name}>
              <button type="button" className="filter-chip" aria-label={`Remove filter ${label}: ${text}`}
                onClick={() => setFilter(name, '')}>{label}: {text} ×</button>
            </li>
          ))}
          <li><button type="button" onClick={() => setFilters(NO_FILTERS)}>Clear All</button></li>
        </ul>
      ) : null}

      <p className="status-disclaimer">
        <strong>Note:</strong> Equipment status reflects mechanical working order verified by gym staff, not real-time availability or occupancy.
      </p>

      <p role="status" aria-live="polite" aria-atomic="true" className="search-summary">
        {loading ? 'Searching equipment…' : error ? '' : items.length === 0
          ? searchTerm
            ? `No equipment matches “${searchTerm}”. Check your spelling or try different search terms.`
            : activeFilters
              ? 'No equipment matches the selected filters. Remove a filter or choose Clear All.'
              : 'No equipment available yet.'
          : `${items.length} equipment ${items.length === 1 ? 'item' : 'items'}${searchTerm ? ` matching “${searchTerm}”` : ''}${activeFilters ? ' with the selected filters' : ''}.`}
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
                <p className="meta"><strong>Floor:</strong> {floorLabel(e.floor)}</p>
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