import AdmZip from "adm-zip";
import path from "path";

const zipPath = path.resolve("public/products-zip/Medicines.zip");
const rootZip = new AdmZip(zipPath);
const entries = rootZip.getEntries();

interface CompanyInfo {
  zipName: string;
  cleanCompanyName: string;
  bonusPercent: number;
  imageCount: number;
}

const companies: CompanyInfo[] = [];
let totalScreenshots = 0;

for (const entry of entries) {
  if (entry.isDirectory) continue;
  const fileName = entry.entryName;
  
  // Extract bonus percentage, e.g. "Albion Laboratories Limited(3%).zip" -> 3%
  // Or "Square Pharmaceuticals PLC.zip" -> 0% / default
  const match = fileName.match(/\((\d+)%\)/);
  const bonusPercent = match ? parseInt(match[1], 10) : 0;
  
  // Clean company name (remove (X%).zip or .zip)
  let cleanName = fileName.replace(/\(\d+%\)\.zip$/i, "").replace(/\.zip$/i, "").trim();

  let imageCount = 0;
  try {
    const subZipData = rootZip.readFile(entry);
    if (subZipData) {
      const subZip = new AdmZip(subZipData);
      const subEntries = subZip.getEntries();
      const images = subEntries.filter(e => !e.isDirectory && /\.(jpe?g|png|webp)$/i.test(e.entryName));
      imageCount = images.length;
      totalScreenshots += imageCount;
    }
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err);
  }

  companies.push({
    zipName: fileName,
    cleanCompanyName: cleanName,
    bonusPercent,
    imageCount
  });
}

console.log(`Total Companies: ${companies.length}`);
console.log(`Total Screenshots across all companies: ${totalScreenshots}`);
console.log("\nCompany Breakdown:");
companies.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.cleanCompanyName}] Bonus: +${c.bonusPercent}% | Screenshots: ${c.imageCount}`);
});
