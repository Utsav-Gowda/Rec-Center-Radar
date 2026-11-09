import React, { useEffect, useState } from 'react';

// Skeleton: shows server/database status and lists equipment from the API.
export default function EquipmentPortal() {
  const [health, setHealth] = useState('checking...');
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((h) => setHealth(`server ${h.server}, database ${h.database}`))
      .catch(() => setHealth('server unreachable'));
    fetch('/api/equipment').then((r) => r.json()).then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <section>
      <p><strong>Status:</strong> {health}</p>
      <h2>Equipment</h2>
      {items.length === 0 ? <p>No equipment found (the server's /api/equipment route may not exist yet).</p> : (
        <ul>{items.map((e) => <li key={e._id}>{e.name} ({e.category}) — {e.status}</li>)}</ul>
      )}
    </section>
  );
}
