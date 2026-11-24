import { auth } from '../firebase/config';

export interface UploadedBlobResult {
  url: string;
  pathname: string;
  size: number;
  mimeType: string;
  storageProvider: 'vercel-blob' | 'local-preview';
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DEFAULT_WATERMARK_LOGO = '/src/assets/images/logo_ivy_oliveira.png';

function loadWatermarkImage(src: string): Promise<HTMLImageElement | null> {
  const tryLoad = (url: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const logo = new Image();
      if (!url.startsWith('/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        logo.crossOrigin = 'anonymous';
      }
      logo.onload = () => (logo.naturalWidth > 0 ? resolve(logo) : resolve(null));
      logo.onerror = () => resolve(null);
      logo.src = url;
    });

  return tryLoad(src).then((img) => {
    if (img || src === DEFAULT_WATERMARK_LOGO) return img;
    return tryLoad(DEFAULT_WATERMARK_LOGO);
  });
}

function drawBrandWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logoImg: HTMLImageElement
): void {
  const minDim = Math.min(width, height);
  const logoW = Math.round(Math.max(110, Math.min(width * 0.19, minDim * 0.28, 340)));
  const logoH = Math.round(logoW * (logoImg.naturalHeight / Math.max(1, logoImg.naturalWidth)));
  const marginX = Math.round(Math.max(18, width * 0.032));
  const marginY = Math.round(Math.max(18, height * 0.042));
  const x = Math.max(12, width - logoW - marginX);
  const y = Math.max(12, height - logoH - marginY);

  ctx.save();

  // Soft diffused pearl halo (no hard rectangle) so black & gold lettering reads on any dark or bright surface
  const cx = x + logoW / 2;
  const cy = y + logoH / 2;
  const radius = Math.max(logoW, logoH) * 0.72;
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius);
  halo.addColorStop(0, 'rgba(255, 253, 248, 0.28)');
  halo.addColorStop(0.65, 'rgba(255, 253, 248, 0.10)');
  halo.addColorStop(1, 'rgba(255, 253, 248, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.88;
  ctx.shadowColor = 'rgba(255, 253, 248, 0.8)';
  ctx.shadowBlur = Math.max(5, Math.round(logoW * 0.035));
  ctx.drawImage(logoImg, x, y, logoW, logoH);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.88;
  ctx.drawImage(logoImg, x, y, logoW, logoH);

  ctx.restore();
}

// Client-side progressive image optimization (max 2048px, quality 0.88 WebP/PNG) with optional automatic logo watermark
export async function optimizeImageFile(
  file: File,
  options?: { watermarkLogoUrl?: string }
): Promise<{ blob: Blob; mimeType: string; base64: string }> {
  if (!file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { blob: file, mimeType: file.type, base64 };
  }

  const watermarkImg = options?.watermarkLogoUrl
    ? await loadWatermarkImage(options.watermarkLogoUrl)
    : null;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objUrl);
      const maxDim = 2048;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const base64 = await fileToBase64(file);
        return resolve({ blob: file, mimeType: file.type, base64 });
      }
      ctx.drawImage(img, 0, 0, width, height);
      if (watermarkImg) {
        drawBrandWatermark(ctx, width, height, watermarkImg);
      }

      const toBlobWithMime = (mime: string, quality: number) =>
        new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality));

      const preferredMime = file.type === 'image/png' && !watermarkImg ? 'image/png' : 'image/webp';
      let outMime = preferredMime;
      let blob = await toBlobWithMime(outMime, 0.88);
      if (blob && blob.size > 2_500_000) {
        outMime = 'image/webp';
        for (const q of [0.82, 0.74, 0.65]) {
          const candidate = await toBlobWithMime(outMime, q);
          if (candidate) {
            blob = candidate;
            if (candidate.size <= 2_500_000) break;
          }
        }
      }

      if (!blob) {
        const base64 = await fileToBase64(file);
        return resolve({ blob: file, mimeType: file.type, base64 });
      }
      const base64 = await fileToBase64(blob);
      resolve({ blob, mimeType: outMime, base64 });
    };
    img.onerror = async () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('Falha ao processar imagem.'));
    };
    img.src = objUrl;
  });
}

// Non-destructive real photo enhancement (lighting, exposure, contrast, sharpness without altering geometry)
export async function enhancePhotoPreservingReality(
  imageUrl: string,
  options: { brightness: number; contrast: number; warmth: number; sharpness: boolean }
): Promise<{ blob: Blob; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1600;
      canvas.height = img.naturalHeight || 1066;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível.'));

      const brightPct = 100 + options.brightness;
      const contrastPct = 100 + options.contrast;
      const saturatePct = 100 + Math.round(options.warmth * 0.4);
      ctx.filter = `brightness(${brightPct}%) contrast(${contrastPct}%) saturate(${saturatePct}%)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (options.warmth > 0) {
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(255, 210, 150, ${Math.min(0.18, options.warmth / 200)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      canvas.toBlob(
        async (blob) => {
          if (!blob) return reject(new Error('Erro ao exportar imagem aprimorada.'));
          const base64 = await fileToBase64(blob);
          resolve({ blob, base64, mimeType: 'image/webp' });
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem para aprimoramento.'));
    img.src = imageUrl;
  });
}

export async function uploadMediaToServer(params: {
  tenantId: string;
  file?: File;
  base64Data?: string;
  filename: string;
  mimeType: string;
  folder?: string;
  watermarkLogoUrl?: string;
}): Promise<UploadedBlobResult> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  let base64Data = params.base64Data;
  let mimeType = params.mimeType;
  let filename = params.filename;

  if (params.file && !base64Data) {
    if (params.file.type.startsWith('image/')) {
      const optimized = await optimizeImageFile(params.file, {
        watermarkLogoUrl: params.watermarkLogoUrl,
      });
      base64Data = optimized.base64;
      mimeType = optimized.mimeType;
      const ext = mimeType === 'image/png' ? '.png' : '.webp';
      filename = filename.replace(/\.[^.]+$/, ext);
    } else {
      base64Data = await fileToBase64(params.file);
    }
  }

  const resp = await fetch('/api/blob/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tenantId: params.tenantId,
      filename,
      mimeType,
      base64Data,
      folder: params.folder || 'properties',
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Falha no upload de mídia.');
  }
  return resp.json();
}

export async function deleteMediaOnServer(tenantId: string, url: string, pathname?: string): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) return;
  await fetch('/api/blob/delete', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenantId, url, pathname }),
  });
}
