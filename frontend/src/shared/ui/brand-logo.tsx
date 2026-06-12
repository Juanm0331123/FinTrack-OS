"use client";

import { CldImage } from "next-cloudinary";

type BrandLogoProps = {
  className?: string;
  height?: number;
  priority?: boolean;
  width?: number;
};

export function BrandLogo({
  className,
  height = 40,
  priority = false,
  width = 160,
}: BrandLogoProps) {
  return (
    <CldImage
      src="Logo_sin_Fondo_FinTrack_OS_bvyube"
      alt="FinTrack OS"
      width={width}
      height={height}
      priority={priority}
      config={{
        cloud: {
          cloudName: "dchllts7y",
        },
      }}
      className={className}
    />
  );
}
