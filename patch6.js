import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  'if (pharmError || !pharmacy) {',
  'if (pharmError || !pharmacy) {\n        console.error("Pharmacy lookup error:", pharmError, "User ID:", user.id);'
);
fs.writeFileSync('server.ts', code);
