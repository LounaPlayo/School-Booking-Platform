export const VENUES = ['Playo', 'Oh Chateau'];
export const EVENT_TYPES = [
  'School Trip / Field Visit',
  'School Workshop',
  'School Sports Day',
  'School Graduation',
  'Other',
];
export const EVENT_TIMES = ['10:00 - 12:00', '09:00 - 11:00', '10:30 - 12:30', '10:00 - 11:30'];
// Packages and their rates now live in the package_rates table (managed
// from the Pricing tab), not here - see components/BookingForm.js.
export const STATUS_ALL = ['Tentative', 'Deposit Pending', 'Confirmed', 'Completed', 'Not Interested', 'Cancelled'];
export const DEPOSIT_STATUSES = ['Not Requested', 'Requested', 'Partial', 'Received'];

export const STATUS_COLORS = {
  Tentative: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  'Deposit Pending': { bg: '#FFEDD5', text: '#9A3412', dot: '#FB923C' },
  Confirmed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  Completed: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  'Not Interested': { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  Cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

export function isStatusLocked(b) {
  return b.booking_status === 'Confirmed' || b.booking_status === 'Completed';
}
export function isDepositLocked(b) {
  return b.deposit_status === 'Received';
}
export function isSealed(b) {
  return isStatusLocked(b) && isDepositLocked(b);
}
export function balanceDue(b) {
  const t = parseFloat(b.total_price) || 0;
  const d = parseFloat(b.deposit_amount_received) || 0;
  return t - d;
}
