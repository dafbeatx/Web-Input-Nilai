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

let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Find all className="..." or className={`...`} blocks
  const classMatches = content.match(/className=(?:["'][^"']*["']|{`[^`]*`})/g);
  
  if (classMatches) {
    classMatches.forEach(match => {
      // If the match contains text-white
      if (match.includes('text-white')) {
        // Exclude generic solid colorful backgrounds where text-white is intended
        const hasSolidBg = /(bg-primary|bg-emerald|bg-rose|bg-amber|bg-sky|bg-indigo|bg-black)\b/.test(match);
        
        // Also exclude if it already has text-white conditionally based on hover
        const isHoverWhite = /hover:text-white/.test(match) && match.split('text-white').length === 2;
        
        if (!hasSolidBg) {
          // It's likely a dark mode remnant text-white, replace it!
          // Replace exactly the text-white token (not hover:text-white)
          // Lookbehind isn't universally safe but we can use string replace and caution
          const newMatch = match.replace(/(?<!hover:|focus:|active:)text-white/g, 'text-on-surface');
          
          if (newMatch !== match) {
            content = content.replace(match, newMatch);
          }
        }
      }
    });
  }

  // Also catch generic text-slate-200 and text-slate-300 that might have been missed
  content = content.replace(/text-slate-200/g, 'text-on-surface');
  content = content.replace(/text-slate-300/g, 'text-on-surface-variant');
  content = content.replace(/text-slate-400/g, 'text-on-surface-variant');

  // Any remaining generic modal borders / text remnants
  content = content.replace(/text-slate-500/g, 'text-on-surface-variant');

  // Add Shadows to rounded-2xl or rounded-3xl or rounded-[2rem] if not present
  // This is a bit riskier, let's just make sure the primary cards have premium-shadow
  // We already replaced shadow-2xl and shadow-md with premium-shadow

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Text Updated: ${path.basename(file)}`);
  }
});

console.log(`\nSuccess! Refactored text colors in ${changedFiles} components.`);
