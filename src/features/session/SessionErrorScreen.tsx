import { useState } from 'react';
import { t } from '@/content/localization';
import { Button, ErrorState, Screen } from '@/ui/primitives';
import { useSessionApi } from './SessionProvider';

/** recoverable-error: the stored session could not be resolved (offline or server error). Nothing is deleted. */
export function SessionErrorScreen() {
  const session = useSessionApi();
  const [busy, setBusy] = useState(false);
  const offline = session.state.kind === 'recoverable-error' && session.state.error === 'offline';
  const signedIn = session.state.kind === 'recoverable-error' && !!session.state.identity;
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} scroll={false}>
      <ErrorState
        message={`${t('sessionError.title')}. ${offline ? t('sessionError.offline') : t('sessionError.failed')}`}
        onRetry={async () => {
          setBusy(true);
          await session.refresh();
          setBusy(false);
        }}
      />
      {signedIn ? <Button label={t('sessionError.signOut')} variant="ghost" onPress={() => void session.signOut()} loading={busy} fullWidth /> : null}
    </Screen>
  );
}
