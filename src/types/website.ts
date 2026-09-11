export type ButtonActionType =
  | "scroll"
  | "page"
  | "url"
  | "whatsapp"
  | "call"
  | "email"
  | "none";

export interface ButtonActionConfig {
  type: ButtonActionType;
  target: string; // section key (e.g. "contact"), page slug / id (e.g. "about"), URL, phone, or email
  label?: string;
}

export interface BrandLogo {
  type: "text" | "image";
  text?: string;
  imageUrl?: string;
}

export interface NavLink {
  id: string;
  label: string;
  action: ButtonActionConfig;
}

export interface NavbarConfig {
  logo?: BrandLogo;
  links?: NavLink[];
}

export interface PageSeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export type BackgroundType =
  | "solid"
  | "tonal_field"
  | "gradient"
  | "dot_grid"
  | "tech_grid"
  | "noise"
  | "full_bleed"
  | "editorial_whitespace";

export interface BackgroundStyleConfig {
  type: BackgroundType;
  color?: string;
  accentColor?: string;
  patternOpacity?: number;
  imageUrl?: string;
  overlayOpacity?: number;
}

export type Spatial3dLevel = "NONE" | "SUBTLE_2_5D" | "ADVANCED_CSS_3D" | "RICH_SPATIAL";

export interface Spatial3dConfig {
  enabled: boolean;
  level: Spatial3dLevel;
  targetSection?: string;
  perspective?: number;
  tiltMaxDeg?: number;
  zSeparationPx?: number;
  mobileFallback: "flat" | "2.5d";
}

export interface ImageIntentConfig {
  subject: string;
  visualStyle: string;
  aspectRatio: string;
  composition: string;
  crop: string;
  purpose: string;
  fallbackType?: "svg_geometric" | "abstract_mesh" | "tonal_composition";
}

export interface DesignStrategyData {
  visualArchetype:
    | "minimal_editorial"
    | "dark_technical"
    | "clean_clinical"
    | "warm_artisanal"
    | "bold_brutalist"
    | "expressive_creative"
    | "luxury_bespoke"
    | "high_trust_service";
  heroType:
    | "split_showcase"
    | "fullscreen_visual"
    | "minimal_editorial"
    | "spatial_depth_hero"
    | "bento_grid_hero"
    | "action_focused";
  colorMood: string;
  typographyStyle: string;
  cardTreatment: "bordered" | "glassmorphic" | "elevated" | "flat_minimal" | "subtle_gradient";
  backgroundStrategy: BackgroundStyleConfig;
  spatial3d: Spatial3dConfig;
  sectionSequence?: string[];
}

export interface Hero {
  title: string;
  subtitle: string;
  button: string;
  image?: string;
  buttonAction?: ButtonActionConfig;
  layoutVariant?: "split_showcase" | "fullscreen_visual" | "minimal_editorial" | "spatial_depth_hero" | "bento_grid_hero" | "action_focused";
  imageIntent?: ImageIntentConfig;
  backgroundStyle?: BackgroundStyleConfig;
  spatial3d?: Spatial3dConfig;
  badges?: string[];
}

export interface About {
  title: string;
  content: string;
  image?: string;
  imageIntent?: ImageIntentConfig;
  backgroundStyle?: BackgroundStyleConfig;
}

export interface Service {
  title: string;
  description: string;
  icon?: string;
  image?: string;
  buttonAction?: ButtonActionConfig;
}

export interface Feature {
  title: string;
  description: string;
  icon?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Contact {
  phone: string;
  email: string;
  address: string;
}

export interface Footer {
  copyright: string;
}

export interface ProductItem {
  id: string;
  project_id?: string;
  name: string;
  description: string;
  item_type?: "product" | "rental" | "service" | "showcase";
  category: string;
  status: "active" | "draft" | "out_of_stock";
  images: string[];
  
  // Backwards compatibility with old `image` field
  image?: string;
  
  price: number;
  originalPrice?: number;
  currencyCode?: string;
  showDiscountBadge?: boolean;
  
  hourly_price?: number;
  daily_price?: number;
  weekly_price?: number;
  monthly_price?: number;
  
  ctaText?: string;
  ctaLink?: string;
  buttonAction?: ButtonActionConfig;
  
  display_order?: number;
  badge?: string;
}

export interface ProductsSectionData {
  title: string;
  subtitle: string;
  products: ProductItem[];
}

export interface SiteLead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  sourcePage?: string;
  createdAt: string;
  read?: boolean;
}

export interface WebsiteVersionSnapshot {
  id: string;
  timestamp: string;
  description: string;
  data: WebsiteData;
}

export interface WebsitePage {
  id: string;
  slug: string; // e.g. "" (home), "about", "services", "products", "contact", "pricing"
  title: string;
  isHome?: boolean;
  sectionOrder: string[];
  seo?: PageSeoConfig;
  [key: string]: unknown;
}

export type ElementType =
  | "heading"
  | "paragraph"
  | "button"
  | "image"
  | "badge"
  | "card"
  | "link"
  | "product"
  | "section"
  | "logo"
  | "page";

export interface ElementSelection {
  sectionKey: string;
  elementPath: string; // e.g. "hero.title", "hero.button", "services[0].title"
  elementType: ElementType;
  label?: string;
  value?: unknown;
}

export interface WebsiteData {
  hero: Hero;
  about: About;
  services: Service[];
  features: Feature[];
  faq: FAQ[];
  contact: Contact;
  footer: Footer;
  productsSection?: ProductsSectionData;

  // Global Branding & Navigation
  navbar?: NavbarConfig;

  // Multi-page website architecture
  pages?: WebsitePage[];
  activePageId?: string;

  // Optional Site Owner Admin Dashboard & Telemetry
  hasAdminDashboard?: boolean;
  leads?: SiteLead[];
  seo?: PageSeoConfig;
  versions?: WebsiteVersionSnapshot[];

  // Design Intelligence Strategy & Spatial Configuration
  designStrategy?: DesignStrategyData;

  sectionOrder?: string[];
  [key: string]: unknown;
}