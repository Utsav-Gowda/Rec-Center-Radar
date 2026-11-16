import React, { useEffect, useState } from 'react';
import EquipmentList from './EquipmentList.jsx';
import { apiUrl } from '../../../api.js';

// Equipment Portal: server status line + the equipment list.
export default function EquipmentPortal({ refreshKey = 0 }) {
  const [health, setHealth] = useState('checking...');

  useEffect(() => {
    fetch(apiUrl('/api/health')).then((r) => r.json()).then((h) => setHealth(`server ${h.status}, database ${h.database}`))
      .catch(() => setHealth('server unreachable'));
  }, []);

  return (
    <section>
      <p className="status-line"><strong>Status:</strong> {health}</p>
      <EquipmentList refreshKey={refreshKey} />
    </section>
  );
}
