// Every docs page, the FAQ and the key facts in one file, built from the same sources as the site.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL, SITE_DESCRIPTION_LONG, GITHUB_URL, REQUIREMENTS, PRO } from "../config/site";
import { FAQ } from "../data/faq";
import { PLAN_ROWS, PRICING_FAQ } from "../data/pricing";
import { PRODUCTS, VS_STATEMENTS, GUIDE_TOOLS, checkedOf } from "../data/compare";
import { FEATURES } from "../lib/jsonld";

export const GET: APIRoute = async () => {
  const docs = (await getCollection("docs")).sort((a, b) => a.data.order - b.data.order);
  const clean = (md: string) => md.replace(/<!--[\s\S]*?-->\n*/g, "").replace(/\]\(\//g, `](${SITE_URL}/`).replace(/^(#{1,5}) /gm, "#$1 ").trim();
  const parts = [
    `# Reelbird\n\n${SITE_DESCRIPTION_LONG}\n\nFeatures:\n${FEATURES.map((f) => `- ${f}`).join("\n")}\n\nWebsite: ${SITE_URL}/\nRepository: ${GITHUB_URL}\nLicence: MIT\nRuns on: ${REQUIREMENTS.runs}. ${REQUIREMENTS.hardware}\nBuilding needs: ${REQUIREMENTS.tools}. ${REQUIREMENTS.toolsDetail}`,
    ...docs.map((d) => `## ${d.data.title}\n\nSource: ${SITE_URL}/docs/${d.id}/\n\n${clean(d.body ?? "")}`),
    `## Pricing\n\nSource: ${SITE_URL}/pricing/\n\nReelbird is free. Reelbird Pro is optional, ${PRO.price} a month, for hosted share links and viewer analytics.\n\n${PLAN_ROWS.map((r) => `- ${r.k}: Free: ${r.free}. Pro: ${r.pro}.`).join("\n")}\n\n${PRICING_FAQ.filter((f) => !FAQ.some((g) => g.q === f.q)).map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}`,
    `## FAQ\n\n${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}`,
    `## How Reelbird compares (facts checked 12 October to 7 November 2026)\n\nSource: ${SITE_URL}/compare/\n\n${VS_STATEMENTS.map((v) => v.text).join("\n\n")}\n\n${PRODUCTS.map((p) => `### ${p.name}\n\n${p.kind}. Price: ${p.price}. Free plan: ${p.freePlan}. Platforms: ${p.platforms}. Open source: ${p.openSource}. Instant share links: ${p.links}. Auto-zoom: ${p.autoZoom}. Keep the file: ${p.download}. Best for: ${p.bestFor} Keep in mind: ${p.keepInMind} Sources: ${p.sources.map((s) => s.href).join(", ")} (checked ${checkedOf(p).label})`).join("\n\n")}\n\n${GUIDE_TOOLS.map((t) => `### ${t.name} (step-by-step guide tool)\n\nPrice: ${t.price}. Free plan: ${t.freePlan}. Platforms: ${t.platforms}. Exports: ${t.exports}. Sources: ${t.sources.map((s) => s.href).join(", ")} (checked ${checkedOf(t).label})`).join("\n\n")}`,
  ];
  return new Response(parts.join("\n\n---\n\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
