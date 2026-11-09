import React from 'react';
import EquipmentPortal from './components/EquipmentPortal/EquipmentPortal.jsx';

export default function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>Rec-Center Radar</h1>
      <EquipmentPortal />
    </main>
  );
}
