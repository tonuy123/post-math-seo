import React, { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

// Provides a global window.showUnsavedChangesDialog(message): Promise<boolean>
// The promise resolves to true when user confirms leaving, false when cancels.
export default function UnsavedChangesProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const resolverRef = React.useRef(null);

  useEffect(() => {
    // Install global helper
    window.showUnsavedChangesDialog = (msg) => {
      return new Promise((resolve) => {
        setMessage(msg || `${window.location.host} says`);
        resolverRef.current = resolve;
        setOpen(true);
      });
    };

    return () => {
      // cleanup
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
