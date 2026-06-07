const fs = require('fs');
const files = ['public/js/pages/my-schedule.js', 'public/js/pages/schedule.js'];

files.forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  txt = txt.split('\\${').join('${');
  fs.writeFileSync(f, txt);
  console.log(`Fixed ${f}`);
});
