export interface Hero {
  title: string;
  subtitle: string;
  button: string;
  image?: string;
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
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  status: "active" | "draft" | "out_of_stock";
  ctaText?: string;
  ctaLink?: string;
  badge?: string;
}

export interface ProductsSectionData {
  title: string;
  subtitle: string;
  products: ProductItem[];
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
  | "section";

export interface ElementSelection {
  sectionKey: string;
  elementPath: string; // e.g. "hero.title", "services[0].description", "products[1].price"
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
  products?: ProductItem[];
  productsSection?: ProductsSectionData;

  sectionOrder?: string[];
  [key: string]:
    | Hero
    | About
    | Service[]
    | Feature[]
    | FAQ[]
    | Contact
    | Footer
    | ProductItem[]
    | ProductsSectionData
    | string[]
    | undefined;
}