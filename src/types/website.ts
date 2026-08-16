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

export interface Hero {
  title: string;
  subtitle: string;
  button: string;
  image?: string;
  buttonAction?: ButtonActionConfig;
}

export interface About {
  title: string;
  content: string;
  image?: string;
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

  sectionOrder?: string[];
  [key: string]: unknown;
}