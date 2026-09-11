"use client";

import { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Laptop,
  Tablet,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Code2,
  Shield,
  Layers,
  Globe2,
} from "lucide-react";

interface SampleBusiness {
  id: string;
  name: string;
  category: string;
  badge: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
  headline: string;
  subtitle: string;
  cta: string;
  secondaryCta: string;
  stats: { value: string; label: string }[];
  features: { title: string; desc: string }[];
  codeSnippet: string;
}

const SAMPLES: SampleBusiness[] = [
  {
    id: "specialty-coffee",
    name: "Nordic Roast Works",
    category: "Artisan Roastery & Cafe",
    badge: "Specialty Grade Direct-Trade",
    palette: {
      primary: "#D97706",
      secondary: "#92400E",
      accent: "#FDE68A",
      bg: "#181412",
    },
    headline: "Micro-lot beans roasted to pure botanical precision.",
    subtitle: "Direct-trade beans ethically sourced from high-altitude estates in Ethiopia and Colombia, precision-roasted daily in Copenhagen.",
    cta: "Order Fresh Roast Box",
    secondaryCta: "Explore Tasting Notes",
    stats: [
      { value: "88+", label: "Cup Quality Score" },
      { value: "48h", label: "Roast to Delivery" },
      { value: "100%", label: "Direct-Trade Ethos" },
    ],
    features: [
      { title: "Single-Origin Micro-Lots", desc: "Batch traceable to specific washing stations and elevations." },
      { title: "Roaster Subscription", desc: "Curated seasonal discovery box with custom grind profiles." },
      { title: "B2B Wholesale Portal", desc: "Direct ordering and barista calibration for Michelin restaurants." },
    ],
    codeSnippet: `<Section type="hero" theme="nordic-warm">
  <MicroBadge>Direct-Trade Single Origin</MicroBadge>
  <Headline>Micro-lot beans roasted to precision</Headline>
  <CTA href="/shop">Order Fresh Roast Box</CTA>
</Section>`,
  },
  {
    id: "cloud-saas",
    name: "Synapse Pulse AI",
    category: "Distributed Cloud Telemetry",
    badge: "Autonomous Telemetry Engine",
    palette: {
      primary: "#06B6D4",
      secondary: "#3B82F6",
      accent: "#67E8F9",
      bg: "#080E1A",
    },
    headline: "Zero-latency telemetry for high-scale microservices.",
    subtitle: "Identify memory leaks, anomalous latency spikes, and cascade failures before users notice. Deep OpenTelemetry instrumentation in 3 lines of code.",
    cta: "Deploy Cluster Free",
    secondaryCta: "Interactive Sandbox",
    stats: [
      { value: "<1ms", label: "Ingestion Latency" },
      { value: "99.999%", label: "Pipeline SLA" },
      { value: "10M+", label: "Traces Per Second" },
    ],
    features: [
      { title: "Autonomous Root-Cause AI", desc: "Isolate cascading microservice failures in seconds." },
      { title: "Zero-Overhead SDK", desc: "eBPF kernel-level profiling with negligible CPU footprint." },
      { title: "SOC2 Type II Certified", desc: "End-to-end payload encryption with client-managed keys." },
    ],
    codeSnippet: `<TelemetryPipeline engine="autonomous-ai">
  <Sensor rate="10M/s" protocol="OTel" />
  <AnomalyDetection model="neural-forecast" threshold={0.99} />
  <EdgeAlert channels={["slack", "pagerduty"]} />
</TelemetryPipeline>`,
  },
  {
    id: "boutique-dental",
    name: "Lumina Studio Dental",
    category: "Cosmetic & Implant Dentistry",
    badge: "Next-Gen Pain-Free Dentistry",
    palette: {
      primary: "#0D9488",
      secondary: "#0F766E",
      accent: "#99F6E4",
      bg: "#041B18",
    },
    headline: "Mastercrafted smiles with calming, spa-grade comfort.",
    subtitle: "Biomimetic restorations, guided 3D implants, and same-day porcelain veneers in a soothing aromatherapy suite.",
    cta: "Reserve Smile Consultation",
    secondaryCta: "Take 3D Virtual Tour",
    stats: [
      { value: "4,800+", label: "Verified Smiles" },
      { value: "0%", label: "Discomfort Protocol" },
      { value: "Same-Day", label: "Porcelain Milling" },
    ],
    features: [
      { title: "Gentle Sleep Dentistry", desc: "Compassionate anxiety-free sedation for restorative treatments." },
      { title: "AI Smile Simulation", desc: "Preview your exact post-treatment aesthetic in high-definition." },
      { title: "Direct Insurance Concierge", desc: "Transparent pre-authorizations and seamless claim filing." },
    ],
    codeSnippet: `<ClinicProfile specialty="cosmetic-surgery">
  <ComfortSuite sedation="calm-conscious" />
  <DigitalMilling precision="sub-micron" turnaround="same-day" />
  <ConciergeBook calendar="instant-sync" />
</ClinicProfile>`,
  },
  {
    id: "prime-estates",
    name: "Aura Prime Estates",
    category: "Architectural Real Estate",
    badge: "Private Architectural Portfolio",
    palette: {
      primary: "#B45309",
      secondary: "#78350F",
      accent: "#FDE68A",
      bg: "#14100C",
    },
    headline: "Curated sanctuaries for discerning collectors.",
    subtitle: "Private access to waterfront penthouses, mid-century architectural icons, and off-market estates worldwide.",
    cta: "Request Confidential Access",
    secondaryCta: "Browse Portfolio",
    stats: [
      { value: "$1.4B+", label: "Closed Volume" },
      { value: "42", label: "Private Estates" },
      { value: "Off-Market", label: "Exclusive Access" },
    ],
    features: [
      { title: "Off-Market Escrow", desc: "Strict NDAs and discrete transactions for institutional estates." },
      { title: "Virtual Drone Tours", desc: "4K cinematic aerials and spatial walkthroughs." },
      { title: "Architectural Heritage", desc: "Verified provenance and historical preservation certs." },
    ],
    codeSnippet: `<PortfolioCatalog privacy="discrete">
  <Property id="villa-cielo" location="Monaco" />
  <VirtualTour fidelity="8k-spatial" />
  <BrokerConcierge encrypted={true} />
</PortfolioCatalog>`,
  },
];

export default function InteractiveDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<SampleBusiness>(SAMPLES[0]);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");
  const [isGenerating, setIsGenerating] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  // Physical spring kinematics for organic deceleration
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 24,
    mass: 0.8,
    restDelta: 0.001,
  });

  // Dynamic Camera & Chassis Transforms
  const perspectiveVal = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? "1600px" : "1800px", "1400px"]);
  const rotateX = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 20, 0]);
  const rotateY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -3, 0]);
  const rotateZ = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -1, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 1 : 0.90, 1]);
  const translateY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 60, 0]);
  const translateZ = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -45, 0]);

  // Ambient lighting & specular reflection
  const ambientGlowOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.25, 0.55, 0.8]);
  const ambientGlowScale = useTransform(smoothProgress, [0, 1], [0.85, 1.15]);
  const sheenTranslateX = useTransform(smoothProgress, [0, 1], ["-140%", "160%"]);
  const sheenOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.75, 0.45, 0.15]);

  // Decoupled Telemetry HUD Wings (Plane 5)
  const hudZ = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 85, 0]);
  const hudLeftX = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -45, 0]);
  const hudLeftY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -16, 0]);
  const hudLeftRotateY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 7, 0]);

  const hudRightX = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 45, 0]);
  const hudRightY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : 16, 0]);
  const hudRightRotateY = useTransform(smoothProgress, [0, 1], [shouldReduceMotion ? 0 : -7, 0]);

  function handleSelect(sample: SampleBusiness) {
    if (sample.id === selected.id) return;
    setIsGenerating(true);
    setTimeout(() => {
      setSelected(sample);
      setIsGenerating(false);
    }, 250);
  }

  // Device width constraints for realistic simulation
  const deviceWidthClass =
    device === "mobile"
      ? "max-w-[375px]"
      : device === "tablet"
      ? "max-w-[768px]"
      : "max-w-full";

  return (
    <motion.section
      id="studio-demo"
      ref={containerRef}
      style={{ perspective: perspectiveVal }}
      className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-visible"
      aria-label="Interactive Studio Demo"
    >
      {/* Background ambient lighting and dot grid - wrapped in overflow-hidden */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          style={{
            opacity: ambientGlowOpacity,
            scale: ambientGlowScale,
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[960px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-indigo-600/20 blur-[140px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/60 dark:border-cyan-800/40 px-3.5 py-1.5 rounded-full inline-block">
            Live Studio Interactive Workbench
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
            Test drive the website generator
          </h2>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Switch industries and viewports below to preview how WebsiteBanja dynamically synthesizes bespoke layouts, color systems, and persuasive copy.
          </p>
        </div>

        {/* Master Studio Frame with 3D Matrix Transforms */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            rotateZ,
            scale,
            y: translateY,
            z: translateZ,
            transformStyle: "preserve-3d",
          }}
          className="w-full max-w-6xl mx-auto rounded-3xl border border-zinc-200/90 bg-white/95 p-3 sm:p-6 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-2xl dark:border-white/12 dark:bg-[#0A0B10]/95 relative"
        >
          {/* Specular Light Reflection Glare Layer */}
          {!shouldReduceMotion && (
            <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden z-40">
              <motion.div
                style={{
                  x: sheenTranslateX,
                  opacity: sheenOpacity,
                }}
                className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent w-full h-full"
              />
            </div>
          )}

          {/* Left Telemetry Wing: Layout Architecture */}
          <motion.div
            style={{
              x: hudLeftX,
              y: hudLeftY,
              z: hudZ,
              rotateY: hudLeftRotateY,
              transformStyle: "preserve-3d",
            }}
            className="hidden md:flex absolute -top-8 -left-6 lg:-left-10 items-center gap-3.5 rounded-2xl border border-cyan-500/35 bg-white/95 p-3.5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-cyan-500/30 dark:bg-[#0b0f17]/95 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] max-w-[270px] z-50 pointer-events-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                Layout Architecture
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Bespoke Component Assembly
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Fluid Responsive Engine
              </div>
            </div>
          </motion.div>

          {/* Right Telemetry Wing: Edge Infrastructure */}
          <motion.div
            style={{
              x: hudRightX,
              y: hudRightY,
              z: hudZ,
              rotateY: hudRightRotateY,
              transformStyle: "preserve-3d",
            }}
            className="hidden md:flex absolute -bottom-8 -right-6 lg:-right-10 items-center gap-3.5 rounded-2xl border border-blue-500/35 bg-white/95 p-3.5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-blue-500/30 dark:bg-[#0b0f17]/95 dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] max-w-[280px] z-50 pointer-events-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Edge Infrastructure
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Instant Global CDN Delivery
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                100/100 Core Web Vitals • 0ms Delay
              </div>
            </div>
          </motion.div>
          {/* Studio Workbench Control Bar */}
          <div className="flex flex-col gap-4 pb-5 border-b border-zinc-200/80 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Studio Telemetry Indicator */}
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Live Studio Workbench
                </span>
                <span className="hidden sm:inline rounded-md bg-zinc-100 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  ⚡ 38ms synthesis
                </span>
              </div>

              {/* Viewport Modes & Inspector Tabs */}
              <div className="flex items-center gap-2">
                {/* View Mode: Visual vs Code */}
                <div className="flex items-center rounded-xl border border-zinc-200/90 bg-zinc-100/90 p-1 dark:border-white/10 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setActiveTab("visual")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      activeTab === "visual"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Render</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("code")}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      activeTab === "code"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Design Tokens</span>
                  </button>
                </div>

                {/* Device Switcher */}
                <div className="flex items-center rounded-xl border border-zinc-200/90 bg-zinc-100/90 p-1 dark:border-white/10 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setDevice("desktop")}
                    aria-label="Desktop viewport"
                    title="Desktop 1440px"
                    className={`rounded-lg p-1.5 transition cursor-pointer ${
                      device === "desktop"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Laptop className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("tablet")}
                    aria-label="Tablet viewport"
                    title="Tablet 768px"
                    className={`rounded-lg p-1.5 transition cursor-pointer ${
                      device === "tablet"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Tablet className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice("mobile")}
                    aria-label="Mobile viewport"
                    title="Mobile 375px"
                    className={`rounded-lg p-1.5 transition cursor-pointer ${
                      device === "mobile"
                        ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preset Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap mr-1">
                Synthesize Industry:
              </span>
              {SAMPLES.map((sample) => {
                const isActive = sample.id === selected.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelect(sample)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900"
                        : "border border-zinc-200/90 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shadow-xs"
                      style={{ backgroundColor: sample.palette.primary }}
                    />
                    <span>{sample.name}</span>
                    <span className="text-[10px] opacity-70">({sample.category.split(" ")[0]})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Viewport Frame with Simulated Browser Shell */}
          <div className="mt-5 flex justify-center overflow-hidden rounded-2xl bg-zinc-950/70 p-2 sm:p-5 border border-zinc-200/60 dark:border-white/10">
            <motion.div
              layout={!shouldReduceMotion}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#040406] text-zinc-100 shadow-2xl transition-all duration-300 ${deviceWidthClass}`}
              style={{ minHeight: "480px" }}
            >
              {/* Simulated Browser Chrome Bar */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4 py-2.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-zinc-900/90 px-3 py-1 font-mono text-[11px] text-zinc-300 border border-zinc-800">
                  <Shield className="h-3 w-3 text-emerald-400" />
                  <span>https://{selected.id}.websitebanja.live</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-mono text-zinc-500 uppercase">
                    {device} • 100%
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Inner Content Area: Visual Website Canvas vs Code / Tokens */}
              <div className="relative p-5 sm:p-8 overflow-y-auto max-h-[580px]">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-80 flex-col items-center justify-center gap-3 text-center"
                    >
                      <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
                      <p className="text-sm font-semibold text-zinc-300">
                        Synthesizing bespoke copywriting, palette tokens & responsive sections...
                      </p>
                      <span className="font-mono text-xs text-zinc-500">
                        Applying Bespoke Brand Styling
                      </span>
                    </motion.div>
                  ) : activeTab === "code" ? (
                    /* Code / Token Inspector */
                    <motion.div
                      key={`code-${selected.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4 font-mono text-xs"
                    >
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span className="text-cyan-400 font-bold">Brand Theme & Color Harmony</span>
                          <span className="text-zinc-500">Industry: {selected.category}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">Primary Color</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-md border border-white/20 shadow-xs"
                                style={{ backgroundColor: selected.palette.primary }}
                              />
                              <span className="text-zinc-300">{selected.palette.primary}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">Secondary Color</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-md border border-white/20 shadow-xs"
                                style={{ backgroundColor: selected.palette.secondary }}
                              />
                              <span className="text-zinc-300">{selected.palette.secondary}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">Accent Color</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-md border border-white/20 shadow-xs"
                                style={{ backgroundColor: selected.palette.accent }}
                              />
                              <span className="text-zinc-300">{selected.palette.accent}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px]">Background Canvas</span>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-md border border-white/20 shadow-xs"
                                style={{ backgroundColor: selected.palette.bg }}
                              />
                              <span className="text-zinc-300">{selected.palette.bg}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                        <span className="text-zinc-400 font-bold block mb-2">
                          Generated Component Architecture
                        </span>
                        <pre className="text-zinc-300 overflow-x-auto text-[11px] leading-relaxed">
                          <code>{selected.codeSnippet}</code>
                        </pre>
                      </div>
                    </motion.div>
                  ) : (
                    /* Live Visual Render */
                    <motion.div
                      key={`visual-${selected.id}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-8"
                    >
                      {/* Simulated In-Site Navbar */}
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-4 w-4 rounded-full shadow-xs"
                            style={{ backgroundColor: selected.palette.primary }}
                          />
                          <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                            {selected.name}
                          </span>
                        </div>

                        <div className="hidden sm:flex items-center gap-5 text-xs text-zinc-400">
                          <span>Services</span>
                          <span>Portfolio</span>
                          <span>About</span>
                        </div>

                        <button
                          type="button"
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90"
                          style={{ backgroundColor: selected.palette.primary }}
                        >
                          Contact
                        </button>
                      </div>

                      {/* Simulated Hero Section */}
                      <div className="text-center py-4 sm:py-8 max-w-2xl mx-auto space-y-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide"
                          style={{
                            backgroundColor: `${selected.palette.primary}20`,
                            color: selected.palette.accent || selected.palette.primary,
                            border: `1px solid ${selected.palette.primary}40`,
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {selected.badge}
                        </span>

                        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                          {selected.headline}
                        </h2>

                        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl mx-auto">
                          {selected.subtitle}
                        </p>

                        {/* CTAs */}
                        <div className="pt-2 flex flex-wrap justify-center gap-3">
                          <button
                            type="button"
                            className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:opacity-95 active:scale-95 flex items-center gap-2"
                            style={{
                              background: `linear-gradient(135deg, ${selected.palette.primary}, ${selected.palette.secondary})`,
                            }}
                          >
                            <span>{selected.cta}</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
                          >
                            {selected.secondaryCta}
                          </button>
                        </div>
                      </div>

                      {/* Metric Counters Banner */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 py-4 border-y border-zinc-800/80 bg-zinc-950/40 rounded-xl px-3">
                        {selected.stats.map((stat) => (
                          <div key={stat.label} className="text-center">
                            <span
                              className="font-mono text-lg sm:text-2xl font-black block"
                              style={{ color: selected.palette.accent }}
                            >
                              {stat.value}
                            </span>
                            <span className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                              {stat.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Feature Cards Matrix */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {selected.features.map((feat) => (
                          <div
                            key={feat.title}
                            className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-1.5 transition hover:border-zinc-700"
                          >
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: selected.palette.primary }}
                              />
                              <h4 className="text-xs font-bold text-white leading-snug">
                                {feat.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed pl-5">
                              {feat.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
