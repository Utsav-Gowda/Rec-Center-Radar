import React, { useEffect, useState } from 'react';
import EquipmentPortal from './components/PittCommunityMemberUI/EquipmentPortal/EquipmentPortal.jsx';
import RegisterEquipment from './components/GymEmployeeUI/RegisterEquipment.jsx';
import FloorMap from './components/PittCommunityMemberUI/EquipmentPortal/FloorMap.jsx';
import { apiUrl } from './api.js';

export default function App() {
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [employee, setEmployee] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [registeredEquipment, setRegisteredEquipment] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/api/auth/demo'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) setDemoEnabled(data.enabled === true);
      })
      .catch(() => {}); // A disabled/unreachable demo capability keeps the public view.
    return () => controller.abort();
  }, []);

  function registered(item) {
    setRegisteredEquipment(item);
    setRefreshKey((value) => value + 1);
  }

  return (
    <main className="container">
      <header className="site-header"><h1>Rec-Center Radar</h1></header>
      {demoEnabled ? <fieldset className="demo-role">
        <legend>Demo role</legend>
        <label><input type="checkbox" checked={employee} onChange={(event) => setEmployee(event.target.checked)} /> View as gym employee (demo)</label>
        <p>Current role: {employee ? 'Gym employee' : 'Pitt community member'}. This demo switch is not Pitt Passport sign-in.</p>
      </fieldset> : null}
      {demoEnabled && employee ? <RegisterEquipment onCreated={registered} /> : null}
      <EquipmentPortal refreshKey={refreshKey} />
      <FloorMap refreshKey={refreshKey} focusEquipment={registeredEquipment} />
    </main>
  );
}
