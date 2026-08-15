import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  imageSize?: number;
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
}

export default function Logo({
  className,
  imageSize = 40,
  showText = true,
  textClassName,
  subtitleClassName,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-2xl p-0.5 transition-transform duration-300 group-hover:scale-105"
        style={{ width: imageSize, height: imageSize }}
      >
        <Image
          src="/logo.png"
          alt="WebsiteBanja Logo"
          width={imageSize}
          height={imageSize}
          className="h-full w-full object-cover rounded-2xl"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-tight",
              textClassName
            )}
          >
            WebsiteBanja
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 -mt-0.5 tracking-wider uppercase",
              subtitleClassName
            )}
          >
            AI Studio
          </span>
        </div>
      )}
    </div>
  );
}
