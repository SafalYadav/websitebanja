import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://websitebanja.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/agent', '/p/', '/llms.txt', '/sitemap.xml', '/favicon.ico'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/editor/',
          '/builder/',
          '/preview/',
          '/admin/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
        ],
      },
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Applebot',
        ],
        allow: ['/', '/agent', '/p/', '/llms.txt', '/sitemap.xml', '/favicon.ico'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/editor/',
          '/builder/',
          '/preview/',
          '/admin/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
