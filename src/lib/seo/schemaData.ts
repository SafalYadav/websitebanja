export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://websitebanja.com/#website",
  url: "https://websitebanja.com",
  name: "WebsiteBanja AI",
  description:
    "Autonomous AI website builder that plans, writes, designs, and publishes modern responsive websites in seconds.",
  publisher: {
    "@id": "https://websitebanja.com/#organization",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://websitebanja.com/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: "en-US",
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://websitebanja.com/#organization",
  name: "WebsiteBanja AI",
  url: "https://websitebanja.com",
  logo: {
    "@type": "ImageObject",
    url: "https://websitebanja.com/logo.png",
    width: "512",
    height: "512",
  },
  sameAs: [
    "https://twitter.com/websitebanja",
    "https://github.com/SafalYadav/websitebanja",
  ],
};

export const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://websitebanja.com/#software",
  name: "WebsiteBanja AI",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web Browser",
  url: "https://websitebanja.com",
  description:
    "AI-powered website builder and autonomous web design architect. Create, edit, and publish modern responsive websites instantly.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Autonomous AI Website Generator",
    "Mitra Voice & Text AI Website Architect",
    "Live Visual Studio Editor with Drag-and-Drop",
    "Mobile & Tablet Responsive Previews",
    "1-Click Global Cloud Publishing",
  ],
  author: {
    "@id": "https://websitebanja.com/#organization",
  },
};

export const authenticFaqs = [
  {
    q: "Do I need coding or design skills to use WebsiteBanja?",
    a: "None at all. You simply describe what your business does and our autonomous AI pipeline writes the copy, pairs the palettes, structures the sections, and renders the website in the visual studio.",
  },
  {
    q: "Can I customize the website after the AI builds it?",
    a: "Yes! WebsiteBanja includes a complete visual Studio Editor. You can edit any text, drag and drop sections to reorder them, duplicate sections, adjust brand colors, and add new sections anytime with real-time live preview.",
  },
  {
    q: "How does the Free Plan work?",
    a: "The Free Plan allows up to 3 AI requests per 7-day rolling window, giving you full access to planning, generation, the visual editor, autosave, and free public subdomain publishing at no cost.",
  },
  {
    q: "Is the generated website responsive on mobile and tablet?",
    a: "Absolutely. Every generated layout is built from the ground up to adapt fluidly across Desktop, Tablet, and Mobile screens. You can preview all viewports directly inside the Studio Editor.",
  },
  {
    q: "How does 1-click publishing work?",
    a: "When you are happy with your website, simply click 'Publish' in the Studio toolbar. Your site is deployed immediately to a high-speed global CDN with SSL encryption and a permanent public link.",
  },
];

export const faqPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: authenticFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};
