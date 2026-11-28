/**
 * Photo selection + preparation. Resizes to RESIZE_LONG_EDGE_PX and re-encodes
 * as JPEG. Re-encoding writes a new file without the original EXIF block, which
 * removes GPS location. This must be verified on real iOS/Android devices
 * (docs/manual-acceptance.md) before claiming it in privacy disclosures.
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { MAX_PHOTO_BYTES, MAX_UPLOAD_BYTES, RESIZE_LONG_EDGE_PX } from '@/domain/memories/memory-rules';
import type { LocalPhoto } from '@/data/repositories/types';
import { logger } from '@/infrastructure/logging/logger';

export type PickResult = { kind: 'ok'; photos: LocalPhoto[]; rejected: { reason: 'too-large' | 'type' | 'processing' }[] } | { kind: 'cancelled' } | { kind: 'permission-denied' };

/** `onProcessing` runs once the user has chosen, while the photos are being prepared (callers block saving meanwhile). */
export async function pickPhotos(limit: number, onProcessing?: () => void): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'permission-denied' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return { kind: 'cancelled' };
  onProcessing?.();

  const photos: LocalPhoto[] = [];
  const rejected: { reason: 'too-large' | 'type' | 'processing' }[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      rejected.push({ reason: 'too-large' });
      continue;
    }
    if (asset.mimeType && !/^image\/(jpeg|png|heic|heif|webp)$/.test(asset.mimeType)) {
      rejected.push({ reason: 'type' });
      continue;
    }
    const prepared = await prepare(asset);
    if (!prepared) rejected.push({ reason: 'processing' });
    // The limit applies to what is uploaded (the processed file), not to the original.
    else if (prepared.byteSize > MAX_UPLOAD_BYTES) rejected.push({ reason: 'too-large' });
    else photos.push(prepared);
  }
  return { kind: 'ok', photos, rejected };
}

/** Picks one square profile photo, processed like memory photos (resized, re-encoded, metadata dropped). */
export async function pickAvatar(): Promise<{ kind: 'ok'; photo: LocalPhoto } | { kind: 'cancelled' } | { kind: 'permission-denied' } | { kind: 'rejected'; reason: 'too-large' | 'processing' }> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: 'permission-denied' };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
  if (result.canceled || !result.assets[0]) return { kind: 'cancelled' };
  const photo = await prepare(result.assets[0]);
  if (!photo) return { kind: 'rejected', reason: 'processing' };
  if (photo.byteSize > MAX_UPLOAD_BYTES) return { kind: 'rejected', reason: 'too-large' };
  return { kind: 'ok', photo };
}

/** Returns null if re-encoding fails: we never upload an unprocessed original that may carry location metadata. */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<LocalPhoto | null> {
  const localId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    const longEdge = Math.max(asset.width, asset.height);
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (longEdge > RESIZE_LONG_EDGE_PX) {
      ctx.resize(asset.width >= asset.height ? { width: RESIZE_LONG_EDGE_PX } : { height: RESIZE_LONG_EDGE_PX });
    }
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    const byteSize = await processedSize(saved.uri);
    if (!byteSize) return null;
    return { localId, uri: saved.uri, width: saved.width, height: saved.height, byteSize, mimeType: 'image/jpeg' };
  } catch (e) {
    logger.warn('photo prepare failed; photo rejected', e);
    return null;
  }
}

/** Size of the re-encoded file. The server re-checks the stored object's real size at finalize. */
async function processedSize(uri: string): Promise<number | null> {
  try {
    const blob = await (await fetch(uri)).blob();
    return blob.size || null;
  } catch (e) {
    logger.warn('could not read processed photo size', e);
    return null;
  }
}
