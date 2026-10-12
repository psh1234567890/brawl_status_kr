"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";

interface BrawlImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackText?: string;
  fallbackContent?: ReactNode;
  title?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function BrawlImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackText,
  fallbackContent,
  title,
  loading,
  sizes,
  onLoad,
  onError,
}: BrawlImageProps) {
  const [failedSrc, setFailedSrc] = useState("");

  if (failedSrc === src) {
    return (
      <span
        aria-label={alt}
        className={`flex items-center justify-center bg-blue-50 font-black text-blue-300 ${className}`}
        title={title}
      >
        {fallbackContent ?? fallbackText ?? alt.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
      title={title}
      loading={loading}
      sizes={sizes}
      onLoad={onLoad}
      onError={() => {
        setFailedSrc(src);
        onError?.();
      }}
    />
  );
}
