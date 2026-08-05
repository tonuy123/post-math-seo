import React, { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

// Cung cấp window.showUnsavedChangesDialog(message) toàn cục: Promise<boolean>
// Promise phân giải thành true khi người dùng xác nhận rời đi, false khi huỷ bỏ.
export default function UnsavedChangesProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const resolverRef = React.useRef(null);

  useEffect(() => {
    // Cài đặt helper toàn cục
    window.showUnsavedChangesDialog = (msg) => {
      return new Promise((resolve) => {
        setMessage(msg || `${window.location.host} says`);
        resolverRef.current = resolve;
        setOpen(true);
      });
    };

    return () => {
      // dọn dẹp
      delete window.showUnsavedChangesDialog;
    };
  }, []);

  function handleConfirm() {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }
  function handleCancel() {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }

  return (
    <>
      {children}
      <ConfirmDialog open={open} title={`${window.location.host} says`} message={message} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
}
