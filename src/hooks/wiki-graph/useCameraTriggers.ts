import { useState } from 'react';

export function useCameraTriggers() {
  const [resetZoomTrigger, setResetZoomTrigger] = useState<number>(0);
  const [focusSelectedTrigger, setFocusSelectedTrigger] = useState<number>(0);
  const [fitScreenTrigger, setFitScreenTrigger] = useState<number>(0);
  const [focusRootTrigger, setFocusRootTrigger] = useState<number>(0);

  return {
    resetZoomTrigger,
    setResetZoomTrigger,
    focusSelectedTrigger,
    setFocusSelectedTrigger,
    fitScreenTrigger,
    setFitScreenTrigger,
    focusRootTrigger,
    setFocusRootTrigger,
  };
}
