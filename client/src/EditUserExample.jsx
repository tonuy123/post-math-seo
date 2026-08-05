import React, { useState } from 'react';
import ConfirmDialog from './components/ConfirmDialog';
import useUnsavedChanges from './hooks/useUnsavedChanges';
import { PromptLink } from './components/PromptLink';

export default function EditUserExample() {
  const [form, setForm] = useState({ username: 'admin', password: '' });
  const [isDirty, setIsDirty] = useState(false);
  const { showPrompt, setShowPrompt, pendingNavigation, setPendingNavigation } = useUnsavedChanges(isDirty);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const save = () => {
    // fake save
    setTimeout(() => {
      setIsDirty(false);
      alert('Saved');
    }, 300);
  };

  const tryCancel = () => {
    if (!isDirty) {
      // navigate away immediately (example: go back)
      window.history.back();
      return;
    }
    setShowPrompt(true);
  };

  const onConfirmLeave = () => {
    setShowPrompt(false);
    setIsDirty(false);
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
    } else {
      window.history.back();
    }
  };

  const onCancelLeave = () => {
    setShowPrompt(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Sửa Tài Khoản Người Dùng (Ví dụ)</h2>

      <div className="bg-white p-6 rounded shadow">
        <label className="block mb-2">Tên đăng nhập</label>
        <input name="username" value={form.username} onChange={onChange} className="border p-2 w-full mb-4" />

        <label className="block mb-2">Mật khẩu</label>
        <input name="password" type="password" value={form.password} onChange={onChange} className="border p-2 w-full mb-4" />

        <div className="flex gap-3">
          <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">Lưu Người Dùng</button>
          <button onClick={tryCancel} className="border px-4 py-2 rounded">Hủy</button>

          {/* Example of using PromptLink for internal navigation */}
          <PromptLink to="/users" isDirty={isDirty} className="ml-auto text-sm text-gray-600">Đi tới danh sách</PromptLink>
        </div>
      </div>

      <ConfirmDialog
        open={showPrompt}
        message={"Bạn có thay đổi chưa được lưu. Rời trang sẽ mất những thay đổi này?"}
        onConfirm={onConfirmLeave}
        onCancel={onCancelLeave}
      />
    </div>
  );
}
