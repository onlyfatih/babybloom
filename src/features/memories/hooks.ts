import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useBackend } from '@/data/backend';
import { queryKeys } from '@/data/query-keys';
import { DataError, LocalPhoto, MemoryInput } from '@/data/repositories/types';
import { decideSave, PhotoUploadResult, SaveDecision } from '@/domain/memories/memory-rules';
import type { Child, Memory, ProfileRef } from '@/domain/model';

export function useMemories(familyId: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.memories(familyId ?? '-'), enabled: !!familyId, queryFn: () => backend.memories.list(familyId!) });
}

export function useMemory(id: string | undefined) {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.memory(id ?? '-'), enabled: !!id, queryFn: () => backend.memories.get(id!), retry: (count, err) => !(err instanceof DataError && err.code === 'not-found') && count < 2 });
}

/**
 * Unified journey: a child's story includes memories of the pregnancy it was
 * born from, through the explicit originPregnancyId relationship.
 */
export function memoriesForProfile(memories: Memory[], profile: ProfileRef, children: Child[]): Memory[] {
  const pregnancyIds = new Set<string>();
  let childId: string | null = null;
  if (profile.kind === 'pregnancy') pregnancyIds.add(profile.pregnancyId);
  else {
    childId = profile.childId;
    const origin = children.find((c) => c.id === profile.childId)?.originPregnancyId;
    if (origin) pregnancyIds.add(origin);
  }
  return memories
    .filter((m) => (m.subject.kind === 'pregnancy' ? pregnancyIds.has(m.subject.pregnancyId) : m.subject.childId === childId))
    .sort((a, b) => (a.eventDate === b.eventDate ? b.createdAt.localeCompare(a.createdAt) : b.eventDate.localeCompare(a.eventDate)));
}

export type PhotoState = { photo: LocalPhoto; mediaId?: string; progress: number; status: 'idle' | 'uploading' | 'uploaded' | 'failed' };

/**
 * Two-stage save orchestration: prepare → upload (per photo, with progress) → decide → finalize.
 * Uploaded media are remembered across retries so only failed photos are re-sent.
 */
export function useSaveMemory() {
  const backend = useBackend();
  const qc = useQueryClient();
  // One idempotency key per editor instance: retries and double taps reuse it.
  const [requestId] = useState(() => ({ current: `req-${Date.now()}-${Math.random().toString(36).slice(2)}` }));

  async function uploadAll(familyId: string, photos: PhotoState[], onUpdate: (next: PhotoState[]) => void): Promise<PhotoUploadResult[]> {
    let current = photos.map((p) => ({ ...p }));
    const pending = current.filter((p) => p.status !== 'uploaded');
    if (pending.length) {
      // Only photos without a slot get a new one; failed photos retry into their existing slot (no orphans).
      const needSlots = pending.filter((p) => !p.mediaId);
      const fresh = needSlots.length ? await backend.memories.prepareUploads(familyId, needSlots.map((p) => p.photo)) : [];
      const reused = pending.filter((p) => p.mediaId).map((p) => ({ localId: p.photo.localId, mediaId: p.mediaId!, target: '' }));
      const slots = [...reused, ...fresh];
      for (const slot of slots) {
        const idx = current.findIndex((p) => p.photo.localId === slot.localId);
        current[idx] = { ...current[idx]!, mediaId: slot.mediaId, status: 'uploading', progress: 0 };
        onUpdate(current);
        try {
          await backend.memories.uploadPhoto(slot, current[idx]!.photo, (f) => {
            current = current.map((p, i) => (i === idx ? { ...p, progress: f } : p));
            onUpdate(current);
          });
          current = current.map((p, i) => (i === idx ? { ...p, status: 'uploaded', progress: 1 } : p));
        } catch (e) {
          if (e instanceof DataError && e.code === 'offline') throw e;
          current = current.map((p, i) => (i === idx ? { ...p, status: 'failed' } : p));
        }
        onUpdate(current);
      }
    }
    return current.map((p) => (p.status === 'uploaded' && p.mediaId ? { localId: p.photo.localId, status: 'uploaded', mediaId: p.mediaId } : { localId: p.photo.localId, status: 'failed' }));
  }

  async function finalize(input: MemoryInput, memoryId?: string): Promise<Memory> {
    const memory = await backend.memories.finalize(input, { memoryId, clientRequestId: requestId.current });
    await qc.invalidateQueries({ queryKey: queryKeys.memories(input.familyId) });
    qc.setQueryData(queryKeys.memory(memory.id), memory);
    return memory;
  }

  return {
    uploadAll,
    decide: (results: PhotoUploadResult[]): SaveDecision => decideSave(results),
    finalize,
  };
}

export function useDeleteMemory(familyId: string) {
  const backend = useBackend();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.memories.remove(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: queryKeys.memory(id) });
      qc.invalidateQueries({ queryKey: queryKeys.memories(familyId) });
      qc.invalidateQueries({ queryKey: queryKeys.profiles(familyId) });
    },
  });
}
