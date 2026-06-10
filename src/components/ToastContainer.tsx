// ============================================
// CLUB PYP — Toast Notification System
// ============================================

import { useAppStore } from '../stores/appStore';

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 animate-[slideDown_0.3s_ease-out] ${
            toast.type === 'success'
              ? 'bg-[#1f1e1c] border-[#e5b85c]/30 text-[#f2d27a]'
              : toast.type === 'error'
              ? 'bg-[#1f1e1c] border-[#ffb4ab]/30 text-[#ffb4ab]'
              : 'bg-[#1f1e1c] border-[#f0d9a8]/30 text-[#f0d9a8]'
          }`}
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          <span className="flex-1 text-xs font-bold">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#c2b391] hover:text-white transition-colors ml-2"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
