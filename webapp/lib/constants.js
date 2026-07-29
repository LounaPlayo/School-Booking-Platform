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
export const PAYMENT_METHODS = ['Cash', 'Wish', 'Bank'];
export const ADD_ON_FOOD_OPTIONS = ['None', 'Mc Do', 'Man2ouche'];

// A brighter, more playful palette - this is a kids entertainment
// business, the tool running it shouldn't feel like a spreadsheet.
export const STATUS_COLORS = {
  Tentative: { bg: '#FFF3C4', text: '#8A5A00', dot: '#FFC933' },
  'Deposit Pending': { bg: '#FFE1C7', text: '#B34700', dot: '#FF9142' },
  Confirmed: { bg: '#CFEFFF', text: '#005A8C', dot: '#22B2F0' },
  Completed: { bg: '#D4F7DA', text: '#166534', dot: '#3DD968' },
  'Not Interested': { bg: '#EDEBFB', text: '#5B21B6', dot: '#A78BFA' },
  Cancelled: { bg: '#FFDCE5', text: '#9F1246', dot: '#FF5C87' },
};

export function isStatusLocked(b) {
  return b.booking_status === 'Confirmed' || b.booking_status === 'Completed';
}
export function isDepositLocked(b) {
  return b.deposit_status === 'Received';
}
// A booking can never be deleted once it's Confirmed or Completed -
// deposit status no longer factors into this rule.
export function isSealed(b) {
  return isStatusLocked(b);
}
export function balanceDue(b) {
  const t = parseFloat(b.total_price) || 0;
  const d = parseFloat(b.deposit_amount_received) || 0;
  return t - d;
}
export function totalBalance(b) {
  return balanceDue(b) + (parseFloat(b.add_on_fee) || 0);
}
export function settledTotal(b) {
  return (parseFloat(b.settled_cash) || 0) + (parseFloat(b.settled_wish) || 0) + (parseFloat(b.settled_bank) || 0);
}
