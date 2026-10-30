/**
 * Nawasena LMS - YouTube Video Helper
 * Utility to parse, embed, and extract YouTube learning videos.
 */

export function extractYouTubeId(urlOrText?: string | null): string | null {
  if (!urlOrText) return null;

  // 1. Check for tagged URL format: [YOUTUBE: url] or [VIDEO: url]
  const tagMatch = urlOrText.match(/\[(?:YOUTUBE|VIDEO):\s*([^\]\s]+)\]/i);
  const target = tagMatch ? tagMatch[1] : urlOrText;

  // 2. If it's already an 11-char alphanumeric YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(target.trim())) {
    return target.trim();
  }

  // 3. Extract from full or shortened YouTube URLs
  // Handles watch?v=, embed/, shorts/, youtu.be/, and mobile URLs
  const regex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = target.match(regex);
  return match ? match[1] : null;
}

export function getYouTubeEmbedUrl(urlOrId?: string | null): string | null {
  const id = extractYouTubeId(urlOrId);
  if (!id) return null;
  // Use Privacy-Enhanced Mode (youtube-nocookie.com)
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1`;
}

export function getYouTubeThumbnailUrl(urlOrId?: string | null): string | null {
  const id = extractYouTubeId(urlOrId);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function stripYouTubeTag(content?: string | null): string {
  if (!content) return '';
  return content.replace(/\[(?:YOUTUBE|VIDEO):\s*[^\]\s]+\]/gi, '').trim();
}

export function injectYouTubeTag(content: string, url: string): string {
  const cleanContent = stripYouTubeTag(content);
  const cleanUrl = url.trim();
  if (!cleanUrl) return cleanContent;
  return `[YOUTUBE: ${cleanUrl}]\n\n${cleanContent}`;
}

