import { supabase } from './supabaseClient';
import { log } from './logger';

const BUCKET = 'service-photos';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export async function uploadServicePhoto(
  companyId: string,
  orderId: string,
  step: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo precisa ser imagem.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Foto maior que 10MB.');
  if (!companyId || !orderId) throw new Error('Sessão inválida para upload.');
  const compressed = await compressImage(file);
  const ext = 'jpg';
  const path = `${companyId}/${orderId}/${step}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    log.error('storage.upload', error.message, { orderId, step });
    throw new Error('Falha no upload da foto: ' + error.message);
  }
  const { data, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600 * 24 * 7);
  if (urlError || !data?.signedUrl) {
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  }
  return data.signedUrl;
}

export async function getSignedPhotoUrl(pathOrUrl: string, expiresIn = 3600): Promise<string> {
  const marker = `/${BUCKET}/`;
  const idx = pathOrUrl.indexOf(marker);
  const path = idx !== -1 ? pathOrUrl.slice(idx + marker.length).split('?')[0] : pathOrUrl;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return pathOrUrl;
  return data.signedUrl;
}

export async function deleteServicePhoto(publicUrl: string): Promise<void> {
  try {
    const marker = `/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.slice(idx + marker.length).split('?')[0];
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) log.warn('storage.remove', error.message, { path });
  } catch (e: any) {
    log.warn('storage.remove', e?.message || String(e));
  }
}

function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir imagem'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem'));
    };
    img.src = url;
  });
}
