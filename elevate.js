// ===== Gym Otak: mode ala Elevate (game banyak, level per game, skor kemampuan, latihan harian) =====
(()=>{
const SKILLS=[
 {id:'fokus',ic:'🎯',name:'Fokus'},{id:'memori',ic:'🧠',name:'Memori'},{id:'kecepatan',ic:'⚡',name:'Kecepatan'},
 {id:'hitung',ic:'➗',name:'Hitung'},{id:'membaca',ic:'📖',name:'Membaca'},{id:'menulis',ic:'✍️',name:'Menulis'},{id:'bicara',ic:'🗣️',name:'Bicara'}];
const SK={stroop:'fokus',gonogo:'fokus',bosan:'fokus',digit:'memori',baca:'membaca'};
EX.forEach(e=>{if(SK[e.id])e.skill=SK[e.id]});
const ri=(a,b)=>a+rnd(b-a+1);
const shuf=a=>[...a].sort(()=>Math.random()-.5);

// ---------- level per game, skor (EPQ), pencapaian ----------
const gpOf=()=>db.gp||(db.gp={});
const MAXL=20;
// Level 1-10: tiap 2 kemenangan (>=2 bintang); level 11-20: tiap 3 kemenangan
const glReal=id=>{const n=gpOf()[id]||0;return Math.min(MAXL,n<18?1+Math.floor(n/2):10+Math.floor((n-18)/3))};
// level yang dipakai main: pilihan manual (db.pick) atau otomatis sesuai progres
const gl=id=>{const p=(db.pick||{})[id];return p?Math.min(MAXL,Math.max(1,p)):glReal(id)};
function perfOf(e,r){
  if(e.id==='bosan')return Math.min(100,Math.round(r.score/Math.max(1,r.target||60)*100));
  const g=e.stars?e.stars[2]:100;return Math.min(100,Math.round(r.score/g*100));
}
const gamesOf=sk=>sk==='bicara'?['talk']:EX.filter(e=>e.skill===sk).map(e=>e.id);
function epq(sk){
  const P=db.perf||{};let a=[];gamesOf(sk).forEach(id=>(P[id]||[]).forEach(x=>a.push(x)));
  if(!a.length)return null;a.sort((x,y)=>x.t-y.t);a=a.slice(-6);
  const p=a.reduce((s,x)=>s+x.p,0)/a.length,l=a.reduce((s,x)=>s+x.l,0)/a.length;
  const le=l<=10?l:10+(l-10)/4;
  return Math.min(1000,Math.round(p*10*(0.6+0.04*le)));
}
const tier=e=>e<300?'Pemula':e<500?'Berkembang':e<700?'Mahir':e<850?'Ahli':'Master';
function overall(){const v=SKILLS.map(s=>epq(s.id)).filter(x=>x!=null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null}
const ACH=[
 ['🎮','Game pertama',()=>(db.plays||0)>=1],['🔟','10 game',()=>(db.plays||0)>=10],['💯','50 game',()=>(db.plays||0)>=50],
 ['🔥','Streak 3 hari',()=>streak()>=3],['🌟','Streak 7 hari',()=>streak()>=7],
 ['🧩','Coba 7 game berbeda',()=>Object.keys(db.perf||{}).filter(k=>k!=='talk').length>=7],['🏅','Coba semua game',()=>EX.every(e=>(db.perf||{})[e.id])],
 ['🥇','3 bintang pertama',()=>(db.s3||0)>=1],['⬆️','Game Level 5',()=>EX.some(e=>gl(e.id)>=5)],['🚀','Game Level 10',()=>EX.some(e=>gl(e.id)>=10)],
 ['💎','Game Level 15',()=>EX.some(e=>gl(e.id)>=15)],['🏆','Game Level 20 (MAX)',()=>EX.some(e=>gl(e.id)>=MAXL)],['🎓','Semua game Level 5',()=>EX.every(e=>gl(e.id)>=5)],
 ['👑','Skor Ahli (EPQ 700+)',()=>SKILLS.some(s=>(epq(s.id)||0)>=700)],['🗣️','Sesi bicara pertama',()=>((db.talk||{}).hist||[]).length>=1]];
function checkAch(){db.ach=db.ach||[];const n=ACH.filter(a=>a[2]()&&!db.ach.includes(a[1]));n.forEach(a=>db.ach.push(a[1]));if(n.length)setTimeout(()=>toast('🏅 Pencapaian baru: '+n.map(a=>a[0]+' '+a[1]).join(', '),3500),900);}
function afterGame(e,r){
  const played=gl(e.id),before=glReal(e.id);if(r.stars>=2)gpOf()[e.id]=(gpOf()[e.id]||0)+1;
  db.perf=db.perf||{};const a=db.perf[e.id]=db.perf[e.id]||[];a.push({p:perfOf(e,r),l:played,t:Date.now()});if(a.length>10)a.shift();
  db.plays=(db.plays||0)+1;if(r.stars===3)db.s3=(db.s3||0)+1;
  const after=glReal(e.id);if(after>before)r.gUp=`⬆️ ${e.name} Level ${after}`;
  save();checkAch();
}
function afterTalk(r,lvl){
  db.perf=db.perf||{};const a=db.perf.talk=db.perf.talk||[];a.push({p:Math.round(r*33.3),l:Math.min(10,Math.max(1,Math.round(lvl/2.1))),t:Date.now()});if(a.length>10)a.shift();save();checkAch();
}

// ---------- engine kuis cepat ----------
async function quiz(gen,hint){
  let ok=0,bad=0,combo=0,maxC=0,cur;
  stage().innerHTML=`<div class="combo" id="cb"></div><div id="qp"></div><div id="qo"></div><p class="mut center">${hint} · <span id="sc">0</span> benar</p>`;
  const next=()=>{cur=gen();$('qp').innerHTML=cur.p;const o=$('qo');o.className=cur.cols===3?'g3':cur.cols===1?'':'g2';
    o.innerHTML=cur.o.map((x,i)=>`<button class="key" data-i="${i}" ${TEST?`data-ok="${x.ok?1:0}"`:''} style="${cur.btn||''}${cur.cols===1?';margin-bottom:8px;font-size:20px':''}">${x.t}</button>`).join('')};
  $('qo').onclick=ev=>{const b=ev.target.closest('button');if(!b||!cur)return;const r=b.getBoundingClientRect();
    if(cur.o[+b.dataset.i].ok){ok++;combo++;maxC=Math.max(maxC,combo);sfx.good();vib(15);floatAt(r.left+r.width/2,r.top,'+1','#4ade80');flash(true)}
    else{bad++;combo=0;sfx.bad();vib(60);floatAt(r.left+r.width/2,r.top,'✗','#f87171');flash(false)}
    $('sc').textContent=ok;const cb=$('cb');cb.textContent=combo>=3?`🔥 x${combo}`:'';cb.classList.remove('bump');void cb.offsetWidth;cb.classList.add('bump');next()};
  next();await runTimer(T(45));
  return {score:Math.max(0,ok-bad),note:`${ok} benar, ${bad} salah · combo terpanjang ${maxC}`};
}
const big=t=>`<div class="word" style="font-size:44px">${t}</div>`;

// 1. Hitung Kilat
function genMath(L){
  let a,b,op,ans;
  if(L<=2){op=['+','-'][rnd(2)];a=ri(2,12);b=ri(1,10);if(op==='-'&&b>a)[a,b]=[b,a]}
  else if(L<=4){op=['+','-'][rnd(2)];a=ri(12,60);b=ri(8,40);if(op==='-'&&b>a)[a,b]=[b,a]}
  else if(L<=6){op=['×','+','-'][rnd(3)];if(op==='×'){a=ri(2,9);b=ri(2,9)}else{a=ri(30,99);b=ri(12,70);if(op==='-'&&b>a)[a,b]=[b,a]}}
  else if(L<=8){op=['×','×','+','-'][rnd(4)];if(op==='×'){a=ri(6,12);b=ri(6,15)}else{a=ri(100,399);b=ri(40,250);if(op==='-'&&b>a)[a,b]=[b,a]}}
  else if(L<=10){op=['×','÷','+','-'][rnd(4)];if(op==='×'){a=ri(11,25);b=ri(6,19)}else if(op==='÷'){b=ri(4,15);ans=ri(6,25);a=b*ans}else{a=ri(250,999);b=ri(120,700);if(op==='-'&&b>a)[a,b]=[b,a]}}
  else{ // level 11-20: soal dua langkah
    let txt;
    if(L<=14){const x=ri(3,12),y=ri(3,12),z=ri(10,99);if(rnd(2)){ans=x*y+z;txt=`${x} × ${y} + ${z}`}else{const zz=Math.min(z,x*y-1);ans=x*y-zz;txt=`${x} × ${y} − ${zz}`}}
    else if(L<=17){const x=ri(5,30),y=ri(5,30),z=ri(3,12);ans=(x+y)*z;txt=`(${x} + ${y}) × ${z}`}
    else{const m=rnd(3);
      if(m===0){const x=ri(12,30),y=ri(6,19),z=ri(11,25),w=ri(4,15);ans=x*y+z*w;txt=`${x} × ${y} + ${z} × ${w}`}
      else if(m===1){const d=ri(6,15),q=ri(12,40),z=ri(20,99);ans=q+z;txt=`${d*q} ÷ ${d} + ${z}`}
      else{const x=ri(15,40),y=ri(15,40),z=ri(3,9);ans=Math.abs(x-y)*z;txt=`|${x} − ${y}| × ${z}`}}
    const set=new Set([ans]);let g=0;while(set.size<4&&g++<80){const d=[1,-1,2,-2,10,-10,5,-5,20,-20,11,-11][rnd(12)];if(ans+d>=0)set.add(ans+d)}let k=1;while(set.size<4)set.add(ans+100+k++);
    return {p:big(`${txt} = ?`),o:shuf([...set]).map(v=>({t:v,ok:v===ans}))};
  }
  if(ans==null)ans=op==='+'?a+b:op==='-'?a-b:a*b;
  const set=new Set([ans]);let guard=0;
  while(set.size<4&&guard++<60){const d=[1,-1,2,-2,10,-10,3,-3,5,-5][rnd(10)];const v=ans+d;if(v>=0)set.add(v)}
  let k=1;while(set.size<4)set.add(ans+100+k++);
  return {p:big(`${a} ${op} ${b} = ?`),o:shuf([...set]).map(v=>({t:v,ok:v===ans}))};
}
async function hitung(){const L=gl('hitung');return quiz(()=>genMath(L),'Tap jawaban benar')}

// 2. Mana Lebih Besar
function genBig(L){
  let A,B,va,vb;
  if(L<=2){va=ri(1,99);do{vb=ri(1,99)}while(vb===va);A=va;B=vb}
  else if(L<=5){va=ri(100,999);do{vb=va+ri(-40,40)}while(vb===va||vb<100);A=va;B=vb}
  else if(L<=8){const x=ri(3,12),y=ri(3,12);va=x*y;do{vb=va+ri(-9,9)}while(vb===va||vb<1);A=`${x} × ${y}`;B=vb;if(Math.random()<.5)[A,B,va,vb]=[B,A,vb,va]}
  else if(L<=10){let p,q,r2,s;do{q=ri(3,9);p=ri(1,q-1);s=ri(3,9);r2=ri(1,s-1);va=p/q;vb=r2/s}while(Math.abs(va-vb)<.001||Math.abs(va-vb)>.2);A=`${p}/${q}`;B=`${r2}/${s}`}
  else if(L<=14){ // dua perkalian yang selisihnya tipis
    let x,y,z,w;do{x=ri(6,19);y=ri(6,19);z=ri(6,19);w=ri(6,19);va=x*y;vb=z*w}while(Math.abs(va-vb)<1||Math.abs(va-vb)>12);
    A=`${x} × ${y}`;B=`${z} × ${w}`;if(Math.random()<.5)[A,B,va,vb]=[B,A,vb,va]}
  else if(L<=17){ // pecahan vs desimal
    let p,q;do{q=ri(3,12);p=ri(1,q-1);va=p/q;vb=Math.round(va*100+ri(-8,8))/100}while(Math.abs(va-vb)<.004||vb<=0||vb>=1);
    A=`${p}/${q}`;B=String(vb).replace('.',',');if(Math.random()<.5)[A,B,va,vb]=[B,A,vb,va]}
  else{ // pecahan dengan selisih sangat tipis
    let p,q,r2,s;do{q=ri(5,16);p=ri(2,q-1);s=ri(5,16);r2=ri(2,s-1);va=p/q;vb=r2/s}while(q===s||Math.abs(va-vb)<.002||Math.abs(va-vb)>.05);A=`${p}/${q}`;B=`${r2}/${s}`}
  return {p:`<p class="mut center">Mana yang <b>LEBIH BESAR</b>?</p>`,o:[{t:A,ok:va>vb},{t:B,ok:vb>va}],btn:'font-size:30px;padding:34px 6px'};
}
async function besar(){const L=gl('besar');return quiz(()=>genBig(L),'Tap yang lebih besar')}

// 3. Kata Sama Arti
const SYN=[['cantik','elok',['kotor','sempit']],['pintar','cerdas',['malas','lemah']],['rajin','giat',['lambat','sombong']],['takut','gentar',['berani','senang']],
 ['marah','murka',['ramah','tenang']],['bohong','dusta',['jujur','benar']],['sedih','pilu',['riang','gembira']],['kuat','perkasa',['lemah','rapuh']],
 ['hening','sunyi',['gaduh','ramai']],['pelit','kikir',['dermawan','boros']],['jelas','gamblang',['kabur','rumit']],['percaya','yakin',['ragu','curiga']],
 ['bingung','bimbang',['paham','yakin']],['teliti','cermat',['ceroboh','santai']],['sabar','tabah',['gegabah','murka']],['ahli','pakar',['pemula','murid']],
 ['indah','permai',['buruk','kumuh']],['hebat','dahsyat',['biasa','lesu']],['tinggi','jangkung',['pendek','sempit']],['rumah','kediaman',['kantor','toko']],
 ['mula','awal',['akhir','tengah']],['musnah','lenyap',['muncul','tumbuh']],['lugas','terus terang',['berbelit','ragu']],['mutakhir','terbaru',['kuno','lampau']],
 ['senang','gembira',['murung','jemu']],['cepat','laju',['pelan','santai']],['besar','raya',['kecil','sedikit']],['miskin','papa',['kaya','mewah']],
 ['sombong','angkuh',['rendah hati','ramah']],['bagus','apik',['jelek','kasar']],['pandai','mahir',['bodoh','lalai']],['luas','lapang',['sempit','padat']],
 ['lelah','penat',['segar','bugar']],['mustahil','tidak mungkin',['pasti','lumrah']],['gigih','tekun',['malas','lengah']],['bijak','arif',['bebal','nekat']],
 ['membantah','menyanggah',['menyetujui','menurut']],['menolong','membantu',['merintangi','mengabaikan']],['kokoh','teguh',['goyah','longgar']],['aman','selamat',['terancam','genting']],
 ['hemat','irit',['royal','berlebihan']],['asli','murni',['tiruan','palsu']],['nyata','konkret',['abstrak','khayal']],['wajar','lazim',['ganjil','aneh']],
 ['lamban','lambat',['gesit','sigap']],['fasih','lancar',['terbata','kaku']],['dermawan','murah hati',['kikir','tamak']],['rancu','kacau',['teratur','jelas']],
 ['sukses','berhasil',['gagal','tertunda']],['gundah','resah',['tenteram','lega']],['tangguh','ulet',['rapuh','manja']],['lengkap','paripurna',['kurang','cacat']]];
async function sinonim(){
  const L=gl('sinonim'),pool=SYN.slice(0,Math.min(SYN.length,10+L*2));
  return quiz(()=>{const [w,s,d]=pool[rnd(pool.length)];return {p:`<p class="mut center">Persamaan kata dari:</p>${big(w)}`,o:shuf([{t:s,ok:true},{t:d[0],ok:false},{t:d[1],ok:false}]),cols:1}},'Pilih kata yang sama arti');
}

// 4. Ejaan Benar
const EJA=[['apotek','apotik'],['atlet','atlit'],['izin','ijin'],['risiko','resiko'],['objek','obyek'],['sistem','sistim'],['teknik','tehnik'],['silakan','silahkan'],
 ['nasihat','nasehat'],['kualitas','kwalitas'],['praktik','praktek'],['antre','antri'],['telepon','telpon'],['standar','standard'],['frekuensi','frekwensi'],
 ['hakikat','hakekat'],['subjek','subyek'],['hierarki','hirarki'],['jenazah','jenasah'],['kuitansi','kwitansi'],['azan','adzan'],['aktivitas','aktifitas'],['konsekuen','konsekwen'],['sah','syah'],
 ['analisis','analisa'],['andal','handal'],['asas','azas'],['cenderamata','cinderamata'],['detail','detil'],['ekstrem','ekstrim'],['familier','familiar'],['gizi','gisi'],
 ['jadwal','jadual'],['kaidah','kaedah'],['lembap','lembab'],['metode','metoda'],['napas','nafas'],['nuklir','nuklear'],['objektif','obyektif'],['paham','faham'],
 ['persen','prosen'],['pikir','fikir'],['sekadar','sekedar'],['rezeki','rejeki'],['tahu','tau'],
 ['teknologi','tehnologi'],['zaman','jaman'],['mengubah','merubah'],['memengaruhi','mempengaruhi'],['mencolok','menyolok']];
async function ejaan(){
  const L=gl('ejaan'),pool=EJA.slice(0,L<=3?10:L<=6?18:L<=10?30:EJA.length);
  return quiz(()=>{const [b,s]=pool[rnd(pool.length)];return {p:`<p class="mut center">Mana ejaan yang <b>BENAR</b>?</p><div style="height:30px"></div>`,o:shuf([{t:b,ok:true},{t:s,ok:false}]),btn:'font-size:24px;padding:28px 6px'}},'Pilih ejaan baku');
}

// 5. Pola Angka
function genPola(L){
  const T=L<=3?[0]:L<=5?[0,1,2]:L<=7?[1,2,3,4]:L<=10?[2,3,4,5]:L<=14?[3,4,5,6,7]:[5,6,7,8,9],t=T[rnd(T.length)];let s=[];
  if(t===0){const a=ri(1,20),d=ri(2,9);s=[0,1,2,3,4].map(i=>a+i*d)}
  else if(t===1){const a=ri(1,4),r=ri(2,3);s=[0,1,2,3,4].map(i=>a*r**i)}
  else if(t===2){const a=ri(1,10),x=ri(2,6),y=ri(2,9);s=[a];for(let i=0;i<4;i++)s.push(s[i]+(i%2?y:x))}
  else if(t===3){const n=ri(1,6);s=[0,1,2,3,4].map(i=>(n+i)**2)}
  else{const a=ri(1,10);s=[a];for(let i=1;i<5;i++)s.push(s[i-1]+i)}
  if(t===5){const x=ri(1,5),y=ri(1,5);s=[x,y];for(let i=2;i<5;i++)s.push(s[i-1]+s[i-2])}
  else if(t===6){const a=ri(3,6),m=ri(2,3),c=ri(1,4)*(rnd(2)?1:-1);s=[a];for(let i=1;i<5;i++)s.push(s[i-1]*m+c)} // kali lalu tambah/kurang
  else if(t===7){const a=ri(1,12),b=ri(20,40),x=ri(2,6),y=ri(2,6);s=[a,b,a+x,b+y,a+2*x]} // dua deret berselang-seling
  else if(t===8){const n=ri(1,4);s=[0,1,2,3,4].map(i=>(n+i)**3)} // pangkat tiga
  else if(t===9){const a=ri(1,5),d=ri(2,4),e=ri(1,3);s=[a];let step=d;for(let i=1;i<5;i++){s.push(s[i-1]+step);step+=e}} // selisihnya ikut naik
  const ans=s[4],set=new Set([ans]);let g=0;while(set.size<4&&g++<60){const v=ans+[1,-1,2,-2,3,-3,4,-4,5,-5,10][rnd(11)];if(v>0)set.add(v)}let k=1;while(set.size<4)set.add(ans+50+k++);
  return {p:`<p class="mut center">Angka berikutnya?</p>${big(s.slice(0,4).join(' , ')+' , ?')}`,o:shuf([...set]).map(v=>({t:v,ok:v===ans}))};
}
async function pola(){const L=gl('pola');return quiz(()=>genPola(L),'Temukan polanya')}

// 6. Cari Ganjil
const GAN=[['🙂','🙃'],['😀','😃'],['🕐','🕑'],['🐶','🐕'],['💙','💜'],['🍎','🍅'],['🔺','🔻'],['🌕','🌖'],['🟦','🟪'],['🔵','🟣']];
const GAN2=[['🕐','🕜'],['😊','☺️'],['🌖','🌗'],['🔶','🔸'],['🟥','🟧'],['🐱','🐈'],['💚','💛'],['🌑','🌚'],['🔷','🔹'],['⬛','◼️']]; // pasangan makin mirip (level 11+)
async function ganjil(){
  const L=gl('ganjil'),n=Math.min(8,3+Math.floor((L-1)/2)),GP=L>=11?GAN.concat(GAN2):GAN;let ok=0,bad=0,combo=0,maxC=0;
  stage().innerHTML=`<div class="combo" id="cb"></div><p class="mut center">Tap emoji yang <b>berbeda</b> · <span id="sc">0</span> benar</p><div id="gg" class="g3" style="max-width:360px;margin:8px auto"></div>`;
  const next=()=>{const [a,b]=GP[rnd(GP.length)],sw=Math.random()<.5,odd=rnd(n*n),g=$('gg');g.style.gridTemplateColumns=`repeat(${n},1fr)`;
    g.innerHTML=Array.from({length:n*n},(_,i)=>`<button class="key" data-o="${i===odd?1:0}" style="font-size:${n>=7?20:n>=5?26:34}px;padding:${n>=7?3:n>=5?6:12}px 0">${(i===odd)!==sw?b:a}</button>`).join('')};
  $('gg').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const r=b.getBoundingClientRect();
    if(b.dataset.o==='1'){ok++;combo++;maxC=Math.max(maxC,combo);sfx.good();vib(15);floatAt(r.left+r.width/2,r.top,'+1','#4ade80');flash(true)}
    else{bad++;combo=0;sfx.bad();vib(60);floatAt(r.left+r.width/2,r.top,'✗','#f87171');flash(false)}
    $('sc').textContent=ok;const cb=$('cb');cb.textContent=combo>=3?`🔥 x${combo}`:'';next()};
  next();await runTimer(T(45));
  return {score:Math.max(0,ok-bad),note:`${ok} benar, ${bad} salah · kotak ${n}×${n}`};
}

// 7. Ingat Pola (urutan posisi)
async function posisi(){
  const L=gl('posisi'),n=L<=5?3:L<=12?4:5;let len=2+Math.ceil(L/3),best=0,strikes=0;hideTimer();
  while(strikes<2&&!abort){
    const seq=Array.from({length:len},()=>rnd(n*n));window.__pseq=seq;
    stage().innerHTML=`<p class="mut center" id="pm">Perhatikan urutannya · nyawa ${'❤️'.repeat(2-strikes)}${'🤍'.repeat(strikes)}</p><div class="g3" id="pg" style="grid-template-columns:repeat(${n},1fr);max-width:340px;margin:12px auto">${Array.from({length:n*n},(_,i)=>`<button class="key" data-i="${i}" style="height:${n===3?90:n===4?72:58}px;padding:0"></button>`).join('')}</div>`;
    const cells=[...$('pg').children];await sleep(TEST?80:700);
    for(const i of seq){if(abort)return{score:best};cells[i].style.background='var(--acc)';tone(300+i*40,.2);await sleep(TEST?80:450);cells[i].style.background='';await sleep(TEST?40:200)}
    $('pm').textContent='Giliranmu! Tap sesuai urutan';
    const okk=await new Promise(res=>{let k=0;$('pg').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;const i=+b.dataset.i;
      b.style.background=i===seq[k]?'var(--ok)':'var(--bad)';setTimeout(()=>b.style.background='',180);
      if(i!==seq[k]){$('pg').onclick=null;return res(false)}k++;sfx.tick();vib(10);if(k===seq.length){$('pg').onclick=null;res(true)}}});
    if(abort)return{score:best};
    if(okk){best=Math.max(best,len);len++;sfx.good();vib(20);stage().innerHTML='<div class="bigic center">✅</div><div class="big" style="color:var(--ok)">Benar!</div>'}
    else{strikes++;sfx.bad();vib(80);stage().innerHTML='<div class="bigic center">😅</div><p class="mut center">Hampir! Coba lagi</p>'}
    await sleep(TEST?100:900);
  }
  return {score:best,note:'Urutan terpanjang yang kamu ingat'};
}

// 8. Ingat Kartu
async function kartu(){
  const L=gl('kartu'),np=Math.min(12,3+Math.floor(L/2)),fs=np>8?28:34,pd=np>8?11:18;
  const EM=['🍎','🚗','🐶','⭐','🎈','🌵','🍕','🎧','🐱','🌈','⚽','🍩'];
  const pk=pick(EM,np),deck=pick([...pk,...pk],np*2);window.__deck=deck;
  hideTimer();let open=[],lock=false,matched=0,bad=0;const t0=Date.now();
  stage().innerHTML=`<p class="mut center">Cari ${np} pasangan · salah <span id="bd">0</span></p><div class="g3" id="kg" style="grid-template-columns:repeat(4,1fr)">${deck.map((e,i)=>`<button class="key" data-i="${i}" style="font-size:${fs}px;padding:${pd}px 0">❔</button>`).join('')}</div>`;
  await new Promise(res=>{$('kg').onclick=async ev=>{const b=ev.target.closest('button');if(!b||lock||abort)return;const i=+b.dataset.i;if(open.includes(i)||b.dataset.m)return;
    b.textContent=deck[i];b.style.background='var(--card2)';sfx.tick();open.push(i);
    if(open.length===2){lock=true;const [x,y]=open,bx=$('kg').children[x],by=$('kg').children[y];
      if(deck[x]===deck[y]){matched++;bx.dataset.m='1';by.dataset.m='1';bx.style.background='#14532d';by.style.background='#14532d';sfx.good();vib(15);open=[];lock=false;if(matched===np)res()}
      else{bad++;$('bd').textContent=bad;sfx.bad();await sleep(TEST?100:750);if(abort)return;bx.textContent='❔';by.textContent='❔';bx.style.background='';by.style.background='';open=[];lock=false}}}});
  const secs=Math.round((Date.now()-t0)/1000);
  return {score:Math.max(0,100-bad*8-Math.max(0,secs-np*5)),note:`${np} pasangan · ${bad} salah · ${secs} detik`};
}

// 9. Susun Huruf
const WORDLIST=['pembicaraan','pemandangan','kepercayaan','pengetahuan','kemerdekaan','pembangunan','kebahagiaan','penghargaan','perpustakaan','pertandingan','perekonomian','pendidikan','masyarakat','pengalaman','kesempatan','kebersihan','keindahan','pelayanan','buku','roti','kopi','meja','sapu','kaca','baju','topi','gigi','kuda','rumah','kursi','pintu','bunga','mobil','tikus','jalan','kebun','sepatu','kompor','bantal','pensil','dompet','ladang','sekolah','jendela','pelajar','bendera','tetangga','keluarga','pekerjaan','kesehatan','perjalanan'];
async function susun(){
  const L=gl('susun'),target=[4,4,5,5,6,6,7,7,8,9,9,10,10,10,11,11,11,12,12,12][L-1];let ok=0,bad=0,word,tiles,ans;
  let pool=WORDLIST.filter(w=>w.length===target);if(!pool.length)pool=WORDLIST.filter(w=>w.length<=target);
  stage().innerHTML=`<p class="mut center">Susun huruf jadi kata · <span id="sc">0</span> benar</p><div class="disp" id="ans"></div><div id="tiles" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0"></div><button class="ghost small" id="bk" style="margin:0 auto;display:block">⌫ Hapus</button>`;
  const draw=()=>{$('ans').innerHTML=word.split('').map((_,i)=>`<span class="${i===ans.length?'f':''}">${ans[i]!=null?tiles[ans[i]]:''}</span>`).join('');
    $('tiles').innerHTML=tiles.map((c,i)=>`<button class="key" data-i="${i}" ${ans.includes(i)?'disabled':''} style="width:56px;padding:12px 0;${ans.includes(i)?'opacity:.2':''}">${c}</button>`).join('')};
  const next=()=>{word=pick(pool,1)[0];window.__word=word;do{tiles=shuf(word.split(''))}while(tiles.join('')===word);ans=[];draw()};
  $('tiles').onclick=ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;ans.push(+b.dataset.i);sfx.tick();vib(8);draw();
    if(ans.length===word.length){if(ans.map(i=>tiles[i]).join('')===word){ok++;$('sc').textContent=ok;sfx.good();vib(20);flash(true);next()}else{bad++;sfx.bad();vib(60);flash(false);ans=[];draw()}}};
  $('bk').onclick=()=>{ans.pop();draw()};
  next();await runTimer(T(60));
  return {score:ok,note:`${ok} kata benar, ${bad} salah · panjang ${target} huruf`};
}

// ---------- daftarkan game baru ----------
EX.push(
 {id:'hitung',skill:'hitung',ic:'➗',name:'Hitung Kilat',desc:'Jawab hitungan secepatnya',unit:'poin',how:['Muncul soal hitungan.','Tap jawaban yang benar secepat mungkin.','45 detik. Level naik = soal makin sulit.'],demo:'7 × 8 = ? → tap <b>56</b> ✅',stars:[8,14,20]},
 {id:'pola',skill:'hitung',ic:'🔗',name:'Pola Angka',desc:'Tebak angka berikutnya',unit:'poin',how:['Muncul deret angka.','Cari polanya.','Tap angka yang melanjutkan deret.'],demo:'2 , 4 , 6 , 8 , ? → <b>10</b> ✅',stars:[5,9,13]},
 {id:'besar',skill:'kecepatan',ic:'🔢',name:'Mana Lebih Besar',desc:'Pilih yang nilainya lebih besar',unit:'poin',how:['Dua angka muncul.','Tap yang <b>lebih besar</b>.','Level tinggi: perkalian dan pecahan.'],demo:'47 vs 74 → tap <b>74</b> ✅',stars:[12,20,30]},
 {id:'sinonim',skill:'membaca',ic:'📚',name:'Kata Sama Arti',desc:'Pilih persamaan kata',unit:'poin',how:['Muncul sebuah kata.','Pilih kata yang <b>sama artinya</b>.','Makin tinggi level, kata makin jarang.'],demo:'cantik → <b>elok</b> ✅',stars:[8,14,20]},
 {id:'ejaan',skill:'menulis',ic:'✍️',name:'Ejaan Benar',desc:'Pilih ejaan baku yang benar',unit:'poin',how:['Dua ejaan muncul.','Tap yang <b>baku</b> (sesuai KBBI).','Benar +1, salah -1.'],demo:'ijin / <b>izin</b> → tap izin ✅',stars:[8,14,20]},
 {id:'susun',skill:'menulis',ic:'🔤',name:'Susun Huruf',desc:'Susun huruf acak jadi kata',unit:'kata',how:['Huruf muncul acak.','Tap huruf berurutan hingga jadi kata.','60 detik. Level naik = kata makin panjang.'],demo:'u · k · b → <b>buku</b> ✅',stars:[4,7,10]},
 {id:'ganjil',skill:'fokus',ic:'🔍',name:'Cari Ganjil',desc:'Temukan emoji yang berbeda',unit:'poin',how:['Kotak penuh emoji hampir sama.','Tap satu yang <b>berbeda</b>.','Level naik = kotak makin besar.'],demo:'🙂🙂🙃🙂 → tap 🙃 ✅',stars:[8,14,20]},
 {id:'posisi',skill:'memori',ic:'🧩',name:'Ingat Pola',desc:'Ulangi urutan kotak yang menyala',unit:'langkah',how:['Kotak menyala satu-satu.','Hafalkan urutannya.','Tap urutan yang sama. Salah 2× = selesai.'],demo:'▪️→▪️→▪️ lalu ulangi ✅',stars:[4,6,8]},
 {id:'kartu',skill:'memori',ic:'🃏',name:'Ingat Kartu',desc:'Cari pasangan kartu yang sama',unit:'poin',how:['Kartu tertutup semua.','Buka dua kartu, cari yang sama.','Makin sedikit salah dan makin cepat, makin tinggi.'],demo:'🍎 + 🍎 = pasangan ✅',stars:[50,70,90]}
);
Object.assign(GAMES,{hitung,pola,besar,sinonim,ejaan,susun,ganjil,posisi,kartu});

// ---------- latihan harian (3 game, kemampuan terlemah dulu) ----------
function todayWorkout(){
  const k=dayKey();if(db.wk&&db.wk.k===k)return db.wk.ids;
  let seed=[...k].reduce((a,c)=>(a*31+c.charCodeAt(0))&0x7fffffff,7);const rn=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
  const sk=SKILLS.filter(s=>s.id!=='bicara').map(s=>({s,e:epq(s.id)??-1})).sort((a,b)=>a.e-b.e);
  const chosen=[sk[0].s],rest=sk.slice(1).map(x=>x.s);
  while(chosen.length<3){chosen.push(rest.splice(Math.floor(rn()*rest.length),1)[0])}
  const ids=chosen.map(s=>{const g=EX.filter(e=>e.skill===s.id);return g[Math.floor(rn()*g.length)].id});
  db.wk={k,ids};save();return ids;
}

// ---------- tampilan ----------
const skOf=id=>SKILLS.find(s=>s.id===(EX.find(e=>e.id===id)||{}).skill)||{ic:'',name:''};
window.renderHome=function(){
  const t=today(),ids=todayWorkout(),n=ids.filter(i=>t[i]!=null).length,st=streak(),ov=overall();
  $('streakPill').textContent=`🔥 ${st} hari`;
  $('ringTxt').textContent=`${n}/3`;$('ringFg').style.strokeDashoffset=251.3*(1-n/3);
  $('greet').textContent=`${greeting()}${db.name?', '+db.name:''}! 👋`;
  $('greetSub').textContent=n===0?'Latihan hari ini: 3 game pilihan untukmu.':n<3?`Tinggal ${3-n} game lagi 🔥`:'Latihan hari ini tuntas 🎉';
  $('lvFill').style.width=(db.xp%100)+'%';$('lvTxt').textContent=`Level ${level()} · ${db.xp%100}/100 XP`;
  $('btnAll').textContent=n===0?'▶ Mulai Latihan Hari Ini':n<3?`▶ Lanjutkan (${3-n} lagi)`:'🔁 Main lagi';
  $('exList').innerHTML=ids.map(id=>{const e=EX.find(x=>x.id===id),v=t[id],d=v!=null,s=skOf(id);
    return `<div class="card ex ${d?'done':''}" data-ex="${id}"><div class="ic">${d?'✅':e.ic}</div><div class="tt"><b>${e.name}</b><div class="mut">${s.ic} ${s.name} · Level ${gl(id)}</div></div>
      <div class="sc">${d?`${v} ${e.unit}<br><span class="stars">${starStr(db.stars?.[dayKey()]?.[id]??0)}</span>`:'<span style="font-size:22px;color:var(--acc)">▶</span>'}</div></div>`}).join('');
  const ps=SKILLS.map(s=>({s,e:epq(s.id)})).filter(x=>x.e!=null).sort((a,b)=>b.e-a.e);
  $('epqMini').innerHTML=ov==null?`<b>📊 Skor Kemampuan (EPQ)</b><div class="mut">Main beberapa game dulu, skor kemampuanmu akan muncul di sini.</div>`:
    `<b>📊 Skor Kemampuan (EPQ)</b><div style="display:flex;gap:14px;align-items:center;margin-top:6px"><div class="big" style="font-size:44px">${ov}</div><div class="mut" style="font-size:14px">${tier(ov)}<br>Terkuat: ${ps[0].s.ic} ${ps[0].s.name}<br>Dilatih lagi: ${ps[ps.length-1].s.ic} ${ps[ps.length-1].s.name}</div></div>`;
  renderTalkCard();
};
window.renderGames=function(){
  $('tab-games').innerHTML=SKILLS.filter(s=>s.id!=='bicara').map(s=>{const e=epq(s.id);
    return `<div class="mut" style="margin:12px 4px 6px"><b style="color:var(--tx)">${s.ic} ${s.name}</b> · EPQ ${e==null?'—':e+' ('+tier(e)+')'}</div>`+
    EX.filter(x=>x.skill===s.id).map(x=>`<div class="card ex" data-ex="${x.id}"><div class="ic">${x.ic}</div><div class="tt"><b>${x.name}</b><div class="mut">${x.desc}</div></div><div class="sc">Lv ${gl(x.id)}<br><span class="mut" style="font-size:12px">${db.best[x.id]!=null?'rekor '+db.best[x.id]:''}</span></div></div>`).join('')}).join('')+
    `<div class="mut center" style="margin:14px 0">🗣️ Latihan bicara ada di tab Bicara</div>`;
};
function radar(){
  const N=SKILLS.length,cx=130,cy=120,R=80,pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/N;return [cx+r*Math.cos(a),cy+r*Math.sin(a)]};
  const grid=[.25,.5,.75,1].map(f=>`<polygon points="${SKILLS.map((_,i)=>pt(i,R*f).join(',')).join(' ')}" fill="none" stroke="#37335f"/>`).join('');
  const poly=SKILLS.map((s,i)=>pt(i,R*Math.max(.03,(epq(s.id)||0)/1000)).join(',')).join(' ');
  const lab=SKILLS.map((s,i)=>{const [x,y]=pt(i,R+22);return `<text x="${x}" y="${y+6}" text-anchor="middle" font-size="18">${s.ic}</text>`}).join('');
  return `<svg viewBox="0 0 260 240" width="100%" style="max-width:320px;display:block;margin:0 auto">${grid}<polygon points="${poly}" fill="#a78bfa55" stroke="#a78bfa" stroke-width="2"/>${lab}</svg>`;
}
window.renderProg=function(){
  const ov=overall(),d0=new Date();let w='';
  for(let i=0;i<7;i++){const k=dayKey(d0),n=Object.keys(db.days[k]||{}).length;
    w+=`<div class="mut">${i===0?'Hari ini':d0.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short'})} — ${n} game ${n>=3?'🔥':''}</div><div class="bar"><div style="width:${Math.min(100,n*33)}%"></div></div>`;d0.setDate(d0.getDate()-1)}
  $('tab-prog').innerHTML=`
  <div class="card"><h2>📊 Skor Kemampuan (EPQ)</h2>
    <div class="center"><div class="big">${ov==null?'—':ov}</div><div class="mut">${ov==null?'Main beberapa game dulu':tier(ov)}</div></div>${radar()}
    ${SKILLS.map(s=>{const e=epq(s.id);return `<div class="row"><span>${s.ic} ${s.name}</span><b>${e==null?'—':e+' · '+tier(e)}</b></div><div class="bar"><div style="width:${e==null?0:e/10}%"></div></div>`}).join('')}
    <div class="tip">EPQ di sini <b>skor app</b> (0-1000) dari performa dan level game terbaru. Bukan tes IQ atau tes resmi.</div></div>
  <div class="card"><h2>🏅 Pencapaian <span class="mut" style="font-size:14px">${ACH.filter(a=>a[2]()).length}/${ACH.length}</span></h2><div class="bd">${ACH.map(a=>`<div class="${a[2]()?'':'lock'}"><b>${a[0]}</b>${a[1]}</div>`).join('')}</div></div>
  <div class="card"><h2>🏆 Rekor terbaik</h2>${EX.map(e=>`<div class="row"><span>${e.ic} ${e.name} <span class="mut">Lv ${gl(e.id)}</span></span><b>${db.best[e.id]!=null?db.best[e.id]+' '+e.unit:'-'}</b></div>`).join('')}<div class="row"><span>⭐ Total XP</span><b>${db.xp} (Level ${level()})</b></div></div>
  <div class="card"><h2>📅 7 hari terakhir</h2>${w}</div>`;
};

Object.assign(window,{gl,glReal,MAXL,afterGame,afterTalk,todayWorkout});
$('btnAll').onclick=()=>{const t=today(),ids=todayWorkout(),q=ids.filter(i=>t[i]==null);runQueue(q.length?q:ids)};
$('tab-games').onclick=ev=>{const c=ev.target.closest('[data-ex]');if(c)runQueue([c.dataset.ex])};
boot();
})();
