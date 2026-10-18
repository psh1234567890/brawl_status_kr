"use client";
/* eslint-disable @next/next/no-img-element -- Private evidence must bypass the shared Next image optimizer. */
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../i18n/config";
import { communityImageError, getCommunityImageMessages } from "../../i18n/communityImageMessages";
import { getCommunityMessages } from "../../i18n/communityMessages";
import { isCommunityId, type CommunityImage } from "../../utils/community";
import styles from "./community.module.css";

export function EvidencePhotos({ images, locale }: { images: CommunityImage[]; locale: Locale }) {
  const copy = getCommunityImageMessages(locale);
  return images.length > 0 && <div className={styles.photos}>{images.map((photo, index) => <a key={photo.id} href={`/api/community/images/${photo.id}`} target="_blank" rel="noopener noreferrer nofollow ugc">
    <img src={`/api/community/images/${photo.id}`} alt={`${copy.alt} ${index + 1}`} width={photo.width} height={photo.height} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
  </a>)}</div>;
}
async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("INVALID_IMAGE_TYPE");
  if (file.size === 0 || file.size > 8 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("INVALID_IMAGE");
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("INVALID_IMAGE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
export function CommunityPhotoPicker({ locale, userId, disabled, onChange, onBusy }: {
  locale: Locale; userId: string; disabled: boolean;
  onChange: (images: CommunityImage[]) => void; onBusy: (busy: boolean) => void;
}) {
  const copy = getCommunityImageMessages(locale);
  const [photos, setPhotos] = useState<(CommunityImage & { preview: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = useRef(photos);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false; controller.current?.abort();
      for (const photo of current.current) URL.revokeObjectURL(photo.preview);
    };
  }, []);
  async function select(files: File[]) {
    if (busy || disabled || !files.length) return;
    setError("");
    if (current.current.length + files.length > 3) { setError(copy.limit); return; }
    setBusy(true); onBusy(true);
    controller.current = new AbortController();
    try {
      for (const file of files) {
        const bytes = await preparePhoto(file);
        if (!active.current) break;
        const response = await fetch("/api/community/images", { method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": bytes.type, "X-Expected-User-Id": userId }, body: bytes, signal: controller.current.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "UNAVAILABLE");
        if (!isCommunityId(result.id) || !Number.isInteger(result.width) || !Number.isInteger(result.height)) throw new Error("UNAVAILABLE");
        if (!active.current) break;
        const next = [...current.current, { id: result.id, width: result.width, height: result.height, preview: URL.createObjectURL(bytes) }];
        current.current = next; setPhotos(next); onChange(next);
      }
    } catch (cause) {
      if (active.current) {
        const code = cause instanceof Error ? cause.message : "";
        setError(code === "LOGIN_REQUIRED" || code === "ACCOUNT_MISMATCH" ? getCommunityMessages(locale).loginNotice : communityImageError(code, locale));
      }
    } finally {
      if (active.current) { setBusy(false); onBusy(false); }
    }
  }
  async function remove(photo: CommunityImage & { preview: string }) {
    if (busy || disabled) return;
    const next = current.current.filter(item => item.id !== photo.id);
    current.current = next; setPhotos(next); onChange(next); URL.revokeObjectURL(photo.preview); setError("");
    // Access is revoked immediately; physical removal is retried by maintenance.
    await fetch(`/api/community/images/${photo.id}`, { method: "DELETE", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUserId: userId }) }).catch(() => undefined);
  }
  return <fieldset className={styles.photoField} disabled={disabled || busy}>
    <legend>{copy.label} <span>{photos.length}/3</span></legend>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label={copy.add} className={styles.fileInput} onChange={event => {
      const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void select(files);
    }} />
    <button type="button" className={styles.secondary} disabled={photos.length >= 3} onClick={() => input.current?.click()}>+ {copy.add}</button>
    {photos.length > 0 && <div className={styles.photoDrafts}>{photos.map((photo, index) => <figure key={photo.id}>
      <img src={photo.preview} alt={`${copy.alt} ${index + 1}`} width={photo.width} height={photo.height} />
      <button type="button" onClick={() => void remove(photo)} aria-label={`${copy.remove} ${index + 1}`}>{copy.remove}</button>
    </figure>)}</div>}
    {busy && <p role="status" className={styles.photoHint}>{copy.uploading}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <details className={styles.photoInfo}><summary>{getCommunityMessages(locale).photoInfo}</summary><p className={styles.photoHint}>{copy.hint}</p><p className={styles.photoHint}>{copy.privacy}</p></details>
  </fieldset>;
}
