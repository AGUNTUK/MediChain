import fs from "fs";
import path from "path";

const progressFile = path.resolve("scripts/catalog_sync_progress.json");
if (fs.existsSync(progressFile)) {
  const data = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
  const completed = Object.values(data.companies || {}).filter((c: any) => c.status === "completed" && c.productsCount > 0);
  const inProg = Object.values(data.companies || {}).filter((c: any) => c.status === "in_progress");
  const pending = Object.values(data.companies || {}).filter((c: any) => c.status === "pending" || c.status === "error" || c.productsCount === 0);

  console.log({
    completedCount: completed.length,
    inProgressCount: inProg.length,
    pendingCount: pending.length,
    totalProductsUpdated: data.totalProductsUpdated,
    totalProductsCreated: data.totalProductsCreated,
    completedList: completed.map((c: any) => `${c.companyName} (${c.productsCount} prods)`),
    currentCompany: inProg.map((c: any) => `${c.companyName} (${c.processedScreenshots}/${c.totalScreenshots} screenshots)`)
  });
}
