# WebsiteBanja AI

> Autonomous AI Website Studio for Modern Businesses

WebsiteBanja AI is an intelligent platform that designs, plans, and deploys high-converting, accessible, and responsive websites for Indian and global enterprises. Powered by OpenAI GPT-5.6 Luna with specialized Design Intelligence skills, Azure PostgreSQL, and Azure Blob Storage.

---

## Key Features

- **Autonomous Generation**: Synthesize multi-page, feature-complete websites in seconds from natural conversation or business details.
- **Master Design Intelligence**: 19 contextual design intelligence skills (UI/UX, CRO, Typography, SEO, Performance, Accessibility, and more) orchestrated dynamically.
- **Interactive Studio Workspace**: Real-time canvas editing, component customization, and AI Copilot.
- **Enterprise Infrastructure**: Azure PostgreSQL Flexible Server persistence, Azure Blob Storage workspace state, and containerized deployment on Azure Container Apps.
- **Dual Build Experience**: Choose between conversational **Talk with AI Agent** or structured **Use Business Details**.
- **Transparent Pricing**: ₹0 Free Starter and ₹500/month Paid Pro.

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm
- Azure PostgreSQL database
- Azure Blob Storage account
- Supabase Project (for Authentication)
- OpenAI API Key

### Installation

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/websitebanja/websitebanja.git
cd websitebanja
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

```bash
# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Skills & Design Intelligence test suite
node tests/openai_skills_migration.test.mjs
node tests/design_intelligence_skills.test.mjs

# Product UI/UX and flow verification
node tests/product_ui_ux_and_flow.test.mjs
```

---

## Architecture Summary

- **Authentication**: Supabase Auth (JWT & Session verification)
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Storage**: Azure Blob Storage (`@azure/storage-blob`)
- **Hosting**: Azure Container Apps
- **Primary AI**: OpenAI Responses API with GPT-5.6 Luna (`gpt-5.6-luna`)
- **Design Engine**: OpenAI Hosted Skills + Master Design Intelligence

For complete architectural details, see [PROJECT.md](./PROJECT.md).
