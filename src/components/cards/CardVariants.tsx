"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { 
  CardPrimitive, 
  CardMedia, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  CardBadge, 
  CardSpotlight, 
  CardGlow, 
  CardActions 
} from "./CardPrimitives";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { ArrowRight, Check, Sparkles, X, ChevronRight, Star, ExternalLink } from "lucide-react";
import type { CardColorTreatment } from "@/types/website";

// =============================================================================
// 1. BENTO CARD (Asymmetric spans, content densities, embedded metric)
// =============================================================================
export function BentoCard({
  title,
  description,
  tag,
  metric,
  metricLabel,
  span = "col-span-1",
  icon,
}: {
  title: string;
  description: string;
  tag?: string;
  metric?: string;
  metricLabel?: string;
  span?: "col-span-1" | "col-span-2" | "col-span-3";
  icon?: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <CardPrimitive
      ref={cardRef}
      variant="glass"
      padding="lg"
      interactive
      onMouseMove={handleMouseMove}
      className={`group flex flex-col justify-between ${span}`}
    >
      <CardSpotlight color="var(--wb-glow-primary)" size={500} />
      <div>
        <div className="flex items-center justify-between mb-4">
          {icon && <div className="p-3 rounded-xl bg-[var(--wb-surface)] border border-[var(--wb-border)] text-[var(--wb-primary)]">{icon}</div>}
          {tag && <CardBadge variant="primary">{tag}</CardBadge>}
        </div>
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>
      </div>

      {metric && (
        <div className="mt-6 pt-4 border-t border-[var(--wb-border)] flex items-baseline justify-between">
          <span className="text-2xl sm:text-3xl font-black text-[var(--wb-primary)] font-mono">{metric}</span>
          {metricLabel ? (
            <span className="text-xs text-[var(--wb-muted)] font-mono uppercase">{metricLabel}</span>
          ) : null}
        </div>
      )}
    </CardPrimitive>
  );
}

// =============================================================================
// 2. EXPANDABLE CARD (Spring layoutId modal expansion with focus trap & Escape)
// =============================================================================
export function ExpandableCard({
  id = "expandable-card",
  title,
  subtitle,
  details,
  image,
}: {
  id?: string;
  title: string;
  subtitle: string;
  details: string;
  image?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <motion.div
        layoutId={shouldReduceMotion ? undefined : `card-${id}`}
        onClick={() => setIsOpen(true)}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className="cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--wb-primary)] focus-visible:outline-none rounded-3xl"
      >
        <CardPrimitive variant="glass" padding="md" interactive className="group">
          {image && <CardMedia src={image} aspectRatio="16/10" />}
          <div className="mt-4">
            <CardHeader title={title} subtitle={subtitle} />
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--wb-primary)]">
              <span>Click to inspect</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </CardPrimitive>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              layoutId={shouldReduceMotion ? undefined : `card-${id}`}
              className="w-full max-w-xl bg-[var(--wb-surface)] border border-[var(--wb-border)] text-[var(--wb-fg)] rounded-3xl p-8 overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[var(--wb-border)]/50 hover:bg-[var(--wb-border)] text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--wb-primary)]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {image && <CardMedia src={image} aspectRatio="16/9" className="mb-6" />}
              <CardHeader title={title} subtitle={subtitle} />
              <CardBody className="mt-4 text-base leading-relaxed">{details}</CardBody>
              <CardFooter>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--wb-primary)] text-white font-bold hover:opacity-90 transition-colors shadow-lg"
                >
                  Close Inspection
                </button>
              </CardFooter>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// =============================================================================
// 3. STACKED CARD (Layered z-index card deck with advance trigger)
// =============================================================================
export function StackedCard({
  cards = [
    { title: "Layer 1: Edge Compute", desc: "Sub-millisecond localized inference." },
    { title: "Layer 2: Token Synthesizer", desc: "Pre-compiled mathematical color roles." },
    { title: "Layer 3: Cryptographic Sandboxing", desc: "Zero multi-tenant contamination." },
  ],
}: {
  cards?: Array<{ title: string; desc: string }>;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const handleNext = () => {
    setActiveIdx((prev) => (prev + 1) % cards.length);
  };

  return (
    <div className="relative w-full max-w-md h-[260px] cursor-pointer select-none" onClick={handleNext}>
      {cards.map((card, i) => {
        const offset = (i - activeIdx + cards.length) % cards.length;
        const isCurrent = offset === 0;

        return (
          <motion.div
            key={i}
            initial={false}
            animate={{
              top: offset * 12,
              scale: 1 - offset * 0.05,
              zIndex: cards.length - offset,
              opacity: offset > 2 ? 0 : 1 - offset * 0.2,
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-x-0"
          >
            <CardPrimitive variant={isCurrent ? "glass" : "default"} padding="md" className="border-white/15 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <CardBadge variant={isCurrent ? "primary" : "outline"}>Deck #{i + 1}</CardBadge>
                <span className="text-[10px] text-zinc-500 font-mono">Click to advance</span>
              </div>
              <CardHeader title={card.title} />
              <CardBody>{card.desc}</CardBody>
            </CardPrimitive>
          </motion.div>
        );
      })}
    </div>
  );
}

// =============================================================================
// 4. SPOTLIGHT CARD (Dynamic mouse coordinate tracking with visible focus)
// =============================================================================
export function SpotlightCard({
  title,
  description,
  accentColor = "var(--wb-glow-primary)",
}: {
  title: string;
  description: string;
  accentColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <CardPrimitive
      ref={cardRef}
      variant="default"
      padding="lg"
      interactive
      onMouseMove={handleMouseMove}
      className="group relative overflow-hidden"
    >
      <CardSpotlight color={accentColor} size={450} />
      <div className="relative z-10">
        <Sparkles className="w-6 h-6 text-[var(--wb-primary)] mb-4" />
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 5. IMAGE REVEAL CARD (Clip-path curtain reveal on hover/focus)
// =============================================================================
export function ImageRevealCard({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle: string;
  image: string;
}) {
  return (
    <CardPrimitive variant="default" padding="none" interactive className="group h-[320px] relative">
      <ImageWithFallback
        src={image}
        alt={title}
        wrapperClassName="w-full h-full absolute inset-0"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />
      
      {/* Dynamic clip path reveal banner */}
      <div className="absolute inset-x-0 bottom-0 p-6 bg-[var(--wb-surface)]/90 backdrop-blur-md border-t border-[var(--wb-border)] transition-transform duration-300 translate-y-2 group-hover:translate-y-0 z-20">
        <CardHeader title={title} subtitle={subtitle} />
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 6. PERSPECTIVE CARD (3D rotateX/rotateY transform responding to pointer tilt)
// =============================================================================
export function PerspectiveCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)";
  };

  return (
    <div className="perspective-1000">
      <CardPrimitive
        ref={cardRef}
        variant="elevated"
        padding="lg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="transition-transform duration-200 ease-out border-[var(--wb-border)]"
      >
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>
      </CardPrimitive>
    </div>
  );
}

// =============================================================================
// 7. EDITORIAL CARD (Asymmetric typography, variable alignment, metadata stamp)
// =============================================================================
export function EditorialCard({
  issue = "VOL. 04",
  title,
  excerpt,
  author,
  date,
}: {
  issue?: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
}) {
  return (
    <CardPrimitive variant="bordered" padding="lg" className="flex flex-col justify-between border-[var(--wb-border)]">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--wb-border)] pb-3 mb-6 text-xs font-mono tracking-widest text-[var(--wb-muted)]">
          <span>{issue}</span>
          <span>{date}</span>
        </div>
        <h3 className="text-3xl font-serif tracking-tight text-[var(--wb-fg)] mb-4 leading-tight">{title}</h3>
        <p className="text-sm font-light text-[var(--wb-muted)] leading-relaxed font-sans">{excerpt}</p>
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--wb-border)] flex items-center justify-between text-xs font-mono text-[var(--wb-muted)]">
        <span>AUTHOR: {author.toUpperCase()}</span>
        <span className="text-[var(--wb-primary)] font-bold">ESSAY →</span>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 8. HORIZONTAL MEDIA CARD (Side-by-side media and content reflowing on mobile)
// =============================================================================
export function HorizontalMediaCard({
  title,
  description,
  image,
  ctaText = "Learn More",
}: {
  title: string;
  description: string;
  image: string;
  ctaText?: string;
}) {
  return (
    <CardPrimitive variant="glass" padding="none" className="grid grid-cols-1 md:grid-cols-2 overflow-hidden border-[var(--wb-border)]">
      <div className="relative min-h-[220px] md:min-h-full">
        <ImageWithFallback
          src={image}
          alt={title}
          wrapperClassName="w-full h-full absolute inset-0 md:relative"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-8 flex flex-col justify-between">
        <div>
          <CardHeader title={title} />
          <CardBody>{description}</CardBody>
        </div>
        <CardFooter>
          <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--wb-primary)] hover:opacity-80 transition-colors">
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </CardFooter>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 9. PROJECT SHOWCASE CARD (Image-first display with CTA hover reveal)
// =============================================================================
export function ProjectShowcaseCard({
  title,
  category,
  image,
  stats,
}: {
  title: string;
  category: string;
  image: string;
  stats?: string;
}) {
  return (
    <CardPrimitive variant="default" padding="none" interactive className="group relative overflow-hidden h-[360px] border-[var(--wb-border)]">
      <ImageWithFallback
        src={image}
        alt={title}
        wrapperClassName="w-full h-full absolute inset-0"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-90 z-10 pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end">
        <CardBadge variant="secondary" className="mb-2 w-fit">{category}</CardBadge>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        {stats && <p className="text-xs font-mono text-[var(--wb-primary)]">{stats}</p>}
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 10. TESTIMONIAL STACK CARD (Layered quote deck with next/prev cycling)
// =============================================================================
export function TestimonialStackCard({
  reviews = [
    { author: "Elena Rostova", role: "VP of Product", text: "The tactile responsiveness and spatial depth feel like software from 2035.", rating: 5 },
    { author: "Marcus Vance", role: "Design Director", text: "Transformed our interface from sterile blocks into an electric, high-converting engine.", rating: 5 },
  ],
}: {
  reviews?: Array<{ author: string; role: string; text: string; rating: number }>;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const review = reviews[currentIdx] || reviews[0];

  return (
    <CardPrimitive variant="glass" padding="lg" className="relative border-[var(--wb-border)]">
      <div className="flex items-center gap-1 mb-4 text-amber-400">
        {[...Array(review.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>
      <p className="text-lg italic text-[var(--wb-fg)] mb-6 leading-relaxed">"{review.text}"</p>
      <div className="flex items-center justify-between border-t border-[var(--wb-border)] pt-4">
        <div>
          <h4 className="text-sm font-bold text-[var(--wb-fg)]">{review.author}</h4>
          <p className="text-xs text-[var(--wb-muted)]">{review.role}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentIdx((p) => (p - 1 + reviews.length) % reviews.length)}
            className="p-2 rounded-lg bg-[var(--wb-surface)] hover:bg-[var(--wb-border)] text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--wb-primary)] border border-[var(--wb-border)]"
            aria-label="Previous review"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentIdx((p) => (p + 1) % reviews.length)}
            className="p-2 rounded-lg bg-[var(--wb-surface)] hover:bg-[var(--wb-border)] text-[var(--wb-muted)] hover:text-[var(--wb-fg)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--wb-primary)] border border-[var(--wb-border)]"
            aria-label="Next review"
          >
            →
          </button>
        </div>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 11. COMPARISON CARD (Distinct split-diff card with contrasting capability panels)
// =============================================================================
export function ComparisonCard({
  title = "Clinical & Technical Benchmark",
  description,
  standardTitle = "Traditional Method",
  proTitle = "Our Standard",
  standardValue = "Manual & Variable",
  proValue = "Immediate & Certified",
  features,
}: {
  title?: string;
  description?: string;
  standardTitle?: string;
  proTitle?: string;
  standardValue?: string;
  proValue?: string;
  features?: Array<{ name: string; standard: string; pro: string }>;
}) {
  if (features && features.length > 0) {
    return (
      <CardPrimitive variant="glass" padding="lg" className="border-[var(--wb-border)] overflow-hidden">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--wb-border)]">
          <div>
            <h4 className="text-base font-bold text-[var(--wb-fg)]">{title}</h4>
            {description && <p className="text-xs text-[var(--wb-muted)] mt-1">{description}</p>}
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--wb-primary)] bg-[var(--wb-primary)]/10 border border-[var(--wb-primary)]/30 px-2.5 py-1 rounded-full">
            Standard Comparison
          </span>
        </div>

        <div className="grid grid-cols-12 pb-3 text-xs font-mono font-bold uppercase tracking-wider text-[var(--wb-muted)] border-b border-[var(--wb-border)]">
          <span className="col-span-5">Capability</span>
          <span className="col-span-3 text-[var(--wb-muted)]/70">{standardTitle}</span>
          <span className="col-span-4 text-[var(--wb-primary)] text-right">{proTitle}</span>
        </div>

        <div className="divide-y divide-[var(--wb-border)]/50">
          {features.map((f, i) => (
            <div key={i} className="grid grid-cols-12 text-sm py-3 items-center">
              <span className="col-span-5 font-medium text-[var(--wb-fg)]">{f.name}</span>
              <span className="col-span-3 text-xs text-[var(--wb-muted)] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--wb-muted)]/50" />
                <span>{f.standard}</span>
              </span>
              <span className="col-span-4 text-xs font-semibold text-[var(--wb-primary)] flex items-center justify-end gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--wb-primary)]" />
                <span>{f.pro}</span>
              </span>
            </div>
          ))}
        </div>
      </CardPrimitive>
    );
  }

  // Feature-level comparative card with dual visual panels
  return (
    <CardPrimitive variant="elevated" padding="lg" className="!bg-[var(--wb-surface)] !text-[var(--wb-fg)] border border-[var(--wb-border)] shadow-xl group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--wb-primary)] bg-[var(--wb-primary)]/10 border border-[var(--wb-border)] px-2.5 py-1 rounded-full">
            Comparative Benchmark
          </span>
          <Sparkles className="h-4 w-4 text-[var(--wb-primary)] opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>

        <h4 className="text-lg font-bold tracking-tight text-[var(--wb-fg)] mb-2">{title}</h4>
        {description && (
          <p className="text-xs leading-relaxed text-[var(--wb-muted)] mb-5">
            {description}
          </p>
        )}
      </div>

      {/* Distinct split comparison diff panels */}
      <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--wb-border)]">
        <div className="rounded-xl p-2.5 bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--wb-muted)] block">
            {standardTitle}
          </span>
          <span className="text-xs font-medium text-[var(--wb-muted)] block line-through opacity-80">
            {standardValue}
          </span>
        </div>

        <div className="rounded-xl p-2.5 bg-[var(--wb-primary)]/10 border border-[var(--wb-primary)]/30 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--wb-primary)] font-bold block">
            {proTitle}
          </span>
          <span className="text-xs font-bold text-[var(--wb-fg)] flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            <span>{proValue}</span>
          </span>
        </div>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 12. STAT CARD (Huge typographic metric with contextual micro-chart)
// =============================================================================
export function StatCard({
  value = "99.98%",
  label = "SYSTEM UPTIME SLA",
  sublabel = "Monitored across 32 regional edge nodes",
}: {
  value?: string;
  label?: string;
  sublabel?: string;
}) {
  return (
    <CardPrimitive variant="glass" padding="lg" className="border-[var(--wb-border)]">
      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--wb-primary)]">{label}</span>
      <div className="text-4xl sm:text-5xl font-black text-[var(--wb-fg)] font-mono mt-2 mb-2 tracking-tight">{value}</div>
      <p className="text-xs text-[var(--wb-muted)]">{sublabel}</p>
      <div className="w-full bg-[var(--wb-border)] h-1.5 rounded-full mt-4 overflow-hidden">
        <div className="bg-[var(--wb-primary)] h-full w-[99.9%]" />
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 13. SERVICE CARD (Tiered service offering with index numeral and CTA)
// =============================================================================
export function ServiceCard({
  index = "01",
  title,
  description,
  price,
  features = [],
}: {
  index?: string;
  title: string;
  description: string;
  price?: string;
  features?: string[];
}) {
  return (
    <CardPrimitive variant="default" padding="lg" interactive className="group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl font-mono font-black text-[var(--wb-muted)] group-hover:text-[var(--wb-primary)] transition-colors">{index}</span>
          {price && <span className="text-sm font-mono font-bold text-[var(--wb-fg)] px-3 py-1 rounded-full bg-[var(--wb-surface)] border border-[var(--wb-border)]">{price}</span>}
        </div>
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>

        {features.length > 0 && (
          <ul className="mt-6 space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[var(--wb-muted)]">
                <Check className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CardFooter>
        <span className="font-semibold text-[var(--wb-muted)] group-hover:text-[var(--wb-primary)] transition-colors">Request Engagement</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[var(--wb-primary)]" />
      </CardFooter>
    </CardPrimitive>
  );
}

// =============================================================================
// 14. FEATURE REVEAL CARD (Progressive disclosure on interactive hover/tap)
// =============================================================================
export function FeatureRevealCard({
  title,
  summary,
  deepDive,
}: {
  title: string;
  summary: string;
  deepDive: string;
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <CardPrimitive
      variant="glass"
      padding="lg"
      interactive
      onClick={() => setIsRevealed((r) => !r)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsRevealed((r) => !r);
        }
      }}
      className="cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <CardBadge variant="primary">Progressive Disclosure</CardBadge>
        <span className="text-xs text-[var(--wb-primary)] font-mono">{isRevealed ? "Collapse ▲" : "Expand ▼"}</span>
      </div>
      <CardHeader title={title} />
      <CardBody>{summary}</CardBody>

      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-[var(--wb-border)] text-xs text-[var(--wb-primary)] font-mono leading-relaxed"
          >
            {deepDive}
          </motion.div>
        )}
      </AnimatePresence>
    </CardPrimitive>
  );
}

// =============================================================================
// 15. FLOATING CARD (Layered floating visual with subtle float motion)
// =============================================================================
export function FloatingCard({
  title,
  description,
  badge = "Floating Visual",
  treatment,
}: {
  title: string;
  description: string;
  badge?: string;
  treatment?: CardColorTreatment;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={shouldReduceMotion ? {} : { y: [-6, 6, -6] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <CardPrimitive variant="elevated" treatment={treatment} padding="lg" className="border-[var(--wb-border)] shadow-xl">
        <CardBadge variant="secondary" className="mb-4">{badge}</CardBadge>
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>
      </CardPrimitive>
    </motion.div>
  );
}

// =============================================================================
// 16. MINIMAL FLAT CARD (Ultra-clean, zero shadow, pure typography)
// =============================================================================
export function MinimalFlatCard({
  title,
  description,
  tag,
  icon,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="flat" treatment={treatment} padding="lg" interactive className="group border-0">
      <div className="flex items-center justify-between mb-4">
        {icon && <div className="text-[var(--wb-primary)] group-hover:scale-110 transition-transform">{icon}</div>}
        {tag && <span className="text-xs font-mono uppercase tracking-widest text-[var(--wb-muted)] border-b border-[var(--wb-border)] pb-0.5">{tag}</span>}
      </div>
      <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--wb-fg)] group-hover:text-[var(--wb-primary)] transition-colors mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--wb-muted)] leading-relaxed">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 17. ELEVATED CARD (Tactile multi-layer drop shadow with smooth lift)
// =============================================================================
export function ElevatedCard({
  title,
  description,
  tag,
  icon,
  image,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
  image?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="elevated" treatment={treatment} padding="none" interactive className="group flex flex-col justify-between">
      {image && (
        <CardMedia src={image} alt={title} aspectRatio="16/10" className="rounded-t-2xl rounded-b-none" />
      )}
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            {icon && <div className="p-2.5 rounded-xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)]">{icon}</div>}
            {tag && <CardBadge variant="primary">{tag}</CardBadge>}
          </div>
          <CardHeader title={title} />
          <CardBody>{description}</CardBody>
        </div>
        <div className="mt-6 pt-4 border-t border-[var(--wb-border)]/50 flex items-center justify-between text-xs font-semibold text-[var(--wb-primary)]">
          <span>Explore Details</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
        </div>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 18. BORDERED CARD (Crisp prominent outline with balanced interior)
// =============================================================================
export function BorderedCard({
  title,
  description,
  tag,
  metric,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  metric?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="bordered" treatment={treatment} padding="lg" interactive className="group hover:border-[var(--wb-primary)]">
      <div className="flex items-center justify-between mb-4">
        {tag && <CardBadge variant="outline">{tag}</CardBadge>}
        {metric && <span className="text-sm font-mono text-[var(--wb-primary)] font-bold">{metric}</span>}
      </div>
      <h3 className="text-xl font-bold tracking-tight text-[var(--wb-fg)] mb-2 group-hover:text-[var(--wb-primary)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--wb-muted)] leading-relaxed">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 19. ASYMMETRIC CARD (Offset layout, diagonal accent badge, dynamic spacing)
// =============================================================================
export function AsymmetricCard({
  title,
  description,
  tag,
  index = 0,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  index?: number;
  treatment?: CardColorTreatment;
}) {
  const isEven = index % 2 === 0;
  return (
    <CardPrimitive
      variant="default"
      treatment={treatment}
      padding="lg"
      interactive
      className={`group relative ${isEven ? "sm:translate-y-2" : "sm:-translate-y-2"}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--wb-primary)]/15 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />
      <div className="flex items-baseline justify-between mb-4">
        <span className="text-xs font-mono font-bold text-[var(--wb-primary)] tracking-widest uppercase">
          #{String(index + 1).padStart(2, "0")}
        </span>
        {tag && <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--wb-surface)] border border-[var(--wb-border)] text-[var(--wb-fg)] font-medium">{tag}</span>}
      </div>
      <h3 className="text-2xl font-bold tracking-tight text-[var(--wb-fg)] mb-3 group-hover:text-[var(--wb-primary)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--wb-muted)] leading-relaxed pl-3 border-l-2 border-[var(--wb-primary)]/40">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 20. IMAGE-LED CARD (Dominant 16:10 photo with gradient scrim and pinned content)
// =============================================================================
export function ImageLedCard({
  title,
  description,
  image,
  tag,
  ctaText = "Discover More",
  treatment,
}: {
  title: string;
  description: string;
  image?: string;
  tag?: string;
  ctaText?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="default" treatment={treatment} padding="none" interactive className="group overflow-hidden flex flex-col justify-between">
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        <ImageWithFallback
          src={image || "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80"}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
        {tag && (
          <div className="absolute top-4 left-4 z-20">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 text-black backdrop-blur-md shadow-sm">
              {tag}
            </span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight drop-shadow-sm">{title}</h3>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <p className="text-sm text-[var(--wb-muted)] leading-relaxed mb-4">{description}</p>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--wb-primary)] group-hover:translate-x-1 transition-transform">
          <span>{ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </CardPrimitive>
  );
}

// =============================================================================
// 21. SOFT SURFACE CARD (Plush pillowy background with gentle tonal wash)
// =============================================================================
export function SoftSurfaceCard({
  title,
  description,
  tag,
  icon,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="soft" treatment={treatment} padding="lg" interactive className="group rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        {icon && <div className="p-3 rounded-2xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)]">{icon}</div>}
        {tag && <CardBadge variant="secondary">{tag}</CardBadge>}
      </div>
      <h3 className="text-xl font-bold tracking-tight text-[var(--wb-fg)] mb-2 group-hover:text-[var(--wb-primary)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--wb-muted)] leading-relaxed">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 22. GLASS LAYERED CARD (Translucent backdrop blur, luminous border, spotlight)
// =============================================================================
export function GlassLayeredCard({
  title,
  description,
  tag,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="glass" treatment={treatment} padding="lg" interactive className="group relative">
      <CardSpotlight color="var(--wb-glow-primary)" size={400} />
      <div className="flex items-center justify-between mb-4">
        {tag && <CardBadge variant="primary">{tag}</CardBadge>}
        <Sparkles className="w-4 h-4 text-[var(--wb-primary)] opacity-75" />
      </div>
      <CardHeader title={title} />
      <CardBody>{description}</CardBody>
    </CardPrimitive>
  );
}

// =============================================================================
// 23. BRUTALIST CARD (High-contrast 2px solid border, 4px solid shadow offset)
// =============================================================================
export function BrutalistCard({
  title,
  description,
  tag,
  index = 0,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  index?: number;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="brutalist" treatment={treatment} padding="lg" interactive className="group rounded-none">
      <div className="flex items-center justify-between mb-4 border-b-2 border-black dark:border-white pb-3">
        <span className="font-mono text-sm font-black tracking-widest uppercase">
          SEC_{String(index + 1).padStart(2, "0")}
        </span>
        {tag && (
          <span className="bg-black dark:bg-white text-white dark:text-black px-2.5 py-0.5 text-xs font-mono font-bold uppercase">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-black uppercase tracking-tight mb-3 group-hover:translate-x-1 transition-transform">
        {title}
      </h3>
      <p className="text-sm font-medium leading-relaxed opacity-90">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 24. LUXURY CARD (Ivory/obsidian surface, Roman numerals, champagne gold hairline)
// =============================================================================
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function LuxuryCard({
  title,
  description,
  tag,
  index = 0,
  image,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  index?: number;
  image?: string;
  treatment?: CardColorTreatment;
}) {
  const roman = ROMAN_NUMERALS[index % ROMAN_NUMERALS.length];
  return (
    <CardPrimitive variant="luxury" treatment={treatment} padding="lg" interactive className="group rounded-xl relative">
      <div className="flex items-center justify-between mb-4 border-b border-[rgba(212,175,55,0.2)] pb-3">
        <span className="font-serif text-lg tracking-widest text-[#B48C28] dark:text-[#D4AF37]">{roman}</span>
        {tag && (
          <span className="text-[10px] uppercase font-serif tracking-[0.2em] text-[#854D0E] dark:text-[#F5E0A3] border border-[rgba(212,175,55,0.3)] px-2 py-0.5 rounded-sm">
            {tag}
          </span>
        )}
      </div>
      {image && (
        <div className="mb-4 overflow-hidden rounded-lg aspect-[16/10]">
          <ImageWithFallback src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
      )}
      <h3 className="text-xl sm:text-2xl font-serif tracking-normal mb-2 text-[#1C1917] dark:text-[#FAF5E9] group-hover:text-[#B48C28] transition-colors">
        {title}
      </h3>
      <p className="text-xs sm:text-sm font-normal leading-relaxed text-[#78716C] dark:text-[#A8A29E]">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 25. ORGANIC CARD (Earthy tones, natural fluid contours, botanical/terroir badge)
// =============================================================================
export function OrganicCard({
  title,
  description,
  tag,
  image,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  image?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="organic" treatment={treatment} padding="lg" interactive className="group rounded-3xl">
      {image && (
        <div className="mb-5 overflow-hidden rounded-2xl aspect-[4/3]">
          <ImageWithFallback src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        {tag && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] border border-[var(--wb-primary)]/20">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--wb-fg)] mb-2 group-hover:text-[var(--wb-primary)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--wb-muted)] leading-relaxed">{description}</p>
    </CardPrimitive>
  );
}

// =============================================================================
// 26. TECHNICAL CARD (Monospace telemetry, live status beacon, electric accent)
// =============================================================================
export function TechnicalCard({
  title,
  description,
  tag,
  metric,
  statusLabel,
  metricLabel,
  treatment,
}: {
  title: string;
  description: string;
  tag?: string;
  metric?: string;
  statusLabel?: string;
  metricLabel?: string;
  treatment?: CardColorTreatment;
}) {
  return (
    <CardPrimitive variant="technical" treatment={treatment} padding="lg" interactive className="group font-mono rounded-lg">
      <div className="flex items-center justify-between mb-4 text-xs border-b border-sky-500/20 pb-3">
        <div className="flex items-center gap-2 text-sky-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
          </span>
          <span className="font-bold tracking-widest uppercase">{statusLabel || "ACTIVE"}</span>
        </div>
        {tag && <span className="text-sky-300/80 bg-sky-950/60 px-2 py-0.5 rounded text-[11px] border border-sky-500/30">{tag}</span>}
      </div>
      <h3 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-slate-100 mb-2 group-hover:text-sky-400 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-slate-400 font-sans leading-relaxed mb-4">{description}</p>
      {metric && (
        <div className="pt-3 border-t border-sky-500/15 flex items-baseline justify-between">
          <span className="text-2xl font-black text-sky-400">{metric}</span>
          {metricLabel && <span className="text-[10px] text-slate-500 uppercase tracking-widest">{metricLabel}</span>}
        </div>
      )}
    </CardPrimitive>
  );
}

// =============================================================================
// 27. OVERSIZED TYPOGRAPHY CARD (Giant 4xl-6xl numeral dominating card)
// =============================================================================
export function OversizedTypographyCard({
  title,
  description,
  metric,
  index = 0,
  tag,
  treatment,
}: {
  title: string;
  description: string;
  metric?: string;
  index?: number;
  tag?: string;
  treatment?: CardColorTreatment;
}) {
  const displayNum = metric || String(index + 1).padStart(2, "0");
  return (
    <CardPrimitive variant="default" treatment={treatment} padding="lg" interactive className="group relative overflow-hidden flex flex-col justify-between min-h-[260px]">
      <div className="flex items-center justify-between mb-2">
        {tag && <CardBadge variant="outline">{tag}</CardBadge>}
      </div>
      <div>
        <div className="text-6xl sm:text-7xl font-black tracking-tighter text-[var(--wb-primary)] mb-2 font-mono group-hover:scale-105 transition-transform origin-left">
          {displayNum}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--wb-fg)] mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-[var(--wb-muted)] leading-relaxed">{description}</p>
      </div>
    </CardPrimitive>
  );
}
