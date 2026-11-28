import { t } from '@/content/localization';
import { DataError } from './repositories/types';

/** Maps data-layer errors to user-facing Turkish messages. */
export function errorMessage(error: unknown): string {
  if (error instanceof DataError) {
    switch (error.code) {
      case 'offline':
        return t('common.offline');
      case 'session-expired':
        return t('errors.sessionExpired');
      case 'forbidden':
        return t('errors.noPermission');
      case 'membership-revoked':
        return t('errors.membershipRemoved');
      case 'not-found':
        return t('errors.recordDeleted');
      case 'invalid-invitation':
        return t('errors.invalidCode');
      case 'validation':
        if (error.message === 'rate-limited') return t('auth.rateLimited');
        if (error.message === 'invalid-code') return t('auth.wrongCode');
        return t('common.genericError');
      default:
        return t('common.genericError');
    }
  }
  return t('common.genericError');
}
