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
}

export default function BrawlImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallbackText,
  title,
}: BrawlImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-label={alt}
        className={`flex items-center justify-center bg-indigo-50 font-black text-indigo-300 ${className}`}
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
      unoptimized
      className={className}
      title={title}
      onError={() => setFailed(true)}
    />
  );
}
