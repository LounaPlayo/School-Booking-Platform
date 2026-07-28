import { STATUS_COLORS } from '../lib/constants';

export default function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Tentative'];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}
