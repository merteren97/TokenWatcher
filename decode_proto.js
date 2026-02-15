const fs = require('fs');
const path = require('path');

// Protobuf decoder kullanmadan base64 decode deneyelim
const base64Data = "EAEaCU1lcnQgRVJFTjoWbWVydGVyZW4xOTk3QGdtYWlsLmNvbWptCmYIAhIDUHJvGAEgATD///////////8BOICAAUDYBEj///////////8BUP///////////wFg0IYD";

const buffer = Buffer.from(base64Data, 'base64');

console.log('Base64 decode edildi');
console.log('Buffer uzunluğu:', buffer.length);
console.log('\nİlk 100 byte (hex):');
console.log(buffer.slice(0, 100).toString('hex').match(/.{2}/g).join(' '));

console.log('\nTüm veri (hex):');
console.log(buffer.toString('hex').match(/.{2}/g).join(' '));

console.log('\n\nUTF-8 olarak okunabilir kısımlar:');
const utf8Str = buffer.toString('utf-8');
console.log(utf8Str.replace(/[^\x20-\x7E\n\r\t]/g, '.'));

// Basit parse - okunabilir stringleri bul
console.log('\n\n=== Okunabilir Stringler ===');
let currentStr = '';
let strs = [];
for (let i = 0; i < buffer.length; i++) {
  const byte = buffer[i];
  if (byte >= 32 && byte <= 126) {
    currentStr += String.fromCharCode(byte);
  } else {
    if (currentStr.length > 3) {
      strs.push({ offset: i - currentStr.length, value: currentStr });
    }
    currentStr = '';
  }
}
if (currentStr.length > 3) {
  strs.push({ offset: buffer.length - currentStr.length, value: currentStr });
}
strs.forEach(s => console.log(`Offset ${s.offset}: "${s.value}"`));

// Protobuf wire format analizi
console.log('\n\n=== Protobuf Wire Format Analizi ===');
let offset = 0;
while (offset < buffer.length) {
  const byte = buffer[offset];
  const fieldNum = byte >> 3;
  const wireType = byte & 0x07;
  
  process.stdout.write(`\nOffset ${offset}: Field ${fieldNum}, Wire Type ${wireType} - `);
  
  switch (wireType) {
    case 0: // Varint
      let varintValue = 0;
      let varintShift = 0;
      offset++;
      while (offset < buffer.length && (buffer[offset] & 0x80)) {
        varintValue |= (buffer[offset] & 0x7F) << varintShift;
        offset++;
        varintShift += 7;
      }
      if (offset < buffer.length) {
        varintValue |= buffer[offset] << varintShift;
        offset++;
      }
      console.log(`Varint: ${varintValue}`);
      break;
      
    case 2: // Length-delimited (string/embed message)
      offset++;
      let length = 0;
      let lenShift = 0;
      while (offset < buffer.length && (buffer[offset] & 0x80)) {
        length |= (buffer[offset] & 0x7F) << lenShift;
        offset++;
        lenShift += 7;
      }
      if (offset < buffer.length) {
        length |= buffer[offset] << lenShift;
        offset++;
      }
      const data = buffer.slice(offset, Math.min(offset + length, buffer.length));
      console.log(`Length-delimited (${length} bytes):`);
      console.log(`  Data: "${data.toString('utf-8')}"`);
      offset += length;
      break;
      
    case 1: // 64-bit
      console.log(`64-bit: ${buffer.slice(offset + 1, offset + 9).toString('hex')}`);
      offset += 9;
      break;
      
    case 5: // 32-bit
      console.log(`32-bit: ${buffer.slice(offset + 1, offset + 5).toString('hex')}`);
      offset += 5;
      break;
      
    default:
      console.log(`Unknown wire type ${wireType}`);
      offset++;
  }
}
