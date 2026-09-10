import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://websitebanja.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/agent', '/p/'],
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
        userAgent: ['Googlebot', 'Bingbot'],
        allow: ['/', '/agent', '/p/'],
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
