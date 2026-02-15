const fs = require('fs');
const path = require('path');

// Protobuf dosyasını oku
const settingsPath = 'C:\\Users\\merte\\.gemini\\antigravity\\user_settings.pb';

try {
  const buffer = fs.readFileSync(settingsPath);
  console.log('Dosya boyutu:', buffer.length, 'bytes');
  console.log('\nİlk 200 byte (hex):');
  console.log(buffer.slice(0, 200).toString('hex'));
  
  console.log('\nİlk 500 karakter (utf-8):');
  console.log(buffer.slice(0, 500).toString('utf-8').replace(/[^\x20-\x7E]/g, '.'));
  
  // JSON formatında olup olmadığını kontrol et
  try {
    const json = JSON.parse(buffer.toString());
    console.log('\nJSON formatında:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('\nJSON formatında değil, protobuf olabilir');
  }
} catch (err) {
  console.error('Dosya okunamadı:', err.message);
}
