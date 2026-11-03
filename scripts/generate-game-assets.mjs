import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public/assets/game');

// Ensure directories
['characters', 'tilesets', 'buildings', 'props'].forEach(sub => {
  fs.mkdirSync(path.join(OUT_DIR, sub), { recursive: true });
});

async function saveSvgToPng(svgStr, outPath, width, height) {
  await sharp(Buffer.from(svgStr))
    .resize(width, height)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outPath);
  console.log(`Saved: ${outPath} (${width}x${height})`);
}

// =============================================================================
// 1. CHARACTER SPRITESHEET (256x256 total = 4 rows x 4 cols, each frame 64x64)
// Row 0: Walk Down (Front)
// Row 1: Walk Left
// Row 2: Walk Right
// Row 3: Walk Up (Back)
// =============================================================================
function generateCharacterSvg(type = 'teacher') {
  // Frame size 64x64. Grid is 4 cols x 4 rows = 256 x 256.
  const isTeacher = type === 'teacher';
  
  // Colors
  const shirtColor = isTeacher ? '#1e40af' : '#ffffff'; // Teacher Batik Blue or Student White
  const shirtAccent = isTeacher ? '#f59e0b' : '#3b82f6'; // Gold batik or blue tie
  const pantsColor = isTeacher ? '#0f172a' : '#1e3a8a'; // Dark trousers or Navy SMP shorts/skirt
  const skinColor = '#fcd34d';
  const skinShadow = '#f59e0b';
  const hairColor = '#18181b';
  const shoeColor = '#09090b';

  // Helper for single 64x64 frame
  function renderFrame(col, row, dir, step) {
    const ox = col * 64;
    const oy = row * 64;
    const cx = ox + 32;
    const cy = oy + 32;

    // Bobbing offset for walking
    const bob = (step === 1 || step === 3) ? -1 : 0;
    const legOffset = step === 1 ? -4 : (step === 3 ? 4 : 0);

    let parts = '';

    // Ground Shadow
    parts += `<ellipse cx="${cx}" cy="${oy + 58}" rx="14" ry="4" fill="rgba(15,23,42,0.25)"/>`;

    if (dir === 'down') {
      // FRONT VIEW
      // Legs
      parts += `
        <!-- Left Leg -->
        <rect x="${cx - 7}" y="${oy + 38 + bob}" width="5" height="${16 + (step === 1 ? -1 : 0)}" rx="2" fill="${pantsColor}"/>
        <rect x="${cx - 8}" y="${oy + 52 + bob + (step === 1 ? -1 : 0)}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
        <!-- Right Leg -->
        <rect x="${cx + 2}" y="${oy + 38 + bob}" width="5" height="${16 + (step === 3 ? -1 : 0)}" rx="2" fill="${pantsColor}"/>
        <rect x="${cx + 1}" y="${oy + 52 + bob + (step === 3 ? -1 : 0)}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
      `;

      // Torso / Shirt
      parts += `
        <rect x="${cx - 10}" y="${oy + 22 + bob}" width="20" height="18" rx="4" fill="${shirtColor}"/>
        <rect x="${cx - 1.5}" y="${oy + 22 + bob}" width="3" height="18" fill="${shirtAccent}"/>
        <!-- Collar -->
        <polygon points="${cx - 5},${oy + 22 + bob} ${cx},${oy + 27 + bob} ${cx + 5},${oy + 22 + bob}" fill="${skinColor}"/>
      `;

      // Arms
      const lArmY = oy + 23 + bob + (step === 3 ? -2 : (step === 1 ? 2 : 0));
      const rArmY = oy + 23 + bob + (step === 1 ? -2 : (step === 3 ? 2 : 0));
      parts += `
        <!-- Left Arm -->
        <rect x="${cx - 14}" y="${lArmY}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx - 12}" cy="${lArmY + 12}" r="2.5" fill="${skinColor}"/>
        <!-- Right Arm -->
        <rect x="${cx + 10}" y="${rArmY}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx + 12}" cy="${rArmY + 12}" r="2.5" fill="${skinColor}"/>
      `;

      // Head
      parts += `
        <circle cx="${cx}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
        <!-- Hair -->
        <path d="M${cx - 10},${oy + 12 + bob} Q${cx},${oy + 2 + bob} ${cx + 10},${oy + 12 + bob} Q${cx + 7},${oy + 6 + bob} ${cx},${oy + 5 + bob} Q${cx - 7},${oy + 6 + bob} ${cx - 10},${oy + 12 + bob}" fill="${hairColor}"/>
        <rect x="${cx - 9}" y="${oy + 7 + bob}" width="18" height="5" rx="2" fill="${hairColor}"/>
        <!-- Eyes -->
        <circle cx="${cx - 3.5}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        <circle cx="${cx + 3.5}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        <!-- Smile -->
        <path d="M${cx - 2},${oy + 18 + bob} Q${cx},${oy + 20 + bob} ${cx + 2},${oy + 18 + bob}" stroke="#92400e" stroke-width="0.8" fill="none"/>
      `;
    } else if (dir === 'up') {
      // BACK VIEW
      // Legs
      parts += `
        <rect x="${cx - 7}" y="${oy + 38 + bob}" width="5" height="16" rx="2" fill="${pantsColor}"/>
        <rect x="${cx - 8}" y="${oy + 52 + bob}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
        <rect x="${cx + 2}" y="${oy + 38 + bob}" width="5" height="16" rx="2" fill="${pantsColor}"/>
        <rect x="${cx + 1}" y="${oy + 52 + bob}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
      `;

      // Torso / Shirt back
      parts += `
        <rect x="${cx - 10}" y="${oy + 22 + bob}" width="20" height="18" rx="4" fill="${shirtColor}"/>
        <rect x="${cx - 8}" y="${oy + 26 + bob}" width="16" height="2" fill="${shirtAccent}" opacity="0.6"/>
      `;

      // Arms
      parts += `
        <rect x="${cx - 14}" y="${oy + 23 + bob}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <rect x="${cx + 10}" y="${oy + 23 + bob}" width="4" height="12" rx="2" fill="${shirtColor}"/>
      `;

      // Head Back (full hair)
      parts += `
        <circle cx="${cx}" cy="${oy + 14 + bob}" r="9" fill="${hairColor}"/>
        <path d="M${cx - 9},${oy + 14 + bob} Q${cx},${oy + 20 + bob} ${cx + 9},${oy + 14 + bob}" fill="${hairColor}"/>
      `;
    } else if (dir === 'left') {
      // LEFT SIDE VIEW
      parts += `
        <!-- Legs Side -->
        <rect x="${cx - 3 + legOffset}" y="${oy + 38 + bob}" width="6" height="16" rx="2" fill="${pantsColor}"/>
        <rect x="${cx - 7 + legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
        <!-- Torso Side -->
        <rect x="${cx - 8}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
        <!-- Arm Side -->
        <rect x="${cx - 4 - legOffset}" y="${oy + 23 + bob}" width="5" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx - 2 - legOffset}" cy="${oy + 35 + bob}" r="2.5" fill="${skinColor}"/>
        <!-- Head Side -->
        <circle cx="${cx - 1}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
        <!-- Hair Side -->
        <path d="M${cx - 10},${oy + 13 + bob} Q${cx - 3},${oy + 3 + bob} ${cx + 8},${oy + 11 + bob} Q${cx + 4},${oy + 19 + bob} ${cx},${oy + 18 + bob} Z" fill="${hairColor}"/>
        <!-- Eye Side -->
        <circle cx="${cx - 6}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        <!-- Nose -->
        <polygon points="${cx - 9},${oy + 15 + bob} ${cx - 11},${oy + 16 + bob} ${cx - 9},${oy + 17 + bob}" fill="${skinColor}"/>
      `;
    } else if (dir === 'right') {
      // RIGHT SIDE VIEW
      parts += `
        <!-- Legs Side -->
        <rect x="${cx - 3 - legOffset}" y="${oy + 38 + bob}" width="6" height="16" rx="2" fill="${pantsColor}"/>
        <rect x="${cx - 2 - legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
        <!-- Torso Side -->
        <rect x="${cx - 7}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
        <!-- Arm Side -->
        <rect x="${cx - 1 + legOffset}" y="${oy + 23 + bob}" width="5" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx + 1 + legOffset}" cy="${oy + 35 + bob}" r="2.5" fill="${skinColor}"/>
        <!-- Head Side -->
        <circle cx="${cx + 1}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
        <!-- Hair Side -->
        <path d="M${cx + 10},${oy + 13 + bob} Q${cx + 3},${oy + 3 + bob} ${cx - 8},${oy + 11 + bob} Q${cx - 4},${oy + 19 + bob} ${cx},${oy + 18 + bob} Z" fill="${hairColor}"/>
        <!-- Eye Side -->
        <circle cx="${cx + 6}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        <!-- Nose -->
        <polygon points="${cx + 9},${oy + 15 + bob} ${cx + 11},${oy + 16 + bob} ${cx + 9},${oy + 17 + bob}" fill="${skinColor}"/>
      `;
    }

    return parts;
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">`;

  // Row 0: Down (frames 0, 1, 2, 3)
  svg += renderFrame(0, 0, 'down', 0);
  svg += renderFrame(1, 0, 'down', 1);
  svg += renderFrame(2, 0, 'down', 2);
  svg += renderFrame(3, 0, 'down', 3);

  // Row 1: Left (frames 0, 1, 2, 3)
  svg += renderFrame(0, 1, 'left', 0);
  svg += renderFrame(1, 1, 'left', 1);
  svg += renderFrame(2, 1, 'left', 2);
  svg += renderFrame(3, 1, 'left', 3);

  // Row 2: Right (frames 0, 1, 2, 3)
  svg += renderFrame(0, 2, 'right', 0);
  svg += renderFrame(1, 2, 'right', 1);
  svg += renderFrame(2, 2, 'right', 2);
  svg += renderFrame(3, 2, 'right', 3);

  // Row 3: Up (frames 0, 1, 2, 3)
  svg += renderFrame(0, 3, 'up', 0);
  svg += renderFrame(1, 3, 'up', 1);
  svg += renderFrame(2, 3, 'up', 2);
  svg += renderFrame(3, 3, 'up', 3);

  svg += `</svg>`;
  return svg;
}

// =============================================================================
// 2. TILESETS (Grass, Asphalt Road, Sidewalk Tactile, Crosswalk)
// =============================================================================
function generateGrassSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect width="64" height="64" fill="#388e3c"/>
    <rect x="0" y="0" width="32" height="32" fill="#2e7d32" opacity="0.3"/>
    <rect x="32" y="32" width="32" height="32" fill="#2e7d32" opacity="0.3"/>
    <!-- Grass blades -->
    <path d="M12,18 L14,10 L16,18 M15,18 L18,12" stroke="#4caf50" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M44,48 L46,40 L48,48 M47,48 L50,42" stroke="#4caf50" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <path d="M22,50 L24,44 L26,50" stroke="#81c784" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <path d="M50,16 L52,10 L54,16" stroke="#81c784" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <!-- Wildflowers -->
    <circle cx="28" cy="24" r="2.5" fill="#fff59d"/>
    <circle cx="28" cy="24" r="1" fill="#f57f17"/>
    <circle cx="16" cy="42" r="2" fill="#ffffff"/>
    <circle cx="16" cy="42" r="0.8" fill="#fbc02d"/>
  </svg>`;
}

function generateRoadSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Asphalt base -->
    <rect width="128" height="128" fill="#1e293b"/>
    <!-- Asphalt texture grain -->
    <rect x="10" y="15" width="2" height="2" fill="#334155"/>
    <rect x="45" y="85" width="2" height="2" fill="#334155"/>
    <rect x="80" y="30" width="2" height="2" fill="#334155"/>
    <rect x="110" y="100" width="2" height="2" fill="#334155"/>
    <!-- Curbs -->
    <rect x="0" y="0" width="128" height="4" fill="#64748b"/>
    <rect x="0" y="124" width="128" height="4" fill="#64748b"/>
    <!-- White road edge solid lines -->
    <rect x="0" y="8" width="128" height="2" fill="#f8fafc" opacity="0.8"/>
    <rect x="0" y="118" width="128" height="2" fill="#f8fafc" opacity="0.8"/>
    <!-- Center Dashed Line (Clean White) -->
    <rect x="12" y="61" width="32" height="6" rx="2" fill="#f8fafc"/>
    <rect x="68" y="61" width="32" height="6" rx="2" fill="#f8fafc"/>
  </svg>`;
}

function generateSidewalkSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <!-- Concrete Paver -->
    <rect width="64" height="64" fill="#cbd5e1"/>
    <!-- Grid seams -->
    <path d="M0,32 L64,32 M32,0 L32,64" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="1" y="1" width="30" height="30" fill="#e2e8f0" opacity="0.6"/>
    <rect x="33" y="33" width="30" height="30" fill="#e2e8f0" opacity="0.6"/>
    <!-- Yellow Tactile Paving (Pedestrian Guide) -->
    <rect x="18" y="0" width="28" height="64" fill="#facc15" opacity="0.95"/>
    <rect x="18" y="0" width="28" height="64" stroke="#ca8a04" stroke-width="1" fill="none"/>
    <!-- Tactile lines -->
    <line x1="23" y1="0" x2="23" y2="64" stroke="#a16207" stroke-width="2"/>
    <line x1="28" y1="0" x2="28" y2="64" stroke="#a16207" stroke-width="2"/>
    <line x1="33" y1="0" x2="33" y2="64" stroke="#a16207" stroke-width="2"/>
    <line x1="38" y1="0" x2="38" y2="64" stroke="#a16207" stroke-width="2"/>
    <line x1="43" y1="0" x2="43" y2="64" stroke="#a16207" stroke-width="2"/>
  </svg>`;
}

function generateCrosswalkSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <rect width="128" height="128" fill="#1e293b"/>
    <!-- Zebra Stripes -->
    <rect x="8" y="12" width="112" height="18" rx="2" fill="#f8fafc"/>
    <rect x="8" y="42" width="112" height="18" rx="2" fill="#f8fafc"/>
    <rect x="8" y="72" width="112" height="18" rx="2" fill="#f8fafc"/>
    <rect x="8" y="102" width="112" height="18" rx="2" fill="#f8fafc"/>
  </svg>`;
}

// =============================================================================
// 3. BUILDINGS (Indonesian School, Warung Bu Siti, Balai Pertemuan)
// =============================================================================
function generateSchoolSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 240" width="340" height="240">
    <!-- Ground Shadow -->
    <ellipse cx="170" cy="225" rx="160" ry="12" fill="rgba(15,23,42,0.3)"/>
    
    <!-- Foundation / Brick Base -->
    <rect x="20" y="90" width="300" height="130" rx="4" fill="#f1f5f9"/>
    <rect x="20" y="200" width="300" height="20" fill="#94a3b8"/>
    <line x1="20" y1="200" x2="320" y2="200" stroke="#64748b" stroke-width="2"/>
    
    <!-- Center Grand Entrance Portico -->
    <rect x="120" y="60" width="100" height="160" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Terracotta Clay Roof Wings -->
    <polygon points="10,90 170,25 330,90" fill="#b91c1c"/>
    <polygon points="20,88 170,30 320,88" fill="#dc2626"/>
    <!-- Roof tiles lines -->
    <line x1="40" y1="80" x2="170" y2="38" stroke="#991b1b" stroke-width="2"/>
    <line x1="60" y1="80" x2="170" y2="46" stroke="#991b1b" stroke-width="2"/>
    <line x1="80" y1="80" x2="170" y2="54" stroke="#991b1b" stroke-width="2"/>
    <line x1="260" y1="80" x2="170" y2="46" stroke="#991b1b" stroke-width="2"/>
    <line x1="280" y1="80" x2="170" y2="54" stroke="#991b1b" stroke-width="2"/>

    <!-- School Signboard Header -->
    <rect x="100" y="65" width="140" height="28" rx="4" fill="#1e3a8a" stroke="#fbbf24" stroke-width="2"/>
    <text x="170" y="78" font-family="Arial, sans-serif" font-size="8" font-weight="900" fill="#fef08a" text-anchor="middle" letter-spacing="0.5">SMP TERPADU AL-ITTIHADIYAH</text>
    <text x="170" y="88" font-family="Arial, sans-serif" font-size="6.5" font-weight="bold" fill="#ffffff" text-anchor="middle">KAMPUS PENDIDIKAN NUSANTARA</text>

    <!-- Indonesian Emblem / Garuda placeholder pin -->
    <circle cx="170" cy="50" r="10" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
    <circle cx="170" cy="50" r="7" fill="#dc2626"/>

    <!-- Entrance Pillars -->
    <rect x="128" y="93" width="12" height="110" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="200" y="93" width="12" height="110" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- Main Double Glass Door -->
    <rect x="146" y="140" width="48" height="75" rx="3" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <rect x="149" y="143" width="20" height="68" fill="#38bdf8" opacity="0.65"/>
    <rect x="171" y="143" width="20" height="68" fill="#38bdf8" opacity="0.65"/>
    <!-- Door handles -->
    <rect x="166" y="175" width="2" height="8" fill="#fbbf24"/>
    <rect x="172" y="175" width="2" height="8" fill="#fbbf24"/>

    <!-- Classroom Windows Left -->
    <g fill="#38bdf8" opacity="0.75" stroke="#1e293b" stroke-width="2">
      <rect x="36" y="110" width="32" height="36" rx="2"/>
      <rect x="76" y="110" width="32" height="36" rx="2"/>
      <rect x="36" y="155" width="32" height="36" rx="2"/>
      <rect x="76" y="155" width="32" height="36" rx="2"/>
    </g>
    <!-- Classroom Windows Right -->
    <g fill="#38bdf8" opacity="0.75" stroke="#1e293b" stroke-width="2">
      <rect x="232" y="110" width="32" height="36" rx="2"/>
      <rect x="272" y="110" width="32" height="36" rx="2"/>
      <rect x="232" y="155" width="32" height="36" rx="2"/>
      <rect x="272" y="155" width="32" height="36" rx="2"/>
    </g>

    <!-- Planters / Bushes in front -->
    <circle cx="35" cy="216" r="10" fill="#15803d"/>
    <circle cx="50" cy="214" r="12" fill="#16a34a"/>
    <circle cx="65" cy="216" r="10" fill="#15803d"/>
    <circle cx="275" cy="216" r="10" fill="#15803d"/>
    <circle cx="290" cy="214" r="12" fill="#16a34a"/>
    <circle cx="305" cy="216" r="10" fill="#15803d"/>
  </svg>`;
}

function generateWarungSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 180" width="220" height="180">
    <!-- Ground Shadow -->
    <ellipse cx="110" cy="170" rx="95" ry="8" fill="rgba(15,23,42,0.25)"/>

    <!-- Main Wooden Structure -->
    <rect x="25" y="55" width="170" height="110" rx="4" fill="#b45309" stroke="#78350f" stroke-width="2"/>
    <!-- Wood panels lines -->
    <line x1="25" y1="80" x2="195" y2="80" stroke="#92400e" stroke-width="1.5"/>
    <line x1="25" y1="105" x2="195" y2="105" stroke="#92400e" stroke-width="1.5"/>
    <line x1="25" y1="130" x2="195" y2="130" stroke="#92400e" stroke-width="1.5"/>

    <!-- Iconic Indonesian Striped Awning (Hijau & Kuning Khas Warung Pecel Lele/Madura) -->
    <polygon points="10,55 210,55 200,20 20,20" fill="#15803d"/>
    <!-- Striping -->
    <path d="M20,20 L10,55 L35,55 L42,20 Z" fill="#facc15"/>
    <path d="M64,20 L60,55 L85,55 L86,20 Z" fill="#facc15"/>
    <path d="M108,20 L110,55 L135,55 L130,20 Z" fill="#facc15"/>
    <path d="M152,20 L160,55 L185,55 L174,20 Z" fill="#facc15"/>

    <!-- Signboard -->
    <rect x="40" y="24" width="140" height="22" rx="4" fill="#b91c1c" stroke="#fef08a" stroke-width="1.5"/>
    <text x="110" y="38" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">WARUNG BU SITI</text>
    <text x="110" y="44" font-family="Arial, sans-serif" font-size="5" font-weight="bold" fill="#fef08a" text-anchor="middle">MAKANAN &amp; KELONTONG SERBA ADA</text>

    <!-- Counter Window / Etalase Kaca -->
    <rect x="45" y="75" width="130" height="50" rx="3" fill="#0f172a" stroke="#ca8a04" stroke-width="2"/>
    <rect x="48" y="78" width="124" height="44" fill="#bae6fd" opacity="0.6"/>

    <!-- Snack Jars and Gallon inside -->
    <rect x="55" y="85" width="14" height="20" rx="2" fill="#ef4444"/>
    <rect x="73" y="85" width="14" height="20" rx="2" fill="#3b82f6"/>
    <rect x="91" y="85" width="14" height="20" rx="2" fill="#10b981"/>
    <!-- Aqua gallon / dispenser -->
    <rect x="145" y="82" width="18" height="26" rx="4" fill="#0284c7" opacity="0.9"/>
    <circle cx="154" cy="80" r="3" fill="#ffffff"/>

    <!-- Service counter shelf -->
    <rect x="40" y="125" width="140" height="12" rx="2" fill="#78350f" stroke="#451a03" stroke-width="1"/>

    <!-- Colorful Plastic Stools (Khas Indonesia) -->
    <rect x="55" y="142" width="16" height="22" rx="3" fill="#ef4444"/>
    <rect x="102" y="142" width="16" height="22" rx="3" fill="#3b82f6"/>
    <rect x="149" y="142" width="16" height="22" rx="3" fill="#10b981"/>
  </svg>`;
}

function generateBalaiSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" width="280" height="200">
    <!-- Ground Shadow -->
    <ellipse cx="140" cy="190" rx="130" ry="8" fill="rgba(15,23,42,0.25)"/>

    <!-- Foundation -->
    <rect x="25" y="75" width="230" height="110" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
    
    <!-- Indonesian Joglo/Limasan Styled Roof -->
    <polygon points="10,80 140,20 270,80" fill="#0f766e"/>
    <polygon points="20,78 140,25 260,78" fill="#14b8a6"/>
    <polygon points="70,50 140,15 210,50" fill="#0d9488"/>

    <!-- Sign Banner -->
    <rect x="65" y="55" width="150" height="24" rx="4" fill="#042f2e" stroke="#5eead4" stroke-width="1.5"/>
    <text x="140" y="70" font-family="Arial, sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">BALAI DESA &amp; PUSAT PID</text>

    <!-- Veranda Pillars (Modern White) -->
    <rect x="45" y="80" width="14" height="100" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="95" y="80" width="14" height="100" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="171" y="80" width="14" height="100" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
    <rect x="221" y="80" width="14" height="100" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>

    <!-- Glass Entryway -->
    <rect x="119" y="115" width="42" height="65" fill="#0f172a" stroke="#06b6d4" stroke-width="2"/>
    <rect x="122" y="118" width="16" height="58" fill="#38bdf8" opacity="0.6"/>
    <rect x="142" y="118" width="16" height="58" fill="#38bdf8" opacity="0.6"/>
  </svg>`;
}

// =============================================================================
// 4. PROPS (Banyan Tree, Flagpole, Smart Board PID, Street Lamp)
// =============================================================================
function generateTreeBeringinSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" width="160" height="180">
    <!-- Ground Shadow -->
    <ellipse cx="80" cy="168" rx="60" ry="10" fill="rgba(15,23,42,0.3)"/>

    <!-- Gnarled Organic Trunk -->
    <path d="M68,165 Q72,120 70,95 Q75,110 82,90 Q85,115 92,165 Z" fill="#78350f"/>
    <!-- Hanging Aerial Roots (Akar Gantung Beringin Khas Nusantara) -->
    <line x1="45" y1="80" x2="48" y2="155" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>
    <line x1="58" y1="85" x2="60" y2="150" stroke="#78350f" stroke-width="1.5"/>
    <line x1="102" y1="85" x2="100" y2="152" stroke="#78350f" stroke-width="1.5"/>
    <line x1="115" y1="80" x2="112" y2="156" stroke="#92400e" stroke-width="2" stroke-linecap="round"/>

    <!-- Lush Multi-layered Foliage Canopy -->
    <circle cx="80" cy="70" r="55" fill="#14532d"/>
    <circle cx="45" cy="80" r="35" fill="#166534"/>
    <circle cx="115" cy="80" r="35" fill="#166534"/>
    <circle cx="80" cy="50" r="42" fill="#15803d"/>
    <circle cx="60" cy="55" r="28" fill="#22c55e" opacity="0.4"/>
    <circle cx="100" cy="55" r="28" fill="#22c55e" opacity="0.4"/>
    <circle cx="80" cy="35" r="22" fill="#4ade80" opacity="0.3"/>
  </svg>`;
}

function generateFlagpoleSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 140" width="60" height="140">
    <!-- Base Shadow -->
    <ellipse cx="18" cy="135" rx="14" ry="4" fill="rgba(15,23,42,0.3)"/>
    <rect x="12" y="128" width="12" height="8" rx="2" fill="#94a3b8" stroke="#475569"/>

    <!-- Shiny Metal Pole -->
    <line x1="18" y1="5" x2="18" y2="130" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
    <circle cx="18" cy="5" r="4" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>

    <!-- Waving Merah Putih Flag -->
    <path d="M18,10 Q32,6 44,12 Q52,18 56,12 L56,26 Q52,32 44,26 Q32,20 18,24 Z" fill="#dc2626"/>
    <path d="M18,24 Q32,20 44,26 Q52,32 56,26 L56,40 Q52,46 44,40 Q32,34 18,38 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.5"/>
  </svg>`;
}

function generateSmartBoardSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="80" height="90">
    <!-- Shadow -->
    <ellipse cx="40" cy="85" rx="30" ry="4" fill="rgba(15,23,42,0.3)"/>

    <!-- Sturdy Stand -->
    <rect x="36" y="55" width="8" height="28" fill="#334155"/>
    <rect x="22" y="80" width="36" height="5" rx="2" fill="#1e293b"/>

    <!-- Smart Board Frame -->
    <rect x="6" y="8" width="68" height="50" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
    
    <!-- Glowing Interactive Touchscreen -->
    <rect x="10" y="12" width="60" height="42" rx="3" fill="#0284c7"/>
    <!-- Screen Header -->
    <rect x="10" y="12" width="60" height="10" fill="#0369a1"/>
    <text x="40" y="20" font-family="Arial, sans-serif" font-size="5" font-weight="bold" fill="#ffffff" text-anchor="middle">PID NAWASENA - MODE GURU</text>
    
    <!-- Interactive App Tiles -->
    <rect x="14" y="26" width="14" height="12" rx="2" fill="#10b981"/>
    <rect x="33" y="26" width="14" height="12" rx="2" fill="#f59e0b"/>
    <rect x="52" y="26" width="14" height="12" rx="2" fill="#6366f1"/>
    
    <text x="40" y="48" font-family="Arial, sans-serif" font-size="4" fill="#e0f2fe" text-anchor="middle">[Sentuh Untuk Mulai]</text>
  </svg>`;
}

function generateStreetLampSvg() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 100" width="40" height="100">
    <ellipse cx="20" cy="95" rx="10" ry="3" fill="rgba(15,23,42,0.3)"/>
    <rect x="18" y="20" width="4" height="75" fill="#334155"/>
    <rect x="15" y="90" width="10" height="5" rx="1" fill="#1e293b"/>
    
    <!-- Lamp Head -->
    <path d="M12,20 L28,20 L24,10 L16,10 Z" fill="#1e293b"/>
    <!-- Bulb Glow -->
    <circle cx="20" cy="22" r="6" fill="#fde047" opacity="0.95"/>
    <circle cx="20" cy="22" r="14" fill="#fef08a" opacity="0.25"/>
  </svg>`;
}

// =============================================================================
// MAIN GENERATION RUNNER
// =============================================================================
async function main() {
  console.log('Generating high-fidelity 2D Indonesian Life RP game assets...');

  // 1. Characters
  await saveSvgToPng(generateCharacterSvg('teacher'), path.join(OUT_DIR, 'characters/guru_spritesheet.png'), 256, 256);
  await saveSvgToPng(generateCharacterSvg('student'), path.join(OUT_DIR, 'characters/siswa_spritesheet.png'), 256, 256);

  // 2. Tilesets
  await saveSvgToPng(generateGrassSvg(), path.join(OUT_DIR, 'tilesets/tile_grass.png'), 64, 64);
  await saveSvgToPng(generateRoadSvg(), path.join(OUT_DIR, 'tilesets/tile_road.png'), 128, 128);
  await saveSvgToPng(generateSidewalkSvg(), path.join(OUT_DIR, 'tilesets/tile_sidewalk.png'), 64, 64);
  await saveSvgToPng(generateCrosswalkSvg(), path.join(OUT_DIR, 'tilesets/tile_crosswalk.png'), 128, 128);

  // 3. Buildings
  await saveSvgToPng(generateSchoolSvg(), path.join(OUT_DIR, 'buildings/building_school.png'), 340, 240);
  await saveSvgToPng(generateWarungSvg(), path.join(OUT_DIR, 'buildings/building_warung.png'), 220, 180);
  await saveSvgToPng(generateBalaiSvg(), path.join(OUT_DIR, 'buildings/building_balai.png'), 280, 200);

  // 4. Props
  await saveSvgToPng(generateTreeBeringinSvg(), path.join(OUT_DIR, 'props/prop_tree_beringin.png'), 160, 180);
  await saveSvgToPng(generateFlagpoleSvg(), path.join(OUT_DIR, 'props/prop_flagpole.png'), 60, 140);
  await saveSvgToPng(generateSmartBoardSvg(), path.join(OUT_DIR, 'props/prop_smart_board.png'), 80, 90);
  await saveSvgToPng(generateStreetLampSvg(), path.join(OUT_DIR, 'props/prop_street_lamp.png'), 40, 100);

  console.log('All game assets generated successfully!');
}

main().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});

