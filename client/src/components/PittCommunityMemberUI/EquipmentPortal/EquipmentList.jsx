import React, { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

// Fetches equipment from the server. The Vite dev proxy (vite.config.js) forwards
// /api to http://localhost:5000, so no CORS setup is needed in development.
export default function EquipmentList() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    fetch('/api/equipment')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!cancelled) { setItems(Array.isArray(data) ? data : []); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  if (state === 'loading') return <p className="message">Loading equipment...</p>;
  if (state === 'error') return <p className="message">Could not load equipment. Is the server running and does <code>/api/equipment</code> exist?</p>;
  if (items.length === 0) return <p className="message">No equipment found.</p>;

  return (
    <ul className="equipment-grid">
      {items.map((e) => (
        <li key={e._id} className="equipment-card">
          <h3>{e.name}</h3>
          <p className="meta">{e.category}{e.workoutType ? ` · ${e.workoutType}` : ''}</p>
          <StatusBadge status={e.status} />
        </li>
      ))}
    </ul>
  );
}
