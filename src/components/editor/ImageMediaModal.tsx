"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UploadCloud,
  Globe,
  Sparkles,
  Check,
  Search,
  RefreshCw,
  Crop,
  RotateCcw,
  Target,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getStorageClient } from "@/lib/storage";
import { toast } from "@/store/toastStore";

export interface ImageSelectedPayload {
  url: string;
  fit?: "cover" | "contain" | "natural";
  focalPoint?: string;
}

interface ImageMediaModalProps {
  isOpen: boolean;
  currentUrl?: string;
  originalUrl?: string;
  initialFit?: "cover" | "contain" | "natural";
  initialFocalPoint?: string;
  onClose: () => void;
  onSelectImage: (newUrl: string, metadata?: { fit?: "cover" | "contain" | "natural"; focalPoint?: string }) => void;
  title?: string;
  projectId?: string;
}

const STOCK_CATEGORIES = [
  {
    name: "Restaurant & Cafe",
    images: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Dental & Medical",
    images: [
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "SaaS & Technology",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Architecture & Interior",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Luxury Fashion",
    images: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Ceramics & Tableware",
    images: [
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1590736969955-71cc94801759?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Trades & Services",
    images: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505798577917-a65157d3320a?w=1200&auto=format&fit=crop&q=80",
    ],
  },
  {
    name: "Creative Agency",
    images: [
      "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&auto=format&fit=crop&q=80",
    ],
  },
];

export default function ImageMediaModal({
  isOpen,
  currentUrl,
  originalUrl,
  initialFit = "cover",
  initialFocalPoint = "50% 50%",
  onClose,
  onSelectImage,
  title = "Image Controls & Replacement",
  projectId,
}: ImageMediaModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "url" | "crop">("library");
  const [selectedUrl, setSelectedUrl] = useState(currentUrl || "");
  const [customUrl, setCustomUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Restaurant & Cafe");
  const [isUploading, setIsUploading] = useState(false);

  // Framing & Focal Point Controls
  const [fit, setFit] = useState<"cover" | "contain" | "natural">(initialFit);
  const [focalPoint, setFocalPoint] = useState<string>(initialFocalPoint);

  const previewBoxRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Please select an image under 5MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", "Only JPG, PNG, and WebP images are supported.");
      return;
    }

    setIsUploading(true);
    try {
      const projectPrefix = projectId ? `${projectId}/` : "general/";
      const fileName = `${projectPrefix}uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storage = getStorageClient("project-assets");
      const { data, error } = await storage.upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error || !data) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setSelectedUrl(base64);
          setIsUploading(false);
          toast.success("Image Loaded", "Uploaded image preview ready.");
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: publicData } = storage.getPublicUrl(data.path);
      setSelectedUrl(publicData.publicUrl);
      toast.success("Upload Complete", "Image uploaded successfully.");
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedUrl(base64);
        toast.success("Image Loaded", "Image loaded from local device.");
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = () => {
    const finalUrl = activeTab === "url" && customUrl.trim() ? customUrl.trim() : selectedUrl;
    if (finalUrl) {
      onSelectImage(finalUrl, {
        fit,
        focalPoint,
      });
    }
    onClose();
  };

  const handleResetOriginal = () => {
    if (originalUrl) {
      setSelectedUrl(originalUrl);
      setFit(initialFit || "cover");
      setFocalPoint(initialFocalPoint || "50% 50%");
      toast.success("Reset Complete", "Reverted to original image.");
    }
  };

  // Interactive 2D Focal Reticle Click Handler
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewBoxRef.current) return;
    const rect = previewBoxRef.current.getBoundingClientRect();
    const xPct = Math.round(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100)));
    setFocalPoint(`${xPct}% ${yPct}%`);
  };

  const categoryImages =
    STOCK_CATEGORIES.find((c) => c.name === selectedCategory)?.images ||
    STOCK_CATEGORIES[0].images;

  const displayUrl = activeTab === "url" && customUrl.trim() ? customUrl.trim() : selectedUrl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          data-testid="studio-image-modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select stock photos, upload brand assets, and adjust framing & focal point.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive Visual Live Preview & Focal Positioner */}
          <div className="bg-zinc-100 dark:bg-zinc-900/70 p-4 border-b border-zinc-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Preview with 2D Focal Reticle */}
              <div
                ref={previewBoxRef}
                onClick={handlePreviewClick}
                className="relative h-44 w-full sm:w-72 rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 cursor-crosshair border border-zinc-300 dark:border-white/15 select-none shrink-0 group/focal"
                title="Click anywhere to position the focal focus center"
              >
                {displayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayUrl}
                    alt="Preview"
                    style={{
                      objectFit: fit === "natural" ? "contain" : fit,
                      objectPosition: focalPoint,
                    }}
                    className="w-full h-full transition-all duration-300 pointer-events-none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    No image selected
                  </div>
                )}

                {/* Animated Focal Target Crosshair */}
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-all duration-150 flex items-center justify-center"
                  style={{
                    left: focalPoint.split(" ")[0] || "50%",
                    top: focalPoint.split(" ")[1] || "50%",
                  }}
                >
                  <div className="h-7 w-7 rounded-full border-2 border-white shadow-lg bg-violet-600/40 flex items-center justify-center animate-pulse">
                    <Target className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>

                <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-black/65 text-[10px] font-mono text-white pointer-events-none backdrop-blur-xs">
                  Focal: {focalPoint}
                </div>
              </div>

              {/* Framing & Quick Focal Controls */}
              <div className="flex-1 space-y-3 w-full">
                {/* Fit Mode Selector */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                    Image Fit
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "cover", label: "Cover (Fill)", icon: Maximize2 },
                        { id: "contain", label: "Contain (Fit)", icon: Minimize2 },
                        { id: "natural", label: "Natural", icon: Crop },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setFit(mode.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
                          fit === mode.id
                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                            : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:border-violet-400"
                        }`}
                      >
                        <mode.icon className="h-3 w-3" />
                        <span>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Focal Presets */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1.5">
                    Quick Focal Point
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: "Top (Faces)", val: "50% 18%" },
                      { label: "Upper Center", val: "50% 38%" },
                      { label: "Center", val: "50% 50%" },
                      { label: "Bottom", val: "50% 82%" },
                    ].map((pos) => (
                      <button
                        key={pos.val}
                        type="button"
                        onClick={() => setFocalPoint(pos.val)}
                        className={`py-1 px-2 rounded-lg text-[11px] font-semibold transition border text-center ${
                          focalPoint === pos.val
                            ? "bg-violet-600/15 text-violet-600 border-violet-500 dark:bg-violet-500/20 dark:text-violet-300 font-bold"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-zinc-300"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 px-6 pt-3 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "library"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              Curated Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "upload"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload Local File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
                activeTab === "url"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Direct Image URL
            </button>
          </div>

          {/* Tab Contents (Scrollable) */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "library" && (
              <div className="space-y-4">
                {/* Category Chips */}
                <div className="flex flex-wrap gap-2">
                  {STOCK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        selectedCategory === cat.name
                          ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Stock Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {categoryImages.map((img) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setSelectedUrl(img)}
                      className={`group relative aspect-4/3 overflow-hidden rounded-2xl border-2 transition ${
                        selectedUrl === img
                          ? "border-violet-600 ring-4 ring-violet-500/20"
                          : "border-zinc-200 hover:border-violet-400 dark:border-white/10"
                      }`}
                    >
                      <Image
                        src={img}
                        alt="Preset choice"
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                        unoptimized
                      />
                      {selectedUrl === img && (
                        <div className="absolute inset-0 flex items-center justify-center bg-violet-600/40 backdrop-blur-xs">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-violet-600 shadow-lg">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "upload" && (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center transition hover:border-violet-500 hover:bg-violet-50/30 dark:border-white/15 dark:bg-zinc-900/50 cursor-pointer">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Uploading image asset...
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-violet-600 dark:text-violet-400 mb-2" />
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        Click to select photo or drag and drop
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        PNG, JPG, WebP up to 5MB
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {selectedUrl && (
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-900">
                    <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                      <Image
                        src={selectedUrl}
                        alt="Uploaded preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 truncate">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Selected Image
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate block">
                        {selectedUrl.startsWith("data:") ? "Local preview asset" : selectedUrl}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Direct Image URL
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                  />
                </div>

                {customUrl.trim() && (
                  <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
                    <Image
                      src={customUrl.trim()}
                      alt="URL preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-white/10 dark:bg-zinc-900/40 shrink-0">
            <div>
              {originalUrl && originalUrl !== selectedUrl && (
                <button
                  type="button"
                  onClick={handleResetOriginal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition"
              >
                <Check className="h-4 w-4" />
                Apply Image & Framing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
