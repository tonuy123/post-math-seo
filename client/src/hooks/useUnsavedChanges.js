import { useEffect, useState } from 'react';

// Hook: handles browser refresh/close via beforeunload and provides state for showing a modal
export default function useUnsavedChanges(isDirty) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      // Standard way to trigger native browser confirmation on refresh/close
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { showPrompt, setShowPrompt, pendingNavigation, setPendingNavigation };
}
