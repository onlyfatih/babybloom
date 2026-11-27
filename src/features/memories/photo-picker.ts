/**
 * Photo selection + preparation. Resizes to RESIZE_LONG_EDGE_PX and re-encodes
 * as JPEG. Re-encoding writes a new file without the original EXIF block, which
 * removes GPS location. This must be verified on real iOS/Android devices
 * (docs/manual-acceptance.md) before claiming it in privacy disclosures.
 */
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { MAX_PHOTO_BYTES, RESIZE_LONG_EDGE_PX } from '@/domain/memories/memory-rules';
import type { LocalPhoto } from '@/data/repositories/types';
import { logger } from '@/infrastructure/logging/logger';

export type PickResult = { kind: 'ok'; photos: LocalPhoto[]; rejected: { reason: 'too-large' | 'type' | 'processing' }[] } | { kind: 'cancelled' } | { kind: 'permission-denied' };

export async function pickPhotos(limit: number): Promise<PickResult> {
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
    if (prepared) photos.push(prepared);
    else rejected.push({ reason: 'processing' });
  }
  return { kind: 'ok', photos, rejected };
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
    return { localId, uri: saved.uri, width: saved.width, height: saved.height, byteSize: asset.fileSize ?? 0, mimeType: 'image/jpeg' };
  } catch (e) {
    logger.warn('photo prepare failed; photo rejected', e);
    return null;
  }
}
