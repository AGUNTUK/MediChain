import AdmZip from "adm-zip";
import path from "path";

const zipPath = path.resolve("public/products-zip/Medicines.zip");
const rootZip = new AdmZip(zipPath);

// Let's inspect a few company archives
const testEntries = [
  "One Pharma Ltd(3%).zip",
  "Pristine Pharmaceuticals Ltd (2%).zip",
  "Square Pharmaceuticals PLC.zip"
];

for (const name of testEntries) {
  const entry = rootZip.getEntry(name);
  if (entry) {
    const subZipData = rootZip.readFile(entry);
    if (subZipData) {
      const subZip = new AdmZip(subZipData);
      const subEntries = subZip.getEntries();
      console.log(`\n--- Company: ${name} (${subEntries.length} items) ---`);
      subEntries.slice(0, 10).forEach(se => {
        console.log(`  - ${se.entryName} (size: ${se.header.size})`);
      });
    }
  }
}
