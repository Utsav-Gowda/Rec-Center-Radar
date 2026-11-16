import React, { useEffect, useState } from 'react';
import { apiUrl, publicAssetUrl } from '../../../api.js';

function FloorCanvas({ floor, items, selectedId, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [ratio, setRatio] = useState(1.6);
  const showImage = floor.floorPlanUrl && !imageFailed;
  return (
    <>
      {!showImage ? <p className="map-note">No floor plan image is available. This coordinate preview shows stored positions, not the actual floor layout.</p> : null}
      <div className="map-padding">
        <div className="floor-map" style={{ aspectRatio: ratio }} aria-label={`Equipment positions on ${floor.name || `Floor ${floor.floorNumber}`}`}>
          {showImage ? <img src={publicAssetUrl(floor.floorPlanUrl)} alt={`Floor plan for ${floor.name || `Floor ${floor.floorNumber}`}`}
            onError={() => setImageFailed(true)} onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
            }} /> : null}
          {items.map((item, index) => <button key={item._id} type="button" className="map-marker"
            style={{ left: `${item.mapPosition.x * 100}%`, top: `${item.mapPosition.y * 100}%` }}
            aria-label={`${item.name}, ${item.room?.name || 'room not assigned'}`} aria-pressed={selectedId === item._id}
            onClick={() => onSelect(item._id)}>{index + 1}</button>)}
        </div>
      </div>
    </>
  );
}

// Minimal US7 placement verification. US2 owns the full map/navigation experience.
export default function FloorMap({ refreshKey = 0, focusEquipment = null }) {
  const [catalog, setCatalog] = useState({ floors: [], equipment: [] });
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [floorId, setFloorId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const focusId = focusEquipment?._id;
  const focusFloorId = focusEquipment?.floor?._id;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState('loading');
    async function read(url) {
      const response = await fetch(apiUrl(url), { signal: controller.signal });
      if (!response.ok) throw new Error('Could not load map.');
      const payload = await response.json();
      if (!Array.isArray(payload.data)) throw new Error('Invalid map response.');
      return payload.data;
    }
    Promise.all([read('/api/floors'), read('/api/equipment')])
      .then(([floors, equipment]) => {
        if (!active) return;
        setCatalog({ floors, equipment });
        if (focusFloorId) setFloorId(focusFloorId);
        if (focusId) setSelectedId(focusId);
        setState('ready');
      })
      .catch((error) => { if (active && error.name !== 'AbortError') setState('error'); });
    return () => { active = false; controller.abort(); };
  }, [refreshKey, attempt, focusId, focusFloorId]);

  const floor = catalog.floors.find((item) => item._id === floorId) || catalog.floors[0];
  const items = catalog.equipment.filter((item) => item.floor?._id === floor?._id &&
    ['x', 'y'].every((axis) => Number.isFinite(item.mapPosition?.[axis]) && item.mapPosition[axis] >= 0 && item.mapPosition[axis] <= 1));
  const selected = items.find((item) => item._id === selectedId);

  return (
    <section className="map-panel" aria-labelledby="floor-map-heading">
      <h2 id="floor-map-heading">Equipment map preview</h2>
      <p>Choose a floor and select a numbered marker to see its equipment and room.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} disabled={state === 'loading'}>Refresh map</button>
      {state === 'loading' ? <p role="status">Loading equipment map…</p> : null}
      {state === 'error' ? <p role="alert">Could not load the map. Try Refresh map again.</p> : null}
      {state === 'ready' && !floor ? <p>No floors are configured yet.</p> : null}
      {state === 'ready' && floor ? (
        <>
          <label htmlFor="map-floor">Map floor</label>
          <select id="map-floor" value={floor._id} onChange={(event) => { setFloorId(event.target.value); setSelectedId(''); }}>
            {catalog.floors.map((item) => <option key={item._id} value={item._id}>{item.name || `Floor ${item.floorNumber}`}</option>)}
          </select>
          {items.length === 0 ? <p>No equipment with a saved position on this floor.</p> : null}
          <FloorCanvas key={`${floor._id}:${floor.floorPlanUrl}`} floor={floor} items={items} selectedId={selectedId} onSelect={setSelectedId} />
          <ol className="map-legend" aria-label="Map equipment">
            {items.map((item) => <li key={item._id}><button type="button" aria-pressed={selectedId === item._id} onClick={() => setSelectedId(item._id)}>{item.name}</button></li>)}
          </ol>
          {selected ? <p role="status"><strong>{selected.name}</strong> · {selected.category} · {floor.name || `Floor ${floor.floorNumber}`} · {selected.room?.name || 'Room not assigned'}</p> : null}
        </>
      ) : null}
    </section>
  );
}
