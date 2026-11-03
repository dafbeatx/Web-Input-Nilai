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
  // Styles
  const isHijab = type === 'teacher_female' || type === 'student_female';
  const isSecurity = type === 'security';
  const isStudent = type === 'student_male' || type === 'student_female';

  let shirtColor = '#1e40af';     // Batik Blue
  let shirtAccent = '#f59e0b';    // Gold motif
  let pantsColor = '#0f172a';     // Navy/Black slacks
  let hijabColor = '#ffffff';
  let skinColor = '#fcd34d';
  const hairColor = '#18181b';
  const shoeColor = '#09090b';

  if (type === 'teacher') {
    shirtColor = '#1e40af';
    shirtAccent = '#f59e0b';
    pantsColor = '#0f172a';
  } else if (type === 'teacher_female') {
    shirtColor = '#0f766e';
    shirtAccent = '#5eead4';
    pantsColor = '#042f2e';
    hijabColor = '#f0fdfa';
  } else if (type === 'student_male') {
    shirtColor = '#ffffff';
    shirtAccent = '#2563eb';      // SMP Blue Tie
    pantsColor = '#1e3a8a';       // SMP Blue trousers
  } else if (type === 'student_female') {
    shirtColor = '#ffffff';
    shirtAccent = '#2563eb';
    pantsColor = '#1e3a8a';       // Long SMP skirt
    hijabColor = '#ffffff';
  } else if (type === 'security') {
    shirtColor = '#78350f';       // Cokelat Satpam
    shirtAccent = '#fbbf24';      // Lencana Emas
    pantsColor = '#1e293b';       // Celana Gelap
  }

  // Helper for single 64x64 frame
  function renderFrame(col, row, dir, step) {
    const ox = col * 64;
    const oy = row * 64;
    const cx = ox + 32;

    // Bobbing offset for walking
    const bob = (step === 1 || step === 3) ? -1 : 0;
    const legOffset = step === 1 ? -4 : (step === 3 ? 4 : 0);

    let parts = '';

    // Ground Shadow
    parts += `<ellipse cx="${cx}" cy="${oy + 58}" rx="14" ry="4" fill="rgba(15,23,42,0.25)"/>`;

    if (dir === 'down') {
      // FRONT VIEW
      if (isHijab) {
        // Long skirt
        parts += `
          <polygon points="${cx - 9},${oy + 38 + bob} ${cx + 9},${oy + 38 + bob} ${cx + 12},${oy + 53 + bob} ${cx - 12},${oy + 53 + bob}" fill="${pantsColor}"/>
          <rect x="${cx - 7}" y="${oy + 52 + bob}" width="6" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx + 1}" y="${oy + 52 + bob}" width="6" height="5" rx="1.5" fill="${shoeColor}"/>
        `;
      } else {
        // Legs / Pants
        parts += `
          <rect x="${cx - 7}" y="${oy + 38 + bob}" width="5" height="${16 + (step === 1 ? -1 : 0)}" rx="2" fill="${pantsColor}"/>
          <rect x="${cx - 8}" y="${oy + 52 + bob + (step === 1 ? -1 : 0)}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx + 2}" y="${oy + 38 + bob}" width="5" height="${16 + (step === 3 ? -1 : 0)}" rx="2" fill="${pantsColor}"/>
          <rect x="${cx + 1}" y="${oy + 52 + bob + (step === 3 ? -1 : 0)}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
        `;
      }

      // Torso / Shirt
      parts += `
        <rect x="${cx - 10}" y="${oy + 22 + bob}" width="20" height="18" rx="4" fill="${shirtColor}"/>
        <rect x="${cx - 1.5}" y="${oy + 22 + bob}" width="3" height="18" fill="${shirtAccent}"/>
        <polygon points="${cx - 5},${oy + 22 + bob} ${cx},${oy + 27 + bob} ${cx + 5},${oy + 22 + bob}" fill="${skinColor}"/>
      `;

      if (isSecurity) {
        // Gold Badge
        parts += `<circle cx="${cx - 5}" cy="${oy + 26 + bob}" r="2" fill="#fbbf24"/>`;
      }

      // Arms
      const lArmY = oy + 23 + bob + (step === 3 ? -2 : (step === 1 ? 2 : 0));
      const rArmY = oy + 23 + bob + (step === 1 ? -2 : (step === 3 ? 2 : 0));
      parts += `
        <rect x="${cx - 14}" y="${lArmY}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx - 12}" cy="${lArmY + 12}" r="2.5" fill="${skinColor}"/>
        <rect x="${cx + 10}" y="${rArmY}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx + 12}" cy="${rArmY + 12}" r="2.5" fill="${skinColor}"/>
      `;

      // Head
      if (isHijab) {
        // Hijab Hood
        parts += `
          <ellipse cx="${cx}" cy="${oy + 14 + bob}" rx="11" ry="12" fill="${hijabColor}"/>
          <polygon points="${cx - 10},${oy + 18 + bob} ${cx},${oy + 28 + bob} ${cx + 10},${oy + 18 + bob}" fill="${hijabColor}"/>
          <ellipse cx="${cx}" cy="${oy + 14 + bob}" rx="6" ry="7" fill="${skinColor}"/>
          <!-- Eyes -->
          <circle cx="${cx - 2.5}" cy="${oy + 14 + bob}" r="1.2" fill="#0f172a"/>
          <circle cx="${cx + 2.5}" cy="${oy + 14 + bob}" r="1.2" fill="#0f172a"/>
          <!-- Smile -->
          <path d="M${cx - 1.5},${oy + 17 + bob} Q${cx},${oy + 18.5 + bob} ${cx + 1.5},${oy + 17 + bob}" stroke="#92400e" stroke-width="0.8" fill="none"/>
        `;
      } else {
        parts += `
          <circle cx="${cx}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
          <!-- Eyes -->
          <circle cx="${cx - 3.5}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
          <circle cx="${cx + 3.5}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
          <!-- Smile -->
          <path d="M${cx - 2},${oy + 18 + bob} Q${cx},${oy + 20 + bob} ${cx + 2},${oy + 18 + bob}" stroke="#92400e" stroke-width="0.8" fill="none"/>
        `;

        if (isSecurity) {
          // Satpam Peaked Cap
          parts += `
            <ellipse cx="${cx}" cy="${oy + 9 + bob}" rx="11" ry="5" fill="#451a03"/>
            <rect x="${cx - 8}" y="${oy + 6 + bob}" width="16" height="5" fill="#451a03"/>
            <circle cx="${cx}" cy="${oy + 8 + bob}" r="1.5" fill="#fbbf24"/>
          `;
        } else {
          // Hair
          parts += `
            <path d="M${cx - 10},${oy + 12 + bob} Q${cx},${oy + 2 + bob} ${cx + 10},${oy + 12 + bob} Q${cx + 7},${oy + 6 + bob} ${cx},${oy + 5 + bob} Q${cx - 7},${oy + 6 + bob} ${cx - 10},${oy + 12 + bob}" fill="${hairColor}"/>
            <rect x="${cx - 9}" y="${oy + 7 + bob}" width="18" height="5" rx="2" fill="${hairColor}"/>
          `;
        }
      }
    } else if (dir === 'up') {
      // BACK VIEW
      if (isHijab) {
        parts += `
          <polygon points="${cx - 9},${oy + 38 + bob} ${cx + 9},${oy + 38 + bob} ${cx + 12},${oy + 53 + bob} ${cx - 12},${oy + 53 + bob}" fill="${pantsColor}"/>
          <rect x="${cx - 7}" y="${oy + 52 + bob}" width="6" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx + 1}" y="${oy + 52 + bob}" width="6" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 10}" y="${oy + 22 + bob}" width="20" height="18" rx="4" fill="${shirtColor}"/>
          <!-- Hijab back drape -->
          <ellipse cx="${cx}" cy="${oy + 14 + bob}" rx="11" ry="12" fill="${hijabColor}"/>
          <polygon points="${cx - 11},${oy + 18 + bob} ${cx},${oy + 28 + bob} ${cx + 11},${oy + 18 + bob}" fill="${hijabColor}"/>
        `;
      } else {
        parts += `
          <rect x="${cx - 7}" y="${oy + 38 + bob}" width="5" height="16" rx="2" fill="${pantsColor}"/>
          <rect x="${cx - 8}" y="${oy + 52 + bob}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx + 2}" y="${oy + 38 + bob}" width="5" height="16" rx="2" fill="${pantsColor}"/>
          <rect x="${cx + 1}" y="${oy + 52 + bob}" width="7" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 10}" y="${oy + 22 + bob}" width="20" height="18" rx="4" fill="${shirtColor}"/>
        `;

        if (isSecurity) {
          parts += `<circle cx="${cx}" cy="${oy + 12 + bob}" r="10" fill="#451a03"/>`;
        } else {
          parts += `
            <circle cx="${cx}" cy="${oy + 14 + bob}" r="9" fill="${hairColor}"/>
            <path d="M${cx - 9},${oy + 14 + bob} Q${cx},${oy + 20 + bob} ${cx + 9},${oy + 14 + bob}" fill="${hairColor}"/>
          `;
        }
      }

      // Arms
      parts += `
        <rect x="${cx - 14}" y="${oy + 23 + bob}" width="4" height="12" rx="2" fill="${shirtColor}"/>
        <rect x="${cx + 10}" y="${oy + 23 + bob}" width="4" height="12" rx="2" fill="${shirtColor}"/>
      `;
    } else if (dir === 'left') {
      // LEFT VIEW
      if (isHijab) {
        parts += `
          <polygon points="${cx - 8},${oy + 38 + bob} ${cx + 6},${oy + 38 + bob} ${cx + 8},${oy + 53 + bob} ${cx - 10},${oy + 53 + bob}" fill="${pantsColor}"/>
          <rect x="${cx - 7 + legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 8}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
          <!-- Hijab profile -->
          <ellipse cx="${cx - 1}" cy="${oy + 14 + bob}" rx="10" ry="11" fill="${hijabColor}"/>
          <ellipse cx="${cx - 4}" cy="${oy + 14 + bob}" rx="4" ry="6" fill="${skinColor}"/>
          <circle cx="${cx - 5}" cy="${oy + 14 + bob}" r="1.1" fill="#0f172a"/>
        `;
      } else {
        parts += `
          <rect x="${cx - 3 + legOffset}" y="${oy + 38 + bob}" width="6" height="16" rx="2" fill="${pantsColor}"/>
          <rect x="${cx - 7 + legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 8}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
          <circle cx="${cx - 1}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
          <circle cx="${cx - 6}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        `;

        if (isSecurity) {
          parts += `<rect x="${cx - 10}" y="${oy + 7 + bob}" width="18" height="5" rx="2" fill="#451a03"/>`;
        } else {
          parts += `<path d="M${cx - 10},${oy + 13 + bob} Q${cx - 3},${oy + 3 + bob} ${cx + 8},${oy + 11 + bob} Q${cx + 4},${oy + 19 + bob} ${cx},${oy + 18 + bob} Z" fill="${hairColor}"/>`;
        }
      }

      // Arm Side
      parts += `
        <rect x="${cx - 4 - legOffset}" y="${oy + 23 + bob}" width="5" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx - 2 - legOffset}" cy="${oy + 35 + bob}" r="2.5" fill="${skinColor}"/>
      `;
    } else if (dir === 'right') {
      // RIGHT VIEW
      if (isHijab) {
        parts += `
          <polygon points="${cx - 6},${oy + 38 + bob} ${cx + 8},${oy + 38 + bob} ${cx + 10},${oy + 53 + bob} ${cx - 8},${oy + 53 + bob}" fill="${pantsColor}"/>
          <rect x="${cx - 2 - legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 7}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
          <!-- Hijab profile -->
          <ellipse cx="${cx + 1}" cy="${oy + 14 + bob}" rx="10" ry="11" fill="${hijabColor}"/>
          <ellipse cx="${cx + 4}" cy="${oy + 14 + bob}" rx="4" ry="6" fill="${skinColor}"/>
          <circle cx="${cx + 5}" cy="${oy + 14 + bob}" r="1.1" fill="#0f172a"/>
        `;
      } else {
        parts += `
          <rect x="${cx - 3 - legOffset}" y="${oy + 38 + bob}" width="6" height="16" rx="2" fill="${pantsColor}"/>
          <rect x="${cx - 2 - legOffset}" y="${oy + 52 + bob}" width="9" height="5" rx="1.5" fill="${shoeColor}"/>
          <rect x="${cx - 7}" y="${oy + 22 + bob}" width="15" height="18" rx="4" fill="${shirtColor}"/>
          <circle cx="${cx + 1}" cy="${oy + 14 + bob}" r="9" fill="${skinColor}"/>
          <circle cx="${cx + 6}" cy="${oy + 14 + bob}" r="1.3" fill="#0f172a"/>
        `;

        if (isSecurity) {
          parts += `<rect x="${cx - 8}" y="${oy + 7 + bob}" width="18" height="5" rx="2" fill="#451a03"/>`;
        } else {
          parts += `<path d="M${cx + 10},${oy + 13 + bob} Q${cx + 3},${oy + 3 + bob} ${cx - 8},${oy + 11 + bob} Q${cx - 4},${oy + 19 + bob} ${cx},${oy + 18 + bob} Z" fill="${hairColor}"/>`;
        }
      }

      // Arm Side
      parts += `
        <rect x="${cx - 1 + legOffset}" y="${oy + 23 + bob}" width="5" height="12" rx="2" fill="${shirtColor}"/>
        <circle cx="${cx + 1 + legOffset}" cy="${oy + 35 + bob}" r="2.5" fill="${skinColor}"/>
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
// MAIN GENERATION RUNNER
// =============================================================================
async function main() {
  console.log('Generating Indonesian Life RP character spritesheets...');

  // 1. Five Character Types
  await saveSvgToPng(generateCharacterSvg('teacher'), path.join(OUT_DIR, 'characters/guru_spritesheet.png'), 256, 256);
  await saveSvgToPng(generateCharacterSvg('teacher_female'), path.join(OUT_DIR, 'characters/guru_wanita_spritesheet.png'), 256, 256);
  await saveSvgToPng(generateCharacterSvg('student_male'), path.join(OUT_DIR, 'characters/siswa_spritesheet.png'), 256, 256);
  await saveSvgToPng(generateCharacterSvg('student_female'), path.join(OUT_DIR, 'characters/siswi_hijab_spritesheet.png'), 256, 256);
  await saveSvgToPng(generateCharacterSvg('security'), path.join(OUT_DIR, 'characters/satpam_spritesheet.png'), 256, 256);

  console.log('All character spritesheets generated successfully!');
}

main().catch(err => {
  console.error('Character generation failed:', err);
  process.exit(1);
});
