import React from 'react';

// Dialog xác nhận tuỳ chỉnh dùng TailwindCSS theo đúng kiểu ảnh chụp màn hình
export default function ConfirmDialog({ open, title = window.location.host + ' says', message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="bg-[#0f0f10] text-white rounded-2xl shadow-2xl w-[420px] p-6 border border-[#222]">
        <div className="text-sm font-semibold mb-2 text-gray-200">{title}</div>
        <div className="text-sm mb-6 text-gray-300">{message}</div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full border border-gray-600 text-gray-200 hover:bg-gray-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full bg-purple-200 text-purple-900 font-semibold hover:brightness-95 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
