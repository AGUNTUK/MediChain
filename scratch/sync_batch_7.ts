import dotenv from 'dotenv';
dotenv.config();
import { supabaseAdmin } from '../src/lib/supabaseAdmin.js';

interface MedicineItem {
  name: string;
  generic_name: string;
  strength: string;
  pack_size: string;
  category_name_fallback: string;
  mrp: number;
  selling_price: number;
  company: string;
  stock_quantity: number;
}

const batch7Medicines: MedicineItem[] = [
  // ==========================================
  // 1. Radiant Pharmaceuticals Limited (2%) [Bonus: +2%]
  // ==========================================
  {
    name: 'Calboplex (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3 + Minerals',
    strength: '500 mg + 200 IU + Minerals',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 243.66,
    company: 'Radiant Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Coralcin-D 500mg+200iu (30 Pcs)',
    generic_name: 'Calcium Carbonate (Coral source) + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 297.04,
    company: 'Radiant Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Coralcin-DX (30 Pcs)',
    generic_name: 'Calcium Carbonate (Coral source) + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 365.18,
    company: 'Radiant Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Coralcin-M (30 Pcs)',
    generic_name: 'Calcium (Coral source) + Vitamin D3 + Minerals',
    strength: '500 mg + 200 IU + Minerals',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 365.18,
    company: 'Radiant Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'M-Kast 10 10mg (30 Pcs)',
    generic_name: 'Montelukast',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 525,
    selling_price: 433.07,
    company: 'Radiant Pharmaceuticals Limited',
    stock_quantity: 100
  },

  // ==========================================
  // 2. Renata PLC (2%) [Bonus: +2%]
  // ==========================================
  {
    name: 'Almex 15 ml (1 bottle)',
    generic_name: 'Albendazole',
    strength: '200 mg / 5 ml',
    pack_size: '15 ml',
    category_name_fallback: 'Suspension',
    mrp: 26.25,
    selling_price: 21.03,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Almex 400 400 mg (2 Pcs)',
    generic_name: 'Albendazole',
    strength: '400 mg',
    pack_size: '2 Pcs',
    category_name_fallback: 'Chewable Tablet',
    mrp: 10,
    selling_price: 7.91,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Almex 400 400 mg (100 Pcs)',
    generic_name: 'Albendazole',
    strength: '400 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Chewable Tablet',
    mrp: 500,
    selling_price: 405.05,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Anaflex 100 100 mg (30 Pcs)',
    generic_name: 'Aceclofenac',
    strength: '100 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 125.07,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Anaflex 50gm 1.5% (1 Pcs)',
    generic_name: 'Aceclofenac',
    strength: '1.5%',
    pack_size: '1 Tube (50 gm)',
    category_name_fallback: 'Gel',
    mrp: 150,
    selling_price: 123.00,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Anaflex Max 200 200 mg (30 Pcs)',
    generic_name: 'Aceclofenac SR',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Aropen 1 gm (1 vial)',
    generic_name: 'Meropenem',
    strength: '1 gm',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 1100,
    selling_price: 880.88,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Aropen 500 500 mg (1 vial)',
    generic_name: 'Meropenem',
    strength: '500 mg',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 605,
    selling_price: 486.90,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Avita 25 25 mg (30 Pcs)',
    generic_name: 'Atenolol',
    strength: '25 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 45,
    selling_price: 36.90,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Avita 50 50 mg (50 Pcs)',
    generic_name: 'Atenolol',
    strength: '50 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 123.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Becosules (30 Pcs)',
    generic_name: 'Vitamin B Complex + Vitamin C',
    strength: 'B-Complex + C',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 105.3,
    selling_price: 86.40,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Bilastin 20 20 mg (30 Pcs)',
    generic_name: 'Bilastine',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 368.51,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Cabolin 0.5 0.5 mg (4 Pcs)',
    generic_name: 'Cabergoline',
    strength: '0.5 mg',
    pack_size: '4 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 326.68,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Calbon D 500mg+200iu (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 220.89,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Calbon M 500 mg (30 Pcs)',
    generic_name: 'Calcium + Vitamin D3 + Minerals',
    strength: '500 mg + 200 IU + Minerals',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.92,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Camlostan 5/50 (30 Pcs)',
    generic_name: 'Amlodipine + Losartan Potassium',
    strength: '5 mg + 50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Cartilage 750 (30 Pcs)',
    generic_name: 'Glucosamine + Chondroitin',
    strength: '750 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 540,
    selling_price: 432.81,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Cartilage Plus (30 Pcs)',
    generic_name: 'Glucosamine + Diacerein',
    strength: 'Plus',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 489.18,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Catadolor 100 100 mg (30 Pcs)',
    generic_name: 'Flupirtine Maleate',
    strength: '100 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 367.61,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Ceclor 500 500 mg (8 Pcs)',
    generic_name: 'Cefaclor',
    strength: '500 mg',
    pack_size: '8 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 440,
    selling_price: 360.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cefotax 1 gm (1 vial)',
    generic_name: 'Cefotaxime',
    strength: '1 gm',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 140,
    selling_price: 114.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cefotax 500 500 mg (1 vial)',
    generic_name: 'Cefotaxime',
    strength: '500 mg',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 90,
    selling_price: 73.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Citrazine 10 10 mg (100 Pcs)',
    generic_name: 'Cetirizine Dihydrochloride',
    strength: '10 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Co-Diovan 160/12.5 (14 Pcs)',
    generic_name: 'Valsartan + Hydrochlorothiazide',
    strength: '160 mg + 12.5 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 630,
    selling_price: 516.60,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Co-Diovan 80/12.5 (14 Pcs)',
    generic_name: 'Valsartan + Hydrochlorothiazide',
    strength: '80 mg + 12.5 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 344.40,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cosat 25 25 mg (30 Pcs)',
    generic_name: 'Losartan Potassium',
    strength: '25 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 120,
    selling_price: 98.40,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cosat 50 50 mg (30 Pcs)',
    generic_name: 'Losartan Potassium',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 196.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cosat Plus 50/12.5 (30 Pcs)',
    generic_name: 'Losartan Potassium + Hydrochlorothiazide',
    strength: '50 mg + 12.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 221.40,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cotrim 100 ml (1 bottle)',
    generic_name: 'Co-trimoxazole',
    strength: '240 mg / 5 ml',
    pack_size: '100 ml',
    category_name_fallback: 'Suspension',
    mrp: 45,
    selling_price: 36.90,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Cotrim DS 800+160 (100 Pcs)',
    generic_name: 'Co-trimoxazole DS',
    strength: '800 mg + 160 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 200,
    selling_price: 164.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'D-Rise 20000 20000 IU (12 Pcs)',
    generic_name: 'Cholecalciferol (Vitamin D3)',
    strength: '20000 IU',
    pack_size: '12 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 295.27,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'D-Rise 40000 40000 IU (8 Pcs)',
    generic_name: 'Cholecalciferol (Vitamin D3)',
    strength: '40000 IU',
    pack_size: '8 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 320,
    selling_price: 263.26,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Deltasone 5 5 mg (100 Pcs)',
    generic_name: 'Prednisolone',
    strength: '5 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 123.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Denvar 200 200 mg (14 Pcs)',
    generic_name: 'Cefixime',
    strength: '200 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 490,
    selling_price: 396.95,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Denvar 400 400 mg (14 Pcs)',
    generic_name: 'Cefixime',
    strength: '400 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 910,
    selling_price: 741.01,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Denvar 50 ml (1 bottle)',
    generic_name: 'Cefixime',
    strength: '100 mg / 5 ml',
    pack_size: '50 ml',
    category_name_fallback: 'Powder For Suspension',
    mrp: 215,
    selling_price: 176.30,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Dexilant 30 30 mg (30 Pcs)',
    generic_name: 'Dexlansoprazole',
    strength: '30 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 297.00,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Dexilant 60 60 mg (30 Pcs)',
    generic_name: 'Dexlansoprazole',
    strength: '60 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 540,
    selling_price: 440.91,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Diovan 160 160 mg (14 Pcs)',
    generic_name: 'Valsartan',
    strength: '160 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 490,
    selling_price: 401.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Diovan 80 80 mg (14 Pcs)',
    generic_name: 'Valsartan',
    strength: '80 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 350,
    selling_price: 287.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Doxiva 200 200 mg (30 Pcs)',
    generic_name: 'Doxofylline',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 172.41,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Doxiva 400 400 mg (30 Pcs)',
    generic_name: 'Doxofylline',
    strength: '400 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Dutaster 0.5 0.5 mg (30 Pcs)',
    generic_name: 'Dutasteride',
    strength: '0.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 367.65,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Dutaster Plus (30 Pcs)',
    generic_name: 'Dutasteride + Tamsulosin Hydrochloride',
    strength: '0.5 mg + 0.4 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 600,
    selling_price: 490.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Dycon 50 50 mg (30 Pcs)',
    generic_name: 'Fluconazole',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 240,
    selling_price: 196.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Elper 50 50 mg (30 Pcs)',
    generic_name: 'Eperisone Hydrochloride',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Entresto 100 49/51mg (28 Pcs)',
    generic_name: 'Sacubitril + Valsartan',
    strength: '49 mg + 51 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 2380,
    selling_price: 1951.60,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Entresto 50 24/26mg (28 Pcs)',
    generic_name: 'Sacubitril + Valsartan',
    strength: '24 mg + 26 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1260,
    selling_price: 1033.20,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Esloric 100 100 mg (50 Pcs)',
    generic_name: 'Allopurinol',
    strength: '100 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 123.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Esloric 300 300 mg (30 Pcs)',
    generic_name: 'Allopurinol',
    strength: '300 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 180,
    selling_price: 147.60,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Eupept 20 20 mg (60 Pcs)',
    generic_name: 'Omeprazole',
    strength: '20 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 295.20,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Exforge 10/160 (14 Pcs)',
    generic_name: 'Amlodipine + Valsartan',
    strength: '10 mg + 160 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 630,
    selling_price: 516.60,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Exforge 5/160 (14 Pcs)',
    generic_name: 'Amlodipine + Valsartan',
    strength: '5 mg + 160 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 560,
    selling_price: 459.20,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Exforge 5/80 (14 Pcs)',
    generic_name: 'Amlodipine + Valsartan',
    strength: '5 mg + 80 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 344.40,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Farlac 100 ml (1 bottle)',
    generic_name: 'Lactulose',
    strength: '3.35 gm / 5 ml',
    pack_size: '100 ml',
    category_name_fallback: 'Oral Solution',
    mrp: 140,
    selling_price: 114.80,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Farlac 200 ml (1 bottle)',
    generic_name: 'Lactulose',
    strength: '3.35 gm / 5 ml',
    pack_size: '200 ml',
    category_name_fallback: 'Oral Solution',
    mrp: 260,
    selling_price: 213.20,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Febustat 40 40 mg (30 Pcs)',
    generic_name: 'Febuxostat',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 221.75,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Febustat 80 80 mg (20 Pcs)',
    generic_name: 'Febuxostat',
    strength: '80 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Fexo 120 120 mg (50 Pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '120 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 367.65,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Fexo 180 180 mg (30 Pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '180 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 295.27,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Fexo 60 60 mg (50 Pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '60 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 275,
    selling_price: 225.28,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Galvus 50 50 mg (28 Pcs)',
    generic_name: 'Vildagliptin',
    strength: '50 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 700,
    selling_price: 574.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Galvus Met 50/500 (28 Pcs)',
    generic_name: 'Vildagliptin + Metformin Hydrochloride',
    strength: '50 mg + 500 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 700,
    selling_price: 574.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Galvus Met 50/850 (28 Pcs)',
    generic_name: 'Vildagliptin + Metformin Hydrochloride',
    strength: '50 mg + 850 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 700,
    selling_price: 574.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Maxpro 20 20 mg (100 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 700,
    selling_price: 574.00,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Maxpro 40 40 mg (30 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 270,
    selling_price: 221.75,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Maxpro HP Kit (1 Box)',
    generic_name: 'Esomeprazole + Clarithromycin + Amoxicillin',
    strength: 'Triple Therapy',
    pack_size: '1 Box',
    category_name_fallback: 'Kit',
    mrp: 1050,
    selling_price: 855.96,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Megavit Gold (30 Pcs)',
    generic_name: 'Multivitamin & Multimineral A to Z',
    strength: 'Gold Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 221.75,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Megavit Silver (30 Pcs)',
    generic_name: 'Multivitamin & Multimineral 50+',
    strength: 'Silver Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 221.75,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Normanal 500 (30 Pcs)',
    generic_name: 'Micronized Flavonoid Fraction',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 367.65,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Ostan 50 50 mg (30 Pcs)',
    generic_name: 'Losartan Potassium',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 196.80,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Ostan Plus 50 (30 Pcs)',
    generic_name: 'Losartan Potassium + Hydrochlorothiazide',
    strength: '50 mg + 12.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 251.82,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Phenocept 500 (50 Pcs)',
    generic_name: 'Mycophenolate Mofetil',
    strength: '500 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 2040,
    selling_price: 1533.06,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Plagrin 75 75 mg (30 Pcs)',
    generic_name: 'Clopidogrel',
    strength: '75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 303.44,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Plagrin Plus 75/75 (30 Pcs)',
    generic_name: 'Clopidogrel + Aspirin',
    strength: '75 mg + 75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 288.07,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Polycef 500 500 mg (24 Pcs)',
    generic_name: 'Cephradine',
    strength: '500 mg',
    pack_size: '24 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 351.12,
    selling_price: 279.25,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Prazole 20 20mg (50 Pcs)',
    generic_name: 'Omeprazole',
    strength: '20 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 350,
    selling_price: 199.43,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Pulmino 200 200 mg (30 Pcs)',
    generic_name: 'Acebrophylline',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 180,
    selling_price: 153.22,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Renabec FG 120 (1 Pcs)',
    generic_name: 'Fluticasone Propionate + Formoterol Fumarate',
    strength: '120 metered doses',
    pack_size: '1 Pcs',
    category_name_fallback: 'Inhaler',
    mrp: 1200,
    selling_price: 984.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Renxit 0.5+10mg (50 Pcs)',
    generic_name: 'Flupentixol + Melitracen',
    strength: '0.5 mg + 10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 407.75,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolac 10 10 mg (60 Pcs)',
    generic_name: 'Ketorolac Tromethamine',
    strength: '10 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 672,
    selling_price: 569.59,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolac 60 60 mg (1 vial)',
    generic_name: 'Ketorolac Tromethamine',
    strength: '60 mg / 2 ml',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 95.36,
    selling_price: 64.20,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolac injection 30mg (1 vial)',
    generic_name: 'Ketorolac Tromethamine',
    strength: '30 mg / ml',
    pack_size: '1 vial',
    category_name_fallback: 'Injection',
    mrp: 55.21,
    selling_price: 40.79,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolip 10 10 mg (30 Pcs)',
    generic_name: 'Rosuvastatin',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 720,
    selling_price: 594.14,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolip 20 20 mg (30 Pcs)',
    generic_name: 'Rosuvastatin',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 900,
    selling_price: 721.62,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Rolip 5 5 mg (30 Pcs)',
    generic_name: 'Rosuvastatin',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 300.71,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Salburen 100 100 mcg (200 doses)',
    generic_name: 'Salbutamol',
    strength: '100 mcg',
    pack_size: '200 doses',
    category_name_fallback: 'Inhaler',
    mrp: 250,
    selling_price: 205.60,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Saltica 50/250 (1 Box)',
    generic_name: 'Salmeterol + Fluticasone Propionate',
    strength: '50 mcg + 250 mcg',
    pack_size: '1 Box (60 doses)',
    category_name_fallback: 'Inhaler',
    mrp: 360,
    selling_price: 284.62,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Saltica 50/500 (1 Box)',
    generic_name: 'Salmeterol + Fluticasone Propionate',
    strength: '50 mcg + 500 mcg',
    pack_size: '1 Box (60 doses)',
    category_name_fallback: 'Inhaler',
    mrp: 510,
    selling_price: 404.07,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Seronex 50 50 mg (30 Pcs)',
    generic_name: 'Sertraline',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 247.08,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Taven 10 10 mg (30 Pcs)',
    generic_name: 'Tamsulosin Hydrochloride',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 300.96,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Telpro 40 40 mg (25 Pcs)',
    generic_name: 'Telmisartan',
    strength: '40 mg',
    pack_size: '25 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 375,
    selling_price: 299.18,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Telpro 80 80 mg (20 Pcs)',
    generic_name: 'Telmisartan',
    strength: '80 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 291.02,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Telpro Max 80 (20 Pcs)',
    generic_name: 'Telmisartan + Amlodipine + Hydrochlorothiazide',
    strength: '80 mg + 5 mg + 12.5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 491.34,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Thyrox 100 100 mcg (100 Pcs)',
    generic_name: 'Levothyroxine Sodium',
    strength: '100 mcg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 186,
    selling_price: 160.65,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Thyrox 25 Pot 25 mcg (100 Pcs)',
    generic_name: 'Levothyroxine Sodium',
    strength: '25 mcg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 111,
    selling_price: 96.53,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Thyrox 25 Strip 25 mcg (90 Pcs)',
    generic_name: 'Levothyroxine Sodium',
    strength: '25 mcg',
    pack_size: '90 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 99.9,
    selling_price: 87.33,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Thyrox 50 50 mcg (100 Pcs)',
    generic_name: 'Levothyroxine Sodium',
    strength: '50 mcg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 198,
    selling_price: 170.68,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Tigover 10 10 mg (20 Pcs)',
    generic_name: 'Tigecycline',
    strength: '10 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 250,
    selling_price: 204.43,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Ursoren 150 150 mg (30 Pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '150 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 358.11,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Ursoren 300 300 mg (30 Pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '300 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 750,
    selling_price: 601.35,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Valporin CR 500 (30 Pcs)',
    generic_name: 'Sodium Valproate + Valproic Acid',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 298.94,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Vomiren 0.5 Tab 0.5 mg (20 Pcs)',
    generic_name: 'Palonosetron',
    strength: '0.5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 332.64,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Vomiren 0.5 Cap 0.5 mg (20 Pcs)',
    generic_name: 'Palonosetron',
    strength: '0.5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 400,
    selling_price: 328.00,
    company: 'Renata PLC',
    stock_quantity: 0
  },
  {
    name: 'Xamic 500 500 mg (30 Pcs)',
    generic_name: 'Tranexamic Acid',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 660,
    selling_price: 534.80,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Xamic Inj 5ml 500 mg (5 Pcs)',
    generic_name: 'Tranexamic Acid',
    strength: '500 mg / 5 ml',
    pack_size: '5 Pcs',
    category_name_fallback: 'Injection',
    mrp: 275,
    selling_price: 166.29,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Xiomox 400 400 mg (10 Pcs)',
    generic_name: 'Moxifloxacin',
    strength: '400 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 380.06,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Zithrin 35 35 ml (1 bottle)',
    generic_name: 'Azithromycin',
    strength: '200 mg / 5 ml',
    pack_size: '35 ml',
    category_name_fallback: 'Powder For Suspension',
    mrp: 140,
    selling_price: 115.35,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Zithrin 500 500 mg (12 Pcs)',
    generic_name: 'Azithromycin',
    strength: '500 mg',
    pack_size: '12 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 468.48,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Zodef 24 24 mg (30 Pcs)',
    generic_name: 'Deflazacort',
    strength: '24 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 466.98,
    company: 'Renata PLC',
    stock_quantity: 100
  },
  {
    name: 'Zodef 6 6 mg (30 Pcs)',
    generic_name: 'Deflazacort',
    strength: '6 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 285,
    selling_price: 227.97,
    company: 'Renata PLC',
    stock_quantity: 100
  },

  // ==========================================
  // 3. SMC Enterprise Ltd (2%) [Bonus: +2%]
  // ==========================================
  {
    name: 'Amore Black (10 Pcs)',
    generic_name: 'Premium Lubricated Condom',
    strength: 'Black',
    pack_size: '10 Pcs',
    category_name_fallback: 'Condom',
    mrp: 600,
    selling_price: 373.68,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Bolt 25 25 mg (10 Pcs)',
    generic_name: 'Sildenafil',
    strength: '25 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 200,
    selling_price: 156.66,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Femicon (26 Pcs)',
    generic_name: 'Levonorgestrel + Ethinylestradiol + Ferrous Fumarate',
    strength: '0.15 mg + 0.03 mg + 75 mg',
    pack_size: '26 Pcs',
    category_name_fallback: 'Oral Contraceptive Pill',
    mrp: 910,
    selling_price: 756.57,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Femipil (28 Pcs)',
    generic_name: 'Desogestrel + Ethinylestradiol',
    strength: '0.15 mg + 0.03 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Oral Contraceptive Pill',
    mrp: 490,
    selling_price: 404.20,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Fullcare (24 Pcs)',
    generic_name: 'Multivitamin and Mineral Supplement',
    strength: 'Adult Care',
    pack_size: '24 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1080,
    selling_price: 598.75,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Hero Condom (10 Pcs)',
    generic_name: 'Lubricated Latex Condom',
    strength: 'Standard',
    pack_size: '10 Pcs',
    category_name_fallback: 'Condom',
    mrp: 240,
    selling_price: 195.98,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Minicon 0.075 (28 Pcs)',
    generic_name: 'Desogestrel',
    strength: '0.075 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Oral Contraceptive Pill',
    mrp: 1120,
    selling_price: 883.68,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'MoniMix 30 Sachets (30 Pcs)',
    generic_name: 'Multiple Micronutrient Powder',
    strength: 'Essential Micronutrients',
    pack_size: '30 Sachets',
    category_name_fallback: 'Powder',
    mrp: 84,
    selling_price: 29.09,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Noret 28 (28 Pcs)',
    generic_name: 'Norethisterone + Ethinylestradiol',
    strength: '1 mg + 0.035 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Oral Contraceptive Pill',
    mrp: 470,
    selling_price: 385.96,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Norix 1.5 1.5 mg (10 Pcs)',
    generic_name: 'Levonorgestrel',
    strength: '1.5 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Emergency Contraceptive Tablet',
    mrp: 700,
    selling_price: 479.29,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Panther Dotted (10 Pcs)',
    generic_name: 'Dotted Lubricated Condom',
    strength: 'Dotted',
    pack_size: '10 Pcs',
    category_name_fallback: 'Condom',
    mrp: 300,
    selling_price: 197.88,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Sensation Classic (10 Pcs)',
    generic_name: 'Classic Lubricated Condom',
    strength: 'Classic',
    pack_size: '10 Pcs',
    category_name_fallback: 'Condom',
    mrp: 480,
    selling_price: 312.53,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Sensation Strawberry (10 Pcs)',
    generic_name: 'Flavored Lubricated Condom',
    strength: 'Strawberry',
    pack_size: '10 Pcs',
    category_name_fallback: 'Condom',
    mrp: 480,
    selling_price: 321.41,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'SMC Fruity 10gm (24 Pcs)',
    generic_name: 'Electrolyte ORS Powder',
    strength: '10 gm',
    pack_size: '24 Sachets',
    category_name_fallback: 'Powder',
    mrp: 192,
    selling_price: 139.64,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Taste Me Mango 1KG (1 Box)',
    generic_name: 'Instant Drink Powder Mango Flavor',
    strength: '1 KG',
    pack_size: '1 KG Box',
    category_name_fallback: 'Powder',
    mrp: 590,
    selling_price: 441.50,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Taste Me Mango 10gm (24 Pcs)',
    generic_name: 'Instant Drink Powder Mango',
    strength: '10 gm',
    pack_size: '24 Sachets',
    category_name_fallback: 'Powder',
    mrp: 240,
    selling_price: 194.11,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Taste Me Orange 1KG (1 Box)',
    generic_name: 'Instant Drink Powder Orange Flavor',
    strength: '1 KG',
    pack_size: '1 KG Box',
    category_name_fallback: 'Powder',
    mrp: 590,
    selling_price: 443.80,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Taste Me Orange 10gm (24 Pcs)',
    generic_name: 'Instant Drink Powder Orange',
    strength: '10 gm',
    pack_size: '24 Sachets',
    category_name_fallback: 'Powder',
    mrp: 240,
    selling_price: 194.69,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'U&Me Anatomic (12 Pcs)',
    generic_name: 'Anatomically Shaped Premium Condom',
    strength: 'Anatomic',
    pack_size: '12 Pcs',
    category_name_fallback: 'Condom',
    mrp: 840,
    selling_price: 581.87,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'U&Me Long Love (12 Pcs)',
    generic_name: 'Extended Pleasure Condom with Benzocaine',
    strength: 'Long Love',
    pack_size: '12 Pcs',
    category_name_fallback: 'Condom',
    mrp: 840,
    selling_price: 559.10,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Xtreme 3 In 1 (12 Pcs)',
    generic_name: 'Dotted, Ribbed & Contoured Condom',
    strength: '3 in 1',
    pack_size: '12 Pcs',
    category_name_fallback: 'Condom',
    mrp: 1080,
    selling_price: 741.10,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },
  {
    name: 'Xtreme Ultra Thin (12 Pcs)',
    generic_name: 'Ultra Thin Sensitive Condom',
    strength: 'Ultra Thin',
    pack_size: '12 Pcs',
    category_name_fallback: 'Condom',
    mrp: 1080,
    selling_price: 745.09,
    company: 'SMC Enterprise Ltd',
    stock_quantity: 100
  },

  // ==========================================
  // 4. Square Pharmaceuticals PLC [Bonus: +0%]
  // ==========================================
  {
    name: 'Ace 500 500 mg (500 Pcs)',
    generic_name: 'Paracetamol',
    strength: '500 mg',
    pack_size: '500 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 513.60,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ace 500 500 mg (250 Pcs)',
    generic_name: 'Paracetamol',
    strength: '500 mg',
    pack_size: '250 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 263.94,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ace Plus (200 Pcs)',
    generic_name: 'Paracetamol + Caffeine',
    strength: '500 mg + 65 mg',
    pack_size: '200 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 502,
    selling_price: 435.64,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ace Power 1000 (150 Pcs)',
    generic_name: 'Paracetamol',
    strength: '1000 mg',
    pack_size: '150 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 395.91,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ace XR 665 (100 Pcs)',
    generic_name: 'Paracetamol Extended Release',
    strength: '665 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 200,
    selling_price: 175.96,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Alatrol 10 10 mg (150 Pcs)',
    generic_name: 'Cetirizine Hydrochloride',
    strength: '10 mg',
    pack_size: '150 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 452.23,
    selling_price: 398.46,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Alfane 300 300 mg (30 Pcs)',
    generic_name: 'Allopurinol',
    strength: '300 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 378.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Anadol 50 50 mg (60 Pcs)',
    generic_name: 'Tramadol Hydrochloride',
    strength: '50 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 322.8,
    selling_price: 277.35,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Anclog 75 75 mg (60 Pcs)',
    generic_name: 'Clopidogrel',
    strength: '75 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 481.2,
    selling_price: 404.21,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Angilock 50 50 mg (50 Pcs)',
    generic_name: 'Losartan Potassium',
    strength: '50 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 440.30,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Angilock Plus 50/12.5 (50 Pcs)',
    generic_name: 'Losartan Potassium + Hydrochlorothiazide',
    strength: '50 mg + 12.5 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 436.60,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Antazol 0.1% 10 ml (1 Pcs)',
    generic_name: 'Xylometazoline Hydrochloride',
    strength: '0.1%',
    pack_size: '10 ml',
    category_name_fallback: 'Nasal Drop',
    mrp: 240,
    selling_price: 215.71,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Antazol 0.05% 10 ml (1 Pcs)',
    generic_name: 'Xylometazoline Hydrochloride',
    strength: '0.05%',
    pack_size: '10 ml',
    category_name_fallback: 'Nasal Drop',
    mrp: 216,
    selling_price: 190.21,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Anzitor 10 10 mg (30 Pcs)',
    generic_name: 'Atorvastatin',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600.3,
    selling_price: 504.25,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Avaspray 27.5 mcg (120 spray)',
    generic_name: 'Fluticasone Furoate',
    strength: '27.5 mcg',
    pack_size: '120 metered spray',
    category_name_fallback: 'Nasal Spray',
    mrp: 275,
    selling_price: 234.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Beclomin 250 250 mcg (1 Pcs)',
    generic_name: 'Beclomethasone Dipropionate',
    strength: '250 mcg',
    pack_size: '200 doses',
    category_name_fallback: 'Inhaler',
    mrp: 320.96,
    selling_price: 278.30,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Bilista 20 20 mg (30 Pcs)',
    generic_name: 'Bilastine',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 398.79,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Bufocort 200 200 mcg (1 Pcs)',
    generic_name: 'Budesonide + Formoterol Fumarate',
    strength: '200 mcg + 6 mcg',
    pack_size: '120 doses',
    category_name_fallback: 'Inhaler',
    mrp: 303,
    selling_price: 254.52,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Calbo 500 500 mg (100 Pcs)',
    generic_name: 'Calcium Carbonate',
    strength: '500 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 430.15,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Calbo D Vita (15 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3 + Vitamin C',
    strength: '500 mg + 400 IU + 180 mg',
    pack_size: '15 Effervescent Tablets',
    category_name_fallback: 'Effervescent Tablet',
    mrp: 150.5,
    selling_price: 126.42,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Calboplex (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3 + Minerals',
    strength: '500 mg + 200 IU + Minerals',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 180,
    selling_price: 151.20,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Calboral D (30 Pcs)',
    generic_name: 'Calcium Carbonate (Coral source) + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 330.3,
    selling_price: 287.63,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Calboral DX (30 Pcs)',
    generic_name: 'Calcium Carbonate (Coral source) + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 424.37,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Camlodin 5 5 mg (60 Pcs)',
    generic_name: 'Amlodipine Besilate',
    strength: '5 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 301.2,
    selling_price: 253.01,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Camlosart 5/20 (30 Pcs)',
    generic_name: 'Amlodipine + Olmesartan Medoxomil',
    strength: '5 mg + 20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 316.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ceevit 250mg (250 Pcs)',
    generic_name: 'Ascorbic Acid (Vitamin C)',
    strength: '250 mg',
    pack_size: '250 Pcs',
    category_name_fallback: 'Chewable Tablet',
    mrp: 475,
    selling_price: 427.45,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ceevit DS 500 500 mg (100 Pcs)',
    generic_name: 'Ascorbic Acid (Vitamin C)',
    strength: '500 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Chewable Tablet',
    mrp: 315,
    selling_price: 264.60,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Cef 3 200 200 mg (14 Pcs)',
    generic_name: 'Cefixime',
    strength: '200 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 630,
    selling_price: 540.86,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Cef 3 DS 400 400 mg (14 Pcs)',
    generic_name: 'Cefixime',
    strength: '400 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 840.05,
    selling_price: 734.04,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Cefotil Plus 250 (14 Pcs)',
    generic_name: 'Cefuroxime Axetil + Clavulanic Acid',
    strength: '250 mg + 62.5 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 364.69,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Cefotil Plus 500 (14 Pcs)',
    generic_name: 'Cefuroxime Axetil + Clavulanic Acid',
    strength: '500 mg + 125 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 720,
    selling_price: 620.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ciprocin 250 250 mg (50 Pcs)',
    generic_name: 'Ciprofloxacin',
    strength: '250 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 428.21,
    selling_price: 360.08,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Clofenac 12.5 12.5 mg (10 Pcs)',
    generic_name: 'Diclofenac Sodium',
    strength: '12.5 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Suppository',
    mrp: 120,
    selling_price: 104.18,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Clofenac 50 Supp 50 mg (20 Pcs)',
    generic_name: 'Diclofenac Sodium',
    strength: '50 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Suppository',
    mrp: 400,
    selling_price: 343.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Clofenac 50 Tab 50 mg (100 Pcs)',
    generic_name: 'Diclofenac Sodium',
    strength: '50 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 336.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Clofenac Gel 1% 10 gm (1 Pcs)',
    generic_name: 'Diclofenac Diethylamine',
    strength: '1%',
    pack_size: '10 gm',
    category_name_fallback: 'Gel',
    mrp: 40,
    selling_price: 36.14,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Colicon 10 10 mg (60 Pcs)',
    generic_name: 'Dicycloverine Hydrochloride',
    strength: '10 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 201,
    selling_price: 168.84,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Combicid 15gm (1 Tube)',
    generic_name: 'Econazole Nitrate + Triamcinolone Acetonide',
    strength: '1% + 0.1%',
    pack_size: '15 gm',
    category_name_fallback: 'Cream',
    mrp: 180,
    selling_price: 158.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Comet 500 500 mg (100 Pcs)',
    generic_name: 'Metformin Hydrochloride',
    strength: '500 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 439.60,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Comprid 80 80 mg (60 Pcs)',
    generic_name: 'Gliclazide',
    strength: '80 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 416.06,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Contilex TS 750 (20 Pcs)',
    generic_name: 'Glucosamine + Chondroitin',
    strength: '750 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 336.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'D Balance 40000 40000 IU (8 Pcs)',
    generic_name: 'Cholecalciferol (Vitamin D3)',
    strength: '40000 IU',
    pack_size: '8 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 350,
    selling_price: 303.56,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Deflacort 24 24 mg (30 Pcs)',
    generic_name: 'Deflazacort',
    strength: '24 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 516.12,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Deflacort 6 6 mg (30 Pcs)',
    generic_name: 'Deflazacort',
    strength: '6 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 570,
    selling_price: 490.71,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Dermasol-N 25gm (1 Tube)',
    generic_name: 'Clobetasol Propionate + Neomycin + Nystatin',
    strength: '25 gm',
    pack_size: '25 gm',
    category_name_fallback: 'Cream',
    mrp: 100,
    selling_price: 87.86,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Diltizem SR 90 90 mg (30 Pcs)',
    generic_name: 'Diltiazem Hydrochloride SR',
    strength: '90 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 225.2,
    selling_price: 195.52,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Dotfix 2 2 mg (30 Pcs)',
    generic_name: 'Glimepiride',
    strength: '2 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 403.20,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Eprim Plus 1000 (30 Pcs)',
    generic_name: 'Evening Primrose Oil + Vitamin E',
    strength: '1000 mg + Vitamin E',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 302.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Erian 15gm (1 Tube)',
    generic_name: 'Fusidic Acid',
    strength: '2%',
    pack_size: '15 gm',
    category_name_fallback: 'Cream',
    mrp: 85,
    selling_price: 71.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Evit 200 200 mg (30 Pcs)',
    generic_name: 'Vitamin E (Alpha Tocopherol)',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 180,
    selling_price: 153.07,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Famotack 20 20 mg (60 Pcs)',
    generic_name: 'Famotidine',
    strength: '20 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 540,
    selling_price: 469.64,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Fexo 120 120 mg (50 Pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '120 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 397.49,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Filfresh 3 5 ml (1 bottle)',
    generic_name: 'Sodium Hyaluronate',
    strength: '0.1%',
    pack_size: '5 ml',
    category_name_fallback: 'Eye Drop',
    mrp: 150.5,
    selling_price: 126.42,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Filwel Gold (30 Pcs)',
    generic_name: '32 Multivitamins & Multiminerals with Lutein',
    strength: 'Gold Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 313.63,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Filwel Silver (30 Pcs)',
    generic_name: '32 Multivitamins & Multiminerals 50+',
    strength: 'Silver Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 317.63,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Flexi SR 200 200 mg (30 Pcs)',
    generic_name: 'Aceclofenac SR',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 213.89,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Flugal 150 150 mg (20 Pcs)',
    generic_name: 'Fluconazole',
    strength: '150 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 442.8,
    selling_price: 385.24,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Flugal 50 50 mg (30 Pcs)',
    generic_name: 'Fluconazole',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 403,
    selling_price: 349.28,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Folita 5 5 mg (100 Pcs)',
    generic_name: 'Folic Acid',
    strength: '5 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 390.69,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Gefapix 45 45 mg (20 Pcs)',
    generic_name: 'Gefapixant',
    strength: '45 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 700,
    selling_price: 588.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Giloba 120 120 mg (30 Pcs)',
    generic_name: 'Ginkgo Biloba Extract',
    strength: '120 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 600,
    selling_price: 504.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Giloba 60 60 mg (30 Pcs)',
    generic_name: 'Ginkgo Biloba Extract',
    strength: '60 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 378.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Gintex 500 500 mg (30 Pcs)',
    generic_name: 'Ginseng Extract',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 313.31,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Hemorif DS (30 Pcs)',
    generic_name: 'Micronized Purified Flavonoid Fraction',
    strength: '1000 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 524.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Intimate 10 10 mg (30 Pcs)',
    generic_name: 'Tadalafil',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 313.63,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Iracet 500 500 mg (20 Pcs)',
    generic_name: 'Levetiracetam',
    strength: '500 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 640,
    selling_price: 564.99,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ivanor 5 5 mg (30 Pcs)',
    generic_name: 'Ivabradine',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 501.6,
    selling_price: 421.34,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Lanso D 30 30 mg (30 Pcs)',
    generic_name: 'Dexlansoprazole',
    strength: '30 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 600,
    selling_price: 527.04,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Livacol 10 10 mg (20 Pcs)',
    generic_name: 'Pitavastatin',
    strength: '10 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 550,
    selling_price: 462.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Livacol 5 5 mg (30 Pcs)',
    generic_name: 'Pitavastatin',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 504.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Lnc 10 10 mg (30 Pcs)',
    generic_name: 'Lercanidipine Hydrochloride',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 226.80,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Lulitop 20gm 1% (1 Tube)',
    generic_name: 'Luliconazole',
    strength: '1%',
    pack_size: '20 gm',
    category_name_fallback: 'Cream',
    mrp: 180,
    selling_price: 157.03,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Maximilk (30 Pcs)',
    generic_name: 'Fenugreek + Blessed Thistle Extract',
    strength: 'Lactation Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 378.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Maxrin 0.4 0.4 mg (30 Pcs)',
    generic_name: 'Tamsulosin Hydrochloride',
    strength: '0.4 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 312.23,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Maxrin D 0.4mg+0.5mg (20 Pcs)',
    generic_name: 'Tamsulosin Hydrochloride + Dutasteride',
    strength: '0.4 mg + 0.5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 400,
    selling_price: 332.72,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Menoral 5 5 mg (30 Pcs)',
    generic_name: 'Norethisterone',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 390,
    selling_price: 327.60,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Minibet 100 100 mg (30 Pcs)',
    generic_name: 'Mebhydrolin Napadisylate',
    strength: '100 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 396.99,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Mirakof SR 50 50 mg (30 Pcs)',
    generic_name: 'Butamirate Citrate SR',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 302.1,
    selling_price: 253.76,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Montene 10 10 mg (30 Pcs)',
    generic_name: 'Montelukast Sodium',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 525,
    selling_price: 462.26,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Motigut 10 10 mg (100 Pcs)',
    generic_name: 'Domperidone',
    strength: '10 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 349.24,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Moxacil 500 500 mg (50 Pcs)',
    generic_name: 'Amoxicillin Trihydrate',
    strength: '500 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 750,
    selling_price: 630.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Navit 500 500 mg (30 Pcs)',
    generic_name: 'Glucosamine Sulfate',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 302.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Neuro-B (60 Pcs)',
    generic_name: 'Vitamin B1 + B6 + B12',
    strength: '100 mg + 200 mg + 200 mcg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 267.69,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Neurolin 50 50 mg (30 Pcs)',
    generic_name: 'Pregabalin',
    strength: '50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 390.33,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Nexum 20 20 mg (60 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 421.2,
    selling_price: 364.68,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Nexum 40 40 mg (30 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 300.9,
    selling_price: 257.81,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Nexum mups 20 20 mg (100 Pcs)',
    generic_name: 'Esomeprazole MUPS',
    strength: '20 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1000,
    selling_price: 823.80,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Nexum mups 40 40 mg (30 Pcs)',
    generic_name: 'Esomeprazole MUPS',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 359.44,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Norpill 1 1.5 mg (5 Pcs)',
    generic_name: 'Levonorgestrel',
    strength: '1.5 mg',
    pack_size: '5 Pcs',
    category_name_fallback: 'Emergency Contraceptive Tablet',
    mrp: 350,
    selling_price: 294.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Probio 4 billion (30 Pcs)',
    generic_name: 'Probiotics Formulation',
    strength: '4 Billion CFU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 1200,
    selling_price: 1008.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Rectocare 15gm (1 Tube)',
    generic_name: 'Zinc Oxide + Lidocaine + Hydrocortisone',
    strength: '15 gm',
    pack_size: '15 gm',
    category_name_fallback: 'Ointment',
    mrp: 65.45,
    selling_price: 54.98,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Redclov 40 40 mg (30 Pcs)',
    generic_name: 'Red Clover Isoflavones',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 302.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Renacom (30 Pcs)',
    generic_name: 'Vitamin B Complex + Folic Acid',
    strength: 'B-Complex Formula',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 504.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Revira 1gm 1 gm (28 Pcs)',
    generic_name: 'Sevelamer Carbonate',
    strength: '1 gm',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 902.64,
    selling_price: 787.01,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Revocit 210mg (30 Pcs)',
    generic_name: 'Ferric Citrate',
    strength: '210 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 750,
    selling_price: 647.18,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Rex Pot (100 Pcs)',
    generic_name: 'Vitamin B Complex Syrup / Tablet',
    strength: 'B-Complex',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 105,
    selling_price: 92.80,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Rutix 400 400 mg (20 pcs)',
    generic_name: 'Rifaximin',
    strength: '400 mg',
    pack_size: '20 pcs',
    category_name_fallback: 'Tablet',
    mrp: 442.8,
    selling_price: 371.95,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Safyron 10 10 mg (20 Pcs)',
    generic_name: 'Affron (Saffron Extract)',
    strength: '10 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 800,
    selling_price: 672.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Salicid 12% 30 gm (1 Box)',
    generic_name: 'Salicylic Acid',
    strength: '12%',
    pack_size: '1 Box (30 gm)',
    category_name_fallback: 'Cream',
    mrp: 100,
    selling_price: 84.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Seclo 20 20mg (120 pcs)',
    generic_name: 'Omeprazole',
    strength: '20 mg',
    pack_size: '120 pcs',
    category_name_fallback: 'Capsule',
    mrp: 720,
    selling_price: 559.51,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Seclo 40 40mg (30 pcs)',
    generic_name: 'Omeprazole',
    strength: '40 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Capsule',
    mrp: 270,
    selling_price: 220.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Seclo Mups 20 20 mg (30 Pcs)',
    generic_name: 'Omeprazole MUPS',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 169.26,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Secrin 1 1 mg (60 Pcs)',
    generic_name: 'Glimepiride',
    strength: '1 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 312.55,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Sonap 500 (30 Pcs)',
    generic_name: 'Naproxen + Esomeprazole',
    strength: '500 mg + 20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 256.77,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ticamet 25/250 120 puffs (1 Box)',
    generic_name: 'Salmeterol + Fluticasone Propionate',
    strength: '25 mcg + 250 mcg',
    pack_size: '120 puffs',
    category_name_fallback: 'Inhaler',
    mrp: 797,
    selling_price: 691.96,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Toco Soft 50/13.5 (30 Pcs)',
    generic_name: 'Tocotrienol + Tocopherol',
    strength: '50 mg + 13.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 450,
    selling_price: 390.33,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Torax 10 10 mg (30 Pcs)',
    generic_name: 'Torsemide',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 524.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Torel 20 gm (1 Box)',
    generic_name: 'Menthol + Methyl Salicylate',
    strength: '20 gm',
    pack_size: '1 Box (20 gm)',
    category_name_fallback: 'Muscle Rub',
    mrp: 70,
    selling_price: 58.80,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'TORY 120 120mg (30 pcs)',
    generic_name: 'Etoricoxib',
    strength: '120 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 385.20,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Tory 90 90 mg (30 Pcs)',
    generic_name: 'Etoricoxib',
    strength: '90 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 362.7,
    selling_price: 309.38,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Trevox 500 500 mg (30 Pcs)',
    generic_name: 'Levofloxacin',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 510,
    selling_price: 428.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Trumega 1000 mg (30 Pcs)',
    generic_name: 'Omega-3 Fatty Acids',
    strength: '1000 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 600,
    selling_price: 504.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Urso 150 150 mg (20 Pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '150 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 258.48,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Urso 300 300 mg (20 Pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '300 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 431.45,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Valmor 100 (10 Pcs)',
    generic_name: 'Sacubitril + Valsartan',
    strength: '49 mg + 51 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 850,
    selling_price: 714.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Valmor 50 (10 Pcs)',
    generic_name: 'Sacubitril + Valsartan',
    strength: '24 mg + 26 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 378.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Viglimet 50/850 (30 Pcs)',
    generic_name: 'Vildagliptin + Metformin Hydrochloride',
    strength: '50 mg + 850 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 660,
    selling_price: 560.74,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Vigorex 100 100 mg (10 Pcs)',
    generic_name: 'Sildenafil Citrate',
    strength: '100 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 501.5,
    selling_price: 440.77,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Vigorex 50 50 mg (8 Pcs)',
    generic_name: 'Sildenafil Citrate',
    strength: '50 mg',
    pack_size: '8 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 301,
    selling_price: 259.76,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Virux 200 200 mg (30 Pcs)',
    generic_name: 'Aciclovir',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 423,
    selling_price: 367.54,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Volinac 50g (1 Tube)',
    generic_name: 'Diclofenac Diethylamine',
    strength: '50 gm',
    pack_size: '1 Tube (50 gm)',
    category_name_fallback: 'Gel',
    mrp: 100,
    selling_price: 84.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Voniza 20 20 mg (30 Pcs)',
    generic_name: 'Vonoprazan',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 252.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Vori 200 200 mg (10 Pcs)',
    generic_name: 'Voriconazole',
    strength: '200 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1000,
    selling_price: 867.20,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Vori 50 50 mg (10 Pcs)',
    generic_name: 'Voriconazole',
    strength: '50 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 350,
    selling_price: 294.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Xfin 250 250 mg (14 Pcs)',
    generic_name: 'Terbinafine',
    strength: '250 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 560,
    selling_price: 487.93,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Zanthin 2 2 mg (30 Pcs)',
    generic_name: 'Astaxanthin',
    strength: '2 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 302.40,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Zanthin 4 4 mg (30 Pcs)',
    generic_name: 'Astaxanthin',
    strength: '4 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 660,
    selling_price: 575.26,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Ziliron B - (30 Pcs)',
    generic_name: 'Iron + Folic Acid + Vitamin B Complex',
    strength: 'Iron + Folic Acid + B-Complex',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 150,
    selling_price: 126.00,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 0
  },
  {
    name: 'Zimax 50 50 ml (1 Pcs)',
    generic_name: 'Azithromycin',
    strength: '200 mg / 5 ml',
    pack_size: '50 ml',
    category_name_fallback: 'Powder For Suspension',
    mrp: 220,
    selling_price: 188.58,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Zimax 500 500mg (18pcs)',
    generic_name: 'Azithromycin',
    strength: '500 mg',
    pack_size: '18 pcs',
    category_name_fallback: 'Tablet',
    mrp: 720,
    selling_price: 616.97,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },
  {
    name: 'Zolivox 400 400 mg (10 Pcs)',
    generic_name: 'Linezolid',
    strength: '400 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 514.26,
    company: 'Square Pharmaceuticals PLC',
    stock_quantity: 100
  },

  // ==========================================
  // 5. Sun Pharmaceutical (Bangladesh) (1%) [Bonus: +1%]
  // ==========================================
  {
    name: 'Clopilet 75 75 mg (50 Pcs)',
    generic_name: 'Clopidogrel',
    strength: '75 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 516.66,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Clopilet A 75/75 (50 Pcs)',
    generic_name: 'Clopidogrel + Aspirin',
    strength: '75 mg + 75 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 498.00,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 0
  },
  {
    name: 'Delpraz 30 mg (30 Pcs)',
    generic_name: 'Dexlansoprazole',
    strength: '30 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 300,
    selling_price: 260.01,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Gemer 2 2 mg+500 mg (50 Pcs)',
    generic_name: 'Glimepiride + Metformin Hydrochloride',
    strength: '2 mg + 500 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 525.00,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Glucodip-M XR 50/500 (30 Pcs)',
    generic_name: 'Sitagliptin + Metformin Hydrochloride Extended Release',
    strength: '50 mg + 500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 512.76,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Mebiz SR 200 200 mg (50 Pcs)',
    generic_name: 'Mebeverine Hydrochloride SR',
    strength: '200 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 501,
    selling_price: 440.63,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Mirtaz 15 15 mg (50 Pcs)',
    generic_name: 'Mirtazapine',
    strength: '15 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 442.55,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Neugaba 75 75 mg (30 Pcs)',
    generic_name: 'Pregabalin',
    strength: '75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 570,
    selling_price: 473.10,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 0
  },
  {
    name: 'Olmezest 10 10 mg (50 Pcs)',
    generic_name: 'Olmesartan Medoxomil',
    strength: '10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 261.93,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Olmezest 20 20 mg (50 Pcs)',
    generic_name: 'Olmesartan Medoxomil',
    strength: '20 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 434.00,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Olmezest 40 40 mg (30 Pcs)',
    generic_name: 'Olmesartan Medoxomil',
    strength: '40 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 510,
    selling_price: 441.00,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Olmezest Am 20 5 mg+20 mg (50 Pcs)',
    generic_name: 'Amlodipine + Olmesartan Medoxomil',
    strength: '5 mg + 20 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 512.46,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Olmezest AM 5/20 (50 Pcs)',
    generic_name: 'Amlodipine + Olmesartan Medoxomil',
    strength: '5 mg + 20 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 514.38,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Prodep 20 20 mg (100 Pcs)',
    generic_name: 'Fluoxetine Hydrochloride',
    strength: '20 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 301,
    selling_price: 270.69,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Ranozex 500 500 mg (30pcs)',
    generic_name: 'Ranolazine Extended Release',
    strength: '500 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 424.37,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Remicron MR 30 30 mg (30 Pcs)',
    generic_name: 'Gliclazide MR',
    strength: '30 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 208.20,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Remicron MR 60 60 mg (30 Pcs)',
    generic_name: 'Gliclazide MR',
    strength: '60 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 316.15,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Sizopin 25 25 mg (100 Pcs)',
    generic_name: 'Clozapine',
    strength: '25 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 264.99,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Sompraz 20 20 mg (50 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 350,
    selling_price: 301.53,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Sompraz 40 40 mg (40 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '40 mg',
    pack_size: '40 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 475,
    selling_price: 417.48,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Syndopa 110 100 mg+10 mg (50 Pcs)',
    generic_name: 'Levodopa + Carbidopa',
    strength: '100 mg + 10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 351,
    selling_price: 311.09,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Ursocol 150 150 mg (50pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '150 mg',
    pack_size: '50 pcs',
    category_name_fallback: 'Tablet',
    mrp: 750,
    selling_price: 651.00,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Ursocol 300 300mg (30 pcs)',
    generic_name: 'Ursodeoxycholic Acid',
    strength: '300 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 750,
    selling_price: 652.13,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },
  {
    name: 'Volibo 0.3 300 mcg (30 Pcs)',
    generic_name: 'Voglibose',
    strength: '300 mcg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 204.98,
    company: 'Sun Pharmaceutical (Bangladesh)',
    stock_quantity: 100
  },

  // ==========================================
  // 6. Synovia Pharma [Bonus: +0%]
  // ==========================================
  {
    name: 'Lasix 40 mg (100 Pcs)',
    generic_name: 'Furosemide',
    strength: '40 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 100,
    selling_price: 92.71,
    company: 'Synovia Pharma',
    stock_quantity: 100
  },
  {
    name: 'Pevisone 10g (1 pcs)',
    generic_name: 'Econazole Nitrate + Triamcinolone Acetonide',
    strength: '10 gm',
    pack_size: '1 pcs (10 gm)',
    category_name_fallback: 'Cream',
    mrp: 70,
    selling_price: 64.16,
    company: 'Synovia Pharma',
    stock_quantity: 100
  },

  // ==========================================
  // 7. TEAM Pharmaceuticals Ltd (3%) [Bonus: +3%]
  // ==========================================
  {
    name: 'Apidone 10 10mg (100 pcs)',
    generic_name: 'Domperidone',
    strength: '10 mg',
    pack_size: '100 pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 136.02,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Bilasi 20 20 mg (20 Pcs)',
    generic_name: 'Bilastine',
    strength: '20 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 193.59,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Cefurav Plus 250 (14 Pcs)',
    generic_name: 'Cefuroxime Axetil + Clavulanic Acid',
    strength: '250 mg + 62.5 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 483,
    selling_price: 314.34,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Cefurav Plus 500 (14 Pcs)',
    generic_name: 'Cefuroxime Axetil + Clavulanic Acid',
    strength: '500 mg + 125 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 770,
    selling_price: 464.54,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Corasis D 500 mg (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 206.94,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Corasis DX 600 mg (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 480,
    selling_price: 306.10,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Desotem 5 5 mg (100 Pcs)',
    generic_name: 'Desloratadine',
    strength: '5 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 96.41,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Doxobron 200 200 mg (50 Pcs)',
    generic_name: 'Doxofylline',
    strength: '200 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 150.99,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Eco Plus Cream 10 gm (1 Pcs)',
    generic_name: 'Econazole Nitrate + Triamcinolone Acetonide',
    strength: '10 gm',
    pack_size: '1 Pcs (10 gm)',
    category_name_fallback: 'Cream',
    mrp: 50,
    selling_price: 35.80,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Esotem 20 20 mg (75 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '75 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 487.5,
    selling_price: 238.73,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Ometem 20 20 mg (100 Pcs)',
    generic_name: 'Omeprazole',
    strength: '20 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 600,
    selling_price: 247.74,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Ometem 40 40 mg (20 Pcs)',
    generic_name: 'Omeprazole',
    strength: '40 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 160,
    selling_price: 81.89,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Orcon 50 50 mg (50 Pcs)',
    generic_name: 'Fluconazole',
    strength: '50 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 375,
    selling_price: 216.19,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Tekast 10 10 mg (30 Pcs)',
    generic_name: 'Montelukast',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 364.50,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Telide 500 500 mg (14 Pcs)',
    generic_name: 'Clarithromycin',
    strength: '500 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 490,
    selling_price: 275.33,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Temcal D 500 mg+200 IU (60 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 220.04,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Temvit Gold Pot (30 Pcs)',
    generic_name: '32 Multivitamins & Multiminerals',
    strength: '32 Minerals & Vitamins',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 174.57,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Temvit Gold Strip (50 Pcs)',
    generic_name: '32 Multivitamins & Multiminerals',
    strength: '32 Minerals & Vitamins',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 283.60,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Tofix 200 200 mg (30 Pcs)',
    generic_name: 'Tolfenamic Acid',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 175.62,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Trec 100 100 mg (20 Pcs)',
    generic_name: 'Itraconazole',
    strength: '100 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 300,
    selling_price: 187.98,
    company: 'TEAM Pharmaceuticals Ltd',
    stock_quantity: 100
  },

  // ==========================================
  // 8. UniMed UniHealth Pharmaceuticals Limited (1%) [Bonus: +1%]
  // ==========================================
  {
    name: 'Adempa 10 10 mg (10 Pcs)',
    generic_name: 'Empagliflozin',
    strength: '10 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 250,
    selling_price: 210.15,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Adlinameg 2.5/500 (30 Pcs)',
    generic_name: 'Linagliptin + Metformin Hydrochloride',
    strength: '2.5 mg + 500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 304.56,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Afexa 120 120 mg (30 Pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '120 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 224.10,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Aleze 10 10 mg (50 Pcs)',
    generic_name: 'Cetirizine Hydrochloride',
    strength: '10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 175,
    selling_price: 153.28,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Alfumax ER 10 10 mg (30 Pcs)',
    generic_name: 'Alfuzosin Hydrochloride ER',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 262.98,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Arthrosin 200+250 (30 Pcs)',
    generic_name: 'Glucosamine Sulfate + Chondroitin Sulfate',
    strength: '200 mg + 250 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 255,
    selling_price: 213.18,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Arthrosin TS 750+50 (30 Pcs)',
    generic_name: 'Glucosamine + Diacerein',
    strength: '750 mg + 50 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 900,
    selling_price: 758.16,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cadosil LD 30mg 4% (30 gm tube)',
    generic_name: 'Calcipotriol + Betamethasone Dipropionate',
    strength: '30 mg / 4%',
    pack_size: '30 gm tube',
    category_name_fallback: 'Ointment',
    mrp: 170,
    selling_price: 145.67,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Candistin 10 ml (1 Pcs)',
    generic_name: 'Clotrimazole',
    strength: '10 ml',
    pack_size: '10 ml',
    category_name_fallback: 'Ear Drop',
    mrp: 150,
    selling_price: 129.00,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cardicor 2.5mg 2.5 mg (30 Pcs)',
    generic_name: 'Bisoprolol Fumarate',
    strength: '2.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 180.75,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cardicor 5 5 mg (30 Pcs)',
    generic_name: 'Bisoprolol Fumarate',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 345,
    selling_price: 285.59,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cavapro 75 75 mg (30 Pcs)',
    generic_name: 'Clopidogrel',
    strength: '75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 180,
    selling_price: 157.00,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cavazide 150 150 mg (30 Pcs)',
    generic_name: 'Irbesartan',
    strength: '150 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 308.41,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Citra K 1080 (Pot) (30 Pcs)',
    generic_name: 'Potassium Citrate',
    strength: '1080 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Pot (Tablet)',
    mrp: 300,
    selling_price: 256.23,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Co Dopa 110 100 mg+10 mg (30 Pcs)',
    generic_name: 'Levodopa + Carbidopa',
    strength: '100 mg + 10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 177.22,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Cogniz 500 500 mg (30 Pcs)',
    generic_name: 'Citicoline Sodium',
    strength: '500 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1500,
    selling_price: 1258.80,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Demelon 1.5 1.5mg (28 pcs)',
    generic_name: 'Indapamide SR',
    strength: '1.5 mg',
    pack_size: '28 pcs',
    category_name_fallback: 'Tablet',
    mrp: 644,
    selling_price: 559.89,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Dexit 0.5mg+10mg (50 Pcs)',
    generic_name: 'Flupentixol + Melitracen',
    strength: '0.5 mg + 10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 250,
    selling_price: 212.75,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Edysta 2.5 2.5 mg (20 Pcs)',
    generic_name: 'Tadalafil',
    strength: '2.5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 200,
    selling_price: 170.58,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Edysta 20 20mg (10 Pcs)',
    generic_name: 'Tadalafil',
    strength: '20 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 503.58,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Edysta 5 5 mg (20 Pcs)',
    generic_name: 'Tadalafil',
    strength: '5 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 307.26,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Etopira 25 25mg (30 Pcs)',
    generic_name: 'Topiramate',
    strength: '25 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 149.93,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Formatide Inhaler 6/200 (120 metered doses)',
    generic_name: 'Formoterol Fumarate + Budesonide',
    strength: '6 mcg + 200 mcg',
    pack_size: '120 metered doses',
    category_name_fallback: 'Inhaler',
    mrp: 980,
    selling_price: 845.05,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Klabid 250 250 mg (14 Pcs)',
    generic_name: 'Clarithromycin',
    strength: '250 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 355.32,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Klabid 500 500 mg (14 Pcs)',
    generic_name: 'Clarithromycin',
    strength: '500 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 700,
    selling_price: 588.00,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Myrica 50 50 mg (28 Pcs)',
    generic_name: 'Pregabalin',
    strength: '50 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 405,
    selling_price: 336.15,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Napexa 375 375 mg (28 Pcs)',
    generic_name: 'Naproxen',
    strength: '375 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 336,
    selling_price: 278.88,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Napsod 275 275 mg (30 Pcs)',
    generic_name: 'Naproxen Sodium',
    strength: '275 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 180,
    selling_price: 152.26,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Napsod 550 550mg (30 Pcs)',
    generic_name: 'Naproxen Sodium',
    strength: '550 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 255.81,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nature E 200IU (30 Pcs)',
    generic_name: 'Vitamin E',
    strength: '200 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 150,
    selling_price: 123.93,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nature E 400IU 400 IU (30 pcs)',
    generic_name: 'Vitamin E',
    strength: '400 IU',
    pack_size: '30 pcs',
    category_name_fallback: 'Capsule',
    mrp: 210,
    selling_price: 177.53,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nebicard 5 5 mg (30 Pcs)',
    generic_name: 'Nebivolol Hydrochloride',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 305.21,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'NeuVital 100 mg+200 mg+200 mcg (30 Pcs)',
    generic_name: 'Vitamin B1 + B6 + B12',
    strength: '100 mg + 200 mg + 200 mcg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 270,
    selling_price: 224.10,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Nexcap 20 20 mg (100 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '100 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 700,
    selling_price: 546.42,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nexcital 5 5 mg (30 Pcs)',
    generic_name: 'Escitalopram Oxalate',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 201.84,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nitro SR 2.6 2.6mg (30 Pcs)',
    generic_name: 'Nitroglycerin SR',
    strength: '2.6 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 126.38,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Nizoder Shampoo 2% (120 ml bottle)',
    generic_name: 'Ketoconazole',
    strength: '2%',
    pack_size: '120 ml bottle',
    category_name_fallback: 'Shampoo',
    mrp: 300,
    selling_price: 263.22,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Okical D 500mg+400iu (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '500 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 254.70,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Okical DX 600 600 mg+400 IU (30 Pcs)',
    generic_name: 'Calcium Carbonate + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 380.70,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Pladex 75 75 mg (30 Pcs)',
    generic_name: 'Clopidogrel',
    strength: '75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 311.44,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Pladex A 75/75 (30 Pcs)',
    generic_name: 'Clopidogrel + Aspirin',
    strength: '75 mg + 75 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 375,
    selling_price: 317.44,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Prazopress ER 2.5 2.5mg (30 Pcs)',
    generic_name: 'Prazosin Hydrochloride ER',
    strength: '2.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 312.77,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Prazopress ER 5 5mg (30 Pcs)',
    generic_name: 'Prazosin Hydrochloride ER',
    strength: '5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 510,
    selling_price: 436.00,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Predixa 16 16mg (10 Pcs)',
    generic_name: 'Methylprednisolone',
    strength: '16 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 202.49,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Protide 50/500mcg (30 Pcs)',
    generic_name: 'Fluticasone Propionate + Salmeterol',
    strength: '50 mcg + 500 mcg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Inhalation Capsule',
    mrp: 510,
    selling_price: 423.30,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Provair 10 10 mg (30 pcs)',
    generic_name: 'Montelukast Sodium',
    strength: '10 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 525,
    selling_price: 447.35,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Pulfibro 267 267 mg (30 Pcs)',
    generic_name: 'Pirfenidone',
    strength: '267 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1350,
    selling_price: 1143.72,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Pulmodox 200 200 mg (30 Pcs)',
    generic_name: 'Doxofylline',
    strength: '200 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 199.20,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Rapasin 4 4mg (30 Pcs)',
    generic_name: 'Silodosin',
    strength: '4 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 298.80,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Reticap 10 10 mg (10 Pcs)',
    generic_name: 'Isotretinoin',
    strength: '10 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 400,
    selling_price: 355.52,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Rhinomist 27.5 mcg (120 metered spray)',
    generic_name: 'Fluticasone Furoate',
    strength: '27.5 mcg',
    pack_size: '120 metered spray',
    category_name_fallback: 'Nasal Spray',
    mrp: 275,
    selling_price: 237.60,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Salost 5 5mg (28 Pcs)',
    generic_name: 'Cilostazol',
    strength: '5 mg',
    pack_size: '28 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 224,
    selling_price: 189.75,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Salost DR 35 35mg (4 Pcs)',
    generic_name: 'Risedronate Sodium DR',
    strength: '35 mg',
    pack_size: '4 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 220,
    selling_price: 189.13,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Slimi 60mg (21 Pcs)',
    generic_name: 'Orlistat',
    strength: '60 mg',
    pack_size: '21 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 630,
    selling_price: 542.56,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Soricap 25 25mg (7 pcs)',
    generic_name: 'Acitretin',
    strength: '25 mg',
    pack_size: '7 pcs',
    category_name_fallback: 'Capsule',
    mrp: 595,
    selling_price: 512.83,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Stacor 10 10 mg (30 Pcs)',
    generic_name: 'Atorvastatin',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 305.28,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Stresin 20mg (30 Pcs)',
    generic_name: 'Paroxetine',
    strength: '20 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 240,
    selling_price: 207.14,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Telfin 250 250 mg (10 Pcs)',
    generic_name: 'Terbinafine',
    strength: '250 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 429.55,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Telfin 30gm 1% (30 gm tube)',
    generic_name: 'Terbinafine Hydrochloride',
    strength: '1%',
    pack_size: '30 gm tube',
    category_name_fallback: 'Cream',
    mrp: 180,
    selling_price: 155.38,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Umactin BD 100mg (30 Pcs)',
    generic_name: 'Doxycycline Hyclate',
    strength: '100 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 690,
    selling_price: 578.57,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Uromax 0.4 0.4mg (30pcs)',
    generic_name: 'Tamsulosin Hydrochloride',
    strength: '0.4 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Capsule',
    mrp: 360,
    selling_price: 306.50,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Uromax D 0.4mg+0.5mg (30 pcs)',
    generic_name: 'Tamsulosin Hydrochloride + Dutasteride',
    strength: '0.4 mg + 0.5 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Capsule',
    mrp: 690,
    selling_price: 586.50,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Utramal 100 100 mg (10 Pcs)',
    generic_name: 'Tramadol Hydrochloride',
    strength: '100 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Suppository',
    mrp: 250,
    selling_price: 207.50,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Utramal Retard 100 100mg (30 Pcs)',
    generic_name: 'Tramadol Hydrochloride Retard',
    strength: '100 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 750,
    selling_price: 631.28,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Utromeg 25 25mg (20 Pcs)',
    generic_name: 'Mirabegron ER',
    strength: '25 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 498.00,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Veserc 16 16mg (50 pcs)',
    generic_name: 'Betahistine Dihydrochloride',
    strength: '16 mg',
    pack_size: '50 pcs',
    category_name_fallback: 'Tablet',
    mrp: 250,
    selling_price: 214.25,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Veserc 8 8mg (50 Pcs)',
    generic_name: 'Betahistine Dihydrochloride',
    strength: '8 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 150,
    selling_price: 124.50,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 0
  },
  {
    name: 'Viscotin 600 600 mg (10 Pcs)',
    generic_name: 'Acetylcysteine Effervescent',
    strength: '600 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 200,
    selling_price: 171.38,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },
  {
    name: 'Waxsol 0.5% 10 ml (1 Pcs)',
    generic_name: 'Docusate Sodium',
    strength: '0.5%',
    pack_size: '10 ml',
    category_name_fallback: 'Ear Drop',
    mrp: 150,
    selling_price: 129.90,
    company: 'UniMed UniHealth Pharmaceuticals Limited',
    stock_quantity: 100
  },

  // ==========================================
  // 9. Veritas Pharmaceuticals Ltd(4%) [Bonus: +4%]
  // ==========================================
  {
    name: 'Anxicon 500 500 mg (50 Pcs)',
    generic_name: 'Paracetamol',
    strength: '500 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 250,
    selling_price: 95.38,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Asmatab 10 10 mg (30 Pcs)',
    generic_name: 'Montelukast',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 390,
    selling_price: 113.84,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Baclomax 10 10 mg (30 Pcs)',
    generic_name: 'Baclofen',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 94.29,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Boncoral 500 500+200 (60 Pcs)',
    generic_name: 'Calcium (Coral source) + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '60 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 660,
    selling_price: 251.66,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Boncoral Dx 600 600+400 (30 pcs)',
    generic_name: 'Calcium (Coral source) + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 179.73,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Fexotab 120 120mg (30 pcs)',
    generic_name: 'Fexofenadine Hydrochloride',
    strength: '120 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 210.6,
    selling_price: 126.11,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Ketofast 10 10mg (20 pcs)',
    generic_name: 'Ketorolac Tromethamine',
    strength: '10 mg',
    pack_size: '20 pcs',
    category_name_fallback: 'Tablet',
    mrp: 240.8,
    selling_price: 50.69,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Painkil (veritas) 100mg (100pcs)',
    generic_name: 'Aceclofenac',
    strength: '100 mg',
    pack_size: '100 pcs',
    category_name_fallback: 'Tablet',
    mrp: 402,
    selling_price: 91.54,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Pantover 20 20mg (60 pcs)',
    generic_name: 'Pantoprazole',
    strength: '20 mg',
    pack_size: '60 pcs',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 70.65,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Prazover 20 20mg (100 pcs)',
    generic_name: 'Omeprazole',
    strength: '20 mg',
    pack_size: '100 pcs',
    category_name_fallback: 'Capsule',
    mrp: 501,
    selling_price: 149.50,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Roximax 250 250 mg (20 Pcs)',
    generic_name: 'Cefuroxime Axetil',
    strength: '250 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 501.4,
    selling_price: 261.38,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Roximax 500 500 mg (8pcs)',
    generic_name: 'Cefuroxime Axetil',
    strength: '500 mg',
    pack_size: '8 pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 171.40,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Roximax Plus 250 (14 pcs)',
    generic_name: 'Cefuroxime Axetil + Clavulanic Acid',
    strength: '250 mg + 62.5 mg',
    pack_size: '14 pcs',
    category_name_fallback: 'Tablet',
    mrp: 420,
    selling_price: 267.04,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Rupaver 10 10 mg (30 Pcs)',
    generic_name: 'Rupatadine',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 360,
    selling_price: 109.51,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Sparel 50 50 mg (50pcs)',
    generic_name: 'Tiemonium Methylsulfate',
    strength: '50 mg',
    pack_size: '50 pcs',
    category_name_fallback: 'Tablet',
    mrp: 300.5,
    selling_price: 119.63,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Terbiver 250 250 mg (10 Pcs)',
    generic_name: 'Terbinafine',
    strength: '250 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 126.15,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Verita B 100 mg+200 mg+200 mcg (30 Pcs)',
    generic_name: 'Vitamin B1 + B6 + B12',
    strength: '100 mg + 200 mg + 200 mcg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 107.50,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Verixim 200 200mg (14 pcs)',
    generic_name: 'Cefixime',
    strength: '200 mg',
    pack_size: '14 pcs',
    category_name_fallback: 'Capsule',
    mrp: 490,
    selling_price: 207.91,
    company: 'Veritas Pharmaceuticals Ltd',
    stock_quantity: 100
  },

  // ==========================================
  // 10. ZISKA Pharmaceuticals Ltd (3%) [Bonus: +3%]
  // ==========================================
  {
    name: 'Ajardy 25 25 mg (10 Pcs)',
    generic_name: 'Empagliflozin',
    strength: '25 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 400,
    selling_price: 316.72,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Azelto 100 100 mg (32 Pcs)',
    generic_name: 'Azithromycin',
    strength: '100 mg',
    pack_size: '32 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 384,
    selling_price: 311.04,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Bilargo 20 20 mg (20 Pcs)',
    generic_name: 'Bilastine',
    strength: '20 mg',
    pack_size: '20 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 354.74,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Closalic 10gm 0.05% (10 gm tube)',
    generic_name: 'Clobetasol Propionate + Salicylic Acid',
    strength: '0.05% + 3%',
    pack_size: '10 gm tube',
    category_name_fallback: 'Ointment',
    mrp: 70,
    selling_price: 56.05,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Closalic 30g 0.05% (30g)',
    generic_name: 'Clobetasol Propionate + Salicylic Acid',
    strength: '0.05% + 3%',
    pack_size: '30 gm tube',
    category_name_fallback: 'Ointment',
    mrp: 150,
    selling_price: 123.02,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Dapgel 7.5% 30 gm (1 Pcs)',
    generic_name: 'Dapsone',
    strength: '7.5%',
    pack_size: '1 Pcs (30 gm)',
    category_name_fallback: 'Gel',
    mrp: 250,
    selling_price: 201.85,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Deltapred 5 5 mg (50 Pcs)',
    generic_name: 'Prednisolone',
    strength: '5 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 550,
    selling_price: 441.32,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Dexilend 30 30mg (90pcs)',
    generic_name: 'Dexlansoprazole',
    strength: '30 mg',
    pack_size: '90 pcs',
    category_name_fallback: 'Capsule',
    mrp: 900,
    selling_price: 720.81,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Eczacort Cream 30gm (1 Pcs)',
    generic_name: 'Hydrocortisone + Clotrimazole',
    strength: '1% + 1%',
    pack_size: '1 Pcs (30 gm)',
    category_name_fallback: 'Cream',
    mrp: 200,
    selling_price: 160.70,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Emurea Cream 25% (30gm)',
    generic_name: 'Urea Cream',
    strength: '25%',
    pack_size: '30 gm',
    category_name_fallback: 'Cream',
    mrp: 150,
    selling_price: 126.33,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Esoprol 20 20 mg (60 Pcs)',
    generic_name: 'Esomeprazole',
    strength: '20 mg',
    pack_size: '60 Pcs',
    category_name_fallback: 'Capsule',
    mrp: 300,
    selling_price: 232.17,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Freshlook 0.1%+2.5% (10 gm tube)',
    generic_name: 'Adapalene + Benzoyl Peroxide',
    strength: '0.1% + 2.5%',
    pack_size: '10 gm tube',
    category_name_fallback: 'Gel',
    mrp: 160,
    selling_price: 128.86,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Fungitac 20 20 gm (1 Pcs)',
    generic_name: 'Ketoconazole',
    strength: '1%',
    pack_size: '1 Pcs (20 gm)',
    category_name_fallback: 'Cream',
    mrp: 200,
    selling_price: 164.70,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Imucort 6 6 mg (30 Pcs)',
    generic_name: 'Deflazacort',
    strength: '6 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 187.10,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Limitrol 12.5 12.5 mg+5 mg (30 Pcs)',
    generic_name: 'Chlordiazepoxide + Clidinium Bromide',
    strength: '12.5 mg + 5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 210,
    selling_price: 171.36,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Linera M 2.5 mg+500 mg (32 Pcs)',
    generic_name: 'Linagliptin + Metformin Hydrochloride',
    strength: '2.5 mg + 500 mg',
    pack_size: '32 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 384,
    selling_price: 308.08,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Melatrin cream 30 gm (1 tube)',
    generic_name: 'Hydroquinone',
    strength: '4%',
    pack_size: '1 tube (30 gm)',
    category_name_fallback: 'Cream',
    mrp: 200,
    selling_price: 138.06,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Metro 400 (Ziska) 400 mg (100 pcs)',
    generic_name: 'Metronidazole',
    strength: '400 mg',
    pack_size: '100 pcs',
    category_name_fallback: 'Tablet',
    mrp: 147,
    selling_price: 122.50,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'MM KIT 200mg+200mcg (1 pcs)',
    generic_name: 'Mifepristone + Misoprostol',
    strength: '200 mg + 200 mcg',
    pack_size: '1 pcs (1 + 4 tab kit)',
    category_name_fallback: 'Tablet',
    mrp: 300,
    selling_price: 218.70,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Monalast 10 10 mg (30 Pcs)',
    generic_name: 'Montelukast',
    strength: '10 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 307.89,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Napxon 375 375 mg (32 Pcs)',
    generic_name: 'Naproxen',
    strength: '375 mg',
    pack_size: '32 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 352,
    selling_price: 285.12,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Napxon 500 500 mg (32 Pcs)',
    generic_name: 'Naproxen',
    strength: '500 mg',
    pack_size: '32 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 416,
    selling_price: 326.85,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Neubin B 100 mg+200 mg+200 mcg (50 Pcs)',
    generic_name: 'Vitamin B1 + B6 + B12',
    strength: '100 mg + 200 mg + 200 mcg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 331.16,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Orofresh OS 10 ml (1 Pcs)',
    generic_name: 'Chlorhexidine Gluconate',
    strength: '10 ml',
    pack_size: '1 Pcs (10 ml)',
    category_name_fallback: 'Oral Solution',
    mrp: 120,
    selling_price: 97.20,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Paloron 0.5 0.5 mg (30 Pcs)',
    generic_name: 'Palonosetron',
    strength: '0.5 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 466.80,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Peuli 30mg (1 pcs)',
    generic_name: 'Ulipristal Acetate',
    strength: '30 mg',
    pack_size: '1 pcs',
    category_name_fallback: 'Tablet',
    mrp: 195,
    selling_price: 145.14,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Prexim 30 30 ml (1 Box)',
    generic_name: 'Cefixime',
    strength: '100 mg / 5 ml',
    pack_size: '30 ml',
    category_name_fallback: 'Powder For Suspension',
    mrp: 120,
    selling_price: 84.50,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Prolong 30 30 mg (8 Pcs)',
    generic_name: 'Dapoxetine',
    strength: '30 mg',
    pack_size: '8 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 240,
    selling_price: 194.76,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Reefcal D 500 mg+200 IU (50 Pcs)',
    generic_name: 'Calcium (Coral source) + Vitamin D3',
    strength: '500 mg + 200 IU',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 382.60,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Reefcal DX 600 mg+400 IU (30 Pcs)',
    generic_name: 'Calcium (Coral source) + Vitamin D3',
    strength: '600 mg + 400 IU',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 450,
    selling_price: 362.88,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Rupin 10 10 mg (50 Pcs)',
    generic_name: 'Rupatadine',
    strength: '10 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 600,
    selling_price: 457.26,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Solupred 16 16 mg (30 Pcs)',
    generic_name: 'Prednisolone',
    strength: '16 mg',
    pack_size: '30 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 390,
    selling_price: 301.20,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Solupred 4 4 mg (50 Pcs)',
    generic_name: 'Prednisolone',
    strength: '4 mg',
    pack_size: '50 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 350,
    selling_price: 271.99,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Solupred 8 8 mg (30 pcs)',
    generic_name: 'Prednisolone',
    strength: '8 mg',
    pack_size: '30 pcs',
    category_name_fallback: 'Tablet',
    mrp: 285,
    selling_price: 230.65,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Soria-D 0.05%+0.005% (20 gm Tube)',
    generic_name: 'Calcipotriol + Betamethasone Dipropionate',
    strength: '0.05% + 0.005%',
    pack_size: '20 gm Tube',
    category_name_fallback: 'Ointment',
    mrp: 380,
    selling_price: 307.04,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Terbitac 250 250mg (10 pcs)',
    generic_name: 'Terbinafine',
    strength: '250 mg',
    pack_size: '10 pcs',
    category_name_fallback: 'Tablet',
    mrp: 500,
    selling_price: 405.00,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Tofatin XR 11mg (10 Pcs)',
    generic_name: 'Tofacitinib XR',
    strength: '11 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 800,
    selling_price: 648.00,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Uliroid 5 5mg (20 pcs)',
    generic_name: 'Ulipristal Acetate',
    strength: '5 mg',
    pack_size: '20 pcs',
    category_name_fallback: 'Tablet',
    mrp: 1100,
    selling_price: 891.00,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 0
  },
  {
    name: 'Voritec 200 200 mg (10 Pcs)',
    generic_name: 'Voriconazole',
    strength: '200 mg',
    pack_size: '10 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 1200,
    selling_price: 940.80,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Xiclav 250 250 mg (14 Pcs)',
    generic_name: 'Amoxicillin + Clavulanic Acid',
    strength: '250 mg + 62.5 mg',
    pack_size: '14 Pcs',
    category_name_fallback: 'Tablet',
    mrp: 490,
    selling_price: 382.84,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  },
  {
    name: 'Z-Lidocaine Jelly 2% (30 gm tube)',
    generic_name: 'Lidocaine Hydrochloride 2%',
    strength: '2%',
    pack_size: '30 gm tube',
    category_name_fallback: 'Jelly',
    mrp: 100,
    selling_price: 74.91,
    company: 'ZISKA Pharmaceuticals Ltd',
    stock_quantity: 100
  }
];

async function retryOperation<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function syncBatch7() {
  console.log(`Starting Batch 7 sync for ${batch7Medicines.length} medicines...`);
  
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const item of batch7Medicines) {
    try {
      const existing = await retryOperation(async () => {
        const { data, error } = await supabaseAdmin
          .from('products')
          .select('id, name, company')
          .eq('name', item.name)
          .eq('company', item.company)
          .maybeSingle();
        if (error) throw error;
        return data;
      });

      if (existing) {
        await retryOperation(async () => {
          const { error } = await supabaseAdmin
            .from('products')
            .update({
              generic_name: item.generic_name,
              strength: item.strength,
              pack_size: item.pack_size,
              category_name_fallback: item.category_name_fallback,
              mrp: item.mrp,
              selling_price: item.selling_price,
              stock_quantity: item.stock_quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          if (error) throw error;
        });

        updated++;
        // Update inventory
        await retryOperation(async () => {
          const { data: invExisting } = await supabaseAdmin
            .from('inventory')
            .select('id')
            .eq('product_id', existing.id)
            .maybeSingle();

          if (invExisting) {
            await supabaseAdmin
              .from('inventory')
              .update({
                available_stock: item.stock_quantity,
                expiry_date: '2028-12-31'
              })
              .eq('id', invExisting.id);
          } else {
            await supabaseAdmin.from('inventory').insert({
              product_id: existing.id,
              available_stock: item.stock_quantity,
              reserved_stock: 0,
              sold_stock: 0,
              batch_number: 'BATCH-2026-B7',
              expiry_date: '2028-12-31'
            });
          }
        });
      } else {
        const insertedProd = await retryOperation(async () => {
          const { data, error } = await supabaseAdmin
            .from('products')
            .insert({
              name: item.name,
              generic_name: item.generic_name,
              strength: item.strength,
              pack_size: item.pack_size,
              category_name_fallback: item.category_name_fallback,
              mrp: item.mrp,
              selling_price: item.selling_price,
              company: item.company,
              stock_quantity: item.stock_quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();
          if (error) throw error;
          return data;
        });

        inserted++;
        if (insertedProd) {
          await retryOperation(async () => {
            const { data: invExisting } = await supabaseAdmin
              .from('inventory')
              .select('id')
              .eq('product_id', insertedProd.id)
              .maybeSingle();

            if (invExisting) {
              await supabaseAdmin
                .from('inventory')
                .update({
                  available_stock: item.stock_quantity,
                  expiry_date: '2028-12-31'
                })
                .eq('id', invExisting.id);
            } else {
              await supabaseAdmin.from('inventory').insert({
                product_id: insertedProd.id,
                available_stock: item.stock_quantity,
                reserved_stock: 0,
                sold_stock: 0,
                batch_number: 'BATCH-2026-B7',
                expiry_date: '2028-12-31'
              });
            }
          });
        }
      }
    } catch (e: any) {
      console.error(`Unexpected error with "${item.name}":`, e?.message || e);
      errors++;
    }
  }

  console.log(`\n--- Batch 7 Sync Complete ---`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${inserted + updated}`);

  // Fetch grand total products count in Supabase
  const { count, error: countErr } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (!countErr) {
    console.log(`Grand total products in database: ${count}`);
  }
}

syncBatch7().catch(console.error);
