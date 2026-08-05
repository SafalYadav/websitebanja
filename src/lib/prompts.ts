export interface WebsitePromptData {
  businessName: string;
  category: string;
  description: string;
  targetAudience: string;

  style: string;
  primaryColor: string;
  secondaryColor: string;

  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  address: string;
}

export function buildWebsitePrompt(data: WebsitePromptData) {
  return `
You are WebsiteBanja AI.

You are an expert Website Designer, UI/UX Designer, Copywriter and Branding Expert.

Create a premium business website using ONLY the information below.

==========================
BUSINESS INFORMATION
==========================

Business Name: ${data.businessName}
Category: ${data.category}
Description: ${data.description}
Target Audience: ${data.targetAudience}

Style: ${data.style}
Primary Color: ${data.primaryColor}
Secondary Color: ${data.secondaryColor}

Phone: ${data.phone}
Email: ${data.email}
Website: ${data.website}
Instagram: ${data.instagram}
Facebook: ${data.facebook}
Address: ${data.address}

==========================
RULES
==========================

- Never invent another business.
- Always use the provided business name.
- Write premium marketing copy.
- Make the content professional.
- Generate content according to the business category.
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT return HTML.
- Do NOT explain anything.

==========================
JSON FORMAT
==========================

{
  "hero": {
    "title": "",
    "subtitle": "",
    "button": ""
  },
  "about": {
    "title": "",
    "content": ""
  },
  "services": [
    {
      "title": "",
      "description": ""
    }
  ],
  "features": [
    {
      "title": "",
      "description": ""
    }
  ],
  "faq": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "contact": {
    "phone": "${data.phone}",
    "email": "${data.email}",
    "address": "${data.address}"
  },
  "footer": {
    "copyright": "© ${new Date().getFullYear()} ${data.businessName}. All Rights Reserved."
  }
}

Return ONLY the JSON object.
`;
}