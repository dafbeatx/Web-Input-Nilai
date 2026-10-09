export interface BookSlide {
  slideNumber: number;
  title: string;
  paragraphs: string[];
}

/**
 * Splits body text into clean, readable paragraphs.
 * If a single paragraph is too long (> 450 characters), breaks it down at sentence boundaries.
 */
function splitBodyIntoCleanParagraphs(text: string): string[] {
  if (!text) return [];
  const rawParts = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const cleanParas: string[] = [];

  for (const part of rawParts) {
    // If paragraph is still very long, break it into 2-3 sentence chunks
    if (part.length > 450) {
      const sents = part
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
        .map(s => s.trim())
        .filter(Boolean);
      if (sents.length > 2) {
        const chunkSize = Math.ceil(sents.length / Math.ceil(sents.length / 2));
        for (let i = 0; i < sents.length; i += chunkSize) {
          cleanParas.push(sents.slice(i, i + chunkSize).join(' '));
        }
        continue;
      }
    }
    cleanParas.push(part);
  }

  return cleanParas.length > 0 ? cleanParas : [text.trim()];
}

/**
 * Intelligently parses raw lesson text into structured Book Slides.
 * Guaranteed to never output a single continuous wall of text.
 */
export function parseLessonToSlides(rawText: string, defaultTitle = 'Materi Pelajaran'): BookSlide[] {
  if (!rawText || !rawText.trim()) {
    return [{
      slideNumber: 1,
      title: defaultTitle,
      paragraphs: ['Belum ada isi materi pelajaran.']
    }];
  }

  const cleaned = rawText
    .replace(/^```(?:markdown|json)?\n?/i, '')
    .replace(/```$/, '')
    .trim();

  // Pattern 1: Markdown headings (## Slide 1 / ## Bab 1 / ### Konsep)
  const mdHeaderRegex = /(?:^|\n)(#{1,3}\s+[^\n]+)/g;
  const mdMatches = Array.from(cleaned.matchAll(mdHeaderRegex));

  if (mdMatches.length >= 2) {
    const rawChunks = cleaned.split(/(?:^|\n)(?=#{1,3}\s+[^\n]+)/).filter(c => c.trim().length > 0);
    const slides: BookSlide[] = [];

    rawChunks.forEach((chunk, idx) => {
      const lines = chunk.trim().split('\n');
      const headerLine = lines[0].replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').trim();
      const body = lines.slice(1).join('\n').trim();
      const paras = splitBodyIntoCleanParagraphs(body || headerLine);

      slides.push({
        slideNumber: idx + 1,
        title: /^slide\b/i.test(headerLine) ? headerLine : `Slide ${idx + 1}: ${headerLine}`,
        paragraphs: paras
      });
    });

    if (slides.length > 0) return slides;
  }

  // Pattern 2: Numbered sections (1. Pengenalan ..., Bab 1: ..., Bagian 1: ...)
  const numberedRegex = /(?:^|\n)(?:[0-9]+\.|\*\*[0-9]+\.|\bBab\s+[0-9]+:?|\bBagian\s+[0-9]+:?)\s+([^\n]+)/gi;
  const numMatches = Array.from(cleaned.matchAll(numberedRegex));

  if (numMatches.length >= 2) {
    const rawChunks = cleaned.split(/(?:^|\n)(?=(?:[0-9]+\.|\*\*[0-9]+\.|\bBab\s+[0-9]+:?|\bBagian\s+[0-9]+:?)\s+)/i).filter(c => c.trim().length > 0);
    const slides: BookSlide[] = [];

    rawChunks.forEach((chunk, idx) => {
      const lines = chunk.trim().split('\n');
      const firstLine = lines[0].replace(/\*\*/g, '').trim();
      const body = lines.slice(1).join('\n').trim();
      const paras = splitBodyIntoCleanParagraphs(body || firstLine);

      slides.push({
        slideNumber: idx + 1,
        title: /^slide\b/i.test(firstLine) ? firstLine : `Slide ${idx + 1}: ${firstLine}`,
        paragraphs: paras
      });
    });

    if (slides.length > 0) return slides;
  }

  // Pattern 3: Existing multiple paragraphs
  const paragraphs = splitBodyIntoCleanParagraphs(cleaned);

  if (paragraphs.length >= 2) {
    const slides: BookSlide[] = [];
    const parasPerSlide = 2;
    const total = Math.ceil(paragraphs.length / parasPerSlide);

    for (let i = 0; i < paragraphs.length; i += parasPerSlide) {
      const slideParas = paragraphs.slice(i, i + parasPerSlide);
      const sNum = Math.floor(i / parasPerSlide) + 1;
      let title = `Slide ${sNum}: Pembahasan Materi`;
      if (sNum === 1) title = `Slide 1: Pengantar & Konsep Dasar`;
      else if (sNum === 2) title = `Slide 2: Mekanisme & Penjelasan Inti`;
      else if (sNum === 3) title = `Slide 3: Penerapan & Contoh`;
      else if (sNum === total) title = `Slide ${sNum}: Rangkuman & Poin Kunci`;

      slides.push({
        slideNumber: sNum,
        title,
        paragraphs: slideParas
      });
    }
    return slides;
  }

  // Pattern 4: Giant continuous wall of text without newlines (like screenshot)
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length > 2) {
    const formedParas: string[] = [];
    const sentencesPerPara = 2;
    for (let i = 0; i < sentences.length; i += sentencesPerPara) {
      formedParas.push(sentences.slice(i, i + sentencesPerPara).join(' '));
    }

    const slides: BookSlide[] = [];
    const parasPerSlide = 2;
    const total = Math.ceil(formedParas.length / parasPerSlide);

    for (let i = 0; i < formedParas.length; i += parasPerSlide) {
      const slideParas = formedParas.slice(i, i + parasPerSlide);
      const sNum = Math.floor(i / parasPerSlide) + 1;
      let title = `Slide ${sNum}: Pembahasan`;
      if (sNum === 1) title = `Slide 1: Pengantar & Definisi`;
      else if (sNum === 2) title = `Slide 2: Cara Kerja & Penjelasan Inti`;
      else if (sNum === 3) title = `Slide 3: Penerapan & Contoh Nyata`;
      else if (sNum === total) title = `Slide ${sNum}: Rangkuman & Kesimpulan`;

      slides.push({
        slideNumber: sNum,
        title,
        paragraphs: slideParas
      });
    }
    return slides;
  }

  return [{
    slideNumber: 1,
    title: `Slide 1: ${defaultTitle}`,
    paragraphs: [cleaned]
  }];
}
