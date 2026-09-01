import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

const itemsToSync = [
  // --- INCEPTA PHARMACEUTICALS LTD (Bonus: +0%) ---
  { name: "Abdolax 10", generic_name: "Bisacodyl", strength: "10 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 261.69, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Adora 500", generic_name: "Cephradine", strength: "500 mg", pack_size: "20 Pcs", category_name_fallback: "Capsule", mrp: 360, selling_price: 308.77, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Alestor 5", generic_name: "Allylestrenol", strength: "5 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 345.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Alfavir 25", generic_name: "Tenofovir Alafenamide", strength: "25 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 1800, selling_price: 1512.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Algicid DX 200 ml", generic_name: "Sodium Alginate + Sodium Bicarbonate", strength: "500 mg + 267 mg / 10 ml", pack_size: "1 Pcs (200 ml)", category_name_fallback: "Oral Suspension", mrp: 300, selling_price: 244.17, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Alneed Gold", generic_name: "Multivitamin & Multimineral A-Z", strength: "N/A", pack_size: "50pcs", category_name_fallback: "Capsule", mrp: 300, selling_price: 258.87, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Aprima 30", generic_name: "Apremilast", strength: "30 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 1200, selling_price: 1042.56, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Askorel SR 50mg", generic_name: "Aceclofenac Sustained Release", strength: "50 mg", pack_size: "20 pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 256.80, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Barbit 60", generic_name: "Phenobarbital", strength: "60 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 150, selling_price: 131.01, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Beuflox 500", generic_name: "Ciprofloxacin", strength: "500 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 257.07, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Biofol 5mg", generic_name: "Folic Acid", strength: "5 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 270, selling_price: 234.31, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Bisopro 2.5", generic_name: "Bisoprolol Fumarate", strength: "2.5 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 266.34, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Bisopro 5", generic_name: "Bisoprolol Fumarate", strength: "5 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 268.62, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Budicort 0.5", generic_name: "Budesonide", strength: "0.5 mg / 2 ml", pack_size: "12 pcs", category_name_fallback: "Nebuliser Suspension", mrp: 540, selling_price: 496.26, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cavic-C 1000 mg", generic_name: "Calcium Carbonate + Vitamin C", strength: "1000 mg + 1000 mg", pack_size: "12 Pcs", category_name_fallback: "Tablet", mrp: 195, selling_price: 168.46, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cavic-C Plus 1000 mg", generic_name: "Calcium Carbonate + Vitamin C + Zinc", strength: "1000 mg + 1000 mg + 10 mg", pack_size: "15 Pcs", category_name_fallback: "Tablet", mrp: 195, selling_price: 159.33, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cefaclav 250", generic_name: "Cefuroxime + Clavulanic Acid", strength: "250 mg + 62.5 mg", pack_size: "14 Pcs", category_name_fallback: "Tablet", mrp: 490, selling_price: 416.99, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cefaclav 500", generic_name: "Cefuroxime + Clavulanic Acid", strength: "500 mg + 125 mg", pack_size: "12 pcs", category_name_fallback: "Tablet", mrp: 840, selling_price: 733.99, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Citofer 210", generic_name: "Ferric Carboxymaltose / Iron complex", strength: "210 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 800, selling_price: 683.12, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Clindacin 300", generic_name: "Clindamycin Hydrochloride", strength: "300 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 540, selling_price: 466.51, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cortan 1% 5 ml", generic_name: "Prednisolone Acetate", strength: "1%", pack_size: "1 Pcs (5 ml)", category_name_fallback: "Eye Drop", mrp: 100, selling_price: 87.34, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cortan 10", generic_name: "Prednisolone", strength: "10 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 323, selling_price: 283.85, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cortan 50ml 5 mg/5ml", generic_name: "Prednisolone", strength: "5 mg / 5 ml", pack_size: "1 Pcs (50 ml)", category_name_fallback: "Oral Solution", mrp: 65, selling_price: 54.45, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cytomis 200", generic_name: "Misoprostol", strength: "200 mcg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 400.23, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Cytomis 600", generic_name: "Misoprostol", strength: "600 mcg", pack_size: "10 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 336.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Delanix 30", generic_name: "Dexlansoprazole", strength: "30 mg", pack_size: "50 Pcs", category_name_fallback: "Capsule", mrp: 500, selling_price: 431.70, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Dermomix 0.05%+", generic_name: "Clobetasol + Miconazole + Gentamicin", strength: "0.05% + 2% + 0.5%", pack_size: "1 Pcs (15 gm)", category_name_fallback: "Cream", mrp: 200, selling_price: 160.30, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Dilate Plus 0.8%+5%", generic_name: "Tropicamide + Phenylephrine", strength: "0.8% + 5%", pack_size: "1 Box (5 ml)", category_name_fallback: "Eye Drop", mrp: 80, selling_price: 67.20, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Disopan 1", generic_name: "Clonazepam", strength: "1 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 388.80, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Disopan 2mg", generic_name: "Clonazepam", strength: "2 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 625, selling_price: 539.31, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Econate Plus 10 gm", generic_name: "Econazole Nitrate + Triamcinolone", strength: "1% + 0.1%", pack_size: "1 Box (10 gm)", category_name_fallback: "Cream", mrp: 55, selling_price: 48.83, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Emixef 400", generic_name: "Cefixime", strength: "400 mg", pack_size: "8 pcs", category_name_fallback: "Capsule", mrp: 400, selling_price: 347.36, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Endofree 2.5", generic_name: "Letrozole", strength: "2.5 mg", pack_size: "10 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 342.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Esonix 20 Tab", generic_name: "Esomeprazole Magnesium Trihydrate", strength: "20 mg", pack_size: "70pcs", category_name_fallback: "Tablet", mrp: 490, selling_price: 418.85, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Esonix M 20", generic_name: "Esomeprazole MUPS", strength: "20 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 431.10, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Esonix M 40", generic_name: "Esomeprazole MUPS", strength: "40 mg", pack_size: "30pcs", category_name_fallback: "Tablet", mrp: 420, selling_price: 360.99, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Febustat 40mg", generic_name: "Febuxostat", strength: "40 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 360, selling_price: 302.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Febustat 80", generic_name: "Febuxostat", strength: "80 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 660, selling_price: 562.78, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Fenofex 120", generic_name: "Fexofenadine Hydrochloride", strength: "120 mg", pack_size: "50 pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 421.15, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Fenofex 180", generic_name: "Fexofenadine Hydrochloride", strength: "180 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 207.94, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Fixocard 5/50", generic_name: "Amlodipine + Atenolol", strength: "5 mg + 50 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 354.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Frenia 4", generic_name: "Tizanidine", strength: "4 mg", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 201.60, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Indapril 2", generic_name: "Imidapril Hydrochloride", strength: "2 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 210, selling_price: 176.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Indapril 4", generic_name: "Imidapril Hydrochloride", strength: "4 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 201.60, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Intamycin 80 mg/2ml", generic_name: "Gentamicin", strength: "80 mg / 2 ml", pack_size: "1 Box (5 ampoules)", category_name_fallback: "IM/IV injection", mrp: 150, selling_price: 126.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Joinix D 750+50mg", generic_name: "Glucosamine + Diacerein", strength: "750 mg + 50 mg", pack_size: "30pcs", category_name_fallback: "Tablet", mrp: 360, selling_price: 311.65, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Joinix Plus 250 mg+200 mg", generic_name: "Glucosamine + Chondroitin", strength: "250 mg + 200 mg", pack_size: "50pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 431.75, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Joinix TS 750 mg+", generic_name: "Glucosamine + Chondroitin + MSM", strength: "750 mg + 50 mg + 250 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 750, selling_price: 643.20, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Klarix 500", generic_name: "Clarithromycin", strength: "500 mg", pack_size: "6pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 207.43, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Levoxin 500", generic_name: "Levofloxacin", strength: "500 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 510, selling_price: 439.67, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Linatab 5", generic_name: "Linagliptin", strength: "5 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 352.44, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Linatab M 2.5/500", generic_name: "Linagliptin + Metformin", strength: "2.5 mg + 500 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 360, selling_price: 321.30, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Linzolid 400", generic_name: "Linezolid", strength: "400 mg", pack_size: "10 Pcs", category_name_fallback: "Tablet", mrp: 600, selling_price: 504.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "MarinCal D 500 mg+200 IU", generic_name: "Calcium Carbonate + Vitamin D3", strength: "500 mg + 200 IU", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 600, selling_price: 510.24, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "MarinCal DX 600", generic_name: "Calcium Carbonate (Coral) + Vitamin D3", strength: "600 mg + 400 IU", pack_size: "40 Pcs", category_name_fallback: "Tablet", mrp: 640, selling_price: 552.06, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Menaril 8", generic_name: "Betahistine Dihydrochloride", strength: "8 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 265.02, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Migrex 200", generic_name: "Pizotifen / Flunarizine", strength: "200 mg", pack_size: "30pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 264.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Momelo 120 ms", generic_name: "Mometasone Furoate", strength: "50 mcg / spray", pack_size: "1 Pcs (120 metered sprays)", category_name_fallback: "Nasal Spray", mrp: 550, selling_price: 485.32, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Momeson 120", generic_name: "Mometasone Furoate", strength: "50 mcg", pack_size: "1 Pcs (120 sprays)", category_name_fallback: "Nasal Spray", mrp: 250, selling_price: 215.73, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Montair 10", generic_name: "Montelukast Sodium", strength: "10 mg", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 525, selling_price: 456.96, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Montair 4 ODT", generic_name: "Montelukast Sodium ODT", strength: "4 mg", pack_size: "50pcs", category_name_fallback: "Tablet", mrp: 350, selling_price: 304.01, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Montair 5 ODT", generic_name: "Montelukast Sodium ODT", strength: "5 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 211.70, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Moxquin 400", generic_name: "Moxifloxacin Hydrochloride", strength: "400 mg", pack_size: "12 pcs", category_name_fallback: "Tablet", mrp: 480, selling_price: 410.88, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Mycocure 250", generic_name: "Terbinafine Hydrochloride", strength: "250 mg", pack_size: "10pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 344.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Myolax 50", generic_name: "Tolperisone Hydrochloride", strength: "50 mg", pack_size: "70 Pcs", category_name_fallback: "Tablet", mrp: 630, selling_price: 551.82, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Neotison 120 ms", generic_name: "Fluticasone Propionate", strength: "50 mcg / spray", pack_size: "1 Pcs (120 metered sprays)", category_name_fallback: "Nasal Spray", mrp: 275, selling_price: 243.81, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Nintoin SR 100", generic_name: "Nitrofurantoin Sustained Release", strength: "100 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 690, selling_price: 606.99, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Nobesit 500", generic_name: "Metformin Hydrochloride", strength: "500 mg", pack_size: "60 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 213.41, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Nomopil 1", generic_name: "Repaglinide", strength: "1 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 252.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Nomopil 2", generic_name: "Repaglinide", strength: "2 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 250, selling_price: 220.35, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Noteron 5", generic_name: "Norethisterone", strength: "5 mg", pack_size: "60 Pcs", category_name_fallback: "Tablet", mrp: 330, selling_price: 285.85, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Olanap 5", generic_name: "Olanzapine", strength: "5 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 125, selling_price: 110.94, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Omidon 10", generic_name: "Domperidone", strength: "10 mg", pack_size: "150 pcs", category_name_fallback: "Tablet", mrp: 525, selling_price: 461.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Orfanem 200", generic_name: "Faropenem Sodium", strength: "200 mg", pack_size: "14 Pcs", category_name_fallback: "Tablet", mrp: 1330, selling_price: 1117.20, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Osartil 50", generic_name: "Losartan Potassium", strength: "50 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 441.65, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Osartil Plus 100 mg+25 mg", generic_name: "Losartan Potassium + Hydrochlorothiazide", strength: "100 mg + 25 mg", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 360, selling_price: 318.46, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Osartil Plus 50 mg+12.5 mg", generic_name: "Losartan Potassium + Hydrochlorothiazide", strength: "50 mg + 12.5 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 444.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Osteo D 200000", generic_name: "Cholecalciferol (Vitamin D3)", strength: "200000 IU / 1 ml", pack_size: "1 ml ampoule", category_name_fallback: "IM Injection", mrp: 120, selling_price: 100.80, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Pantonix 20", generic_name: "Pantoprazole Sodium", strength: "20 mg", pack_size: "98pcs", category_name_fallback: "Tablet", mrp: 686, selling_price: 597.51, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Pantonix 40", generic_name: "Pantoprazole Sodium", strength: "40 mg", pack_size: "98 pcs", category_name_fallback: "Tablet", mrp: 980, selling_price: 843.49, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Pregaben 50", generic_name: "Pregabalin", strength: "50 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 412, selling_price: 369.73, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Pregaben 75", generic_name: "Pregabalin", strength: "75 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 540, selling_price: 477.58, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Progesic 500", generic_name: "Paracetamol", strength: "500 mg", pack_size: "30pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 388.98, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Purisal 2", generic_name: "Salbutamol Sulphate", strength: "2 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 200, selling_price: 168.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Ramogut 5", generic_name: "Rifaximin", strength: "5 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 600, selling_price: 518.76, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Ramoril 2.5", generic_name: "Ramipril", strength: "2.5 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 250, selling_price: 218.05, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Reservix 100", generic_name: "Aceclofenac", strength: "100 mg", pack_size: "100pcs", category_name_fallback: "Tablet", mrp: 570, selling_price: 491.23, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Reservix SR 200", generic_name: "Aceclofenac Sustained Release", strength: "200 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 205.44, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Rosen 28", generic_name: "Drospirenone + Ethinylestradiol", strength: "0.03 mg + 3 mg", pack_size: "28 Pcs", category_name_fallback: "Tablet", mrp: 399, selling_price: 345.69, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Rupex 10", generic_name: "Rupatadine Fumarate", strength: "10 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 257.79, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Sabitar 50", generic_name: "Sacubitril + Valsartan", strength: "24 mg + 26 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 1350, selling_price: 1143.85, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Seasonix 5", generic_name: "Levocetirizine Dihydrochloride", strength: "5 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 390.33, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Sitagil M 50/500", generic_name: "Sitagliptin + Metformin", strength: "50 mg + 500 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 320, selling_price: 285.57, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Sumatrex 10", generic_name: "Sumatriptan Succinate", strength: "10 mg / dose", pack_size: "1 Box (2 devices)", category_name_fallback: "Nasal Spray", mrp: 620, selling_price: 520.80, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Synogen Alfa 40", generic_name: "Pantoprazole + Domperidone", strength: "40 mg + 30 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 800, selling_price: 682.32, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Telmidip 40/5", generic_name: "Telmisartan + Amlodipine", strength: "40 mg + 5 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 266.40, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Telmipres 80", generic_name: "Telmisartan", strength: "80 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 330, selling_price: 287.63, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Ticarel 90", generic_name: "Ticagrelor", strength: "90 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 1500, selling_price: 1270.35, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Topirva 50", generic_name: "Topiramate", strength: "50 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 420.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Tridosil 500", generic_name: "Azithromycin", strength: "500 mg", pack_size: "12 pcs", category_name_fallback: "Tablet", mrp: 420, selling_price: 356.33, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Trimela 30 gm", generic_name: "Hydroquinone + Tretinoin + Fluocinolone", strength: "2% + 0.025% + 4%", pack_size: "1 Box (30 gm)", category_name_fallback: "Cream", mrp: 200, selling_price: 155.42, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Ulfate 200 ml", generic_name: "Sucralfate", strength: "500 mg / 5 ml", pack_size: "1 Box (200 ml)", category_name_fallback: "Suspension", mrp: 400, selling_price: 355.72, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Uptiva 150", generic_name: "Ursodeoxycholic Acid", strength: "150 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 378.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "Valovir 1gm", generic_name: "Valacyclovir", strength: "1 gm", pack_size: "8pcs", category_name_fallback: "Tablet", mrp: 600, selling_price: 516.18, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Vitabion 100 mg+200 mg+200 mcg", generic_name: "Vitamin B1 + B6 + B12", strength: "100 mg + 200 mg + 200 mcg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 600, selling_price: 517.08, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Welgut 20 billion", generic_name: "Probiotics 20 Billion CFU", strength: "20 billion CFU", pack_size: "20 Pcs", category_name_fallback: "Capsule", mrp: 800, selling_price: 688.24, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Windel plus 2.5 mg+0.5 mg", generic_name: "Salbutamol + Ipratropium", strength: "2.5 mg + 0.5 mg", pack_size: "15 pcs", category_name_fallback: "Nebuliser Solution", mrp: 450, selling_price: 396.00, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Xyotil 20", generic_name: "Teneligliptin", strength: "20 mg", pack_size: "30pc", category_name_fallback: "Tablet", mrp: 240, selling_price: 212.59, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Zolium 0.25", generic_name: "Alprazolam", strength: "0.25 mg", pack_size: "100pcs", category_name_fallback: "Tablet", mrp: 200, selling_price: 174.62, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Zolium 0.5", generic_name: "Alprazolam", strength: "0.5 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 340, selling_price: 295.77, company: "Incepta Pharmaceuticals Ltd", stock_quantity: 100 },

  // --- JAYSON PHARMACEUTICALS LTD (Bonus: +2%) ---
  { name: "Folison 5mg", generic_name: "Folic Acid", strength: "5 mg", pack_size: "500pcs", category_name_fallback: "Tablet", mrp: 175, selling_price: 155.10, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },
  { name: "Histacin 4", generic_name: "Chlorpheniramine Maleate", strength: "4 mg", pack_size: "500pcs", category_name_fallback: "Tablet", mrp: 150, selling_price: 128.78, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },
  { name: "Jasocaine 2%", generic_name: "Lidocaine Jelly", strength: "2%", pack_size: "30 gm", category_name_fallback: "Gel", mrp: 100, selling_price: 82.00, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },
  { name: "Jasocaine Inj 30 ml", generic_name: "Lidocaine Hydrochloride", strength: "2%", pack_size: "1 Box (30 ml)", category_name_fallback: "Injection", mrp: 65, selling_price: 55.92, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },
  { name: "KT 150mg Injection", generic_name: "Ketorolac Tromethamine", strength: "150 mg / 10 ml", pack_size: "10 ml ampoule", category_name_fallback: "Injection", mrp: 150, selling_price: 121.43, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },
  { name: "Montison 10mg", generic_name: "Montelukast Sodium", strength: "10 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 246.00, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 0 },
  { name: "Riboson 5", generic_name: "Riboflavin", strength: "5 mg", pack_size: "500pcs", category_name_fallback: "Tablet", mrp: 150, selling_price: 129.00, company: "Jayson Pharmaceuticals Ltd.", stock_quantity: 100 },

  // --- KUMUDINI PHARMA LTD (Bonus: +3%) ---
  { name: "Cefadyl 200", generic_name: "Cefixime", strength: "200 mg", pack_size: "12 Pcs", category_name_fallback: "Capsule", mrp: 720, selling_price: 385.34, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Dexitor 30", generic_name: "Dexlansoprazole", strength: "30 mg", pack_size: "50 pcs", category_name_fallback: "Capsule", mrp: 500, selling_price: 303.75, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Dudon 10", generic_name: "Domperidone", strength: "10 mg", pack_size: "140 Pcs", category_name_fallback: "Tablet", mrp: 560, selling_price: 173.71, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "E Mups 20", generic_name: "Esomeprazole MUPS", strength: "20 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 308.60, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Esomiloc 20", generic_name: "Esomeprazole Magnesium Trihydrate", strength: "20 mg", pack_size: "60 Pcs", category_name_fallback: "Tablet", mrp: 360, selling_price: 159.19, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Fungimin Oral Gel", generic_name: "Miconazole Nitrate", strength: "2%", pack_size: "1 Pcs (10 gm)", category_name_fallback: "Oral Gel", mrp: 60, selling_price: 37.45, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Itrafun 100", generic_name: "Itraconazole", strength: "100 mg", pack_size: "30 pcs", category_name_fallback: "Capsule", mrp: 450, selling_price: 243.68, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Lumexit 0.5", generic_name: "Flupentixol + Melitracen", strength: "0.5 mg + 10 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 280, selling_price: 226.80, company: "Kumudini Pharma Ltd", stock_quantity: 0 },
  { name: "Mybion 100 mg+200 mg+200 mcg", generic_name: "Vitamin B1 + B6 + B12", strength: "100 mg + 200 mg + 200 mcg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 500, selling_price: 248.05, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Ocoral DX 600 mg", generic_name: "Calcium Carbonate (Coral) + Vitamin D3", strength: "600 mg + 400 IU", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 420, selling_price: 222.26, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Omiloc 20", generic_name: "Omeprazole", strength: "20 mg", pack_size: "100 Pcs", category_name_fallback: "Capsule", mrp: 500, selling_price: 207.95, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Orgy 10", generic_name: "Cetirizine Hydrochloride", strength: "10 mg", pack_size: "140 Pcs", category_name_fallback: "Tablet", mrp: 420, selling_price: 158.55, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Ossi D 500mg+200IU", generic_name: "Calcium Carbonate + Vitamin D3", strength: "500 mg + 200 IU", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 180, selling_price: 78.61, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Pulmokast 10 mg", generic_name: "Montelukast Sodium", strength: "10 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 364.50, company: "Kumudini Pharma Ltd", stock_quantity: 0 },
  { name: "Rubee 20", generic_name: "Rabeprazole Sodium", strength: "20 mg", pack_size: "60 pcs", category_name_fallback: "Tablet", mrp: 420, selling_price: 278.96, company: "Kumudini Pharma Ltd", stock_quantity: 100 },
  { name: "Vigotrum Gold", generic_name: "Multivitamin & Mineral Gold Formula", strength: "N/A", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 141.81, company: "Kumudini Pharma Ltd", stock_quantity: 100 },

  // --- MYSTIC PHARMACEUTICALS LTD (Bonus: +3%) ---
  { name: "Best B Pot", generic_name: "Vitamin B Complex Pot", strength: "N/A", pack_size: "30 Pcs", category_name_fallback: "Pot (Tablet)", mrp: 240, selling_price: 80.86, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Best B Strip", generic_name: "Vitamin B Complex", strength: "N/A", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 88.72, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Ciprolex 500", generic_name: "Ciprofloxacin", strength: "500 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 240, selling_price: 97.37, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Delgut 30", generic_name: "Dexlansoprazole", strength: "30 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 270, selling_price: 111.29, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Delgut 60", generic_name: "Dexlansoprazole", strength: "60 mg", pack_size: "30 Pcs", category_name_fallback: "Capsule", mrp: 480, selling_price: 203.95, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Etocoxiben 120", generic_name: "Etoricoxib", strength: "120 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 280, selling_price: 46.62, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Etocoxiben 90", generic_name: "Etoricoxib", strength: "90 mg", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 330, selling_price: 50.00, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Etoricoxiben 120", generic_name: "Etoricoxib", strength: "120 mg", pack_size: "20 Pcs", category_name_fallback: "Tablet", mrp: 280, selling_price: 52.81, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Etoricoxiben 90", generic_name: "Etoricoxib", strength: "90 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 330, selling_price: 50.00, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Fenoxit 90", generic_name: "Flupentixol + Melitracen", strength: "0.5 mg + 10 mg", pack_size: "90 Pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 80.33, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Finixzole 20", generic_name: "Rabeprazole Sodium", strength: "20 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 92.28, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Flucozole 50", generic_name: "Fluconazole", strength: "50 mg", pack_size: "30 pcs", category_name_fallback: "Capsule", mrp: 212, selling_price: 42.68, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Motiper 10", generic_name: "Domperidone", strength: "10 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 200, selling_price: 162.00, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 0 },
  { name: "My Para Extra 500", generic_name: "Paracetamol + Caffeine", strength: "500 mg + 65 mg", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 190, selling_price: 102.35, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Myfexo 120", generic_name: "Fexofenadine Hydrochloride", strength: "120 mg", pack_size: "50pcs", category_name_fallback: "Tablet", mrp: 350, selling_price: 96.50, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Myfin Terbinafine 250", generic_name: "Terbinafine Hydrochloride", strength: "250 mg", pack_size: "10 Pcs", category_name_fallback: "Tablet", mrp: 400, selling_price: 101.88, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Mymonte 10", generic_name: "Montelukast Sodium", strength: "10 mg", pack_size: "30 pcs", category_name_fallback: "Tablet", mrp: 450, selling_price: 37.62, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Mysangel 20", generic_name: "Omeprazole", strength: "20 mg", pack_size: "100 Pcs", category_name_fallback: "Capsule", mrp: 650, selling_price: 104.26, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Mystocal D 500 (Strip)", generic_name: "Calcium Carbonate + Vitamin D3", strength: "500 mg + 200 IU", pack_size: "100 Pcs", category_name_fallback: "Tablet", mrp: 650, selling_price: 66.50, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Mystocal D Pot", generic_name: "Calcium Carbonate + Vitamin D3", strength: "500 mg + 200 IU", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 195, selling_price: 34.53, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Naproxen plus 500 (Mystic)", generic_name: "Naproxen + Esomeprazole", strength: "500 mg + 20 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 126.99, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Omeprazole 20 (Mystic)", generic_name: "Omeprazole", strength: "20 mg", pack_size: "100 Pcs", category_name_fallback: "Capsule", mrp: 500, selling_price: 94.75, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Panton 20 (Mystic)", generic_name: "Pantoprazole Sodium", strength: "20 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 200, selling_price: 34.52, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Panton 40 (Mystic)", generic_name: "Pantoprazole Sodium", strength: "40 mg", pack_size: "50 Pcs", category_name_fallback: "Tablet", mrp: 325, selling_price: 47.55, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Rupatadine Myrup", generic_name: "Rupatadine Fumarate", strength: "10 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 300, selling_price: 68.43, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Senargra 100 (Mystic)", generic_name: "Sildenafil Citrate", strength: "100 mg", pack_size: "80pcs", category_name_fallback: "Tablet", mrp: 4000, selling_price: 3.20, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Tossnil 200", generic_name: "Doxofylline", strength: "200 mg", pack_size: "30 Pcs", category_name_fallback: "Tablet", mrp: 270, selling_price: 81.38, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Zithrolex 35 35 ml", generic_name: "Azithromycin", strength: "200 mg / 5 ml", pack_size: "1 Pcs (35 ml)", category_name_fallback: "Powder For Suspension", mrp: 130, selling_price: 68.02, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 },
  { name: "Zithrolex 500", generic_name: "Azithromycin", strength: "500 mg", pack_size: "6 Pcs", category_name_fallback: "Tablet", mrp: 192, selling_price: 95.62, company: "Mystic Pharmaceuticals Ltd", stock_quantity: 100 }
];

async function syncFourCompanies() {
  console.log(`Syncing ${itemsToSync.length} items for Incepta, Jayson, Kumudini, and Mystic...`);
  let count = 0;
  for (const item of itemsToSync) {
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .ilike("name", item.name)
      .limit(1);

    if (existing && existing.length > 0) {
      const id = existing[0].id;
      await supabaseAdmin.from("products").update(item).eq("id", id);
      await supabaseAdmin.from("inventory").upsert({
        product_id: id,
        available_stock: item.stock_quantity,
        expiry_date: "2027-12-31"
      }, { onConflict: "product_id" });
      count++;
    } else {
      const { data: inserted } = await supabaseAdmin.from("products").insert(item).select("id").single();
      if (inserted) {
        await supabaseAdmin.from("inventory").insert({
          product_id: inserted.id,
          available_stock: item.stock_quantity,
          reserved_stock: 0,
          sold_stock: 0,
          batch_number: `B-${Math.floor(10000 + Math.random() * 90000)}`,
          expiry_date: "2027-12-31"
        });
        count++;
      }
    }
  }
  console.log(`Batch sync successful! Total ${count} products synced.`);
}

syncFourCompanies().catch(console.error);
