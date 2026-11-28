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
  /** Set while signOut() runs: refreshes wait for it instead of reading an identity that is being removed. */
  private signingOut: Promise<void> | null = null;

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
    if (this.signingOut) return this.signingOut;
    const gen = ++this.generation;
    const run: Promise<void> = this.resolve(gen).then(() => {
      if (gen === this.generation) return;
      // Superseded: wait for whatever owns the state now (never for itself).
      if (this.signingOut) return this.signingOut;
      if (this.latest !== run) return this.latest;
    });
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
        // Already signed out: keep the reason (the SIGNED_OUT event after an explicit sign-out re-resolves too).
        next = this.state.kind === 'signed-out' ? this.state : { kind: 'signed-out', reason: this.state.kind === 'bootstrapping' ? undefined : 'session-expired' };
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
      if (gen !== this.generation) return;
      next = { kind: 'recoverable-error', error: e instanceof DataError && e.code === 'offline' ? 'offline' : 'bootstrap-failed', identity: who };
    }
    if (gen !== this.generation) return; // a newer resolution owns the state
    await this.publish(next, gen);
  }

  /**
   * Signs this device out. Keeps all server and local records.
   *
   * Every resolution that is in flight (or that starts while the backend is
   * still removing the session and could read the old identity) is dropped:
   * the generation moves before and after the backend call, and refresh()
   * joins this promise instead of starting a new resolution.
   */
  signOut(): Promise<void> {
    this.signingOut ??= this.runSignOut().finally(() => {
      this.signingOut = null;
    });
    return this.signingOut;
  }

  private async runSignOut(): Promise<void> {
    this.generation += 1;
    try {
      await this.options.backend.identity.signOut();
    } catch (e) {
      // The session may still be there: re-read it rather than claim a sign-out.
      this.signingOut = null;
      await this.refresh();
      throw e;
    }
    const gen = ++this.generation;
    await this.publish({ kind: 'signed-out', reason: 'signed-out' }, gen);
  }

  async selectFamily(familyId: string): Promise<void> {
    await this.options.backend.memberships.setActiveFamily(familyId);
    await this.refresh();
  }

  private async publish(next: SessionState, gen: number): Promise<void> {
    const prevScope = sessionScope(this.state);
    const nextScope = sessionScope(next);
    if (!sameScope(prevScope, nextScope) && this.state.kind !== 'bootstrapping') {
      await this.options.onScopeChange(prevScope, nextScope);
      // A newer resolution (or a sign-out) started while the cache was being cleared.
      if (gen !== this.generation) return;
    }
    if (next.kind === 'ready' || next.kind === 'authenticated-with-family-without-profile') this.previousFamilyId = next.current.family.id;
    if (next.kind === 'signed-out') this.previousFamilyId = null;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }
}
