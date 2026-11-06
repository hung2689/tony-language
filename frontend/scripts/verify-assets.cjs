const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('frontend/src');
const publicDir = path.resolve('frontend/public');

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(full, exts));
    } else if (exts.some(ext => file.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const files = getAllFiles(srcDir, ['.jsx', '.js', '.css', '.html']);
const assetRegex = /(?:url\(['"]?|['"])(\/(?:assets|wallpapers|video)\/[^'"\)\?#]+\.(?:png|jpe?g|webp|svg|gif|mp4))['"]?\)?/g;

const checked = new Map();
let totalMatches = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = assetRegex.exec(content)) !== null) {
    const assetPath = match[1];
    totalMatches++;
    if (!checked.has(assetPath)) {
      const targetFile = path.join(publicDir, assetPath);
      const exists = fs.existsSync(targetFile);
      checked.set(assetPath, { exists, foundIn: [path.relative(srcDir, file)] });
    } else {
      checked.get(assetPath).foundIn.push(path.relative(srcDir, file));
    }
  }
}

const missing = [];
const valid = [];
for (const [p, info] of checked.entries()) {
  if (info.exists) {
    valid.push({ path: p, count: info.foundIn.length });
  } else {
    missing.push({ path: p, foundIn: info.foundIn });
  }
}

console.log('=== KẾT QUẢ QUÉT TĨNH TOÀN BỘ ĐƯỜNG DẪN ẢNH / TÀI NGUYÊN ===');
console.log('Tổng số tệp mã nguồn quét:', files.length);
console.log('Tổng số tham chiếu tài nguyên tìm thấy:', totalMatches);
console.log('Số đường dẫn tài nguyên duy nhất:', checked.size);
console.log('Số đường dẫn hợp lệ (tệp tồn tại trong public/):', valid.length);
console.log('Số đường dẫn HỎNG (missing):', missing.length);

if (missing.length > 0) {
  console.log('\nDANH SÁCH ĐƯỜNG DẪN HỎNG:');
  missing.forEach(m => console.log(' - ' + m.path + ' (tại ' + m.foundIn.join(', ') + ')'));
} else {
  console.log('\n=> TẤT CẢ ĐƯỜNG DẪN ẢNH VÀ TÀI NGUYÊN ĐỀU TỒN TẠI HỢP LỆ TRONG frontend/public!');
}
