import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

try {
  const zipPath = path.resolve("public/products-zip/Medicines.zip");
  if (!fs.existsSync(zipPath)) {
    console.error("Zip not found:", zipPath);
    process.exit(1);
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  console.log(`Total entries in Medicines.zip: ${entries.length}`);

  const topLevel = entries.map(e => ({
    name: e.entryName,
    isDirectory: e.isDirectory,
    size: e.header.size
  }));

  console.log(JSON.stringify(topLevel, null, 2));
} catch (err) {
  console.error("Error inspecting zip:", err);
}
