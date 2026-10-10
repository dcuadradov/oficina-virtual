export const BLOCK_TYPES = {
  H2: 'h2',
  H3: 'h3',
  PARAGRAPH: 'paragraph',
  OL: 'ol',
  UL: 'ul',
  MEDIA: 'media',
  SPLIT: 'split',
};

export const MEDIA_ASPECT = {
  FULL: '16:9',
  SPLIT: '1:1',
};

export function newBlockId() {
  return crypto.randomUUID();
}

export function createBlock(type) {
  const id = newBlockId();
  switch (type) {
    case BLOCK_TYPES.H2:
      return { id, type, text: '' };
    case BLOCK_TYPES.H3:
      return { id, type, text: '' };
    case BLOCK_TYPES.PARAGRAPH:
      return { id, type, html: '' };
    case BLOCK_TYPES.OL:
      return { id, type, items: [''] };
    case BLOCK_TYPES.UL:
      return { id, type, items: [''] };
    case BLOCK_TYPES.MEDIA:
      return {
        id,
        type,
        layout: 'full',
        aspect: MEDIA_ASPECT.FULL,
        kind: 'image',
        url: '',
        alt: '',
      };
    case BLOCK_TYPES.SPLIT:
      return {
        id,
        type,
        aspect: MEDIA_ASPECT.SPLIT,
        html: '',
        media: { kind: 'image', url: '', alt: '' },
      };
    default:
      return { id, type: BLOCK_TYPES.PARAGRAPH, html: '' };
  }
}

export function parseYoutubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

export function detectMediaKind(url, mimeType) {
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('image/')) return 'image';
  if (parseYoutubeId(url)) return 'youtube';
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return 'video';
  return 'image';
}

export function youtubeEmbedUrl(url) {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
