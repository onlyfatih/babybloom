/** Central query keys so invalidation stays consistent across features. */
export const queryKeys = {
  session: ['session'] as const,
  profiles: (familyId: string) => ['profiles', familyId] as const,
  memories: (familyId: string) => ['memories', familyId] as const,
  memory: (id: string) => ['memory', id] as const,
  measurements: (childId: string) => ['measurements', childId] as const,
  appointments: (familyId: string) => ['appointments', familyId] as const,
  members: (familyId: string) => ['members', familyId] as const,
  invitations: (familyId: string) => ['invitations', familyId] as const,
  preferences: (userId: string) => ['preferences', userId] as const,
};
