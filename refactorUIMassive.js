const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/components/grademaster');

// Recursive function to get all tsx files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

const replacements = [
  // Backgrounds
  { regex: /bg-slate-900\/40/g, replace: 'bg-surface premium-shadow' },
  { regex: /bg-slate-950\/95/g, replace: 'bg-surface/95' },
  { regex: /bg-slate-950\/90/g, replace: 'bg-surface/90' },
  { regex: /bg-slate-950\/80/g, replace: 'bg-surface/80' },
  { regex: /bg-slate-950\/60/g, replace: 'bg-surface/60' },
  { regex: /bg-slate-950\/50/g, replace: 'bg-surface-variant' },
  { regex: /bg-slate-950/g, replace: 'bg-surface' },
  { regex: /bg-\[#0e0e10\]\/80/g, replace: 'bg-surface/80' },
  { regex: /bg-\[#0e0e10\]/g, replace: 'bg-surface' },
  { regex: /bg-white\/5/g, replace: 'bg-surface-variant' },
  { regex: /bg-white\/10/g, replace: 'bg-surface-container-highest' },
  { regex: /bg-white\/\[0\.02\]/g, replace: 'bg-surface-variant' },
  { regex: /bg-white\/\[0\.025\]/g, replace: 'bg-surface-variant' },
  { regex: /bg-white\/\[0\.03\]/g, replace: 'bg-surface-variant' },
  { regex: /bg-white\/\[0\.04\]/g, replace: 'bg-surface-variant' },
  { regex: /bg-white\/\[0\.05\]/g, replace: 'bg-surface-variant' },

  // Borders
  { regex: /border-white\/10/g, replace: 'border-outline-variant' },
  { regex: /border-white\/5/g, replace: 'border-outline-variant' },
  { regex: /border-white\/\[0\.06\]/g, replace: 'border-outline-variant' },
  { regex: /border-white\/\[0\.08\]/g, replace: 'border-outline-variant' },
  { regex: /border-white\/\[0\.1\]/g, replace: 'border-outline-variant' },

  // Shadows
  { regex: /shadow-2xl(?!\s+shadow)/g, replace: 'premium-shadow' },
  { regex: /shadow-md/g, replace: 'premium-shadow' },
  { regex: /shadow-inner/g, replace: 'shadow-sm' },

  // Text
  { regex: /text-slate-200/g, replace: 'text-on-surface' },
  { regex: /text-slate-300/g, replace: 'text-on-surface-variant' },
  { regex: /text-slate-400/g, replace: 'text-on-surface-variant' },

  // Form Inputs specific logic
  { regex: /placeholder:text-slate-600/g, replace: 'placeholder:text-slate-400' },
  { regex: /placeholder:text-slate-700/g, replace: 'placeholder:text-slate-400' },
  { regex: /placeholder:text-slate-800/g, replace: 'placeholder:text-slate-400' },
  
  // Custom manual fixes using string targets
  { regex: /bg-slate-900\/50/g, replace: 'bg-surface-variant' },
  { regex: /bg-slate-800\/50/g, replace: 'bg-surface-variant' },
];

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });

  // Careful text-white fixes
  // Change text-white to text-on-surface if it's inside inputs, textareas, labels etc.
  content = content.replace(/text-white(?=\s+outline-none)/g, 'text-on-surface');
  content = content.replace(/text-white(?=\s+focus:ring)/g, 'text-on-surface');
  content = content.replace(/text-white(?=\s+uppercase)/g, 'text-on-surface');
  content = content.replace(/text-white(?=\s+tracking-widest)/g, 'text-on-surface');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated: ${path.basename(file)}`);
  }
});

console.log(`\nSuccess! Refactored ${changedFiles} components.`);
