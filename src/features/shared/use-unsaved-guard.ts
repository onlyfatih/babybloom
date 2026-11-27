import { useState } from 'react';
import { usePreventRemove, useNavigation } from 'expo-router';

/**
 * Asks before discarding meaningful unsaved changes (back gesture, header back, Vazgeç).
 * Returns state for a ConfirmationSheet.
 */
export function useUnsavedGuard(isDirty: boolean) {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  usePreventRemove(isDirty, ({ data }) => {
    setPendingAction(() => () => navigation.dispatch(data.action));
  });
  return {
    visible: pendingAction !== null,
    confirm: () => {
      const action = pendingAction;
      setPendingAction(null);
      action?.();
    },
    cancel: () => setPendingAction(null),
  };
}
