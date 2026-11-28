/**
 * Adapts SessionController (src/data/session) to React (R2).
 *
 * Isolation between accounts and families: every (user, family) scope gets
 * its own QueryClient, and the subtree below is keyed by it. On a scope change
 * the controller first awaits `cancelQueries` on the old client, then the
 * new state and a fresh client are published in ONE React update, the old
 * client is cleared, and every screen remounts. A response that arrives late
 * for the previous scope lands in a client nobody reads any more.
 *
 * Foreground: token auto-refresh runs only while the app is active, and
 * returning to the foreground re-resolves the session (revocation, expiry).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { AppBackends } from '@/data/backend';
import { SessionController } from '@/data/session/session-controller';
import { sameScope, sessionScope, type SessionState } from '@/data/session/session-state';
import type { AcceptInvitationResult } from '@/data/session/contracts';
import { clearDraftsForUser } from '@/infrastructure/storage/drafts';
import { createQueryClient as defaultCreateQueryClient } from './query-client';

export interface SessionApi {
  state: SessionState;
  mode: AppBackends['kind'];
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  selectFamily(familyId: string): Promise<void>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
  createFamily(input: { familyName: string; displayName: string; relationshipLabel: string }): Promise<string>;
  /** Family to create the first profile in: the current one, or a new one (demo welcome flow). Does not publish a new state; call refresh() when the flow is done. */
  ensureFamily(input: { familyName: string; displayName: string; relationshipLabel: string }): Promise<{ familyId: string; userId: string }>;
  acceptInvitation(token: string, displayName: string): Promise<AcceptInvitationResult>;
}

const SessionContext = createContext<SessionApi | null>(null);

interface View {
  state: SessionState;
  client: QueryClient;
  generation: number;
}

export function SessionProvider({ backends, children, createQueryClient = defaultCreateQueryClient }: { backends: AppBackends; children: ReactNode; createQueryClient?: () => QueryClient }) {
  // Mutable holder for the latest view, read from callbacks (never during render).
  const [holder] = useState(() => ({ view: { state: { kind: 'bootstrapping' } as SessionState, client: createQueryClient(), generation: 0 } as View }));
  const [view, setView] = useState<View>(holder.view);

  const [controller] = useState(
    () =>
      new SessionController({
        backend: backends.session,
        // Runs before the new state is published: stop in-flight work for the old scope.
        onScopeChange: async () => {
          await holder.view.client.cancelQueries();
        },
      }),
  );

  useEffect(() => {
    const unsubscribe = controller.subscribe((next) => {
      const prev = holder.view;
      let v: View;
      if (sameScope(sessionScope(prev.state), sessionScope(next))) {
        v = { ...prev, state: next };
      } else {
        prev.client.clear();
        v = { state: next, client: createQueryClient(), generation: prev.generation + 1 };
      }
      holder.view = v;
      setView(v);
    });
    backends.session.identity.setForeground(AppState.currentState === 'active');
    void controller.start();
    const appState = AppState.addEventListener('change', (s) => {
      const active = s === 'active';
      backends.session.identity.setForeground(active);
      if (active) void controller.refresh();
    });
    return () => {
      appState.remove();
      unsubscribe();
      controller.stop();
      backends.session.identity.setForeground(false);
      holder.view.client.clear();
    };
  }, [backends, controller, createQueryClient, holder]);

  const api = useMemo<SessionApi>(() => {
    const { identity, memberships, invitations } = backends.session;
    const current = () => holder.view.state;
    return {
      state: view.state,
      mode: backends.kind,
      refresh: () => controller.refresh(),
      async signOut() {
        const s = current();
        await controller.signOut();
        // Drafts belong to the account; another account on this device must never see them.
        const userId = sessionScope(s)?.userId;
        if (userId) await clearDraftsForUser(userId);
      },
      selectFamily: (id) => controller.selectFamily(id),
      requestEmailCode: (email) => identity.requestEmailCode(email),
      async verifyEmailCode(email, code) {
        await identity.verifyEmailCode(email, code);
        await controller.refresh();
      },
      async createFamily(input) {
        const id = await memberships.createFamily(input);
        await memberships.setActiveFamily(id);
        await controller.refresh();
        return id;
      },
      async ensureFamily(input) {
        const s = current();
        if (s.kind === 'ready' || s.kind === 'authenticated-with-family-without-profile') return { familyId: s.current.family.id, userId: s.identity.userId };
        if (backends.kind !== 'demo') throw new Error('ensureFamily without a family is a demo-only flow');
        const familyId = await memberships.createFamily(input);
        const who = await identity.current();
        if (!who) throw new Error('demo family without user');
        return { familyId, userId: who.userId };
      },
      async acceptInvitation(token, displayName) {
        const r = await invitations.accept(token, displayName);
        await memberships.setActiveFamily(r.familyId);
        await controller.refresh();
        return r;
      },
    };
  }, [backends, controller, holder, view.state]);

  return (
    <SessionContext.Provider value={api}>
      <QueryClientProvider client={view.client} key={view.generation}>
        {children}
      </QueryClientProvider>
    </SessionContext.Provider>
  );
}

export function useSessionApi(): SessionApi {
  const api = useContext(SessionContext);
  if (!api) throw new Error('useSessionApi outside SessionProvider');
  return api;
}
