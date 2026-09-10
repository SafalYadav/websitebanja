import React from "react";
export {
  websiteJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  authenticFaqs,
  faqPageJsonLd,
} from "@/lib/seo/schemaData";

export interface JsonLdProps {
  data: Record<string, any>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
