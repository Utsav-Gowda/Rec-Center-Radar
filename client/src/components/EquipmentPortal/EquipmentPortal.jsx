import React, { useEffect, useState } from 'react';
import EquipmentList from './EquipmentList.jsx';

// Equipment Portal: server status line + the equipment list.
export default function EquipmentPortal() {
  const [health, setHealth] = useState('checking...');

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((h) => setHealth(`server ${h.server}, database ${h.database}`))
      .catch(() => setHealth('server unreachable'));
  }, []);

  return (
    <section>
      <p className="status-line"><strong>Status:</strong> {health}</p>
      <EquipmentList />
    </section>
  );
}
