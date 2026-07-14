const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const hookDest = path.join(projectRoot, '.git', 'hooks', 'pre-commit');

// Check if .git directory exists
if (fs.existsSync(path.join(projectRoot, '.git'))) {
  const hookContent = `#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

try {
  // Execute the secret scan script
  execSync('node ' + JSON.stringify(path.join(__dirname, '../../scripts/pre-commit-secrets.js')), { stdio: 'inherit' });
} catch (err) {
  process.exit(1);
}
`;

  fs.mkdirSync(path.dirname(hookDest), { recursive: true });
  fs.writeFileSync(hookDest, hookContent, { mode: 0o755 });
  
  // Also try to chmod it on Unix systems just in case
  try {
    fs.chmodSync(hookDest, 0o755);
  } catch (err) {
    // Ignore error on Windows
  }

  console.log('✅ Local git pre-commit hook installed successfully.');
} else {
  console.log('⚠️ .git folder not found. Skipping hook installation.');
}
