const CONTACT_SECTIONS = new Set([
  "contact",
  "booking",
  "reservation",
  "inquiry",
  "appointment",
  "lead_capture",
  "get_in_touch",
]);

/**
 * Canonical page-flow invariant: one conversion/contact section immediately
 * before the footer. This is shared by generation, repair, and rendering so
 * legacy previews cannot regress to a mid-page contact form.
 */
export function placeContactAtEnd(sectionOrder: string[]): string[] {
  const clean = sectionOrder.filter((section, index) =>
    Boolean(section) && sectionOrder.indexOf(section) === index
  );
  const contact = clean.find((section) => CONTACT_SECTIONS.has(section.toLowerCase()));
  const content = clean.filter((section) =>
    section.toLowerCase() !== "footer" && !CONTACT_SECTIONS.has(section.toLowerCase())
  );
  return [...content, ...(contact ? [contact] : []), "footer"];
}

export function isContactSection(section: string): boolean {
  return CONTACT_SECTIONS.has(section.toLowerCase());
}

export function resolveSectionTarget(requestedTarget: string, sectionOrder: string[]): string {
  const cleanTarget = requestedTarget.replace(/^#/, "").replace(/^wb-section-/, "");
  if (sectionOrder.includes(cleanTarget)) return cleanTarget;
  if (isContactSection(cleanTarget)) {
    return sectionOrder.find(isContactSection) ?? cleanTarget;
  }
  return cleanTarget;
}

export function sectionAnchorHref(requestedTarget: string, sectionOrder: string[]): string {
  return `#wb-section-${resolveSectionTarget(requestedTarget, sectionOrder)}`;
}
