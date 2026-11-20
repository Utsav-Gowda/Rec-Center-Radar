import React, { useEffect, useRef, useState } from 'react';
import { apiUrl, publicAssetUrl } from '../../../api.js';

// US2: show a selected machine outlined on its floor's plan.
// Positions are fractions of the floor-plan image (0 to 1), so outlines scale with the map.
const ZOOM_LEVELS = [1, 2, 3];

const floorLabel = (floor) => floor.name || `Floor ${floor.floorNumber}`;
const inUnitRange = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
const hasPosition = (item) => ['x', 'y'].every((axis) => inUnitRange(item.mapPosition?.[axis]));
const hasFootprint = (item) => ['width', 'height'].every((side) => inUnitRange(item.mapSize?.[side]) && item.mapSize[side] > 0);
const percent = (value) => `${value * 100}%`;

function Callout({ item }) {
  const { x, y } = item.mapPosition;
  const halfHeight = hasFootprint(item) ? item.mapSize.height / 2 : 0.03;
  const below = y - halfHeight < 0.15;
  // Anchor the label toward the middle of the map so it never hangs past either edge.
  const align = x < 0.3 ? 'start' : x > 0.7 ? 'end' : 'center';
  return (
    <div className={`map-callout map-callout-${below ? 'below' : 'above'} map-callout-${align}`} aria-hidden="true"
      style={{ left: percent(x), top: percent(below ? y + halfHeight : y - halfHeight) }}>
      {item.name}
    </div>
  );
}

function FloorCanvas({ floor, items, selectedId, onSelect, zoom }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [ratio, setRatio] = useState(1.6);
  const scrollRef = useRef(null);
  const showImage = floor.floorPlanUrl && !imageFailed;
  const selected = items.find((item) => item._id === selectedId);

  // When zoomed in, scroll so the selected machine sits in the middle of the view.
  useEffect(() => {
    const view = scrollRef.current;
    if (!view || !selected) return;
    view.scrollLeft = Math.max(0, selected.mapPosition.x * view.scrollWidth - view.clientWidth / 2);
  }, [selected, zoom, ratio]);

  return (
    <>
      {!showImage ? <p className="map-note">No floor plan image is available. This coordinate preview shows stored positions, not the actual floor layout.</p> : null}
      <div className="map-scroll" ref={scrollRef}>
        <div className={`floor-map${selected ? ' has-selection' : ''}`} style={{ aspectRatio: ratio, width: percent(zoom) }}
          aria-label={`Equipment positions on ${floorLabel(floor)}`}>
          {showImage ? <img src={publicAssetUrl(floor.floorPlanUrl)} alt={`Floor plan for ${floorLabel(floor)}`}
            onError={() => setImageFailed(true)} onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
            }} /> : null}
          {items.map((item, index) => {
            const outlined = hasFootprint(item);
            const position = { left: percent(item.mapPosition.x), top: percent(item.mapPosition.y) };
            const size = outlined ? { width: percent(item.mapSize.width), height: percent(item.mapSize.height) } : {};
            return (
              <button key={item._id} type="button" className={outlined ? 'map-machine' : 'map-marker'}
                style={{ ...position, ...size }}
                aria-label={`${item.name}, ${item.room?.name || 'room not assigned'}`} aria-pressed={selectedId === item._id}
                onClick={() => onSelect(item._id)}>
                {outlined ? <span className="map-machine-label">{item.mapLabel || item.name}</span> : index + 1}
              </button>
            );
          })}
          {selected ? <Callout item={selected} /> : null}
        </div>
      </div>
    </>
  );
}

export default function FloorMap({ refreshKey = 0, focusEquipment = null }) {
  const [catalog, setCatalog] = useState({ floors: [], equipment: [] });
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [floorId, setFloorId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [zoom, setZoom] = useState(1);
  const sectionRef = useRef(null);

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
        setState('ready');
      })
      .catch((error) => { if (active && error.name !== 'AbortError') setState('error'); });
    return () => { active = false; controller.abort(); };
  }, [refreshKey, attempt]);

  // Selecting a search result (or saving a new machine) opens that machine's floor and outlines it.
  useEffect(() => {
    if (!focusEquipment?._id) return;
    if (focusEquipment.floor?._id) setFloorId(focusEquipment.floor._id);
    setSelectedId(focusEquipment._id);
    if (focusEquipment.scrollToMap) sectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [focusEquipment]);

  const floor = catalog.floors.find((item) => item._id === floorId) || catalog.floors[0];
  const items = catalog.equipment.filter((item) => item.floor?._id === floor?._id && hasPosition(item));
  const selected = items.find((item) => item._id === selectedId);
  const unplaced = !selected && selectedId ? catalog.equipment.find((item) => item._id === selectedId) : null;
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);

  return (
    <section className="map-panel" aria-labelledby="floor-map-heading" ref={sectionRef}>
      <h2 id="floor-map-heading">Floor map</h2>
      <p>Choose <strong>Show on map</strong> on a search result, or pick a floor and select a machine, to see exactly where it is.</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)} disabled={state === 'loading'}>Refresh map</button>
      {state === 'loading' ? <p role="status">Loading equipment map…</p> : null}
      {state === 'error' ? <p role="alert">Could not load the map. Try Refresh map again.</p> : null}
      {state === 'ready' && !floor ? <p>No floors are configured yet.</p> : null}
      {state === 'ready' && floor ? (
        <>
          <label htmlFor="map-floor">Map floor</label>
          <select id="map-floor" value={floor._id} onChange={(event) => { setFloorId(event.target.value); setSelectedId(''); }}>
            {catalog.floors.map((item) => <option key={item._id} value={item._id}>{floorLabel(item)}</option>)}
          </select>
          {selected ? (
            <p role="status" className="map-selection">
              <strong>{selected.name}</strong> · {selected.category} · {floorLabel(floor)} · {selected.room?.name || 'Room not assigned'}
              {selected.status ? ` · ${selected.status}` : ''}
            </p>
          ) : null}
          {unplaced ? <p role="status" className="map-selection">{unplaced.name} does not have a saved map position yet.</p> : null}
          {items.length === 0 ? <p>No equipment with a saved position on this floor.</p> : null}
          <div className="map-zoom" role="group" aria-label="Map zoom">
            <button type="button" onClick={() => setZoom(ZOOM_LEVELS[zoomIndex - 1])} disabled={zoomIndex === 0}>Zoom out</button>
            <span>{zoom * 100}%</span>
            <button type="button" onClick={() => setZoom(ZOOM_LEVELS[zoomIndex + 1])} disabled={zoomIndex === ZOOM_LEVELS.length - 1}>Zoom in</button>
          </div>
          <FloorCanvas key={`${floor._id}:${floor.floorPlanUrl}`} floor={floor} items={items} selectedId={selectedId} onSelect={setSelectedId} zoom={zoom} />
          {items.length > 0 ? (
            <details className="map-legend-details">
              <summary>All equipment on this floor ({items.length})</summary>
              <ol className="map-legend" aria-label="Map equipment">
                {items.map((item) => <li key={item._id}><button type="button" aria-pressed={selectedId === item._id} onClick={() => setSelectedId(item._id)}>{item.name}</button></li>)}
              </ol>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
