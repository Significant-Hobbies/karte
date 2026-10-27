import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_IMAGE_UPLOAD_SIZE_MB,
} from '@/lib/validation';
import type { useImageUploadField } from './image-upload-field';
export function ImageUploadFieldView(
  view: ReturnType<typeof useImageUploadField>,
) {
  'use no memo';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor={view.inputId}
          className="block text-sm font-medium text-karte-text"
        >
          {view.label}
        </label>
        <span className="text-xs text-karte-text-4">
          Upload from device or paste a URL
        </span>
      </div>

      {view.preview && (
        <div
          className={`mb-3 overflow-hidden border border-karte-border-emphasis bg-white/5 ${
            view.kind === 'avatar'
              ? 'h-20 w-20 rounded-full bg-cover bg-center'
              : 'h-40 w-full rounded-2xl bg-cover bg-center'
          }`}
          style={{ backgroundImage: `url(${view.preview})` }}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!view.canUpload || view.uploading}
          onClick={() => view.fileInputRef.current?.click()}
          className="rounded-full bg-white/[0.05] px-4 py-2 text-sm font-medium text-karte-text transition-colors duration-200 ease-[var(--karte-ease)] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {view.uploading
            ? 'Uploading...'
            : `Upload ${view.kind === 'avatar' ? 'Avatar' : 'Image'}`}
        </button>
        <button
          type="button"
          disabled={!view.preview}
          onClick={() => {
            view.onChange('');
            view.setMessage('');
          }}
          className="rounded-lg border border-karte-border-emphasis px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
        <span className="text-xs text-karte-text-4">
          Up to {MAX_IMAGE_UPLOAD_SIZE_MB}MB. JPG, PNG, WebP, GIF, AVIF.
        </span>
      </div>

      <input
        ref={view.fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_CONTENT_TYPES.join(',')}
        onChange={view.handleFileSelect}
        className="hidden"
      />

      <input
        id={view.inputId}
        type="url"
        value={view.value}
        onChange={(event) => {
          view.onChange(event.target.value);
          if (view.messageType === 'success') {
            view.setMessage('');
          }
        }}
        placeholder={view.placeholder}
        className="w-full rounded-lg bg-white/[0.045] px-4 py-2.5 text-sm text-karte-text placeholder:text-karte-text-4 outline-none ring-1 ring-inset ring-transparent transition-all duration-200 ease-[var(--karte-ease)] hover:bg-white/[0.06] focus:bg-white/[0.06] focus:ring-karte-accent/35"
      />

      <p className="mt-2 text-xs text-karte-text-4">
        {view.helpText ??
          'Upload an image from this device or paste a public URL.'}
        {!view.canUpload && ' Create the page first to unlock uploads.'}
      </p>

      {view.message && (
        <p
          className={`mt-2 text-sm ${
            view.messageType === 'success' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {view.message}
        </p>
      )}
    </div>
  );
}
