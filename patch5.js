import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  '.select("name, phone, address")\n        .eq("owner_id", user.id)',
  '.select("pharmacyName, phone, address")\n        .eq("user_id", user.id)'
);
code = code.replace(
  'pharmacyName: pharmacy.name,',
  'pharmacyName: pharmacy.pharmacyName || "Unknown",'
);
fs.writeFileSync('server.ts', code);
