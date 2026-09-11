// tests/test_studio_copilot_direct.ts
import assert from "node:assert";
import { executeStudioActions, type StudioAiAction } from "../src/lib/studioAiActions";
import type { WebsiteData } from "../src/types/website";

console.log("=== STARTING STUDIO COPILOT DIRECT VERIFICATION ===");

const initialWebsite: WebsiteData = {
  hero: {
    title: "Welcome to our dental clinic",
    subtitle: "We offer good teeth cleaning and dental services.",
    button: "Contact Us",
    buttonAction: {
      type: "scroll",
      target: "contact"
    }
  },
  about: {
    title: "About Us",
    content: "We are a local clinic in town."
  },
  services: [
    { title: "General Dentistry", description: "Cleaning and exams." }
  ],
  features: [
    { title: "Modern Technology", description: "Digital tools." }
  ],
  faq: [
    { question: "Are you open?", answer: "Yes." }
  ],
  contact: {
    phone: "+919876543210",
    email: "info@elitesmile.com",
    address: "Main Street, Mumbai"
  },
  footer: {
    copyright: "© 2026 Dental"
  },
  sectionOrder: ["hero", "about", "contact"],
  pages: [
    {
      id: "home",
      slug: "",
      title: "Home",
      isHome: true,
      sectionOrder: ["hero", "about", "contact"]
    }
  ]
};

// 1. Test executeStudioActions with set_button_whatsapp and label
console.log("\n[TEST 1] Testing executeStudioActions with set_button_whatsapp and label...");
const whatsappActions: StudioAiAction[] = [
  {
    action: "set_button_whatsapp",
    payload: {
      path: "hero.button",
      label: "Book on WhatsApp",
      phone: "+919876543210"
    },
    summary: "Configured Hero CTA button to Book on WhatsApp"
  }
];

const res1 = executeStudioActions(initialWebsite, whatsappActions);
assert.strictEqual(res1.updatedWebsite.hero.button, "Book on WhatsApp", "Hero button text must be updated");
assert.strictEqual(res1.updatedWebsite.hero.buttonAction?.type, "whatsapp", "Hero buttonAction.type must be whatsapp");
assert.strictEqual(res1.updatedWebsite.hero.buttonAction?.target, "+919876543210", "Hero buttonAction.target must be phone number");
assert.strictEqual(res1.updatedWebsite.hero.buttonAction?.label, "Book on WhatsApp", "Hero buttonAction.label must match");
console.log("✓ TEST 1 PASSED: WhatsApp button action and label updated successfully.");

// 2. Test executeStudioActions with update_text for premium headline
console.log("\n[TEST 2] Testing executeStudioActions with update_text for premium headline...");
const headlineActions: StudioAiAction[] = [
  {
    action: "update_text",
    payload: {
      path: "hero.title",
      text: "Crafting World-Class Smiles with Precision & Luxury Care"
    },
    summary: "Updated Hero title to a premium headline"
  }
];

const res2 = executeStudioActions(initialWebsite, headlineActions);
assert.strictEqual(res2.updatedWebsite.hero.title, "Crafting World-Class Smiles with Precision & Luxury Care");
assert.strictEqual(res2.updatedWebsite.hero.button, "Contact Us", "Other fields must remain intact");
console.log("✓ TEST 2 PASSED: Hero headline updated to premium copy.");

// 3. Test executeStudioActions with custom natural language edit (About section)
console.log("\n[TEST 3] Testing custom edit on about.content...");
const customActions: StudioAiAction[] = [
  {
    action: "update_text",
    payload: {
      path: "about.content",
      text: "With over 10 years of clinical excellence, our award-winning specialists deliver gentle, painless dentistry using state-of-the-art 3D imaging."
    },
    summary: "Updated About story to reflect 10 years of dental excellence"
  }
];

const res3 = executeStudioActions(initialWebsite, customActions);
assert.strictEqual(res3.updatedWebsite.about.content, "With over 10 years of clinical excellence, our award-winning specialists deliver gentle, painless dentistry using state-of-the-art 3D imaging.");
console.log("✓ TEST 3 PASSED: Custom natural-language edit executed.");

// 4. Test Project Isolation
console.log("\n[TEST 4] Testing Project Isolation...");
const projectA_Website = JSON.parse(JSON.stringify(initialWebsite));

const projectB_Website = JSON.parse(JSON.stringify(initialWebsite));

const resA = executeStudioActions(projectA_Website, headlineActions);
assert.strictEqual(resA.updatedWebsite.hero.title, "Crafting World-Class Smiles with Precision & Luxury Care");
assert.strictEqual(projectB_Website.hero.title, "Welcome to our dental clinic", "Project B must be completely unaffected by Project A actions");
console.log("✓ TEST 4 PASSED: Project isolation verified.");

console.log("\n=== ALL STUDIO COPILOT DIRECT UNIT TESTS PASSED ===");
