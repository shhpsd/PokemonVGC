// Lista reducida de pokémon para pruebas
const POKEMON = [
  { id: 1, name: 'Incineroar', tag: 'Fire/Dark' },
  { id: 2, name: 'Dragapult', tag: 'Dragon/Ghost' },
  { id: 3, name: 'Togekiss', tag: 'Fairy/Flying' },
  { id: 4, name: 'Landorus-T', tag: 'Ground/Flying' },
  { id: 5, name: 'Gastrodon', tag: 'Water/Ground' },
  { id: 6, name: 'Urshifu-R', tag: 'Fighting/Dark' },
  { id: 7, name: 'Tapu Fini', tag: 'Water/Fairy' },
  { id: 8, name: 'Rotom-Wash', tag: 'Electric/Water' },
  { id: 9, name: 'Hawlucha', tag: 'Fighting/Flying' },
  { id:10, name: 'Ferrothorn', tag: 'Grass/Steel' }
];

const TYPE_CHART = {
  Normal: { strongAgainst: [], weakAgainst: ['Fighting'] },
  Fire: { strongAgainst: ['Grass','Ice','Bug','Steel'], weakAgainst: ['Water','Ground','Rock'] },
  Water: { strongAgainst: ['Fire','Ground','Rock'], weakAgainst: ['Electric','Grass'] },
  Electric: { strongAgainst: ['Water','Flying'], weakAgainst: ['Ground'] },
  Grass: { strongAgainst: ['Water','Ground','Rock'], weakAgainst: ['Fire','Ice','Poison','Flying','Bug'] },
  Ice: { strongAgainst: ['Grass','Ground','Flying','Dragon'], weakAgainst: ['Fire','Fighting','Rock','Steel'] },
  Fighting: { strongAgainst: ['Normal','Ice','Rock','Dark','Steel'], weakAgainst: ['Flying','Psychic','Fairy'] },
  Poison: { strongAgainst: ['Grass','Fairy'], weakAgainst: ['Ground','Psychic'] },
  Ground: { strongAgainst: ['Fire','Electric','Poison','Rock','Steel'], weakAgainst: ['Water','Grass','Ice'] },
  Flying: { strongAgainst: ['Grass','Fighting','Bug'], weakAgainst: ['Electric','Ice','Rock'] },
  Psychic: { strongAgainst: ['Fighting','Poison'], weakAgainst: ['Bug','Ghost','Dark'] },
  Bug: { strongAgainst: ['Grass','Psychic','Dark'], weakAgainst: ['Fire','Flying','Rock'] },
  Rock: { strongAgainst: ['Fire','Ice','Flying','Bug'], weakAgainst: ['Water','Grass','Fighting','Ground','Steel'] },
  Ghost: { strongAgainst: ['Psychic','Ghost'], weakAgainst: ['Ghost','Dark'] },
  Dragon: { strongAgainst: ['Dragon'], weakAgainst: ['Ice','Dragon','Fairy'] },
  Dark: { strongAgainst: ['Psychic','Ghost'], weakAgainst: ['Fighting','Bug','Fairy'] },
  Steel: { strongAgainst: ['Ice','Rock','Fairy'], weakAgainst: ['Fire','Fighting','Ground'] },
  Fairy: { strongAgainst: ['Fighting','Dragon','Dark'], weakAgainst: ['Poison','Steel'] }
};
const TYPE_LIST = Object.keys(TYPE_CHART);

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function makeTypeQuiz(n=8){
  const questions=[];
  for(let i=0;i<n;i++){
    const base = TYPE_LIST[Math.floor(Math.random()*TYPE_LIST.length)];
    const mode = Math.random() < 0.5 ? 'attack' : 'weakness';
    let correct;
    let prompt;
    if(mode === 'attack'){
      const opponents = TYPE_LIST.filter(type => TYPE_CHART[type].strongAgainst.includes(base));
      if(opponents.length === 0){ i--; continue; }
      correct = opponents[Math.floor(Math.random()*opponents.length)];
      prompt = `¿Qué tipo le gana a ${base}?`;
    } else {
      const targets = TYPE_CHART[base].strongAgainst;
      if(!targets.length){ i--; continue; }
      correct = targets[Math.floor(Math.random()*targets.length)];
      prompt = `¿Qué tipo es débil a ${base}?`;
    }
    const choices = new Set([correct]);
    const distractors = TYPE_LIST.filter(type => type !== correct && type !== base);
    shuffleArray(distractors);
    while(choices.size < 4 && distractors.length){
      choices.add(distractors.shift());
    }
    questions.push({
      q: prompt,
      correct,
      choices: shuffleArray(Array.from(choices)).slice(0,4),
      typeMode: 'table',
      baseType: base
    });
  }
  return questions;
}

// Helpers
const $ = id => document.getElementById(id);

// PokeAPI cache (in-memory + localStorage)
const POKE_CACHE_KEY = 'poke_api_cache_v1';
let POKE_CACHE = {};
try{ POKE_CACHE = JSON.parse(localStorage.getItem(POKE_CACHE_KEY) || '{}') }catch(e){ POKE_CACHE = {} }

async function saveCache(){ localStorage.setItem(POKE_CACHE_KEY, JSON.stringify(POKE_CACHE)); }

async function getPokemonData(name){
  const raw = String(name ?? '');
  // normalize cache key
  const key = (typeof raw === 'number' || /^[0-9]+$/.test(raw)) ? `id-${String(raw)}` : raw.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  if(POKE_CACHE[key]) return POKE_CACHE[key];

  // helper to extract best sprite from API response
  function pickSprite(data){
    if(!data || !data.sprites) return null;
    return data.sprites.other?.home?.front_default
      || data.sprites.other?.['official-artwork']?.front_default
      || data.sprites.other?.dream_world?.front_default
      || data.sprites.front_default
      || null;
  }

  function placeholderSvg(name){
    const letter = (name && name[0]) ? name[0].toUpperCase() : '?';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='100%' height='100%' fill='#07131a'/><text x='50%' y='50%' font-family='Arial,sans-serif' font-size='44' fill='#9aa4b2' dominant-baseline='middle' text-anchor='middle'>${letter}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // If raw is numeric, fetch by id directly
  const candidates = [];
  if(typeof name === 'number' || /^[0-9]+$/.test(raw)){
    candidates.push(String(raw));
  } else {
    candidates.push(raw.toLowerCase().replace(/\s+/g,'-'));
    candidates.push(raw.toLowerCase().replace(/\s+/g,''));
    candidates.push(raw.toLowerCase());
  }

  for(const c of candidates){
    if(!c) continue;
    try{
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(c)}`);
      if(!res.ok) continue;
      const data = await res.json();
      const types = data.types.map(t=>t.type.name.charAt(0).toUpperCase()+t.type.name.slice(1)).join('/');
      // Prefer API-provided sprites; if missing, fall back to raw GitHub sprite URLs
      let sprite = pickSprite(data);
      if(!sprite && data.id){
        // small sprite first, then official artwork
        sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`;
        // we prefer official-artwork URLs for clearer images
        sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png` || sprite;
      }
      // last resort: placeholder SVG
      if(!sprite) sprite = placeholderSvg(data.name || raw);
      const entry = { name: data.name, types, sprite };
      POKE_CACHE[key]=entry; await saveCache();
      return entry;
    }catch(e){
      continue;
    }
  }

  // fallback when no candidate matched
  // if raw is numeric, try direct sprite urls from the sprites repo
  let sprite = null;
  if(/^[0-9]+$/.test(raw)){
    sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${raw}.png`;
  }
  if(!sprite) sprite = placeholderSvg(raw);
  const entry = { name: raw, types: 'Unknown', sprite };
  POKE_CACHE[key]=entry; await saveCache();
  return entry;
}

function renderPokedex(filter = ''){
  const list = $("pokedex");
  list.innerHTML = '';
  const filtered = POKEMON.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
  filtered.forEach(p => {
    const li = document.createElement('li');
    const row = document.createElement('div'); row.className='poke-row';
    const spriteWrap = document.createElement('span'); spriteWrap.className='poke-sprite'; spriteWrap.textContent = p.name.charAt(0);
    const info = document.createElement('div'); info.innerHTML = `<strong>${p.name}</strong><div class="muted">${p.tag}</div>`;
    row.appendChild(spriteWrap); row.appendChild(info);
    li.appendChild(row);
    li.onclick = () => addToTeam(p);
    list.appendChild(li);
    // async fetch real data
    getPokemonData(p.name).then(d=>{
      if(d.sprite){ spriteWrap.innerHTML = `<img src="${d.sprite}" alt="${d.name}"/>`; }
      info.querySelector('.muted').textContent = d.types || p.tag;
    });
  });
}

// Team management
const team = [];
// Statistics (persisted)
const STATS_KEY = 'vgc_stats_v1';
let STATS = {};
function loadStats(){ try{ STATS = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }catch(e){ STATS = {} } STATS.totalQuizzes = STATS.totalQuizzes||0; STATS.totalCorrect = STATS.totalCorrect||0; STATS.teamGenCount = STATS.teamGenCount||0; STATS.pickCounts = STATS.pickCounts||{}; STATS.lastQuizSize = STATS.lastQuizSize||0; return STATS }
function saveStats(){ localStorage.setItem(STATS_KEY, JSON.stringify(STATS)) }
loadStats();
function renderTeam(){
  const list = $('teamList');
  list.innerHTML = '';
  team.forEach((p, i) => {
    const li = document.createElement('li');
    const spriteWrap = document.createElement('span'); spriteWrap.className='poke-sprite'; spriteWrap.textContent = p.name.charAt(0);
    const info = document.createElement('div'); info.innerHTML = `<strong>${p.name}</strong><div class="muted">${p.tag}</div>`;
    const rem = document.createElement('button'); rem.className='remove'; rem.textContent='✕'; rem.dataset.i = i;
    rem.onclick = () => { team.splice(i,1); renderTeam(); };
    li.appendChild(spriteWrap); li.appendChild(info); li.appendChild(rem);
    // fetch sprite/types
    getPokemonData(p.name).then(d=>{ if(d.sprite) spriteWrap.innerHTML = `<img src="${d.sprite}" alt="${d.name}"/>`; info.querySelector('.muted').textContent = d.types || p.tag; });
    list.appendChild(li);
  });
}

function renderStats(){
  const el = document.getElementById('teamStats'); if(!el) return;
  const totalQ = STATS.totalQuizzes||0; const totalCorrect = STATS.totalCorrect||0;
  const avg = totalQ? Math.round((totalCorrect/(totalQ * (STATS.lastQuizSize||1)))*100) : 0;
  let html = `<div><b>Quizzes:</b> ${totalQ} — <b>Aciertos totales:</b> ${totalCorrect} — <b>Precisión:</b> ${avg}%</div>`;
  html += `<div style="margin-top:8px"><b>Equipos generados:</b> ${STATS.teamGenCount||0}</div>`;
  const counts = STATS.pickCounts || {};
  const entries = Object.keys(counts).map(k=>({k,v:counts[k]})).sort((a,b)=>b.v-a.v).slice(0,6);
  if(entries.length){ html += '<div style="margin-top:8px"><b>Top picks:</b><ul>';
    entries.forEach(en=>{ const name = findNameForKey(en.k); html += `<li>${name} — ${en.v}</li>` }); html += '</ul></div>'; }
  el.innerHTML = html;
}

function findNameForKey(k){
  const bank = (typeof QUESTIONS !== 'undefined' && Array.isArray(QUESTIONS) && QUESTIONS.length>0)
    ? QUESTIONS.map(q=>({ id: q.id, name: q.name }))
    : POKEMON.map(p=>({ id: p.id, name: p.name }));
  const found = bank.find(x => String(x.id) === String(k) || x.name === k);
  return found? found.name : k;
}

function addToTeam(p){
  if(team.length >= 6) return alert('El equipo ya tiene 6 pokémon');
  if(team.find(x=>x.id===p.id)) return alert('Ya está en el equipo');
  team.push(p); renderTeam();
}

function clearTeam(){
  team.length = 0; renderTeam();
}

function randomTeam(){
  clearTeam();
  const copy = [...POKEMON];
  while(team.length < 6 && copy.length){
    const i = Math.floor(Math.random()*copy.length);
    team.push(copy.splice(i,1)[0]);
  }
  renderTeam();
}

// Init UI
document.addEventListener('DOMContentLoaded', ()=>{
  renderPokedex(); renderTeam(); renderStats();
  $('search').addEventListener('input', e=> renderPokedex(e.target.value));
  $('randomTeam').addEventListener('click', randomTeam);
  $('clearTeam').addEventListener('click', clearTeam);
  // Training UI wiring
  const mode = $('trainMode');
  const flashView = $('flash');
  const quizView = $('quiz');
  let selectedQuizLevel = 'basic';
  const levelButtons = Array.from(document.querySelectorAll('.level-btn'));
  const quizLevelSizes = { basic: 8, table: 8, advanced: 12, maestro: 16 };

  function updateLevelButtons() {
    levelButtons.forEach(btn => {
      const active = btn.dataset.level === selectedQuizLevel;
      btn.classList.toggle('active', active);
      btn.textContent = btn.textContent.trim();
    });
  }

  levelButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedQuizLevel = btn.dataset.level;
      updateLevelButtons();
      const count = quizLevelSizes[selectedQuizLevel] || 10;
      $('startQuiz').textContent = `Iniciar Quiz (${count})`;
    });
  });

  updateLevelButtons();
  $('startQuiz').textContent = `Iniciar Quiz (${quizLevelSizes[selectedQuizLevel]})`;

  mode.addEventListener('change', e=>{
    if(e.target.value === 'flash'){ flashView.style.display='block'; quizView.style.display='none'; }
    else { flashView.style.display='none'; quizView.style.display='block'; }
  });

  // Flashcards
  let flashIndex = 0;
  function renderFlash(){
    // Use QUESTIONS bank if provided, otherwise fallback to POKEMON
    const bank = (typeof QUESTIONS !== 'undefined' && Array.isArray(QUESTIONS) && QUESTIONS.length>0)
      ? QUESTIONS.map(q=>({ id: q.id, name: q.name, slug: q.slug }))
      : POKEMON.map(p=>({ id: p.id, name: p.name }));
    if(bank.length === 0) return;
    const card = bank[flashIndex % bank.length];
    // fetch sprite and types
    getPokemonData(card.name).then(d=>{
      const spriteHtml = d.sprite ? `<img src="${d.sprite}" alt="${d.name}"/>` : d.name.charAt(0);
      $('flashCard').innerHTML = `<div class="flash-sprite">${spriteHtml}</div><div class="flash-content"><div id="flashFront" class="front">${d.name}</div><div id="flashBack" class="back" style="display:none">${d.types ?? card.tag}</div></div>`;
    });
  }
  $('flipCard').addEventListener('click', ()=>{
    const back = document.getElementById('flashBack'); if(!back) return; back.style.display = back.style.display === 'block' ? 'none' : 'block';
  });
  $('nextCard').addEventListener('click', ()=>{ flashIndex = (flashIndex+1)%POKEMON.length; renderFlash(); });
  $('prevCard').addEventListener('click', ()=>{ flashIndex = (flashIndex-1+POKEMON.length)%POKEMON.length; renderFlash(); });
  renderFlash();

  // Type guide rendering (responsive / selectable)
  function renderTypeGuide(){
    const container = document.getElementById('typeGuide');
    if(!container) return;
    container.innerHTML = '';
    const viewSelect = document.getElementById('typeGuideView');
    const viewMode = viewSelect ? viewSelect.value : 'auto';
    const autoUseTable = (window.innerWidth || document.documentElement.clientWidth) > 900;
    const useTable = (viewMode === 'table') || (viewMode === 'auto' && autoUseTable);
    const useCards = (viewMode === 'cards') || (viewMode === 'auto' && !autoUseTable);
    if(useTable){
      const table = document.createElement('table'); table.className='type-table';
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const empty = document.createElement('th'); empty.textContent='Attack \\ Defense'; headerRow.appendChild(empty);
      TYPE_LIST.forEach(t=>{ const th = document.createElement('th'); th.textContent = t; headerRow.appendChild(th); });
      thead.appendChild(headerRow); table.appendChild(thead);
      const tbody = document.createElement('tbody');
      TYPE_LIST.forEach(attack=>{
        const tr = document.createElement('tr');
        const nameCell = document.createElement('th'); nameCell.className='type-name'; nameCell.textContent = attack; tr.appendChild(nameCell);
        TYPE_LIST.forEach(def=>{
          const td = document.createElement('td');
          let cls='cell-1x'; let text='1x';
          if(TYPE_CHART[attack] && TYPE_CHART[attack].strongAgainst.includes(def)){ cls='cell-2x'; text='2x'; }
          else if(TYPE_CHART[attack] && TYPE_CHART[attack].weakAgainst.includes(def)){ cls='cell-05x'; text='0.5x'; }
          td.className = cls; td.textContent = text; tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    } else if(useCards){
      const grid = document.createElement('div'); grid.className = 'type-grid';
      TYPE_LIST.forEach(attack=>{
        const card = document.createElement('div'); card.className='type-card';
        const h = document.createElement('div'); h.className='type-card-title'; h.textContent = attack; card.appendChild(h);
        const beats = document.createElement('div'); beats.className='type-card-beats'; beats.innerHTML = '<strong>Super efectivo contra:</strong> ' + (TYPE_CHART[attack] && TYPE_CHART[attack].strongAgainst.length ? TYPE_CHART[attack].strongAgainst.join(', ') : '—');
        const weak = document.createElement('div'); weak.className='type-card-weak'; weak.innerHTML = '<strong>Débil frente a:</strong> ' + (TYPE_CHART[attack] && TYPE_CHART[attack].weakAgainst.length ? TYPE_CHART[attack].weakAgainst.join(', ') : '—');
        card.appendChild(beats); card.appendChild(weak);
        grid.appendChild(card);
      });
      container.appendChild(grid);
    }
    // legend
    const legend = document.createElement('div'); legend.className='type-legend';
    const s1 = document.createElement('div'); s1.className='type-swatch cell-2x'; s1.textContent='2x — Super efectivo';
    const s2 = document.createElement('div'); s2.className='type-swatch cell-05x'; s2.textContent='0.5x — Poco efectivo';
    const s3 = document.createElement('div'); s3.className='type-swatch cell-1x'; s3.textContent='1x — Normal';
    legend.appendChild(s1); legend.appendChild(s2); legend.appendChild(s3);
    container.appendChild(legend);
  }

  // Toggle type guide button
  const toggleBtn = document.getElementById('toggleTypeGuide');
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      const el = document.getElementById('typeGuide');
      if(!el) return;
      if(el.style.display === 'none' || el.style.display === ''){ el.style.display = 'block'; renderTypeGuide(); toggleBtn.classList.add('active'); }
      else { el.style.display = 'none'; toggleBtn.classList.remove('active'); }
    });
  }

  // Quiz
  let quizQuestions = [];
  let quizPos = 0;
  let quizScore = 0;
  // Build quiz from QUESTIONS (from questions.js) or fallback to POKEMON
  async function makeQuiz(n=10){
    if(selectedQuizLevel === 'table'){
      return makeTypeQuiz(n);
    }
    const bank = (typeof QUESTIONS !== 'undefined' && Array.isArray(QUESTIONS) && QUESTIONS.length>0)
      ? QUESTIONS.map(q=>({ id: q.id, name: q.name, slug: q.slug }))
      : POKEMON.map(p=>({ id: p.id, name: p.name }));
    const questions = [];
    for(let i=0;i<n;i++){
      const idx = Math.floor(Math.random()*bank.length);
      const correct = bank[idx];
      // fetch real data for correct using the numeric Pokédex id when available
      // Prefer an explicit slug in QUESTIONS for exact-form sprites (e.g. 'raichu-alola')
      const identifier = (correct && correct.slug) ? correct.slug : ((typeof correct.id !== 'undefined') ? correct.id : correct.name);
      const correctData = await getPokemonData(identifier);
      // select other choices (filter by different id)
      const others = bank.filter(p=>p.id !== correct.id);
      const choices = [correctData];
      // Prefer choices that have known types
      let attempts = 0;
      while(choices.length<4 && others.length && attempts < 30){
        attempts++;
        const j = Math.floor(Math.random()*others.length);
        const pick = others.splice(j,1)[0];
        const pickIdentifier = (pick && pick.slug) ? pick.slug : ((typeof pick.id !== 'undefined') ? pick.id : pick.name);
        const pickData = await getPokemonData(pickIdentifier);
        if(pickData.types && pickData.types !== 'Unknown') choices.push(pickData);
        else {
          // keep as fallback but try to fill up choices with known types
          if(choices.length + others.length + 1 <= 4) choices.push(pickData);
        }
      }
      // If still not enough choices, allow unknowns
      if(choices.length < 4){
        const rem = bank.filter(p=>!choices.find(c=>c.name===p.name));
        while(choices.length<4 && rem.length){
          const r = rem.splice(0,1)[0];
          const rId = (r && r.slug) ? r.slug : ((typeof r.id !== 'undefined') ? r.id : r.name);
          const rd = await getPokemonData(rId);
          choices.push(rd);
        }
      }
      // shuffle
      for(let k=choices.length-1;k>0;k--){ const r=Math.floor(Math.random()*(k+1)); [choices[k],choices[r]]=[choices[r],choices[k]] }
      // Ensure choices are unique by types (avoid duplicate answers)
      const COMMON_TYPES = ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
      const seen = new Set();
      const uniqueChoices = [];
      // keep correct first
      if(correctData.types && !seen.has(correctData.types)){ seen.add(correctData.types); uniqueChoices.push(correctData.types); }
      // add from generated choices
      for(const c of choices){ if(uniqueChoices.length>=4) break; if(c.types && !seen.has(c.types)){ seen.add(c.types); uniqueChoices.push(c.types); } }
      // try remaining bank to find other types
      if(uniqueChoices.length < 4){
        const rem = bank.filter(p=>p.id !== correct.id);
        for(const r of rem){ if(uniqueChoices.length>=4) break; const rId = (typeof r.id !== 'undefined') ? r.id : r.name; const rd = await getPokemonData(rId); if(rd.types && !seen.has(rd.types)){ seen.add(rd.types); uniqueChoices.push(rd.types); } }
      }
      // fallback to common types list
      for(const t of COMMON_TYPES){ if(uniqueChoices.length>=4) break; if(!seen.has(t)) { seen.add(t); uniqueChoices.push(t); } }

      // Shuffle answer choices so the correct one is not always first
      for(let k = uniqueChoices.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [uniqueChoices[k], uniqueChoices[r]] = [uniqueChoices[r], uniqueChoices[k]];
      }
      // Use the display name from the QUESTIONS bank when available
      const displayName = (correct && correct.name) ? correct.name : correctData.name;
      questions.push({
        q: `¿Cuál es el tipo de ${displayName}?`,
        correct: correctData.types,
        choices: uniqueChoices.slice(0,4),
        pokemon: { name: displayName, sprite: correctData.sprite }
      });
    }
    return questions;
  }

  function renderQuizQuestion(){
    const q = quizQuestions[quizPos];
    const area = $('questionArea');
    // Quiz finished -> show results modal
    if(!q){
      if(quizQuestions.length > 0 && quizPos >= quizQuestions.length){
        showResults();
        return;
      }
      area.innerHTML = '<div class="quiz-card"><div class="quiz-question">No hay preguntas.</div></div>'; return;
    }
    // header / progress
    area.innerHTML = '';
    const card = document.createElement('div'); card.className='quiz-card';
    const header = document.createElement('div'); header.className='quiz-header';
    const label = document.createElement('div'); label.textContent = `Pregunta ${quizPos+1} / ${quizQuestions.length}`;
    const prog = document.createElement('div'); prog.className='quiz-progress'; prog.innerHTML = '<i></i>';
    header.appendChild(label); header.appendChild(prog);
    card.appendChild(header);

    // sprite + question
    const sprite = document.createElement('div'); sprite.className='quiz-sprite';
    if(q.pokemon && q.pokemon.sprite){ sprite.innerHTML = `<img src="${q.pokemon.sprite}" alt="${q.pokemon.name}"/>`; }
    else if(q.typeMode === 'table'){ sprite.innerHTML = `<div class="type-chip">${q.baseType}</div>`; }
    else sprite.textContent = q.pokemon ? q.pokemon.name.charAt(0) : '?';
    const question = document.createElement('div'); question.className='quiz-question'; question.textContent = q.q;
    card.appendChild(sprite); card.appendChild(question);

    const ch = document.createElement('div'); ch.id = 'choices'; ch.className='choices';
    card.appendChild(ch);
    area.appendChild(card);

    // update progress bar
    const pct = Math.round((quizPos/quizQuestions.length)*100);
    prog.firstElementChild.style.width = pct + '%';

    q.choices.forEach((c, i)=>{
      const d = document.createElement('div'); d.className='choice'; d.textContent = c;
      d.onclick = ()=>{
        if(d.classList.contains('answered')) return;
        d.classList.add('answered');
        const fb = $('feedback');
        if(c === q.correct){ d.classList.add('correct'); quizScore++; fb.textContent = '¡Correcto!'; fb.className='feedback ok'; }
        else { d.classList.add('wrong'); fb.textContent = `Incorrecto — la respuesta correcta es: ${q.correct}`; fb.className='feedback bad'; }
        fb.style.display = 'block';
        // reveal correct
        Array.from(ch.children).forEach(node=>{ if(node.textContent===q.correct) node.classList.add('correct'); node.style.pointerEvents='none'; });
        quizPos++;
        updateScore();
        setTimeout(()=>{ fb.style.display='none'; renderQuizQuestion(); }, 1100);
      };
      ch.appendChild(d);
    });
  }

  function updateScore(){ $('score').textContent = `Puntuación: ${quizScore}/${quizQuestions.length}` }
  $('startQuiz').addEventListener('click', async ()=>{
    const btn = $('startQuiz');
    const count = quizLevelSizes[selectedQuizLevel] || 10;
    btn.disabled = true; btn.textContent = 'Generando preguntas...';
    try{
      quizQuestions = await makeQuiz(count);
      quizPos=0; quizScore=0; renderQuizQuestion(); updateScore();
    }catch(err){
      console.error('Error generando quiz', err);
      alert('No se pudieron generar las preguntas. Intenta recargar la página.');
      quizQuestions = [];
    }finally{
      btn.disabled = false; btn.textContent = `Iniciar Quiz (${count})`;
    }
  });

  // Results modal handlers
  function showResults(){
    const modal = document.getElementById('resultsModal');
    const summary = document.getElementById('resultsSummary');
    const title = document.getElementById('resultsTitle');
    const total = quizQuestions.length || 0;
    const pct = total? Math.round((quizScore/total)*100) : 0;
    title.textContent = 'Resultados';
    summary.innerHTML = `<div>Has obtenido <strong>${quizScore}</strong> de <strong>${total}</strong> respuestas correctas.</div><div style="margin-top:6px;color:var(--muted)">Porcentaje: <strong>${pct}%</strong></div>`;
    // update stats
    STATS.totalQuizzes = (STATS.totalQuizzes||0) + 1;
    STATS.totalCorrect = (STATS.totalCorrect||0) + (quizScore||0);
    STATS.lastQuizSize = total || STATS.lastQuizSize || 0;
    saveStats(); renderStats();
    modal.style.display = 'flex';
    // focus first button
    const repeat = document.getElementById('repeatQuizBtn'); if(repeat) repeat.focus();
  }

  function hideResults(){ const modal = document.getElementById('resultsModal'); if(modal) modal.style.display = 'none'; }

  document.getElementById('repeatQuizBtn').addEventListener('click', async ()=>{
    hideResults();
    const count = quizLevelSizes[selectedQuizLevel] || 10;
    const btn = $('startQuiz'); btn.disabled = true; btn.textContent = 'Generando preguntas...';
    try{ quizQuestions = await makeQuiz(count); quizPos=0; quizScore=0; renderQuizQuestion(); updateScore(); }
    finally{ btn.disabled=false; btn.textContent = `Iniciar Quiz (${count})`; }
  });

  document.getElementById('chooseLevelBtn').addEventListener('click', ()=>{
    hideResults();
    // make sure quiz view is visible and user can pick a level
    $('trainMode').value = 'quiz'; $('trainMode').dispatchEvent(new Event('change'));
    // scroll to quiz settings
    document.querySelector('.training-section').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('closeResultsBtn').addEventListener('click', ()=>{ hideResults(); });

  // Start modal wiring
  const startModal = document.querySelector('.start-modal');
  document.querySelectorAll('.start-btn').forEach(btn => {
    btn.addEventListener('click', e=>{
      const mode = btn.dataset.mode;
      // Show only the selected mode's sections
      const teamSections = document.querySelectorAll('.team-section');
      const trainSections = document.querySelectorAll('.training-section');
      if(mode === 'quiz' || mode === 'flash'){
        trainSections.forEach(s=>s.style.display='block');
        teamSections.forEach(s=>s.style.display='none');
        $('trainMode').value = (mode === 'quiz') ? 'quiz' : 'flash';
        $('trainMode').dispatchEvent(new Event('change'));
      } else if(mode === 'team'){
        trainSections.forEach(s=>s.style.display='none');
        teamSections.forEach(s=>s.style.display='block');
      }
      // hide modal and scroll
      if(startModal) startModal.style.display='none';
      document.querySelector('main').scrollIntoView({ behavior: 'smooth' });
    });
  });
  

});
