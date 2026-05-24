// Script: import_list.js
// Toma un archivo de texto con una lista de Pokémon (ID y nombre) y genera
// /questions.js con entradas { id, name } para usar en la app.

const fs = require('fs');
const path = require('path');

function usage(){
  console.log('Uso: node tools/import_list.js path/to/list.txt');
  console.log('Formato por línea aceptado:');
  console.log('- 003 Venusaur');
  console.log('- 3,Venusaur');
  console.log('- 003 | Venusaur');
  console.log('- Venusaur | 3');
  process.exit(1);
}

const inPath = process.argv[2];
if (!inPath) usage();
if (!fs.existsSync(inPath)){
  console.error('No existe', inPath);
  process.exit(1);
}

const text = fs.readFileSync(inPath, 'utf8');
const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
const items = [];
const seen = new Set();

for (const line of lines){
  // Try multiple patterns to extract id and name
  let id = null, name = null;
  // pattern: id [sep] name  (sep = ,|\||-|; or whitespace)
  let m = line.match(/^\s*0*(\d{1,4})\s*[,|\-|;:]?\s+(.+)$/);
  if (m){ id = parseInt(m[1],10); name = m[2].trim(); }
  if (!id){ m = line.match(/^\s*0*(\d{1,4})\s*[,|;|\|\-:]\s*(.+)$/); if (m){ id=parseInt(m[1],10); name=m[2].trim(); } }
  // pattern: name [sep] id
  if (!id){ m = line.match(/^(.+?)\s*[|,;:-]\s*0*(\d{1,4})$/); if (m){ name=m[1].trim(); id=parseInt(m[2],10); } }
  // pattern: just two tokens: id name
  if (!id){ m = line.match(/^0*(\d{1,4})\s+(\S[\s\S]+)$/); if (m){ id=parseInt(m[1],10); name=m[2].trim(); } }
  // fallback: try to find any number and any word
  if (!id){ m = line.match(/(\d{1,4})/); if (m){ id=parseInt(m[1],10); name = line.replace(m[0],'').replace(/[|,;:-]/g,'').trim(); } }

  if (!id || !name) {
    console.warn('Ignorado (no parseable):', line);
    continue;
  }

  const key = `${id}::${name.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  items.push({ id, name });
}

if (!items.length){
  console.error('No se generaron entradas desde', inPath);
  process.exit(1);
}

items.sort((a,b)=>a.id-b.id);

const outPath = path.resolve(__dirname, '..', 'questions.js');
const header = `// Preguntas generadas desde lista de usuario\n`+
  `// Cada entrada: { id: number, name: string }\n`;
const body = 'const QUESTIONS = ' + JSON.stringify(items, null, 2) + ';\n\n' +
  '// Archivo generado por tools/import_list.js\n';

fs.writeFileSync(outPath, header + body, 'utf8');
console.log('Escrito', outPath, 'con', items.length, 'entradas.');
