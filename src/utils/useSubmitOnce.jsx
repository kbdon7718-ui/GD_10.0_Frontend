import { useState, useCallback } from 'react';

// Hook to prevent double-submit: returns [isSubmitting, wrap]
export function useSubmitOnce() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wrap = useCallback(
    (asyncFn) => async (...args) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  return [isSubmitting, wrap];
}
