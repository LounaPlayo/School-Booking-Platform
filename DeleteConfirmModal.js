'use client';

export default function DeleteConfirmModal({ booking, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-slate-900 mb-2">Delete this booking?</h3>
        <p className="text-sm text-slate-500 mb-5">{booking.school_name || 'This booking'} will be permanently removed. This can&apos;t be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}
