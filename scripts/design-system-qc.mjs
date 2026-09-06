import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const requireText = (file, text, message) => {
  if (!read(file).includes(text)) failures.push(`${file}: ${message}`);
};

const tokenFile = 'app/globals.css';
for (const token of [
  '--font-system:',
  '--font-system-mono:',
  '--control-height:',
  '--tool-content-width:',
  '--motion-fast:',
  '--motion-standard:',
  '--motion-drawer:',
  '--motion-ease:',
  '--chart-1:',
  '--chart-5:',
  '.ds-title',
  '.ds-surface',
  '.ds-control',
  '.ds-receipt',
  '.ds-chart',
])
  requireText(
    tokenFile,
    token,
    `missing required Operator v1 token or primitive ${token}`,
  );

requireText(
  'components/app-shell.tsx',
  'data-design-system="operator-v1"',
  'shell must declare the active design-system version',
);
requireText(
  'components/app-shell.tsx',
  'data-design="equal-tool-hierarchy"',
  'drawer must expose equal task hierarchy',
);
requireText(
  'components/app-shell.tsx',
  'toolDestinationsForGroup(drawerGroup)',
  'drawer must flatten workspaces into equal task destinations',
);
requireText(
  'components/ui/button.tsx',
  'rounded-lg',
  'button geometry must use the shared radius',
);
requireText(
  'components/ui/tool-link-card.tsx',
  'data-design="tool-card"',
  'tool cards must use the shared component',
);
requireText(
  'components/ui/tool-system.tsx',
  'data-design="chart"',
  'chart wrapper must remain available',
);

const uiFiles = [
  ...readdirSync(path.join(root, 'components'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => `components/${entry.name}`),
  ...readdirSync(path.join(root, 'app'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => `app/${entry.name}`),
];
const forbiddenPalette =
  /\b(?:bg|text|border)-(?:red|green|blue|purple|amber|yellow|emerald|lime|cyan|sky|indigo|violet|pink|rose)-/u;
const forbiddenGradient =
  /\b(?:bg-gradient|from-(?:red|green|blue|purple)|to-(?:red|green|blue|purple))/u;
for (const file of uiFiles) {
  const source = read(file);
  if (forbiddenPalette.test(source))
    failures.push(
      `${file}: arbitrary color utility bypasses semantic monochrome tokens`,
    );
  if (forbiddenGradient.test(source))
    failures.push(`${file}: decorative gradient bypasses Operator v1`);
  if (source.includes('<AppShell')) {
    if (!source.includes('id="tool"'))
      failures.push(`${file}: AppShell page lacks the standard #tool root`);
    if (!source.includes('tabIndex={-1}'))
      failures.push(`${file}: #tool root must accept skip-link focus`);
    if (
      source.includes('<h1') &&
      !(source.includes('text-3xl') && source.includes('font-semibold'))
    ) {
      failures.push(
        `${file}: page title does not use the standard display hierarchy`,
      );
    }
  }
}

if (failures.length) {
  process.stderr.write(
    `[DESIGN QC] BLOCKED — ${failures.length} issue(s)\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `[DESIGN QC] PASS — Operator v1 tokens, equal task hierarchy, monochrome palette, shared controls, tool roots, typography, receipt and chart contracts verified across ${uiFiles.length} UI files.\n`,
);
