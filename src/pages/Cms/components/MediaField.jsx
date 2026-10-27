import React, { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { uploadBlogMedia } from '../../../lib/cms/api';
import { detectMediaKind, parseYoutubeId, youtubeEmbedUrl } from '../../../lib/cms/blocks';

export default function MediaField({
  postId,
  url,
  alt,
  kind,
  aspectClass,
  helper,
  onChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [error, setError] = useState('');

  const applyUrl = (nextUrl, mimeType) => {
    onChange({
      url: nextUrl,
      kind: detectMediaKind(nextUrl, mimeType),
      alt: alt || '',
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const publicUrl = await uploadBlogMedia(postId, file);
      applyUrl(publicUrl, file.type);
    } catch (err) {
      setError(err.message || 'No se pudo subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const ytId = parseYoutubeId(url);
  const embed = youtubeEmbedUrl(url);

  return (
    <div className="space-y-3">
      <div className={`${aspectClass} bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative`}>
        {uploading && (
          <div className="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#1717AF]" size={28} />
          </div>
        )}
        {ytId && embed ? (
          <iframe title="Video" src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : kind === 'video' && url ? (
          <video src={url} className="w-full h-full object-cover" controls />
        ) : url ? (
          <img src={url} alt={alt || ''} className="w-full h-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#1717AF] hover:bg-indigo-50/50 transition-colors"
          >
            <ImagePlus size={28} />
            <span className="text-sm font-medium">Subir imagen o video</span>
            {helper && <span className="text-xs text-slate-400 px-4 text-center">{helper}</span>}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ImagePlus size={14} />
          {url ? 'Reemplazar archivo' : 'Subir archivo'}
        </button>
        <div className="flex-1 flex gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Pegar URL de YouTube o imagen"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (!urlDraft.trim()) return;
              applyUrl(urlDraft.trim());
              setUrlDraft('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
          >
            <Link2 size={14} /> Usar
          </button>
        </div>
      </div>

      {url && (
        <input
          value={alt || ''}
          onChange={(e) => onChange({ url, kind, alt: e.target.value })}
          placeholder="Texto alternativo"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
