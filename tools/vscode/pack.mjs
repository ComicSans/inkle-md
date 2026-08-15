/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Copyright 2026 Tobias Reithmeier
 */

/**
 * Packs the extension into a .vsix, which is the only way VS Code has taken
 * an extension since 1.74: a folder copied or linked into
 * `~/.vscode/extensions` is no longer scanned, only what the CLI or the UI
 * installed is.
 *
 * A .vsix is a zip with three things in it - the extension under `extension/`,
 * a manifest, and a content-type table - so it is written here rather than
 * pulled in as a dependency. `vsce` would want a package manager, and this
 * project has none.
 *
 *   node tools/vscode/pack.mjs [--out DIR]
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..', '..');

/** The extension's own files. Everything else in the folder is not shipped. */
const FILES = [
  'package.json',
  'README.md',
  'extension.js',
  'book.mjs',
  'document.mjs',
  'panel.js',
  'panel.css',
];

const argv = process.argv.slice(2);
const outDir = resolve(argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : join(project, 'build'));
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const vsix = join(outDir, `${manifest.publisher}.${manifest.name}-${manifest.version}.vsix`);

const stage = join(outDir, 'vsix-stage');
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'extension'), { recursive: true });

for (const file of FILES) cpSync(join(here, file), join(stage, 'extension', file));

// The compiler, the runtime and the view travel with the extension: an
// installed copy sits in ~/.vscode/extensions and cannot reach the project.
// A checkout still wins over this copy at runtime, see `sourceDir`.
cpSync(join(project, 'src'), join(stage, 'extension', 'vendor', 'src'), { recursive: true });
// `src/` is ES modules, and the nearest package.json is the extension
// manifest, which must not say so - VS Code loads `main` with `require`. One
// package.json of its own inside `vendor/` says it for the copy alone.
writeFileSync(join(stage, 'extension', 'vendor', 'package.json'), '{ "type": "module" }\n');
cpSync(join(project, 'LICENSE'), join(stage, 'extension', 'LICENSE'));

writeFileSync(join(stage, '[Content_Types].xml'), `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="json" ContentType="application/json"/>
<Default Extension="js" ContentType="application/javascript"/>
<Default Extension="mjs" ContentType="application/javascript"/>
<Default Extension="css" ContentType="text/css"/>
<Default Extension="md" ContentType="text/markdown"/>
<Default Extension="vsixmanifest" ContentType="text/xml"/>
</Types>
`);

writeFileSync(join(stage, 'extension.vsixmanifest'), `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="${manifest.name}" Version="${manifest.version}" Publisher="${manifest.publisher}"/>
    <DisplayName>${manifest.displayName}</DisplayName>
    <Description xml:space="preserve">${manifest.description}</Description>
    <Tags>markdown,gamebook,story-weaver</Tags>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${manifest.engines.vscode}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
  </Assets>
</PackageManifest>
`);

rmSync(vsix, { force: true });
// `zip` is what macOS and every Linux has; a zip writer of our own would be
// the one dependency this project would have had to write, and it earns
// nothing that the system tool does not already do.
execFileSync('zip', ['-q', '-r', '-X', vsix, '[Content_Types].xml', 'extension.vsixmanifest', 'extension'], { cwd: stage });
rmSync(stage, { recursive: true, force: true });

process.stdout.write(`${vsix}\n\nInstallieren:\n  "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension "${vsix}"\n`);
