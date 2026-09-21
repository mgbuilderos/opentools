#!/usr/bin/env node
/**
 * Scores which live guides have, or could honestly have, something distinct to
 * say, so the owner can confirm the `distinct` picks in
 * lib/seo/guide-keep-list.ts. It reads the code; it changes nothing.
 *
 *   npm run seo:guide-distinctness [-- --top 40] [-- --json]
 *
 * First it measures how much of each guide is template: the guide body with the
 * tool's own name, category and slug masked out. Then it scores the evidence
 * that a tool has its own material. Weights (documented, not tuned on data):
 *
 *   +3  dedicated route (its own page, not a ?tool= control in a workbench)
 *   +3  a hand-written blog article is about this exact tool URL
 *   +2  a template links to this exact tool URL
 *   +2  an end-to-end spec exercises the tool's route
 *   +1  the operation states its own notice or limits
 *   +1  the page runs a local model (its privacy section genuinely differs)
 *   +1  release wave P0
 *   -2  another live guide points at the same tool URL (duplicate intent)
 *   -1  another live tool in the category has a near-identical name
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { runnerImport } from 'vite';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const { values } = parseArgs({
  options: {
    top: { type: 'string', default: '40' },
    json: { type: 'boolean', default: false },
  },
});

async function load(relativePath) {
  const { module } = await runnerImport(path.join(appRoot, relativePath), {
    configFile: false,
    root: appRoot,
    logLevel: 'error',
    resolve: { alias: { '@': appRoot } },
  });
  return module;
}

const OPERATION_MODULES = [
  'lib/tools/catalog.ts',
  'lib/tools/creator-workbench.ts',
  'lib/tools/date-workbench.ts',
  'lib/tools/developer-advanced-workbench.ts',
  'lib/tools/developer-data-workbench.ts',
  'lib/tools/document-workbench.ts',
  'lib/tools/file-workbench.ts',
  'lib/tools/finance-business-workbench.ts',
  'lib/tools/life-admin-workbench.ts',
  'lib/tools/math-workbench.ts',
  'lib/tools/productivity-workbench.ts',
  'lib/tools/qr-barcode-workbench.ts',
  'lib/tools/science-education-workbench.ts',
  'lib/tools/spreadsheet-workbench.ts',
  'lib/tools/text-workbench.ts',
  'lib/tools/web-workbench.ts',
  'lib/tools/writing-workbench.ts',
];

const [liveTools, guideContent, blog, templates, csp, ...operationModules] =
  await Promise.all([
    load('lib/seo/live-tools.ts'),
    load('lib/seo/guide-content.ts'),
    load('lib/seo/blog-data.ts'),
    load('lib/templates/templates-data.ts'),
    load('lib/security/content-security-policy.ts'),
    ...OPERATION_MODULES.map(load),
  ]);

/** Operations by id, per module export, for notices. */
const operationsById = new Map();
for (const loaded of operationModules) {
  for (const value of Object.values(loaded)) {
    if (!Array.isArray(value)) continue;
    for (const operation of value) {
      if (operation && typeof operation.id === 'string') {
        const list = operationsById.get(operation.id) ?? [];
        list.push(operation);
        operationsById.set(operation.id, list);
      }
    }
  }
}

const e2eSources = readdirSync(path.join(appRoot, 'e2e'))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => readFileSync(path.join(appRoot, 'e2e', file), 'utf8'))
  .join('\n');

const catalog = liveTools.LIVE_TOOL_CATALOG;
const dedicated = new Set(liveTools.DEDICATED_TOOL_ROUTES);
const blogByUrl = new Map();
for (const post of blog.getAllBlogPosts()) {
  blogByUrl.set(post.toolDestination, [
    ...(blogByUrl.get(post.toolDestination) ?? []),
    post.slug,
  ]);
}
const templatesByUrl = new Map();
for (const template of templates.getAllTemplates()) {
  templatesByUrl.set(template.relatedToolHref, [
    ...(templatesByUrl.get(template.relatedToolHref) ?? []),
    template.slug,
  ]);
}
const guidesByUrl = new Map();
for (const tool of catalog) {
  guidesByUrl.set(tool.destinationUrl, [
    ...(guidesByUrl.get(tool.destinationUrl) ?? []),
    tool.slug,
  ]);
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
/** Guide prose with this tool's own identifiers masked out. */
function templateBody(tool) {
  const guide = guideContent.generateToolGuide(tool);
  let text = [
    guide.metaTitle,
    guide.metaDescription,
    guide.heading,
    guide.directAnswer,
    guide.leadParagraph,
    guide.technicalArchitecture,
    ...guide.steps.flatMap((step) => [step.name, step.text]),
    ...guide.comparison.flatMap((row) => Object.values(row)),
    ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join('\n');
  for (const token of [tool.name, tool.category, tool.slug]) {
    text = text.replace(new RegExp(escape(token), 'giu'), '<X>');
  }
  return text;
}
const bodies = new Map();
for (const tool of catalog) {
  const body = templateBody(tool);
  bodies.set(body, [...(bodies.get(body) ?? []), tool.slug]);
}

const nameWords = (name) =>
  new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((word) => word.length > 2),
  );
function nearDuplicateName(tool) {
  const words = nameWords(tool.name);
  return catalog.find((other) => {
    if (other.slug === tool.slug || other.category !== tool.category) {
      return false;
    }
    const otherWords = nameWords(other.name);
    const shared = [...words].filter((word) => otherWords.has(word)).length;
    const union = new Set([...words, ...otherWords]).size;
    return union > 0 && shared / union >= 0.6;
  });
}

const rows = catalog.map((tool) => {
  const [route, query = ''] = tool.destinationUrl.split('?');
  const operationId = new URLSearchParams(query).get('tool');
  const reasons = [];
  let score = 0;
  const add = (points, reason) => {
    score += points;
    reasons.push(`${points > 0 ? '+' : ''}${points} ${reason}`);
  };

  if (dedicated.has(route) && !operationId) add(3, `own page ${route}`);
  const posts = blogByUrl.get(tool.destinationUrl);
  if (posts) add(3, `blog: ${posts.join(', ')}`);
  const linkedTemplates = templatesByUrl.get(tool.destinationUrl);
  if (linkedTemplates) add(2, `template: ${linkedTemplates.join(', ')}`);
  const e2ePattern = operationId
    ? new RegExp(`tool=${escape(operationId)}\\b`, 'u')
    : new RegExp(`['"\`]${escape(route)}(?:[?#'"\`/]|$)`, 'u');
  if (e2ePattern.test(e2eSources)) add(2, 'e2e spec covers it');
  const operation = operationId
    ? (operationsById.get(operationId) ?? []).find((op) => op.notice)
    : undefined;
  if (operation) add(1, 'states its own notice');
  if (csp.loadsLocalModel(route)) add(1, 'local model');
  if (tool.releaseWave === 'P0') add(1, 'P0');
  const sharing = guidesByUrl.get(tool.destinationUrl);
  if (sharing.length > 1) {
    add(
      -2,
      `same URL as ${sharing.filter((slug) => slug !== tool.slug).join(', ')}`,
    );
  }
  const twin = nearDuplicateName(tool);
  if (twin) add(-1, `name close to ${twin.slug}`);

  return {
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    url: tool.destinationUrl,
    score,
    reasons,
  };
});
rows.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

const summary = {
  liveGuides: catalog.length,
  distinctTemplateBodies: bodies.size,
  largestTemplateGroup: Math.max(...[...bodies.values()].map((g) => g.length)),
  withBlogArticle: rows.filter((row) =>
    row.reasons.some((r) => r.includes('blog:')),
  ).length,
  dedicatedRoutes: rows.filter((row) =>
    row.reasons.some((r) => r.includes('own page')),
  ).length,
  scoreAtLeast3: rows.filter((row) => row.score >= 3).length,
};

if (values.json) {
  process.stdout.write(`${JSON.stringify({ summary, rows }, null, 2)}\n`);
} else {
  const out = (line = '') => process.stdout.write(`${line}\n`);
  out('Guide distinctness report');
  out(`Live guides: ${summary.liveGuides}`);
  out(
    `Guide bodies after masking the tool name/category/slug: ${summary.distinctTemplateBodies} distinct (largest identical group: ${summary.largestTemplateGroup}).`,
  );
  if (summary.largestTemplateGroup / summary.liveGuides >= 0.9) {
    out(
      'So the guide text itself is template-only; the scores below measure material a rewritten guide could draw on.',
    );
  }
  out(
    `Tools with a blog article: ${summary.withBlogArticle}; with their own route: ${summary.dedicatedRoutes}; scoring >= 3: ${summary.scoreAtLeast3}.`,
  );
  out();
  const top = Number(values.top);
  for (const row of rows.slice(0, top)) {
    out(`${String(row.score).padStart(3)}  ${row.slug}  (${row.url})`);
    out(`     ${row.reasons.join('; ')}`);
  }
}
