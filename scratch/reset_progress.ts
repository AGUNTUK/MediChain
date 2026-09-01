import fs from "fs";
import path from "path";

const progressFile = path.resolve("scripts/catalog_sync_progress.json");
if (fs.existsSync(progressFile)) {
  const data = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
  
  // Keep only companies and images where products were actually extracted
  const newProcessedImages: Record<string, boolean> = {};
  const newCompanies: Record<string, any> = {};

  for (const [compKey, comp] of Object.entries(data.companies as Record<string, any>)) {
    if (comp.productsCount > 0 && comp.status === "completed") {
      newCompanies[compKey] = comp;
      // keep its images
      for (const [imgKey, val] of Object.entries(data.processedImages as Record<string, boolean>)) {
        if (imgKey.startsWith(compKey)) {
          newProcessedImages[imgKey] = val;
        }
      }
    } else {
      console.log(`Resetting company: ${compKey} (had ${comp.productsCount} products)`);
    }
  }

  data.companies = newCompanies;
  data.processedImages = newProcessedImages;
  fs.writeFileSync(progressFile, JSON.stringify(data, null, 2), "utf-8");
  console.log("Progress file reset for unextracted companies!");
}
