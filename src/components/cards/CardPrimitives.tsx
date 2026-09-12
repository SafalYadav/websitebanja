"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

import ImageWithFallback from "@/components/ui/ImageWithFallback";

// 1. Base Card Primitive
export interface CardPrimitiveProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "article" | "div" | "section" | "li";
  variant?: "default" | "glass" | "bordered" | "flat" | "elevated";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  interactive?: boolean;
}

export const CardPrimitive = React.forwardRef<HTMLDivElement, CardPrimitiveProps>(
  ({ as = "article", variant = "default", padding = "md", interactive = false, className, children, ...props }, ref) => {
    const Component = as as any;

    const variantStyles = {
      default: "bg-[var(--wb-surface)] border border-[var(--wb-border)] text-[var(--wb-fg)] shadow-xs",
      glass: "bg-[var(--wb-surface)]/85 backdrop-blur-xl border border-[var(--wb-border)] text-[var(--wb-fg)] shadow-xl",
      bordered: "bg-transparent border-2 border-[var(--wb-border)] text-[var(--wb-fg)]",
      flat: "bg-[var(--wb-surface)] text-[var(--wb-fg)] border-0",
      elevated: "bg-[var(--wb-surface)] border border-[var(--wb-border)] shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-[var(--wb-fg)]",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-4",
      md: "p-6 sm:p-8",
      lg: "p-8 sm:p-10",
      xl: "p-10 sm:p-14",
    };

    return (
      <Component
        ref={ref}
        data-card-primitive={variant}
        className={cn(
          "rounded-3xl relative overflow-hidden transition-all duration-300",
          variantStyles[variant],
          paddingStyles[padding],
          interactive && "cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--wb-primary)] focus-visible:outline-none",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
CardPrimitive.displayName = "CardPrimitive";

import { useImageEditor } from "@/contexts/ImageEditorContext";

// 2. Card Media
export function CardMedia({
  src,
  alt = "",
  aspectRatio = "16/10",
  overlay = false,
  fit = "cover",
  focalPoint,
  role = "general",
  editable,
  onEditClick,
  className = "",
  children,
}: {
  src?: string;
  alt?: string;
  aspectRatio?: "16/9" | "16/10" | "4/3" | "1/1" | "21/9";
  overlay?: boolean;
  fit?: "cover" | "contain" | "natural";
  focalPoint?: string;
  role?: string;
  editable?: boolean;
  onEditClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const imageEditor = useImageEditor();
  const isEditable = editable ?? Boolean(imageEditor?.isInteractive);

  const aspectClass = {
    "16/9": "aspect-video",
    "16/10": "aspect-[16/10]",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
    "21/9": "aspect-[21/9]",
  }[aspectRatio];

  const handleEdit = () => {
    if (onEditClick) {
      onEditClick();
    } else if (imageEditor && src) {
      imageEditor.openImageModal({
        elementPath: `media.${encodeURIComponent(src).slice(-12)}`,
        currentUrl: src,
        originalUrl: src,
        fit,
        focalPoint,
        title: alt || "Card Photo",
      });
    }
  };

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl", aspectClass, className)}>
      {src && (
        <ImageWithFallback
          src={src}
          alt={alt}
          fit={fit}
          focalPoint={focalPoint}
          role={role}
          editable={isEditable}
          onEditClick={handleEdit}
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-10" />
      )}
      {children}
    </div>
  );
}

// 3. Card Header
export function CardHeader({
  title,
  subtitle,
  badge,
  action,
  className = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-2 mb-4", className)}>
      {(badge || action) && (
        <div className="flex items-center justify-between gap-2 mb-1">
          {badge && <div>{badge}</div>}
          {action && <div>{action}</div>}
        </div>
      )}
      {title && <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--wb-fg)]">{title}</h3>}
      {subtitle && <p className="text-xs sm:text-sm text-[var(--wb-muted)] font-normal">{subtitle}</p>}
    </header>
  );
}

// 4. Card Body
export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-sm text-[var(--wb-muted)] leading-relaxed", className)}>{children}</div>;
}

// 5. Card Footer
export function CardFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <footer className={cn("mt-6 pt-4 border-t border-[var(--wb-border)] flex items-center justify-between text-xs text-[var(--wb-muted)]", className)}>{children}</footer>;
}

// 6. Card Badge
export function CardBadge({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "accent" | "outline";
  className?: string;
}) {
  const badgeClasses = {
    primary: "bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] border-[var(--wb-primary)]/25",
    secondary: "bg-[var(--wb-secondary)]/10 text-[var(--wb-secondary)] border-[var(--wb-secondary)]/25",
    accent: "bg-[var(--wb-accent)]/10 text-[var(--wb-accent)] border-[var(--wb-accent)]/25",
    outline: "bg-[var(--wb-surface)] text-[var(--wb-fg)] border-[var(--wb-border)]",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border", badgeClasses[variant], className)}>
      {children}
    </span>
  );
}

// 7. Card Glow
export function CardGlow({ color = "var(--wb-glow-primary)", className = "" }: { color?: string; className?: string }) {
  return (
    <div
      className={cn("absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-xl", className)}
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

// 8. Card Spotlight (Dynamic Pointer Tracking)
export function CardSpotlight({
  color = "var(--wb-glow-primary)",
  size = 400,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 pointer-events-none rounded-3xl", className)}
      style={{
        background: `radial-gradient(${size}px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}, transparent 65%)`,
      }}
      aria-hidden="true"
    />
  );
}

// 9. Card Overlay
export function CardOverlay({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("absolute inset-0 bg-[var(--wb-surface)]/80 backdrop-blur-sm z-20 flex flex-col justify-end p-6", className)}>
      {children}
    </div>
  );
}

// 10. Card Actions
export function CardActions({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-3", className)}>{children}</div>;
}
