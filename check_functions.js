// Быстрая проверка функций через API
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function check(name, url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${BASE_URL}${url}`, options);
    const data = await res.json();
    
    if (res.ok) {
      console.log(`✅ ${name}`);
      return true;
    } else {
      console.log(`❌ ${name}: ${res.status} - ${JSON.stringify(data).substring(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Проверка функций через API...\n');
  
  const results = [];
  
  results.push(await check('GET /api/admin/server-info', '/api/admin/server-info'));
  results.push(await check('GET /api/admin/review-sets', '/api/admin/review-sets'));
  results.push(await check('POST /api/admin/review-sets/check-slug', '/api/admin/review-sets/check-slug', 'POST', { slug: 'test-123' }));
  
  const passed = results.filter(r => r).length;
  console.log(`\n📊 Результат: ${passed}/${results.length} функций работают`);
  
  if (passed === results.length) {
    console.log('✅ Все проверенные функции работают!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
