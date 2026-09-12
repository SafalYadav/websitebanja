"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Star, Quote, CheckCircle } from "lucide-react";
import EditableElement from "@/components/editor/EditableElement";
import type { CardFamily } from "@/types/website";
import { CardRenderer } from "@/components/registry/cardRendererRegistry";

export interface ReviewItem {
  name?: string;
  author?: string;
  client?: string;
  title?: string;
  text?: string;
  quote?: string;
  review?: string;
  description?: string;
  role?: string;
  rating?: number;
}

interface ReviewsSectionProps {
  sectionKey?: string;
  reviews?: ReviewItem[] | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  category?: string;
  cardFamily?: CardFamily;
}

function getCategoryReviewsCopy(category?: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor")) {
    return {
      badge: "PATIENT TESTIMONIALS",
      title: "Real Stories of Restored Smiles",
      subtitle: "Read how our gentle, anxiety-free care transformed our patients' health and confidence.",
    };
  }
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining")) {
    return {
      badge: "GUEST EXPERIENCES",
      title: "Praised by Diners & Critics",
      subtitle: "Memorable dining moments, artisan flavors, and warm hospitality.",
    };
  }
  if (cat.includes("architect") || cat.includes("spatial")) {
    return {
      badge: "CLIENT VOICES",
      title: "Trusted by Discerning Commissioners",
      subtitle: "What clients say about our architectural rigor, contextual sensitivity, and spatial artistry.",
    };
  }
  if (cat.includes("agency") || cat.includes("branding") || cat.includes("creative studio")) {
    return {
      badge: "CLIENT ENDORSEMENTS",
      title: "Trusted by High-Growth Brands",
      subtitle: "What founders and creative leaders say about our strategic vision and design execution.",
    };
  }
  if (cat.includes("ceramic") || cat.includes("pottery") || cat.includes("tableware")) {
    return {
      badge: "COLLECTOR REVIEWS",
      title: "Cherished in Homes & Studios Worldwide",
      subtitle: "Read feedback from collectors who live with our handcrafted ceramics every day.",
    };
  }
  if (cat.includes("electric") || cat.includes("service") || cat.includes("trade")) {
    return {
      badge: "VERIFIED REVIEWS",
      title: "Trusted Across the Neighborhood",
      subtitle: "Hundreds of homeowners and businesses rely on our 24/7 master technicians.",
    };
  }
  return {
    badge: "CLIENT FEEDBACK",
    title: "What Our Clients Say",
    subtitle: "Real experiences and genuine endorsements from partners who value our standards.",
  };
}

function getCategoryFallbackReviews(category?: string): Array<{ name: string; text: string; role: string }> {
  const cat = (category || "").toLowerCase();
  if (cat.includes("dental") || cat.includes("clinic") || cat.includes("doctor")) {
    return [
      { name: "Amanda R.", text: "I never thought dental visits could feel this calm. The sedation and care truly erased my anxiety.", role: "Verified Patient" },
      { name: "Michael D.", text: "The team’s professionalism and the soothing environment made all the difference. Seamless and pain-free.", role: "Verified Patient" },
      { name: "Sarah L.", text: "Truly innovative and reassuring! The 3D smile design helped me see my new smile before the procedure.", role: "Verified Patient" },
    ];
  }
  if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("dining") || cat.includes("bistro")) {
    return [
      { name: "Marcus T.", text: "The single-origin pour-over and wild-fermented sourdough are unmatched. Our favorite weekend ritual.", role: "Regular Diner" },
      { name: "Elena V.", text: "Sitting in the sunlit glasshouse with hearth-baked brunch felt like a calm retreat from the city.", role: "Food & Wine Critic" },
      { name: "David K.", text: "Incredible attention to origin and flavor. You can taste the wood-fired craft in every single dish.", role: "Verified Guest" },
    ];
  }
  if (cat.includes("electric") || cat.includes("service") || cat.includes("trade")) {
    return [
      { name: "Robert M.", text: "VoltCraft arrived within 25 minutes on a rainy Friday night. Solved our blown main breaker safely and cleanly.", role: "Homeowner, Mission District" },
      { name: "Sandra P.", text: "Upgraded our 1950s panel for a new EV fast charger. Clear estimate, on-time arrival, and zero surprise fees.", role: "Property Owner" },
      { name: "David L.", text: "Diagnosed a persistent circuit flicker other electricians couldn't solve. Honest, licensed, master-level work.", role: "Commercial Facility Mgr" },
    ];
  }
  if (cat.includes("architect") || cat.includes("design") || cat.includes("spatial")) {
    return [
      { name: "Henrik S.", text: "Komorebi transformed our hillside parcel into a serene sanctuary of mass timber and natural daylight.", role: "Private Estate Client" },
      { name: "Maya B.", text: "Spatial harmony at its finest. Their bioclimatic architectural discipline was inspiring throughout the build.", role: "Design Foundation Director" },
      { name: "Julian W.", text: "Uncompromising spatial rigor and quiet poetry. A landmark achievement in sustainable architecture.", role: "Cultural Commissioner" },
    ];
  }
  if (cat.includes("fashion") || cat.includes("luxury") || cat.includes("atelier")) {
    return [
      { name: "Vivienne C.", text: "The bespoke double-faced cashmere coat is pure tactile poetry. Handcrafted luxury at its absolute pinnacle.", role: "Haute Couture Collector" },
      { name: "Arthur M.", text: "Bespoke tailoring that fits like a second skin. Generational European artistry evident in every stitch.", role: "Private Client" },
      { name: "Claire D.", text: "Unparalleled silhouette control and sustainable silk heritage. An heirloom piece I will cherish for decades.", role: "Fashion Editor" },
    ];
  }
  if (cat.includes("saas") || cat.includes("tech") || cat.includes("ai") || cat.includes("software")) {
    return [
      { name: "Dr. Aris V.", text: "VectorPulse lowered our sub-millisecond retrieval latency by 82%. Essential infrastructure for our agent fleet.", role: "VP of AI Infrastructure" },
      { name: "Priya N.", text: "The real-time semantic caching engine solved our LLM token cost bottleneck on day one.", role: "Principal Systems Architect" },
      { name: "Kevin T.", text: "Rock-solid distributed vector retrieval with unmatched observability and zero downtime.", role: "Lead Machine Learning Eng" },
    ];
  }
  if (cat.includes("e-commerce") || cat.includes("ecommerce") || cat.includes("ceramic") || cat.includes("retail")) {
    return [
      { name: "Naomi H.", text: "The wheel-thrown stoneware has a grounding tactile presence. Truly functional art for daily dining rituals.", role: "Interior Stylist" },
      { name: "Mateo G.", text: "Exquisite wabi-sabi glaze and organic form. Each vessel tells an authentic artisanal story.", role: "Collector" },
      { name: "Chloe R.", text: "Shipped securely with museum-grade care. A timeless centerpiece for our culinary gatherings.", role: "Verified Buyer" },
    ];
  }
  return [
    { name: "Alex M.", text: "Exceptional quality and attentive service from start to finish. Delivered beyond our highest expectations.", role: "Verified Partner" },
    { name: "Jordan T.", text: "Meticulous craft, clear communication, and an uncompromising dedication to excellence.", role: "Satisfied Client" },
    { name: "Taylor S.", text: "Professional, responsive, and truly world-class delivery. We couldn't be happier with the results.", role: "Verified Client" },
  ];
}

export default function ReviewsSection({
  sectionKey = "reviews",
  reviews,
  title,
  subtitle,
  badge,
  category,
  cardFamily,
}: ReviewsSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const defaults = getCategoryReviewsCopy(category);

  const safeTitle = typeof title === "string" && title.trim() ? title : defaults.title;
  const safeSubtitle = typeof subtitle === "string" && subtitle.trim() ? subtitle : defaults.subtitle;
  const safeBadge = typeof badge === "string" && badge.trim() ? badge : defaults.badge;

  const rawReviews = Array.isArray(reviews)
    ? reviews.filter((r): r is ReviewItem => Boolean(r && typeof r === "object"))
    : [];

  const safeReviews = rawReviews.length > 0
    ? rawReviews.map((r, idx) => {
        const name = (r.name || r.author || r.client || r.title || `Client Review ${idx + 1}`).trim();
        const text = (r.text || r.quote || r.review || r.description || "Exceptional quality and attentive service from start to finish.").trim();
        const role = (r.role || "Verified Customer").trim();
        return { name, text, role };
      })
    : getCategoryFallbackReviews(category);

  return (
    <section
      className="relative py-24 sm:py-32 px-6 sm:px-10 border-y overflow-hidden isolate"
      style={{
        backgroundColor: "var(--wb-bg-alt)",
        borderColor: "var(--wb-border)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-sm"
            style={{
              backgroundColor: "var(--wb-surface)",
              borderColor: "var(--wb-border)",
              color: "var(--wb-secondary)",
            }}
          >
            <Quote className="h-3.5 w-3.5" />
            <span>{safeBadge}</span>
          </div>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.title`} elementType="heading" label="Reviews Title" className="w-full">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ color: "var(--wb-fg)" }}>
              {safeTitle}
            </h2>
          </EditableElement>

          <EditableElement sectionKey={sectionKey} elementPath={`${sectionKey}.subtitle`} elementType="paragraph" label="Reviews Subtitle" className="w-full">
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--wb-muted)" }}>
              {safeSubtitle}
            </p>
          </EditableElement>
        </div>

        {/* Testimonials Presentation */}
        {cardFamily === "testimonial-stack" ? (
          <div className="max-w-2xl mx-auto">
            <CardRenderer
              cardFamily="testimonial-stack"
              title={safeReviews[0]?.name || "Client Review"}
              reviews={safeReviews.map((r) => ({
                author: r.name,
                role: r.role,
                text: r.text,
                rating: 5,
              }))}
            />
          </div>
        ) : cardFamily === "stacked" ? (
          <div className="max-w-xl mx-auto">
            <CardRenderer
              cardFamily="stacked"
              title={safeReviews[0]?.name || "Client Review"}
              description={safeReviews[0]?.text}
              details={safeReviews[1]?.text}
              metric={safeReviews[2]?.text}
            />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {safeReviews.map((item, index) => (
              <motion.div
                key={index}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.07 }}
                whileHover={shouldReduceMotion ? {} : { y: -5 }}
                className="group relative rounded-3xl border p-8 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between shadow-xl"
                style={{
                  backgroundColor: "var(--wb-surface)",
                  borderColor: "var(--wb-border)",
                }}
              >
                <div>
                  {/* 5 Stars + Quote Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="h-6 w-6 opacity-20" style={{ color: "var(--wb-muted)" }} />
                  </div>

                  <EditableElement
                    sectionKey={sectionKey}
                    elementPath={`${sectionKey}[${index}].text`}
                    elementType="paragraph"
                    label={`Review ${index + 1} Quote`}
                  >
                    <blockquote className="text-sm sm:text-base leading-relaxed italic" style={{ color: "var(--wb-fg)" }}>
                      &ldquo;{item.text}&rdquo;
                    </blockquote>
                  </EditableElement>
                </div>

                {/* Reviewer Meta */}
                <div className="pt-6 mt-6 border-t border-[var(--wb-border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-xs shadow-inner"
                      style={{
                        backgroundColor: "var(--wb-glow-secondary)",
                        color: "var(--wb-secondary)",
                        borderColor: "var(--wb-border)",
                      }}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: "var(--wb-fg)" }}>
                        {item.name}
                      </h4>
                      <p className="text-[11px]" style={{ color: "var(--wb-muted)" }}>
                        {item.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
