import { GITHUB_URL, LAUNCH_VIDEO, MIN_MACOS, PREBUILT, PRO, SITE_DESCRIPTION, SITE_NAME, SITE_URL, abs } from "../config/site";

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#software`;

export const organization = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: abs("/icon-512.png"),
  sameAs: [GITHUB_URL],
});

export const website = () => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
  publisher: { "@id": ORG_ID },
  inLanguage: "en",
});

export const FEATURES = [
  "Share link copied the moment you stop recording",
  "Update link replaces the video and keeps the URL",
  "Auto-zoom planned from clicks, with a smooth redrawn cursor",
  "Free share links to your own S3-compatible bucket, such as Cloudflare R2",
  "Optional Reelbird Pro ($5 a month): hosted share links with viewer analytics",
  "Auto level, on-device voice enhance and ducking of system audio",
  "On-device captions in six styles and one-click Clean Up",
  "Step-by-step guide from every recording: a Guide and Click-through on the share link, exported as a web page, Markdown or a Claude skill",
  "Find Sensitive Info: on-device suggestions to blur emails, API keys, card and phone numbers, following scrolling text",
  "Blur, pixelate or redaction bar, plus arrows, boxes, labels and highlights",
  "Camera layouts: bubble, camera only, side by side on a 9:16 canvas, or screen only",
  "Speed any part from 0.25× to 4×, and Speed Up Typing for typing and waiting",
  "Hide Browser Toolbar crops tabs and bookmarks off a browser recording",
  "Export to MP4, HEVC, ProRes or GIF in 16:9, 9:16, 1:1 or 4:3",
  "Crash-safe recording in 2-second segments with live warnings",
  "reelbird command-line tool and MCP server for coding agents",
];

export const softwareApplication = () => ({
  "@type": "SoftwareApplication",
  "@id": APP_ID,
  name: SITE_NAME,
  alternateName: "Reelbird screen recorder",
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}/`,
  downloadUrl: PREBUILT.url,
  installUrl: abs("/download/"),
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "Screen recorder",
  operatingSystem: `${MIN_MACOS} or later`,
  softwareRequirements: "To build: Command Line Tools for Xcode 26 or later (Swift 6.2, macOS 26 SDK), on macOS 15.6 or later",
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  offers: [
    {
      "@type": "Offer",
      name: "Reelbird",
      description: "The app: recording, editing, exporting and sharing to your own bucket. No watermark, no limits, no account.",
      price: "0",
      priceCurrency: "USD",
      url: abs("/download/"),
    },
    {
      "@type": "Offer",
      name: "Reelbird Pro",
      description: `Optional. Reelbird hosts your share links: unlimited links, ${PRO.storage} of storage and viewer analytics. Cancel any time.`,
      price: PRO.priceAmount,
      priceCurrency: PRO.currency,
      category: "Subscription",
      url: abs("/pricing/"),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: PRO.priceAmount,
        priceCurrency: PRO.currency,
        billingDuration: "P1M",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
      },
    },
  ],
  featureList: FEATURES,
  screenshot: abs("/og/home.png"),
  image: abs("/icon-512.png"),
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  sameAs: [GITHUB_URL],
});

export const softwareSourceCode = () => ({
  "@type": "SoftwareSourceCode",
  "@id": `${SITE_URL}/#source`,
  name: `${SITE_NAME} source code`,
  codeRepository: GITHUB_URL,
  programmingLanguage: "Swift",
  runtimePlatform: `${MIN_MACOS} or later`,
  license: "https://opensource.org/licenses/MIT",
  targetProduct: { "@id": APP_ID },
  author: { "@id": ORG_ID },
});

export const techArticle = (o: { title: string; description: string; path: string; dateModified: string }) => ({
  "@type": "TechArticle",
  headline: o.title,
  description: o.description,
  url: abs(o.path),
  dateModified: o.dateModified,
  inLanguage: "en",
  about: { "@id": APP_ID },
  publisher: { "@id": ORG_ID },
});

export const article = (o: { title: string; description: string; path: string; datePublished: string; dateModified?: string; image?: string }) => ({
  "@type": "Article",
  headline: o.title,
  description: o.description,
  url: abs(o.path),
  datePublished: o.datePublished,
  dateModified: o.dateModified ?? o.datePublished,
  inLanguage: "en",
  about: { "@id": APP_ID },
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  image: abs(o.image ?? "/og/home.png"),
});

export const faqPage = (items: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: items.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});

export const breadcrumbs = (trail: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: abs(t.path) })),
});

export const graph = (...nodes: object[]) => ({ "@context": "https://schema.org", "@graph": nodes });

export const videoObject = () => ({
  "@type": "VideoObject",
  "@id": `${SITE_URL}/#launch-film`,
  name: LAUNCH_VIDEO.name,
  description: SITE_DESCRIPTION,
  thumbnailUrl: [`https://i.ytimg.com/vi/${LAUNCH_VIDEO.youtubeId}/maxresdefault.jpg`],
  uploadDate: LAUNCH_VIDEO.uploadDate,
  duration: "PT58S",
  embedUrl: `https://www.youtube.com/embed/${LAUNCH_VIDEO.youtubeId}`,
  contentUrl: `https://www.youtube.com/watch?v=${LAUNCH_VIDEO.youtubeId}`,
  publisher: { "@id": ORG_ID },
  about: { "@id": APP_ID },
});
