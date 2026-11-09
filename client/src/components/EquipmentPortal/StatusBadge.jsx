import React from 'react';

// Status labels match FR4 / the server's EQUIPMENT_STATUSES exactly.
const CLASS_BY_STATUS = {
  'Operational': 'badge badge-operational',
  'Under Maintenance': 'badge badge-maintenance',
  'Out of Order': 'badge badge-out',
};

export default function StatusBadge({ status }) {
  return <span className={CLASS_BY_STATUS[status] || 'badge badge-unknown'}>{status || 'Unknown'}</span>;
}
