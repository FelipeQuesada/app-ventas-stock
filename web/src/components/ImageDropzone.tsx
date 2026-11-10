import { useId, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';

type Props = {
  label: string;
  hint?: string;
  previewUrl?: string | null;
  previewAlt?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
};

export function ImageDropzone({
  label,
  hint = 'Arrastrá una imagen o hacé clic para elegirla',
  previewUrl,
  previewAlt = 'Vista previa',
  disabled,
  onFile,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFile(file: File | undefined | null) {
    if (!file || disabled) return;
    if (!file.type.startsWith('image/')) return;
    onFile(file);
  }

  return (
    <div className="image-dropzone-field">
      <label className="image-dropzone-label" htmlFor={inputId}>
        {label}
      </label>

      <div
        className={`image-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className={`image-dropzone-preview${previewUrl ? '' : ' is-empty'}`}>
          {previewUrl ? (
            <img src={previewUrl} alt={previewAlt} />
          ) : (
            <ImagePlus size={28} strokeWidth={1.8} aria-hidden />
          )}
        </div>

        <div className="image-dropzone-copy">
          <strong>{dragging ? 'Soltá la imagen acá' : 'Subir logo'}</strong>
          <span>{hint}</span>
          <span className="image-dropzone-cta">
            <Upload size={14} aria-hidden /> Elegir archivo
          </span>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={disabled}
          className="image-dropzone-input"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
