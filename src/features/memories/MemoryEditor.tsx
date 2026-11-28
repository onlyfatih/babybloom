import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/content/localization';
import { errorMessage } from '@/data/errors';
import { DataError } from '@/data/repositories/types';
import { LocalDate, addDays } from '@/domain/dates/local-date';
import { MAX_BODY_LENGTH, MAX_PHOTOS_PER_MEMORY, MAX_TITLE_LENGTH, MemoryValidationError, validateMemoryDraft } from '@/domain/memories/memory-rules';
import type { Memory, ProfileRef, Visibility } from '@/domain/model';
import { draftKey as buildDraftKey } from '@/infrastructure/storage/drafts';
import { useRequiredSession } from '@/features/profiles';
import { useFormDraft } from '@/features/shared/use-form-draft';
import { useBackend } from '@/data/backend';
import { useUnsavedGuard } from '@/features/shared/use-unsaved-guard';
import { useToday } from '@/features/shared/use-today';
import { Banner, Button, Chip, ConfirmationSheet, DateField, PhotoGrid, Screen, Text, TextField } from '@/ui/primitives';
import { spacing } from '@/ui/tokens';
import { PhotoState, useSaveMemory } from './hooks';
import { pickPhotos } from './photo-picker';

interface DraftShape {
  title: string;
  body: string;
  eventDate: LocalDate | null;
  visibility: Visibility;
}

type ExistingPhoto = { mediaId: string };

/**
 * Create / edit a memory. Two-stage save with per-photo progress; "Kaydedildi"
 * only after the server confirms finalize. Drafts persist locally for new memories.
 */
export function MemoryEditor({ familyId, subject, existing }: { familyId: string; subject: ProfileRef; existing?: Memory }) {
  const backend = useBackend();
  const today = useToday();
  const save = useSaveMemory();
  const session = useRequiredSession();
  // Drafts only for new memories; edits start from the saved record.
  const draftKey = existing
    ? null
    : buildDraftKey({ userId: session.user.id, familyId, profile: subject.kind === 'child' ? `child:${subject.childId}` : `pregnancy:${subject.pregnancyId}`, purpose: 'memory-new' });

  const initial: DraftShape = useMemo(
    () => ({ title: existing?.title ?? '', body: existing?.body ?? '', eventDate: existing?.eventDate ?? today, visibility: existing?.visibility ?? 'family' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.id],
  );
  const [form, setForm] = useState<DraftShape>(initial);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(existing?.mediaIds.map((mediaId) => ({ mediaId })) ?? []);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'finalizing' | 'saved'>('idle');
  const [banner, setBanner] = useState<{ tone: 'danger' | 'warning' | 'info' | 'success'; message: string } | null>(null);
  const [partial, setPartial] = useState<{ uploaded: string[]; failed: number } | null>(null);
  const draft = useFormDraft<DraftShape>({
    key: draftKey,
    value: form,
    isEmpty: (d) => !(d.title || d.body),
    onRestore: setForm,
  });

  const dirty =
    phase !== 'saved' &&
    (form.title !== initial.title || form.body !== initial.body || form.eventDate !== initial.eventDate || form.visibility !== initial.visibility || photos.length > 0 || existingPhotos.length !== (existing?.mediaIds.length ?? 0));
  const guard = useUnsavedGuard(dirty && phase === 'idle');

  const totalPhotos = existingPhotos.length + photos.length;
  const errors = validateMemoryDraft({ title: form.title, body: form.body, eventDate: form.eventDate, photoCount: totalPhotos }, today);
  const errorText = (e: MemoryValidationError): string =>
    ({
      empty: t('errors.memoryEmpty'),
      'event-date-required': t('errors.required'),
      'event-date-in-future': t('errors.eventInFuture'),
      'too-many-photos': t('errors.tooManyPhotos', { max: MAX_PHOTOS_PER_MEMORY }),
      'title-too-long': t('errors.titleTooLong', { max: MAX_TITLE_LENGTH }),
      'body-too-long': t('errors.bodyTooLong', { max: MAX_BODY_LENGTH }),
    })[e];
  const busy = phase === 'uploading' || phase === 'finalizing';

  async function addPhotos() {
    const result = await pickPhotos(MAX_PHOTOS_PER_MEMORY - totalPhotos);
    if (result.kind === 'permission-denied') return setBanner({ tone: 'warning', message: t('errors.photoPermission') });
    if (result.kind !== 'ok') return;
    setPhotos((prev) => [...prev, ...result.photos.map((photo) => ({ photo, progress: 0, status: 'idle' as const }))]);
    if (result.rejected.length) {
      const r = result.rejected[0]!.reason;
      setBanner({ tone: 'warning', message: r === 'too-large' ? t('errors.photoTooLarge', { mb: 15 }) : r === 'type' ? t('errors.photoType') : t('errors.photoProcessing') });
    }
  }

  async function finalizeWith(mediaIds: string[]) {
    setPhase('finalizing');
    const memory = await save.finalize(
      {
        familyId,
        subject,
        title: form.title.trim() || null,
        body: form.body.trim() || null,
        eventDate: form.eventDate!,
        visibility: form.visibility,
        mediaIds: [...existingPhotos.map((p) => p.mediaId), ...mediaIds],
      },
      existing?.id,
    );
    // The memory is saved from here on. A failed draft cleanup must not turn
    // that into "not saved"; it only earns a warning (R0-E).
    setPhase('saved');
    const cleaned = await draft.discard();
    setBanner(cleaned ? { tone: 'success', message: t('common.saved') } : { tone: 'warning', message: t('common.savedDraftCleanupFailed') });
    setTimeout(() => router.replace(`/memory/${memory.id}`), 400);
  }

  async function submit() {
    setShowErrors(true);
    if (errors.length || busy) return;
    setBanner(null);
    setPartial(null);
    try {
      setPhase('uploading');
      const results = await save.uploadAll(familyId, photos, setPhotos);
      const decision = save.decide(results);
      if (decision.kind === 'finalize') return await finalizeWith(decision.mediaIds);
      setPhase('idle');
      if (decision.kind === 'not-saved') {
        // A photo-only memory with every upload failed is never "saved".
        setBanner({ tone: 'danger', message: t('memory.allFailed') });
      } else {
        setPartial({ uploaded: decision.uploadedMediaIds, failed: decision.failedLocalIds.length });
      }
    } catch (e) {
      setPhase('idle');
      setBanner({ tone: 'danger', message: e instanceof DataError ? errorMessage(e) : t('common.genericError') });
    }
  }

  const uploadedCount = photos.filter((p) => p.status === 'uploaded').length;
  const items = [
    ...existingPhotos.map((p, i) => ({ key: p.mediaId, source: backend.memories.mediaSource(p.mediaId) ?? '', accessibilityLabel: t('memory.photoA11y', { title: form.title || t('memory.newTitle'), n: i + 1 }) })),
    ...photos.map((p, i) => ({ key: p.photo.localId, source: p.photo.uri, accessibilityLabel: t('memory.photoA11y', { title: form.title || t('memory.newTitle'), n: existingPhotos.length + i + 1 }), progress: p.status === 'uploading' ? p.progress : undefined, failed: p.status === 'failed' })),
  ];

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <View style={{ gap: spacing.sm }}>
          {phase === 'uploading' ? (
            <Text variant="caption" color="textSecondary" align="center" accessibilityLiveRegion="polite">
              {t('memory.uploading', { done: uploadedCount, total: photos.length })}
            </Text>
          ) : phase === 'finalizing' ? (
            <Text variant="caption" color="textSecondary" align="center">
              {t('memory.finalizing')}
            </Text>
          ) : null}
          <Button label={phase === 'saved' ? t('common.saved') : busy ? t('common.saving') : t('common.save')} onPress={submit} fullWidth loading={busy} disabled={phase === 'saved'} testID="save-memory" />
        </View>
      }
    >
      <Stack.Screen options={{ title: existing ? t('memory.editTitle') : t('memory.newTitle') }} />
      {draft.restored ? (
        <View style={{ gap: spacing.sm }}>
          <Banner tone="info" message={t('common.draftRestored')} />
          <Button
            label={t('common.discardDraft')}
            variant="ghost"
            onPress={() => {
              draft.discard();
              setForm(initial);
            }}
          />
        </View>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Text variant="label">{t('memory.photos')}</Text>
          <Text variant="caption" color="textSecondary">
            {t('memory.photosLimit', { max: MAX_PHOTOS_PER_MEMORY })}
          </Text>
        </View>
        <PhotoGrid
          items={items}
          onRemove={busy ? undefined : (key) => {
            setExistingPhotos((prev) => prev.filter((p) => p.mediaId !== key));
            setPhotos((prev) => prev.filter((p) => p.photo.localId !== key));
          }}
          removeLabel={(n) => t('memory.removePhoto', { n })}
          onAdd={totalPhotos < MAX_PHOTOS_PER_MEMORY && !busy ? addPhotos : undefined}
          addLabel={t('memory.addPhotos')}
        />
      </View>
      <TextField label={t('memory.titleLabel')} optional placeholder={t('memory.titlePlaceholder')} value={form.title} onChangeText={(title) => setForm((f) => ({ ...f, title }))} maxLength={MAX_TITLE_LENGTH} testID="memory-title" />
      <TextField label={t('memory.bodyLabel')} placeholder={t('memory.bodyPlaceholder')} value={form.body} onChangeText={(body) => setForm((f) => ({ ...f, body }))} multiline error={showErrors && errors.includes('empty') ? errorText('empty') : null} testID="memory-body" />
      <DateField
        label={t('memory.eventDateLabel')}
        value={form.eventDate}
        onChange={(eventDate) => setForm((f) => ({ ...f, eventDate }))}
        invalidMessage={t('errors.invalidDate')}
        error={showErrors ? (errors.includes('event-date-required') ? errorText('event-date-required') : errors.includes('event-date-in-future') ? errorText('event-date-in-future') : null) : null}
        shortcuts={[
          { label: t('common.today'), value: today },
          { label: t('common.yesterday'), value: addDays(today, -1) },
        ]}
        testID="memory-date"
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{t('memory.visibility')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
          <Chip label={t('memory.visibilityFamily')} icon="people-outline" selected={form.visibility === 'family'} onPress={() => setForm((f) => ({ ...f, visibility: 'family' }))} />
          <Chip label={t('memory.visibilityPrivate')} icon="lock-closed-outline" selected={form.visibility === 'private'} onPress={() => setForm((f) => ({ ...f, visibility: 'private' }))} />
        </View>
        <Text variant="caption" color="textSecondary">
          {form.visibility === 'family' ? t('memory.visibilityFamilyHint') : t('memory.visibilityPrivateHint')}
        </Text>
      </View>
      {banner ? <Banner tone={banner.tone} message={banner.message} /> : null}

      <ConfirmationSheet
        visible={!!partial}
        title={t('memory.partialTitle')}
        message={t('memory.partialMessage', { failed: partial?.failed ?? 0 })}
        confirmLabel={t('common.retry')}
        cancelLabel={t('memory.saveWithout')}
        onConfirm={() => {
          setPartial(null);
          submit();
        }}
        onCancel={() => {
          const uploaded = partial?.uploaded ?? [];
          setPartial(null);
          setPhotos((prev) => prev.filter((p) => p.status === 'uploaded'));
          finalizeWith(uploaded).catch((e) => {
            setPhase('idle');
            setBanner({ tone: 'danger', message: errorMessage(e) });
          });
        }}
      />
      <ConfirmationSheet visible={guard.visible} title={t('common.discardTitle')} message={t('common.discardMessage')} confirmLabel={t('common.discardConfirm')} cancelLabel={t('common.keepEditing')} destructive onConfirm={() => {
          draft.discard();
          guard.confirm();
        }}
        onCancel={guard.cancel}
      />
    </Screen>
  );
}
