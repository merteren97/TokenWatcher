const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const cookiePath = 'C:\\Users\\merte\\AppData\\Roaming\\Antigravity\\Network\\Cookies';

const db = new sqlite3.Database(cookiePath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Cookie DB açılamadı:', err.message);
    return;
  }
  console.log('Cookie DB açıldı');
});

db.all('SELECT host_key, name, value FROM cookies', [], (err, rows) => {
  if (err) {
    console.error('Sorgu hatası:', err.message);
    return;
  }
  
  console.log('\n=== Tüm Cookie ler ===');
  rows.forEach(row => {
    console.log(`${row.host_key} | ${row.name} = ${row.value ? row.value.substring(0, 50) : 'empty'}`);
  });
  
  // Google/Antigravity ile ilgili cookie'leri filtrele
  console.log('\n=== Google/Antigravity Cookie leri ===');
  const relevantCookies = rows.filter(row => 
    row.host_key.includes('google') || 
    row.host_key.includes('antigravity')
  );
  
  relevantCookies.forEach(row => {
    console.log(`${row.host_key} | ${row.name} = ${row.value ? row.value.substring(0, 100) : 'empty'}`);
  });
});

db.close();
