const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-commit secret scanning...');

// Define regex patterns for high-risk secrets
const SECRET_PATTERNS = [
  { name: 'Supabase Service Role Key / Token Pattern', pattern: /sb_[a-zA-Z0-9]{32,}/i },
  { name: 'Supabase Service Role JWT', pattern: /eyJhYmdjIjoiSFMyNTYiLCJ0eXAiOiJKV1QifQ\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ }, // typical Supabase service role token prefix
  { name: 'Generic Secret JWT', pattern: /ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/ },
  { name: 'Telegram Bot Token', pattern: /\d{8,10}:[a-zA-Z0-9_-]{35}/ },
  { name: 'Groq API Key', pattern: /gsk_[a-zA-Z0-9]{40,}/i },
  { name: 'Generic API Key / Secret', pattern: /(api[-_]?key|secret|password|token)\s*=\s*['"`][a-zA-Z0-9_*-]{20,}['"`]/i }
];

// File extensions or paths to ignore
const IGNORED_PATHS = [
  /\.env\.example$/,
  /package-lock\.json$/,
  /scripts\/pre-commit-secrets\.js$/
];

try {
  // Get list of staged files
  const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);

  let leaksFound = 0;

  for (const file of stagedFiles) {
    if (IGNORED_PATHS.some(p => p.test(file))) {
      continue;
    }

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          // Double check if it's not a placeholder/example value
          if (line.includes('your_') || line.includes('placeholder') || line.includes('example')) {
            continue;
          }
          console.error(`❌ \x1b[31mLEAK DETECTED\x1b[0m: Found potential ${name} in file \x1b[33m${file}:${i + 1}\x1b[0m`);
          console.error(`   Line: ${line.trim().substring(0, 100)}...`);
          leaksFound++;
        }
      }
    }
  }

  if (leaksFound > 0) {
    console.error(`\n🔴 Commit blocked. Found ${leaksFound} potential secret leak(s).`);
    console.error('   Please remove the secrets, or use environment variables, then stage the files again.');
    process.exit(1);
  }

  console.log('✅ No secrets detected in staged files.');
} catch (err) {
  console.error('Error running secret scan:', err.message);
  process.exit(0); // Fail open on git command failures to avoid blocking developers if git/env issues occur
}
