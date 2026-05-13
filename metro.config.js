const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Block the marketing site from the Metro bundle. The `landing/` directory is
// a separate Next.js project (see landing/README.md) — Metro must never
// resolve or watch anything inside it, otherwise its node_modules + Next.js
// app code would leak into the mobile bundle.
const blocked = [
  new RegExp(`${path.resolve(__dirname, 'landing').replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`),
];

config.resolver = config.resolver ?? {};
config.resolver.blockList = blocked;

config.watchFolders = (config.watchFolders ?? []).filter(
  (folder) => !folder.startsWith(path.resolve(__dirname, 'landing')),
);

module.exports = withNativeWind(config, { input: './global.css' });
