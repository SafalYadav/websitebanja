// src/lib/audit/htmlParser.ts
/**
 * Lightweight Zero-Dependency HTML DOM Extractor
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Extracts semantic elements, metadata, headings, CTAs, assets, and contact indicators.
 */

export interface ParsedHtmlDocument {
  title?: string;
  metaDescription?: string;
  viewport?: string;
  canonical?: string;
  ogTitle?: string;
  ogImage?: string;
  ogDescription?: string;
  twitterCard?: string;
  lang?: string;
  h1List: string[];
  h2List: string[];
  h3List: string[];
  images: { src?: string; alt?: string; hasAlt: boolean }[];
  links: { href: string; text: string; isPhone: boolean; isEmail: boolean; isWhatsApp: boolean }[];
  buttons: { text: string }[];
  formsCount: number;
  inputsCount: number;
  scriptsCount: number;
  stylesheetsCount: number;
  wordCount: number;
  rawText: string;
}

export function parseHtml(html: string): ParsedHtmlDocument {
  const result: ParsedHtmlDocument = {
    h1List: [],
    h2List: [],
    h3List: [],
    images: [],
    links: [],
    buttons: [],
    formsCount: 0,
    inputsCount: 0,
    scriptsCount: 0,
    stylesheetsCount: 0,
    wordCount: 0,
    rawText: "",
  };

  if (!html || typeof html !== "string") {
    return result;
  }

  // 1. Language attribute on <html>
  const langMatch = /<html[^>]*?\slang=["']([^"']+)["']/i.exec(html);
  if (langMatch) {
    result.lang = langMatch[1].trim();
  }

  // 2. <title>
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch) {
    result.title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  }

  // 3. <meta> tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const attrs = metaMatch[1];
    const nameMatch = /(?:name|property)=["']([^"']+)["']/i.exec(attrs);
    const contentMatch = /content=["']([^"']*?)["']/i.exec(attrs);

    if (nameMatch && contentMatch) {
      const key = nameMatch[1].toLowerCase().trim();
      const val = contentMatch[1].trim();

      if (key === "description") result.metaDescription = val;
      if (key === "viewport") result.viewport = val;
      if (key === "og:title") result.ogTitle = val;
      if (key === "og:image") result.ogImage = val;
      if (key === "og:description") result.ogDescription = val;
      if (key === "twitter:card") result.twitterCard = val;
    }
  }

  // 4. <link rel="canonical">
  const canonicalMatch = /<link\s+[^>]*?rel=["']canonical["'][^>]*?href=["']([^"']+)["']/i.exec(html);
  if (canonicalMatch) {
    result.canonical = canonicalMatch[1].trim();
  }

  // 5. Headings: H1, H2, H3
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1Match: RegExpExecArray | null;
  while ((h1Match = h1Regex.exec(html)) !== null) {
    const text = h1Match[1].replace(/<[^>]+>/g, "").trim();
    if (text) result.h1List.push(text);
  }

  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let h2Match: RegExpExecArray | null;
  while ((h2Match = h2Regex.exec(html)) !== null) {
    const text = h2Match[1].replace(/<[^>]+>/g, "").trim();
    if (text) result.h2List.push(text);
  }

  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let h3Match: RegExpExecArray | null;
  while ((h3Match = h3Regex.exec(html)) !== null) {
    const text = h3Match[1].replace(/<[^>]+>/g, "").trim();
    if (text) result.h3List.push(text);
  }

  // 6. <img> tags
  const imgRegex = /<img\s+([^>]+)>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const attrs = imgMatch[1];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    const altMatch = /alt=["']([^"']*?)["']/i.exec(attrs);

    const hasAlt = altMatch !== null && altMatch[1].trim().length > 0;
    result.images.push({
      src: srcMatch ? srcMatch[1] : undefined,
      alt: altMatch ? altMatch[1] : undefined,
      hasAlt,
    });
  }

  // 7. <a> links
  const aRegex = /<a\s+([^>]*?)href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let aMatch: RegExpExecArray | null;
  while ((aMatch = aRegex.exec(html)) !== null) {
    const href = aMatch[2].trim();
    const text = aMatch[3].replace(/<[^>]+>/g, "").trim();

    const isPhone = href.startsWith("tel:") || /\+?\d{10,12}/.test(href);
    const isEmail = href.startsWith("mailto:");
    const isWhatsApp = href.includes("wa.me") || href.includes("whatsapp.com");

    result.links.push({
      href,
      text,
      isPhone,
      isEmail,
      isWhatsApp,
    });
  }

  // 8. <button> tags
  const btnRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  let btnMatch: RegExpExecArray | null;
  while ((btnMatch = btnRegex.exec(html)) !== null) {
    const text = btnMatch[1].replace(/<[^>]+>/g, "").trim();
    if (text) result.buttons.push({ text });
  }

  // 9. Forms, Inputs, Scripts, Stylesheets
  const formMatches = html.match(/<form\b[^>]*>/gi);
  result.formsCount = formMatches ? formMatches.length : 0;

  const inputMatches = html.match(/<input\b[^>]*>/gi);
  result.inputsCount = inputMatches ? inputMatches.length : 0;

  const scriptMatches = html.match(/<script\b[^>]*>/gi);
  result.scriptsCount = scriptMatches ? scriptMatches.length : 0;

  const styleMatches = html.match(/<link\s+[^>]*?rel=["']stylesheet["']/gi);
  result.stylesheetsCount = styleMatches ? styleMatches.length : 0;

  // 10. Rough text word count
  const strippedText = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  result.rawText = strippedText;
  result.wordCount = strippedText ? strippedText.split(/\s+/).length : 0;

  return result;
}
