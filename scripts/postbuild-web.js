const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const htmlPath = path.join(distDir, 'index.html');
const iconSource = path.join(projectRoot, 'assets', 'icon.png');
const appleIconName = 'apple-touch-icon.png';
const appleIconDest = path.join(distDir, appleIconName);
const manifestName = 'site.webmanifest';
const manifestPath = path.join(distDir, manifestName);
const android192Name = 'android-chrome-192x192.png';
const android512Name = 'android-chrome-512x512.png';
const android192Dest = path.join(distDir, android192Name);
const android512Dest = path.join(distDir, android512Name);

if (!fs.existsSync(htmlPath)) {
  throw new Error(`Missing build output: ${htmlPath}`);
}

if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, appleIconDest);
  fs.copyFileSync(iconSource, android192Dest);
  fs.copyFileSync(iconSource, android512Dest);
}

const manifest = {
  name: 'Family Dashboard',
  short_name: 'Family Dashboard',
  start_url: '/',
  display: 'standalone',
  background_color: '#EEF6FF',
  theme_color: '#EEF6FF',
  icons: [
    {
      src: `/${android192Name}`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: `/${android512Name}`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

let html = fs.readFileSync(htmlPath, 'utf8');

const injection = [
  '    <meta name="apple-mobile-web-app-capable" content="yes" />',
  '    <meta name="apple-mobile-web-app-status-bar-style" content="default" />',
  '    <meta name="apple-mobile-web-app-title" content="Family Dashboard" />',
  '    <meta name="mobile-web-app-capable" content="yes" />',
  '    <meta name="application-name" content="Family Dashboard" />',
  '    <meta name="theme-color" content="#EEF6FF" />',
  `    <link rel="apple-touch-icon" href="/${appleIconName}" />`,
  `    <link rel="manifest" href="/${manifestName}" />`,
].join('\n');

if (!html.includes('apple-mobile-web-app-title')) {
  html = html.replace('</head>', `${injection}\n</head>`);
}

fs.writeFileSync(htmlPath, html);

console.log('Postbuild web completed: Apple touch icon and iPhone meta added.');
