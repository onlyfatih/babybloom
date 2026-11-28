/**
 * Owns the session state machine (R1). Framework-free so it can be tested
 * without React; SessionProvider adapts it to React and TanStack Query.
 *
 * - Subscribes to identity changes (sign-in, refresh, sign-out, expiry) and
 *   unsubscribes on stop().
 * - Every resolution has a generation number. A resolution that finishes after
 *   a newer one started is discarded, so a slow request for the previous user
 *   can never overwrite the state of the next one.
 * - When the (user, family) scope changes, `onScopeChange` runs before the new
 *   state is published: the adapter cancels in-flight queries and clears the
 *   previous scope's cache there.
 */
import { DataError } from '../repositories/types';
import type { SessionBackend } from './contracts';
import { resolveSession, sameScope, SessionState, sessionScope } from './session-state';

export interface SessionControllerOptions {
  backend: SessionBackend;
  onScopeChange: (previous: ReturnType<typeof sessionScope>, next: ReturnType<typeof sessionScope>) => Promise<void> | void;
}

export class SessionController {
  private state: SessionState = { kind: 'bootstrapping' };
  private listeners = new Set<(s: SessionState) => void>();
  private generation = 0;
  private unsubscribe: (() => void) | null = null;
  private previousFamilyId: string | null = null;
  private latest: Promise<void> = Promise.resolve();

  constructor(private readonly options: SessionControllerOptions) {}

  get current(): SessionState {
    return this.state;
  }

  subscribe(listener: (s: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): Promise<void> {
    this.unsubscribe ??= this.options.backend.identity.subscribe((event) => {
      // Token refreshes keep the same scope; re-resolving would only cost requests.
      if (event.type === 'token-refreshed' && this.state.kind === 'ready') return;
      // Leave the auth callback before calling the client again (supabase-js
      // can deadlock when auth methods are awaited inside onAuthStateChange).
      setTimeout(() => void this.refresh(), 0);
    });
    return this.refresh();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.generation += 1; // drop anything still in flight
  }

  /**
   * Re-reads identity, memberships and profiles. Safe to call at any time
   * (e.g. foreground). Resolves when the newest resolution has published, even
   * if this call's own result was superseded.
   */
  refresh(): Promise<void> {
    const run = this.resolve(++this.generation);
    this.latest = run;
    return run;
  }

  private async resolve(gen: number): Promise<void> {
    const { identity, memberships } = this.options.backend;
    let next: SessionState;
    let who: Awaited<ReturnType<typeof identity.current>> = null;
    try {
      who = await identity.current();
      if (!who) {
        next = { kind: 'signed-out', reason: this.state.kind === 'bootstrapping' || this.state.kind === 'signed-out' ? undefined : 'session-expired' };
      } else {
        const [list, activeFamilyId] = await Promise.all([memberships.listMine(), memberships.activeFamilyId()]);
        const resolved = resolveSession({ identity: who, memberships: list, activeFamilyId, profileCount: null, previousFamilyId: this.previousFamilyId });
        if (resolved.kind === 'ready') {
          const count = await memberships.profileCount(resolved.current.family.id);
          next = resolveSession({ identity: who, memberships: list, activeFamilyId, profileCount: count, previousFamilyId: this.previousFamilyId });
        } else {
          next = resolved;
        }
      }
    } catch (e) {
      if (gen !== this.generation) return this.latest;
      next = { kind: 'recoverable-error', error: e instanceof DataError && e.code === 'offline' ? 'offline' : 'bootstrap-failed', identity: who };
    }
    if (gen !== this.generation) return this.latest; // a newer resolution owns the state
    await this.publish(next);
  }

  /** Signs this device out. Keeps all server and local records. */
  async signOut(): Promise<void> {
    this.generation += 1;
    await this.options.backend.identity.signOut();
    await this.publish({ kind: 'signed-out', reason: 'signed-out' });
  }

  async selectFamily(familyId: string): Promise<void> {
    await this.options.backend.memberships.setActiveFamily(familyId);
    await this.refresh();
  }

  private async publish(next: SessionState): Promise<void> {
    const prevScope = sessionScope(this.state);
    const nextScope = sessionScope(next);
    if (!sameScope(prevScope, nextScope) && this.state.kind !== 'bootstrapping') {
      await this.options.onScopeChange(prevScope, nextScope);
    }
    if (next.kind === 'ready' || next.kind === 'authenticated-with-family-without-profile') this.previousFamilyId = next.current.family.id;
    if (next.kind === 'signed-out') this.previousFamilyId = null;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }
}
