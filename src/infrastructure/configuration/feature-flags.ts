/**
 * Small, centralized, typed feature flags. Read-only at runtime.
 *
 * Flags decide what the client *shows*. They never grant access: anything a
 * flag unlocks must also be authorized by the server (docs/permissions.md).
 * To add a flag: add it to FeatureFlags + defaults, document it in docs/change-guide.md.
 */
import { appEnvironment } from './environment';

export interface FeatureFlags {
  /** Show clearly-labelled demo weekly content. Must be false in production. */
  showDemoContent: boolean;
  /** Device calendar export (requires a development build; expo-calendar is not in Expo Go). */
  calendarExport: boolean;
  /** Prototype-only tools in Settings (simulate failures, reset data). */
  prototypeTools: boolean;
  /** Placeholder for a future premium entitlement check. Server must verify entitlements. */
  premiumFeatures: boolean;
}

const defaults: Record<typeof appEnvironment, FeatureFlags> = {
  prototype: { showDemoContent: true, calendarExport: false, prototypeTools: true, premiumFeatures: false },
  development: { showDemoContent: true, calendarExport: false, prototypeTools: true, premiumFeatures: false },
  production: { showDemoContent: false, calendarExport: false, prototypeTools: false, premiumFeatures: false },
};

export const featureFlags: Readonly<FeatureFlags> = Object.freeze(defaults[appEnvironment]);
