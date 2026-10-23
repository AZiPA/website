import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

// Fix Windows sandbox EPERM when Vite uses fs.realpathSync.native
if (fs.realpathSync && fs.realpathSync.native) {
  fs.realpathSync.native = fs.realpathSync;
}

const shimDir = fileURLToPath(new URL("./shims/", import.meta.url));

/** Mermaid's fastdom import is CJS. Serve an ESM shim so dev does not white-screen. */
function fastdomShim() {
  return {
    name: "fastdom-esm-shim",
    enforce: "pre" as const,
    resolveId(id: string) {
      if (id === "fastdom") return shimDir + "fastdom.js";
      if (
        id === "fastdom/extensions/fastdom-promised.js" ||
        id === "fastdom/extensions/fastdom-promised"
      ) {
        return shimDir + "fastdom-promised.js";
      }
    },
  };
}

function siteBase(): string {
  const forced = process.env.DOCS_BASE?.trim();
  if (forced) {
    if (forced === "/") return "/";
    return forced.endsWith("/") ? forced : `${forced}/`;
  }
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo || repo.endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

const repository = process.env.GITHUB_REPOSITORY;
const repoUrl = repository ? `https://github.com/${repository}` : "";
const base = siteBase();

// -------------------------------------------------------------------------
// English Sidebars
// -------------------------------------------------------------------------
const cfEnSidebar = [
  {
    text: "Cloudflare Workers Edition",
    items: [
      { text: "Overview & Architecture", link: "/cloudflare-filestore/architecture" },
      { text: "Cloudflare & D1 Setup", link: "/cloudflare-filestore/cloudflare" },
      { text: "GitHub Secrets", link: "/cloudflare-filestore/secrets" },
      { text: "Webhook & WAF Hardening", link: "/cloudflare-filestore/webhook" },
      { text: "Live Configuration & Logging", link: "/cloudflare-filestore/configuration" },
      { text: "Commands & Roles", link: "/cloudflare-filestore/commands" },
    ],
  },
];

const tgcloudEnSidebar = [
  {
    text: "Telegram Serverless Edition",
    items: [
      { text: "Overview & Architecture", link: "/tgcloud-filestore/architecture" },
      { text: "Setup & Deployment", link: "/tgcloud-filestore/setup" },
      { text: "Live Configuration", link: "/tgcloud-filestore/configuration" },
      { text: "Secrets & Security", link: "/tgcloud-filestore/secrets" },
      { text: "Webhook Management", link: "/tgcloud-filestore/webhook" },
      { text: "Commands & Roles", link: "/tgcloud-filestore/commands" },
    ],
  },
];

// -------------------------------------------------------------------------
// Persian Sidebars
// -------------------------------------------------------------------------
const cfFaSidebar = [
  {
    text: "نسخه Cloudflare Workers",
    items: [
      { text: "معرفی و معماری", link: "/fa/cloudflare-filestore/architecture" },
      { text: "آماده‌سازی Cloudflare و D1", link: "/fa/cloudflare-filestore/cloudflare" },
      { text: "رازهای گیت‌هاب", link: "/fa/cloudflare-filestore/secrets" },
      { text: "وب‌هوک و سخت‌سازی لبه", link: "/fa/cloudflare-filestore/webhook" },
      { text: "پیکربندی زنده و لاگ", link: "/fa/cloudflare-filestore/configuration" },
      { text: "دستورها و نقش‌ها", link: "/fa/cloudflare-filestore/commands" },
    ],
  },
];

const tgcloudFaSidebar = [
  {
    text: "نسخه Telegram Serverless",
    items: [
      { text: "معرفی و معماری", link: "/fa/tgcloud-filestore/architecture" },
      { text: "راه‌اندازی و استقرار", link: "/fa/tgcloud-filestore/setup" },
      { text: "پیکربندی پویا", link: "/fa/tgcloud-filestore/configuration" },
      { text: "رازها و امنیت", link: "/fa/tgcloud-filestore/secrets" },
      { text: "مدیریت وب‌هوک", link: "/fa/tgcloud-filestore/webhook" },
      { text: "دستورها و نقش‌ها", link: "/fa/tgcloud-filestore/commands" },
    ],
  },
];

export default withMermaid(
  defineConfig({
    base,
    title: "FileStore Docs Hub",
    description: "Multi-project documentation hub for Telegram FileStore bots.",
    lang: "en-US",
    titleTemplate: ":title · FileStore Docs Hub",
    lastUpdated: Boolean(process.env.CI),
    cleanUrls: true,
    metaChunk: true,
    appearance: true,
    head: [
      ["link", { rel: "icon", type: "image/svg+xml", href: `${base}logo.svg` }],
      ["meta", { name: "theme-color", content: "#0f766e" }],
    ],
    markdown: {
      theme: { light: "github-light", dark: "github-dark" },
    },
    vite: {
      plugins: [fastdomShim()],
    },
    themeConfig: {
      logo: "/logo.svg",
      siteTitle: "FileStore Docs Hub",
      search: {
        provider: "local",
        options: {
          locales: {
            fa: {
              translations: {
                button: {
                  buttonText: "جست‌وجو",
                  buttonAriaLabel: "جست‌وجو در راهنما",
                },
                modal: {
                  noResultsText: "نتیجه‌ای برای",
                  resetButtonTitle: "پاک کردن جست‌وجو",
                  displayDetails: "نمایش فهرست جزئی",
                  footer: {
                    selectText: "انتخاب",
                    navigateText: "جابه‌جایی",
                    closeText: "بستن",
                  },
                },
              },
            },
          },
        },
      },
      socialLinks: repoUrl ? [{ icon: "github", link: repoUrl }] : [],
      outline: { level: [2, 3] },
    },
    locales: {
      root: {
        label: "English",
        lang: "en-US",
        dir: "ltr",
        title: "FileStore Docs Hub",
        description:
          "Production Telegram FileStore documentation for Cloudflare Workers and Telegram Serverless editions.",
        themeConfig: {
          nav: [
            {
              text: "Projects",
              items: [
                { text: "Cloudflare Workers Edition", link: "/cloudflare-filestore/architecture" },
                { text: "Telegram Serverless Edition", link: "/tgcloud-filestore/architecture" },
              ],
            },
            { text: "Cloudflare Manual", link: "/cloudflare-filestore/architecture" },
            { text: "Serverless Manual", link: "/tgcloud-filestore/architecture" },
          ],
          sidebar: {
            "/cloudflare-filestore/": cfEnSidebar,
            "/tgcloud-filestore/": tgcloudEnSidebar,
          },
          footer: {
            message: "100% Free Forever. Zero operational cost, zero VPS, zero file bytes in bots.",
            copyright: "Telegram FileStore Bot Ecosystem 1.0.0",
          },
          docFooter: { prev: "Previous", next: "Next" },
          outline: { label: "On this page", level: [2, 3] },
          lastUpdated: { text: "Updated" },
          darkModeSwitchLabel: "Appearance",
          lightModeSwitchTitle: "Light",
          darkModeSwitchTitle: "Dark",
          sidebarMenuLabel: "Menu",
          returnToTopLabel: "Back to top",
          langMenuLabel: "Language",
        },
      },
      fa: {
        label: "فارسی",
        lang: "fa-IR",
        dir: "rtl",
        title: "پرتال مستندات فایل‌استور",
        description:
          "پرتال مستندات ربات‌های فایل‌استور تلگرام برای نسخه‌های Cloudflare Workers و Telegram Serverless.",
        themeConfig: {
          nav: [
            {
              text: "پروژه‌ها",
              items: [
                { text: "نسخه Cloudflare Workers", link: "/fa/cloudflare-filestore/architecture" },
                { text: "نسخه Telegram Serverless", link: "/fa/tgcloud-filestore/architecture" },
              ],
            },
            { text: "راهنمای کلودفلر", link: "/fa/cloudflare-filestore/architecture" },
            { text: "راهنمای سرورلس", link: "/fa/tgcloud-filestore/architecture" },
          ],
          sidebar: {
            "/fa/cloudflare-filestore/": cfFaSidebar,
            "/fa/tgcloud-filestore/": tgcloudFaSidebar,
          },
          footer: {
            message: "۱۰۰٪ رایگان برای همیشه. بدون سرور اختصاصی و بدون عبور بایت‌های فایل از ربات.",
            copyright: "اکوسیستم ربات‌های فایل‌استور تلگرام ۱.۰.۰",
          },
          docFooter: { prev: "قبلی", next: "بعدی" },
          outline: { label: "در این صفحه", level: [2, 3] },
          lastUpdated: { text: "به‌روزرسانی" },
          darkModeSwitchLabel: "ظاهر",
          lightModeSwitchTitle: "روشن",
          darkModeSwitchTitle: "تیره",
          sidebarMenuLabel: "منو",
          returnToTopLabel: "بالای صفحه",
          langMenuLabel: "زبان",
        },
      },
    },
  }),
);
