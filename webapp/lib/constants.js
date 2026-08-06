export const VENUES = ['Playo', 'Oh Chateau'];
export const EVENT_TYPES = [
  'School Trip / Field Visit',
  'School Workshop',
  'School Sports Day',
  'School Graduation',
  'School Outdoor',
  'Other',
];
export const EVENT_TIMES = ['09:00 - 11:00', '10:00 - 11:30', '10:00 - 12:00', '10:30 - 12:30'];
// Packages and their rates now live in the package_rates table (managed
// from the Pricing tab), not here - see components/BookingForm.js.
export const STATUS_ALL = ['Tentative', 'Deposit Pending', 'Confirmed', 'Completed', 'Not Interested', 'Cancelled'];
export const DEPOSIT_STATUSES = ['Not Requested', 'Requested', 'Partial', 'Received'];
export const PAYMENT_METHODS = ['Cash', 'Whish', 'Bank'];
export const ADD_ON_FOOD_OPTIONS = ['None', 'Mc Do', 'Man2ouche'];
export const COUNTRY_CODES = [
  { code: '+961', label: 'Lebanon (+961)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+962', label: 'Jordan (+962)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
];
// Everything is stored and displayed in USD throughout the app. The
// only place LBP is allowed as an input is Deposit Amount Received and
// the final settlement amounts - typed in LBP there, auto-converted to
// USD immediately using this rate.
export const LBP_RATE = 90000;

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
// A booking can never be deleted while it's Confirmed or Completed.
// Approvers can revert the status (they can edit anything) which then
// re-allows deletion - that's intentional: Approvers keep full control,
// this restriction is specifically to stop Agents from touching or
// deleting a confirmed booking.
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
export function grandTotal(b) {
  return (parseFloat(b.total_price) || 0) + (parseFloat(b.add_on_fee) || 0);
}
export function settledTotal(b) {
  return (parseFloat(b.settled_cash) || 0) + (parseFloat(b.settled_wish) || 0) + (parseFloat(b.settled_bank) || 0);
}
// Combined money collected per method for a booking - the deposit was
// paid via ONE method (payment_method), and the final settlement is
// already split across methods. These add the deposit into whichever
// method it actually went through, so the totals reflect everything
// collected, not just the final settlement.
export function cashTotal(b) {
  const dep = b.payment_method === 'Cash' ? (parseFloat(b.deposit_amount_received) || 0) : 0;
  return dep + (parseFloat(b.settled_cash) || 0);
}
export function wishTotal(b) {
  const dep = b.payment_method === 'Whish' ? (parseFloat(b.deposit_amount_received) || 0) : 0;
  return dep + (parseFloat(b.settled_wish) || 0);
}
export function bankTotal(b) {
  const dep = b.payment_method === 'Bank' ? (parseFloat(b.deposit_amount_received) || 0) : 0;
  return dep + (parseFloat(b.settled_bank) || 0);
}
