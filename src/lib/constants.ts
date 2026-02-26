export const FINISH_TYPES = [
  'Ornament',
  'Pillow',
  'Stocking',
  'Belt',
  'Bag',
  'Framing',
  'Other',
] as const

export const ORDER_STATUSES = [
  'dropped_off',
  'in_progress',
  'ready_for_pickup',
  'picked_up',
  'paid_in_full',
] as const

export const STATUS_LABELS: Record<string, string> = {
  dropped_off: 'Dropped Off',
  in_progress: 'In Progress',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  paid_in_full: 'Paid in Full',
}

export const KANBAN_COLUMNS = [
  { id: 'dropped_off', title: 'Dropped Off', statuses: ['dropped_off'] },
  { id: 'in_progress', title: 'In Progress', statuses: ['in_progress'] },
  { id: 'ready_for_pickup', title: 'Ready for Pickup', statuses: ['ready_for_pickup'] },
  { id: 'complete', title: 'Complete', statuses: ['picked_up', 'paid_in_full'] },
] as const
