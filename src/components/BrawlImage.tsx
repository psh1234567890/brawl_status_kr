"use client";

import Image from "next/image";
import { useState } from "react";

interface BrawlImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackText?: string;
  title?: string;
  loading?: "eager" | "lazy";
  sizes?: string;
}

export default function BrawlImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackText,
  title,
  loading,
  sizes,
}: BrawlImageProps) {
  const [failedSrc, setFailedSrc] = useState("");

  if (failedSrc === src) {
    return (
      <span
        aria-label={alt}
        className={`flex items-center justify-center bg-blue-50 font-black text-blue-300 ${className}`}
        title={title}
      >
        {fallbackText ?? alt.slice(0, 1)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={!isOptimizableBrawlImage(src)}
      className={className}
      title={title}
      loading={loading}
      sizes={sizes}
      onError={() => setFailedSrc(src)}
    />
  );
}

function isOptimizableBrawlImage(src: string) {
  try {
    return new URL(src).hostname === "cdn.brawlify.com";
  } catch {
    return src.startsWith("/");
  }
}
