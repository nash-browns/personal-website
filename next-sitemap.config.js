const { readFile } = require('node:fs/promises');
const path = require('node:path');

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.nashbrowns.com',
  generateRobotsTxt: true,
  autoLastmod: false,
  exclude: ['/api/*', '/partners/dashboard', '/partners/users', '/signup', '/forgot-password'],
  // Allow crawlers to read noindex tags; hiding drafts in robots.txt would prevent that.
  robotsTxtOptions: { policies: [{ userAgent: '*', allow: '/' }] },
  async transform(config, loc) {
    const { sitemapEntryFromHtml } = await import('./lib/seo/sitemap.mjs');
    const filename = loc === '/' ? 'index' : loc.slice(1);
    let html;
    try {
      html = await readFile(path.join(config.sourceDir, 'server/app', `${filename}.html`), 'utf8');
    } catch (error) {
      // Icons and routes without a generated HTML page have no static page entry.
      if (error.code === 'ENOENT') return null;
      throw error;
    }
    return sitemapEntryFromHtml(html, loc);
  },
}
