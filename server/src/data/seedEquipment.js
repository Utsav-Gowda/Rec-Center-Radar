// Seed data for development. Equipment points at floors and rooms by
// floorNumber and roomName; seed.js resolves these to ObjectIds.
// Status reflects mechanical working order, not real-time occupancy (US4).

const floors = [
  {
    floorNumber: 1,
    name: 'Floor 1 - Cardio',
    floorPlanUrl: '/floorplans/floor-1.png',
    rooms: [{ name: 'Cardio Deck' }, { name: 'Stretching Area' }],
  },
  {
    floorNumber: 2,
    name: 'Floor 2 - Strength',
    floorPlanUrl: '/floorplans/floor-2.png',
    rooms: [{ name: 'Weight Room' }, { name: 'Machine Area' }],
  },
];

const equipment = [
  {
    name: 'Squat Rack',
    category: 'Free Weights',
    workoutType: 'Strength Training',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    status: 'Operational',
    floorNumber: 2,
    roomName: 'Weight Room',
    mapPosition: { x: 0.2, y: 0.3 },
  },
  {
    name: 'Bench Press',
    category: 'Free Weights',
    workoutType: 'Strength Training',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    status: 'Operational',
    floorNumber: 2,
    roomName: 'Weight Room',
    mapPosition: { x: 0.35, y: 0.3 },
  },
  {
    name: 'Cable Crossover Machine',
    category: 'Machines',
    workoutType: 'Strength Training',
    muscleGroups: ['Chest', 'Biceps', 'Triceps', 'Back'],
    status: 'Under Maintenance',
    statusNote: 'Left cable frayed; replacement part ordered.',
    floorNumber: 2,
    roomName: 'Machine Area',
    mapPosition: { x: 0.7, y: 0.25 },
  },
  {
    name: 'Leg Press',
    category: 'Machines',
    workoutType: 'Strength Training',
    muscleGroups: ['Quadriceps', 'Glutes'],
    status: 'Operational',
    floorNumber: 2,
    roomName: 'Machine Area',
    mapPosition: { x: 0.75, y: 0.6 },
  },
  {
    name: 'Lat Pulldown',
    category: 'Machines',
    workoutType: 'Strength Training',
    muscleGroups: ['Back', 'Biceps'],
    status: 'Operational',
    floorNumber: 2,
    roomName: 'Machine Area',
    mapPosition: { x: 0.85, y: 0.4 },
  },
  {
    name: 'Treadmill',
    category: 'Cardio',
    workoutType: 'Cardio',
    muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves'],
    status: 'Out of Order',
    statusNote: 'Belt motor failure. Awaiting technician.',
    floorNumber: 1,
    roomName: 'Cardio Deck',
    mapPosition: { x: 0.15, y: 0.5 },
  },
  {
    name: 'Rowing Machine',
    category: 'Cardio',
    workoutType: 'Cardio',
    muscleGroups: ['Back', 'Biceps', 'Quadriceps'],
    status: 'Operational',
    floorNumber: 1,
    roomName: 'Cardio Deck',
    mapPosition: { x: 0.4, y: 0.55 },
  },
  {
    name: 'Stationary Bike',
    category: 'Cardio',
    workoutType: 'Cardio',
    muscleGroups: ['Quadriceps', 'Calves'],
    status: 'Operational',
    floorNumber: 1,
    roomName: 'Cardio Deck',
    mapPosition: { x: 0.6, y: 0.5 },
  },
];

module.exports = { floors, equipment };
