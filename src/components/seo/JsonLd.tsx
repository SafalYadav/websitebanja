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
  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
