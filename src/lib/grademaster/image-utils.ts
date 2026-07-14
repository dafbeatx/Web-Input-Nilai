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

  // Refactor: Menggunakan failOnError: false untuk mentolerir metadata EXIF yang rusak di beberapa device
  // Ditambah .rotate() tanpa argumen untuk normalisasi otomatis berdasarkan EXIF orientation
  const processed = await sharp(buffer, { failOnError: false })
    .rotate() 
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ 
      quality: 85, 
      effort: 6,
      lossless: false 
    })
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
