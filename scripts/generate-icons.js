const sharp = require('sharp');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Dark icon SVG — matches favicon.svg design, full square (for icon.png with rounded corners added by OS)
const svgIcon = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="roof" x1="160" y1="240" x2="880" y2="800" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7B7BF8"/>
      <stop offset="1" stop-color="#5B5BD6"/>
    </linearGradient>
    <linearGradient id="wall" x1="240" y1="400" x2="760" y2="840" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2A2A50"/>
      <stop offset="1" stop-color="#1E1E3C"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="240" fill="#1A1A3E"/>
  <ellipse cx="512" cy="560" rx="360" ry="240" fill="#5B5BD6" fill-opacity="0.12"/>
  <path d="M256 480L512 260L768 480V780C768 815.346 739.346 844 704 844H320C284.654 844 256 815.346 256 780V480Z" fill="url(#wall)"/>
  <path d="M208 480L484 260C500 247 524 247 540 260L816 480C836 497 836.6 527 818 545C799.4 563 770 564.6 754 548L512 336L270 548C254 564.6 224.6 563 206 545C187.4 527 188 497 208 480Z" fill="url(#roof)"/>
  <rect x="372" y="420" width="280" height="272" rx="32" fill="#16163A" stroke="#5B5BD6" stroke-width="16" stroke-opacity="0.5"/>
  <rect x="400" y="456" width="44" height="44" rx="12" fill="#5B5BD6"/>
  <path d="M411 478L421 488L437 468" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="460" y="466" width="112" height="12" rx="6" fill="#5B5BD6" fill-opacity="0.6"/>
  <rect x="460" y="486" width="84" height="12" rx="6" fill="#5B5BD6" fill-opacity="0.3"/>
  <rect x="400" y="536" width="44" height="44" rx="12" fill="#5B5BD6"/>
  <path d="M411 558L421 568L437 548" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="460" y="546" width="112" height="12" rx="6" fill="#5B5BD6" fill-opacity="0.6"/>
  <rect x="460" y="566" width="84" height="12" rx="6" fill="#5B5BD6" fill-opacity="0.3"/>
  <rect x="440" y="692" width="144" height="152" rx="20" fill="#5B5BD6" fill-opacity="0.25" stroke="#5B5BD6" stroke-width="10" stroke-opacity="0.4"/>
  <circle cx="568" cy="772" r="10" fill="#7B7BF8"/>
</svg>`;

// Android foreground SVG — transparent background, centered smaller (Android adds its own bg)
const svgAndroid = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="roof" x1="240" y1="290" x2="790" y2="750" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7B7BF8"/>
      <stop offset="1" stop-color="#5B5BD6"/>
    </linearGradient>
    <linearGradient id="wall" x1="280" y1="420" x2="730" y2="790" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2A2A50"/>
      <stop offset="1" stop-color="#1E1E3C"/>
    </linearGradient>
  </defs>
  <path d="M312 490L512 320L712 490V730C712 756.51 690.51 778 664 778H360C333.49 778 312 756.51 312 730V490Z" fill="url(#wall)"/>
  <path d="M272 490L494 320C504 312 520 312 530 320L752 490C762 499 762 515 752 524C742 533 726 533 716 524L512 362L308 524C298 533 282 533 272 524C262 515 262 499 272 490Z" fill="url(#roof)"/>
  <rect x="406" y="440" width="212" height="206" rx="24" fill="#16163A" stroke="#5B5BD6" stroke-width="12" stroke-opacity="0.5"/>
  <rect x="424" y="462" width="34" height="34" rx="10" fill="#5B5BD6"/>
  <path d="M433 479L441 487L453 471" stroke="white" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="468" y="470" width="86" height="10" rx="5" fill="#5B5BD6" fill-opacity="0.6"/>
  <rect x="468" y="486" width="64" height="10" rx="5" fill="#5B5BD6" fill-opacity="0.3"/>
  <rect x="424" y="514" width="34" height="34" rx="10" fill="#5B5BD6"/>
  <path d="M433 531L441 539L453 523" stroke="white" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="468" y="522" width="86" height="10" rx="5" fill="#5B5BD6" fill-opacity="0.6"/>
  <rect x="468" y="538" width="64" height="10" rx="5" fill="#5B5BD6" fill-opacity="0.3"/>
  <rect x="456" y="672" width="112" height="106" rx="16" fill="#5B5BD6" fill-opacity="0.25" stroke="#5B5BD6" stroke-width="8" stroke-opacity="0.4"/>
  <circle cx="560" cy="728" r="8" fill="#7B7BF8"/>
</svg>`;

async function generate() {
  await sharp(Buffer.from(svgIcon))
    .png()
    .toFile(path.join(projectRoot, 'assets', 'icon.png'));
  console.log('Generated assets/icon.png');

  await sharp(Buffer.from(svgAndroid))
    .png()
    .toFile(path.join(projectRoot, 'assets', 'android-icon-foreground.png'));
  console.log('Generated assets/android-icon-foreground.png');
}

generate().catch(console.error);
