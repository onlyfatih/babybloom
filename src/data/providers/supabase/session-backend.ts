/**
 * Supabase implementation of the session contracts (R1): identity by email
 * one-time code, membership and active-family selection, invitation
 * acceptance. Takes a configured client so tests can run it in Node.
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { FamilyMembership } from '@/domain/model';
import { DataError } from '../../repositories/types';
import type { SessionBackend } from '../../session/contracts';
import type { AuthIdentity, MembershipSummary } from '../../session/session-state';
import type { Database } from './database.types';
import { toDataError, unwrap, unwrapData } from './errors';

type Client = SupabaseClient<Database>;

const toIdentity = (s: Session | null): AuthIdentity | null => (s?.user ? { userId: s.user.id, email: s.user.email ?? null } : null);

export function createSupabaseSessionBackend(client: Client): SessionBackend {
  return {
    identity: {
      async current() {
        // getSession restores from storage and refreshes an expired access token.
        const { data, error } = await client.auth.getSession();
        if (error) {
          const d = toDataError(error);
          if (d.code === 'offline') throw d;
          return null; // refresh token rejected: the session is over
        }
        return toIdentity(data.session);
      },
      subscribe(listener) {
        const { data } = client.auth.onAuthStateChange((event, session) => {
          const who = toIdentity(session);
          if (event === 'INITIAL_SESSION') return;
          if (event === 'SIGNED_OUT' || !who) listener({ type: 'signed-out' });
          else if (event === 'TOKEN_REFRESHED') listener({ type: 'token-refreshed', identity: who });
          // INITIAL_SESSION is ignored: the controller resolves the stored session itself on start.
          else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') listener({ type: 'signed-in', identity: who });
        });
        return () => data.subscription.unsubscribe();
      },
      async requestEmailCode(email) {
        const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
        if (error) {
          if (error.status === 429) throw new DataError('validation', 'rate-limited');
          throw toDataError(error);
        }
      },
      async verifyEmailCode(email, code) {
        const { data, error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
        if (error) {
          if (error.status === 429) throw new DataError('validation', 'rate-limited');
          const d = toDataError(error);
          throw d.code === 'offline' ? d : new DataError('validation', 'invalid-code');
        }
        const who = toIdentity(data.session);
        if (!who) throw new DataError('unknown', 'no-session');
        return who;
      },
      async signOut() {
        // 'local' ends this device's session only; other devices stay signed in.
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error && toDataError(error).code !== 'session-expired') throw toDataError(error);
      },
      setForeground(active) {
        if (active) void client.auth.startAutoRefresh();
        else void client.auth.stopAutoRefresh();
      },
    },

    memberships: {
      async listMine() {
        const { data: auth } = await client.auth.getSession();
        const uid = auth.session?.user.id;
        if (!uid) throw new DataError('session-expired');
        const rows = await unwrapData(
          client
            .from('family_memberships')
            .select('id, family_id, user_id, role, relationship_label, display_name, status, joined_at, ended_at, families(id, name, created_by, created_at)')
            .eq('user_id', uid)
            .order('joined_at', { ascending: true }),
        );
        return rows.flatMap((r): MembershipSummary[] => {
          // A family row is only readable while the membership is active.
          const fam = r.families ?? { id: r.family_id, name: '', created_by: '', created_at: r.joined_at };
          const membership: FamilyMembership = {
            id: r.id,
            familyId: r.family_id,
            userId: r.user_id,
            role: r.role,
            relationshipLabel: r.relationship_label,
            status: r.status,
            joinedAt: r.joined_at,
            revokedAt: r.ended_at,
          };
          return [{ membership, family: { id: fam.id, name: fam.name, createdBy: fam.created_by, createdAt: fam.created_at }, user: { id: r.user_id, displayName: r.display_name } }];
        });
      },
      async activeFamilyId() {
        const rows = await unwrapData(client.from('user_preferences').select('active_family_id').limit(1));
        return rows[0]?.active_family_id ?? null;
      },
      async setActiveFamily(familyId) {
        await unwrap(client.rpc('set_active_family', { p_family_id: familyId }));
      },
      async createFamily({ familyName, displayName, relationshipLabel }) {
        return unwrapData(client.rpc('create_family', { p_family_name: familyName, p_display_name: displayName, p_relationship_label: relationshipLabel }));
      },
      async leaveFamily(familyId) {
        await unwrap(client.rpc('leave_family', { p_family_id: familyId }));
      },
      async profileCount(familyId) {
        const [p, c] = await Promise.all([
          client.from('pregnancies').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
          client.from('children').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
        ]);
        if (p.error) throw toDataError(p.error);
        if (c.error) throw toDataError(c.error);
        return (p.count ?? 0) + (c.count ?? 0);
      },
    },

    invitations: {
      async accept(token, displayName) {
        const rows = await unwrapData(client.rpc('accept_invitation', { p_token: token, p_display_name: displayName }));
        const row = rows[0];
        if (!row) throw new DataError('unknown');
        if (row.result === 'invalid-invitation') throw new DataError('invalid-invitation');
        if (row.result === 'rate-limited') throw new DataError('validation', 'rate-limited');
        return { result: row.result === 'already-member' ? 'already-member' : 'joined', familyId: row.family_id! };
      },
    },
  };
}
