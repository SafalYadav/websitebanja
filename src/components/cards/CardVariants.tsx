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

// =============================================================================
// 1. BENTO CARD (Asymmetric spans, content densities, embedded metric)
// =============================================================================
export function BentoCard({
  title,
  description,
  tag,
  metric,
  span = "col-span-1",
  icon,
}: {
  title: string;
  description: string;
  tag?: string;
  metric?: string;
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
          <span className="text-xs text-[var(--wb-muted)] font-mono uppercase">Telemetry Target</span>
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
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={shouldReduceMotion ? {} : { y: [-6, 6, -6] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <CardPrimitive variant="elevated" padding="lg" className="border-[var(--wb-border)] shadow-xl">
        <CardBadge variant="secondary" className="mb-4">{badge}</CardBadge>
        <CardHeader title={title} />
        <CardBody>{description}</CardBody>
      </CardPrimitive>
    </motion.div>
  );
}
