"use client";

import { useEffect, useId, useRef, useState } from "react";

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  label?: string;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  /** Confirmed files ready to upload with the parent form */
  value?: File[];
  onChange: (files: File[]) => void;
  className?: string;
  helpText?: string;
};

function revokeAll(items: PendingFile[]) {
  items.forEach((p) => URL.revokeObjectURL(p.previewUrl));
}

export default function ImageFilePicker({
  label = "Images",
  multiple = true,
  accept = "image/*",
  disabled = false,
  value = [],
  onChange,
  className = "",
  helpText = "Select images, preview them, then confirm to attach for upload.",
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => revokeAll(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function onNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length) return;
    const next: PendingFile[] = Array.from(list).map((file, i) => ({
      id: `${file.name}-${file.size}-${i}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    revokeAll(pending);
    setPending(next);
    setModalOpen(true);
    e.target.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function cancelModal() {
    revokeAll(pending);
    setPending([]);
    setModalOpen(false);
  }

  function confirmModal() {
    const files = pending.map((p) => p.file);
    revokeAll(pending);
    setPending([]);
    setModalOpen(false);
    onChange(multiple ? [...value, ...files] : files.slice(0, 1));
  }

  function removeConfirmed(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>
      ) : null}
      <p className="text-xs text-muted">{helpText}</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={onNativeChange}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/60 px-4 py-8 text-center transition hover:border-brand hover:bg-brand-subtle/40 disabled:opacity-50"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[#0c0d0b]">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </span>
        <span className="text-sm font-semibold">Choose images</span>
        <span className="text-xs text-muted">
          PNG, JPG, or WebP — preview before upload
        </span>
      </button>

      {value.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
          {value.map((file, i) => (
            <ConfirmedThumb
              key={`${file.name}-${file.size}-${i}`}
              file={file}
              onRemove={() => removeConfirmed(i)}
            />
          ))}
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview selected images"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={cancelModal}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Preview images
                </h2>
                <p className="text-xs text-muted">
                  Remove any you don’t want, then confirm to attach for upload.
                </p>
              </div>
              <button
                type="button"
                onClick={cancelModal}
                className="rounded-md p-2 text-muted hover:bg-surface hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {pending.length === 0 ? (
                <p className="text-sm text-muted">No images selected.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {pending.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="aspect-[16/10] w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <p className="truncate text-xs">{item.file.name}</p>
                        <button
                          type="button"
                          className="text-xs text-danger hover:underline"
                          onClick={() => removePending(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="app-btn app-btn-secondary"
                onClick={cancelModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary"
                disabled={pending.length === 0}
                onClick={confirmModal}
              >
                Confirm {pending.length} image{pending.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmedThumb({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-surface-dark">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
      >
        Remove
      </button>
      <p className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[10px] text-white">
        {file.name}
      </p>
    </div>
  );
}
