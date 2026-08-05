export interface Hero {
  title: string;
  subtitle: string;
  button: string;
}

export interface About {
  title: string;
  content: string;
}

export interface Service {
  title: string;
  description: string;
}

export interface Feature {
  title: string;
  description: string;
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

export interface WebsiteData {
  hero: Hero;
  about: About;

  services: Service[];

  features: Feature[];

  faq: FAQ[];

  contact: Contact;

  footer: Footer;
}