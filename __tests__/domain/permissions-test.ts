import { Actor, canOnFamily, canOnRecord, canRemoveMember } from '@/domain/permissions/permissions';
import { selectForExport } from '@/domain/permissions/export-selection';
import { buildAppointment, buildMeasurement, buildMemory } from '@/testing/builders';

const F = 'family-1';
const owner: Actor = { userId: 'u-owner', membership: { familyId: F, role: 'owner', status: 'active' } };
const adult: Actor = { userId: 'u-adult', membership: { familyId: F, role: 'adult', status: 'active' } };
const revoked: Actor = { userId: 'u-gone', membership: { familyId: F, role: 'adult', status: 'revoked' } };
const outsider: Actor = { userId: 'u-out', membership: { familyId: 'family-2', role: 'owner', status: 'active' } };

const shared = { familyId: F, authorId: 'u-adult', visibility: 'family' as const };
const privateToAdult = { familyId: F, authorId: 'u-adult', visibility: 'private' as const };

describe('record permissions', () => {
  it('unauthorized family access is denied', () => {
    expect(canOnRecord(outsider, 'view', shared)).toBe(false);
    expect(canOnFamily(outsider, 'create-record', F)).toBe(false);
  });
  it('revoked membership loses all access', () => {
    expect(canOnRecord(revoked, 'view', shared)).toBe(false);
    expect(canOnRecord(revoked, 'view', { ...shared, authorId: 'u-gone' })).toBe(false);
    expect(canOnFamily(revoked, 'create-record', F)).toBe(false);
  });
  it('private memory is author-only; owner status grants nothing', () => {
    expect(canOnRecord(adult, 'view', privateToAdult)).toBe(true);
    expect(canOnRecord(owner, 'view', privateToAdult)).toBe(false);
    expect(canOnRecord(owner, 'delete', privateToAdult)).toBe(false);
  });
  it('shared records: everyone views, author edits, author or owner deletes', () => {
    expect(canOnRecord(owner, 'view', shared)).toBe(true);
    expect(canOnRecord(owner, 'edit', shared)).toBe(false);
    expect(canOnRecord(owner, 'delete', shared)).toBe(true);
    expect(canOnRecord(adult, 'edit', shared)).toBe(true);
    expect(canOnRecord(adult, 'delete', { ...shared, authorId: 'u-owner' })).toBe(false);
  });
  it('family management is owner-only', () => {
    expect(canOnFamily(owner, 'invite-member', F)).toBe(true);
    expect(canOnFamily(adult, 'invite-member', F)).toBe(false);
    expect(canOnFamily(adult, 'revoke-member', F)).toBe(false);
  });
  it('the last owner cannot be removed', () => {
    const ms = [
      { userId: 'u-owner', role: 'owner' as const, status: 'active' as const },
      { userId: 'u-adult', role: 'adult' as const, status: 'active' as const },
    ];
    expect(canRemoveMember(ms, 'u-owner')).toBe('last-owner');
    expect(canRemoveMember(ms, 'u-adult')).toBe('ok');
    expect(canRemoveMember(ms, 'nobody')).toBe('not-member');
  });
});

describe('export selection', () => {
  it('contains only authorized, selected content for the selected profile', () => {
    const child = { kind: 'child' as const, childId: 'c1' };
    const source = {
      memories: [
        buildMemory({ id: 'shared', subject: child, authorId: 'u-adult' }),
        buildMemory({ id: 'owner-private', subject: child, authorId: 'u-owner', visibility: 'private' }),
        buildMemory({ id: 'adult-private', subject: child, authorId: 'u-adult', visibility: 'private' }),
        buildMemory({ id: 'other-child', subject: { kind: 'child', childId: 'c2' } }),
      ],
      measurements: [buildMeasurement({ id: 'w1', childId: 'c1' }), buildMeasurement({ id: 'w2', childId: 'c2' })],
      appointments: [buildAppointment({ id: 'a1', subject: child })],
    };
    const result = selectForExport(adult, source, {
      profile: child,
      include: { memories: true, measurements: true, appointments: false },
    });
    expect(result.memories.map((m) => m.id)).toEqual(['shared', 'adult-private']);
    expect(result.measurements.map((m) => m.id)).toEqual(['w1']);
    expect(result.appointments).toEqual([]);
    expect(selectForExport(revoked, source, { profile: child, include: { memories: true, measurements: true, appointments: true } })).toEqual({
      memories: [],
      measurements: [],
      appointments: [],
    });
  });
});
