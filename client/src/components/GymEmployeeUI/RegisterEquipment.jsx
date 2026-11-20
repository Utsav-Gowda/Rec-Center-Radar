import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../../api.js';

const EMPTY_FORM = { name: '', category: '', workoutType: '', muscleGroups: '', floor: '', room: '', x: '', y: '' };

export default function RegisterEquipment({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [floors, setFloors] = useState([]);
  const [floorState, setFloorState] = useState('loading');
  const [floorAttempt, setFloorAttempt] = useState(0);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const request = useRef(null);
  const rooms = floors.find((floor) => floor._id === form.floor)?.rooms || [];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setFloorState('loading');
    fetch(apiUrl('/api/floors'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load floors.');
        const payload = await response.json();
        if (!Array.isArray(payload.data)) throw new Error('Invalid floor response.');
        if (active) { setFloors(payload.data); setFloorState('ready'); }
      })
      .catch((error) => { if (active && error.name !== 'AbortError') setFloorState('error'); });
    return () => { active = false; controller.abort(); };
  }, [floorAttempt]);

  useEffect(() => () => request.current?.abort(), []);

  function change(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value,
      ...(name === 'floor' ? { room: '', x: '', y: '' } : {}),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const nextErrors = {};
    for (const [field, label] of [['name', 'Equipment name'], ['category', 'Category'], ['workoutType', 'Workout type'], ['floor', 'Floor'], ['room', 'Assigned room']]) {
      if (!form[field].trim()) nextErrors[field] = `${label} is required.`;
    }
    if (['x', 'y'].some((axis) => form[axis] === '' || !Number.isFinite(Number(form[axis])) || Number(form[axis]) < 0 || Number(form[axis]) > 100)) {
      nextErrors.mapPosition = 'Assigned location needs X and Y positions between 0% and 100%.';
    }
    setErrors(nextErrors);
    setSaved(null);
    if (Object.keys(nextErrors).length) { setMessage('Check the highlighted fields.'); return; }
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(apiUrl('/api/equipment'), {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Demo-Role': 'employee' },
        body: JSON.stringify({
          name: form.name.trim(), category: form.category.trim(), workoutType: form.workoutType.trim(),
          muscleGroups: form.muscleGroups.split(',').map((group) => group.trim()).filter(Boolean),
          floor: form.floor, room: form.room,
          mapPosition: { x: Number(form.x) / 100, y: Number(form.y) / 100 },
        }),
      });
      const payload = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setErrors(payload.errors || {});
        setMessage(payload.error || 'Could not register equipment. Please try again.');
        return;
      }
      if (!payload.data?._id) throw new Error('Invalid registration response.');
      setSaved(payload.data);
      setForm(EMPTY_FORM);
      onCreated?.(payload.data);
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Could not register equipment. Check the connection and try again.');
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const invalid = (field) => errors[field] ? { 'aria-invalid': true, 'aria-describedby': `registration-${field}-error` } : {};
  const fieldError = (field) => errors[field] ? <p className="field-error" id={`registration-${field}-error`}>{errors[field]}</p> : null;

  return (
    <section className="employee-panel" aria-labelledby="register-heading">
      <h2 id="register-heading">Register equipment</h2>
      <p>Demo employee ID: <strong>demo-employee</strong></p>
      {floorState === 'loading' ? <p role="status">Loading floors…</p> : null}
      {floorState === 'error' ? <p role="alert">Could not load floors. <button onClick={() => setFloorAttempt((value) => value + 1)}>Retry floors</button></p> : null}
      {floorState === 'ready' && floors.length === 0 ? <p>No floors are configured yet. Add the demo floors before registering equipment.</p> : null}
      {message ? <p role="alert" className="message">{message}</p> : null}
      {saved ? <p role="status" className="success-message">Registered {saved.name} as {saved.registeredBy} at {new Date(saved.createdAt).toLocaleString()}. Search and the map have been refreshed.</p> : null}
      {floorState === 'ready' && floors.length > 0 ? (
        <form onSubmit={submit} noValidate className="registration-form">
          <fieldset disabled={saving}>
            <legend>Equipment details</legend>
            {[[ 'name', 'Equipment name', 120 ], [ 'category', 'Category', 80 ], [ 'workoutType', 'Workout type', 100 ]].map(([name, label, maxLength]) => (
              <div key={name}>
                <label htmlFor={`registration-${name}`}>{label} (required)</label>
                <input id={`registration-${name}`} name={name} required maxLength={maxLength} value={form[name]} onChange={change} {...invalid(name)} />
                {fieldError(name)}
              </div>
            ))}
            <div>
              <label htmlFor="registration-muscleGroups">Muscle groups (comma separated, optional)</label>
              <input id="registration-muscleGroups" name="muscleGroups" value={form.muscleGroups} onChange={change} {...invalid('muscleGroups')} />
              {fieldError('muscleGroups')}
            </div>
            <div>
              <label htmlFor="registration-floor">Floor (required)</label>
              <select id="registration-floor" name="floor" required value={form.floor} onChange={change} {...invalid('floor')}>
                <option value="">Select a floor</option>
                {floors.map((floor) => <option key={floor._id} value={floor._id}>{floor.name || `Floor ${floor.floorNumber}`}</option>)}
              </select>
              {fieldError('floor')}
            </div>
            <div>
              <label htmlFor="registration-room">Assigned room (required)</label>
              <select id="registration-room" name="room" required disabled={!form.floor} value={form.room} onChange={change} {...invalid('room')}>
                <option value="">Select a room</option>
                {rooms.map((room) => <option key={room._id} value={room._id}>{room.name}</option>)}
              </select>
              {fieldError('room')}
            </div>
            <p id="registration-position-help">Assigned location: enter percentages measured from the left (X) and top (Y) of the floor plan.</p>
            <div className="coordinate-fields">
              {['x', 'y'].map((axis) => <div key={axis}>
                <label htmlFor={`registration-${axis}`}>{axis.toUpperCase()} position (%) (required)</label>
                <input id={`registration-${axis}`} name={axis} type="number" min="0" max="100" step="any" required value={form[axis]} onChange={change}
                  aria-describedby={`registration-position-help${errors.mapPosition ? ' registration-mapPosition-error' : ''}`} aria-invalid={errors.mapPosition ? true : undefined} />
              </div>)}
            </div>
            {fieldError('mapPosition')}
            <button type="submit">{saving ? 'Registering…' : 'Register equipment'}</button>
          </fieldset>
        </form>
      ) : null}
    </section>
  );
}
