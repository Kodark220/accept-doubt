'use client';

import Image from 'next/image';

type GenLayerLogoProps = {
  variant?: 'default' | 'white';
};

export default function GenLayerLogo({ variant = 'default' }: GenLayerLogoProps) {
  const filterStyle =
    variant === 'white' ? { filter: 'brightness(0) saturate(100%) invert(1)' } : undefined;

  return (
    <div className="w-full flex justify-center mb-4">
      <div className="relative w-[220px] h-[88px]">
        <Image
          src="/logo.png"
          alt="GenLayer"
          fill
          className="object-contain"
          style={filterStyle}
        />
      </div>
    </div>
  );
}
