import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function setupRealCampaign() {
  console.log('--- Step 1: Finding an appealing in-stock product from the catalog ---');
  const prodRes = await fetch('http://localhost:3000/api/products?limit=10');
  const prodData = await prodRes.json();
  const products = Array.isArray(prodData) ? prodData : prodData.products;

  // Find a medicine with an image
  const featured = products.find(p => p.imageUrl || p.image_url) || products[0];
  console.log('Selected featured product:', {
    id: featured.id,
    name: featured.name,
    strength: featured.strength,
    company: featured.company,
    has_image: !!(featured.imageUrl || featured.image_url)
  });

  console.log('\n--- Step 2: Creating a Live Billboard Campaign via Backend API ---');
  const payload = {
    title: 'Super Bulk Savings',
    subtext: 'B2B Pharma Wholesale, Made Smarter',
    featured_product_id: featured.id,
    discount_display_percent: 28,
    trust_badges: [
      { icon: 'shield', label: 'Trusted Brands' },
      { icon: 'lightning', label: 'Bulk Discounts' },
      { icon: 'truck', label: 'Fast Delivery' }
    ],
    cta_text: 'Order Now',
    cta_link: '/products',
    status: 'Live'
  };

  const createRes = await fetch('http://localhost:3000/api/bulk-deals/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log('Campaign creation status:', createRes.status);
  const created = await createRes.json();
  console.log('Created campaign ID:', created.id);
  console.log('Created campaign title:', created.title);
  console.log('Created campaign discount %:', created.discount_display_percent);
  console.log('Created campaign status:', created.status);

  console.log('\n--- Step 3: Verifying GET /api/bulk-deals/live ---');
  const liveRes = await fetch('http://localhost:3000/api/bulk-deals/live');
  const liveData = await liveRes.json();
  console.log('Live Campaign returned:', {
    id: liveData?.id,
    title: liveData?.title,
    status: liveData?.status,
    discount_display_percent: liveData?.discount_display_percent,
    featured_product_name: liveData?.featured_product?.name,
    featured_product_strength: liveData?.featured_product?.strength,
    featured_product_company: liveData?.featured_product?.company,
    trust_badges: liveData?.trust_badges
  });
}

setupRealCampaign().catch(console.error);
