module.exports = function equipmentResponse(item) {
  const room = item.floor?.rooms?.find((candidate) => candidate._id.equals(item.room));
  return {
    ...item,
    floor: item.floor ? {
      _id: item.floor._id,
      floorNumber: item.floor.floorNumber,
      name: item.floor.name,
      floorPlanUrl: item.floor.floorPlanUrl,
    } : null,
    room: room ? { _id: room._id, name: room.name } : { _id: item.room, name: null },
  };
};
