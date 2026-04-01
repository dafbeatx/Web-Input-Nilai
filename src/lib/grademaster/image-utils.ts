const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_QUALITY = 80;
const MAX_DIMENSION = 512;

export function validateImageSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function generatePhotoFileName(studentId: string): string {
  const timestamp = Date.now();
  return `${studentId}-${timestamp}.webp`;
}

export async function compressAndConvertToWebP(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'cover',
      withoutEnlargement: true,
    })
    .webp({ quality: OUTPUT_QUALITY })
    .toBuffer();

  return processed;
}

export const IMAGE_CONFIG = {
  maxFileSize: MAX_FILE_SIZE,
  outputQuality: OUTPUT_QUALITY,
  maxDimension: MAX_DIMENSION,
  bucket: 'student-photos',
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;
