#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing Local Bridge connection...\n');

// ヘルスチェックエンドポイントをテスト
const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Local Bridge is running!');
      console.log('📊 Response:', data);
      
      try {
        const json = JSON.parse(data);
        console.log('\n🔧 Server Details:');
        console.log(`  - Status: ${json.status}`);
        console.log(`  - Version: ${json.version}`);
        console.log(`  - Time: ${json.timestamp}`);
      } catch (e) {
        // JSONパースエラーは無視
      }
    } else {
      console.log(`❌ Unexpected status code: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\n💡 Make sure the Local Bridge is running:');
  console.log('   pnpm dev:bridge');
  console.log('   or');
  console.log('   cd local-bridge && pnpm dev');
});

req.end();