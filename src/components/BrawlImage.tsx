"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";

interface BrawlImageProps {
  src: string;
  fallbackSrcs?: readonly string[];
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
  fallbackSrcs = [],
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
  const sources = [...new Set([src, ...fallbackSrcs].filter(Boolean))];
  const sourceKey = JSON.stringify(sources);
  const [failures, setFailures] = useState<{ key: string; urls: string[] }>({ key: "", urls: [] });
  const failed = failures.key === sourceKey ? failures.urls : [];
  const activeSrc = sources.find(source => !failed.includes(source));

  if (!activeSrc) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex items-center justify-center bg-blue-50 font-black text-blue-300 ${className}`}
        title={title}
      >
        {fallbackContent ?? fallbackText ?? alt.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      key={activeSrc}
      src={activeSrc}
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
        setFailures(previous => ({ key: sourceKey, urls: [...(previous.key === sourceKey ? previous.urls : []), activeSrc] }));
        if (sources.every(source => source === activeSrc || failed.includes(source))) onError?.();
      }}
    />
  );
}
