const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeHref=u=>/^https?:\/\//i.test(u||'')?u:'#';
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};

// ---------------- translations ----------------
const I18N={
en:{home:'Home',about:'About',contact:'Contact',discordLogin:'Sign in with Discord',logout:'Log out',tabAll:'All tools',tabFree:'Free',tabPremium:'Premium',search:'search tools...',sortNew:'Newest',sortDl:'Most downloaded',sortAz:'A → Z',back:'← All tools',rights:'© 2026 GRr0upEvil. All rights reserved.',terms:'Terms & Disclaimer',share:'Share',aboutTitle:'About us',contactTitle:'Contact',joinDiscord:'Join our Discord',openDiscord:'Open Discord',copyLink:'Copy link',copy:'Copy',copied:'Copied',
 consentTitle:'Before you download',consentText:'By using this tool, you take full responsibility for any illegal use, and you agree to the Terms of Use and Disclaimer.',consentCheck:'I have read and agree to the Terms of Use and Disclaimer, and I accept responsibility for how I use this tool.',readTerms:'Read the Terms of Use & Disclaimer',consentGo:'I agree — download',
 download:'Download',preparing:'Preparing…',pinned:'★ PINNED',newTag:'NEW',free:'FREE',premium:'PREMIUM',filePw:'File password',changelog:'changelog',downloads:'downloads',tools:'tools',visits:'visits',noMatch:'No tools match.',notFound:'Tool not found.',
 sha:'SHA-256',vt:'Check on VirusTotal',toolLink:'Copy link to this tool',lockedLogin:'🔒 Premium — sign in with Discord',lockedRole:'🔒 Premium role required — join our Discord',lockedContact:'🔒 Premium — contact us on Discord',
 term:['> connecting to mainframe...','> access granted.','> browse the arsenal below.'],
 termsDefault:`1. Tools are provided "as is", without warranty of any kind.\n2. You are solely responsible for how you use any tool and for complying with the laws that apply to you.\n3. We do not support or encourage illegal activity. Any illegal use is entirely your responsibility, and we accept no liability for it.\n4. We are not liable for any loss or damage resulting from downloading or using a tool, including data loss or damage to devices. Use everything at your own risk.\n5. Check the SHA-256 checksum shown on each tool's card and scan files before you run them.\n6. We may change or remove any tool, and update these terms, at any time.\n7. By downloading a tool you confirm that you have read and accepted these terms.`},
ar:{home:'الرئيسية',about:'من نحن',contact:'تواصل معنا',discordLogin:'تسجيل الدخول بديسكورد',logout:'خروج',tabAll:'كل الأدوات',tabFree:'مجانية',tabPremium:'بريميوم',search:'ابحث عن أداة...',sortNew:'الأحدث',sortDl:'الأكثر تحميلًا',sortAz:'أ ← ي',back:'→ كل الأدوات',rights:'© 2026 GRr0upEvil. جميع الحقوق محفوظة.',terms:'الشروط وإخلاء المسؤولية',share:'مشاركة',aboutTitle:'من نحن',contactTitle:'تواصل معنا',joinDiscord:'انضم لسيرفر ديسكورد',openDiscord:'افتح ديسكورد',copyLink:'نسخ الرابط',copy:'نسخ',copied:'تم النسخ',
 consentTitle:'قبل التحميل',consentText:'باستخدام هذه الأداة تتحمّل مسؤولية أي استخدام غير قانوني، وتوافق على شروط الاستخدام وإخلاء المسؤولية.',consentCheck:'قرأت شروط الاستخدام وإخلاء المسؤولية وأوافق عليها، وأتحمّل مسؤولية استخدامي لهذه الأداة.',readTerms:'اقرأ شروط الاستخدام وإخلاء المسؤولية',consentGo:'أوافق — تحميل',
 download:'تحميل',preparing:'جارٍ التجهيز…',pinned:'★ مثبّتة',newTag:'جديد',free:'مجانية',premium:'بريميوم',filePw:'كلمة سر الملف',changelog:'سجل التغييرات',downloads:'تحميل',tools:'أدوات',visits:'الزيارات',noMatch:'ما فيه أدوات مطابقة.',notFound:'الأداة غير موجودة.',
 sha:'SHA-256',vt:'تحقق عبر VirusTotal',toolLink:'انسخ رابط هذه الأداة',lockedLogin:'🔒 بريميوم — سجّل الدخول بديسكورد',lockedRole:'🔒 تحتاج رتبة البريميوم — انضم لسيرفرنا',lockedContact:'🔒 بريميوم — تواصل معنا على ديسكورد',
 term:['> الاتصال بالسيرفر الرئيسي...','> تم السماح بالدخول.','> تصفّح الأدوات بالأسفل.'],
 termsDefault:`1. الأدوات مقدّمة «كما هي» دون أي ضمان من أي نوع.\n2. أنت المسؤول الوحيد عن طريقة استخدامك لأي أداة وعن الالتزام بالقوانين المطبّقة عليك.\n3. نحن لا ندعم ولا نشجّع أي نشاط غير قانوني. أي استخدام غير قانوني يقع بالكامل على مسؤوليتك، ولا نتحمّل أي مسؤولية عنه.\n4. لا نتحمّل أي خسارة أو ضرر ناتج عن تحميل أو استخدام أي أداة، بما في ذلك فقدان البيانات أو تضرّر الأجهزة. استخدمها على مسؤوليتك الخاصة.\n5. تحقّق من بصمة SHA-256 الظاهرة في بطاقة كل أداة وافحص الملفات قبل تشغيلها.\n6. يحق لنا تعديل أو حذف أي أداة وتحديث هذه الشروط في أي وقت.\n7. بتحميلك لأي أداة فإنك تؤكد أنك قرأت هذه الشروط ووافقت عليها.`}
};
let lang=store.get('lang')||((navigator.language||'').toLowerCase().startsWith('ar')?'ar':'en');
const t=k=>(I18N[lang][k]??I18N.en[k]??k);

// ---------------- state ----------------
let tools=[],filter='all',query='',sortMode='new',settings={},me={discordEnabled:false,discord:null,turnstileSiteKey:null},toolsLoaded=false;
const focusMatch=location.pathname.match(/^\/t\/([a-f0-9]+)/i),focusId=focusMatch?focusMatch[1]:null;
if(focusId)document.body.classList.add('focus');
let sound=store.get('sound')==='1';
const scrambled=new Set();

// ---------------- effects ----------------
(function rain(){
  const c=$('rain'),ctx=c.getContext('2d');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const glyphs='01<>/{}[]#$%&ABCDEF'.split('');
  let w,h,cols,drops,step;
  function size(){w=c.width=innerWidth;h=c.height=innerHeight;step=innerWidth<600?28:18;cols=Math.floor(w/step);drops=Array(cols).fill(0).map(()=>Math.random()*-40)}
  size();addEventListener('resize',size);
  let last=0;
  function tick(ts){
    requestAnimationFrame(tick);
    if(document.hidden||ts-last<70)return;last=ts;
    ctx.fillStyle='rgba(6,5,6,0.14)';ctx.fillRect(0,0,w,h);
    ctx.font=(step-3)+'px "Share Tech Mono",monospace';
    for(let i=0;i<cols;i++){
      const g=glyphs[Math.floor(Math.random()*glyphs.length)],x=i*step,y=drops[i]*step;
      ctx.fillStyle=Math.random()<.04?'#ff6b78':'rgba(228,20,43,0.55)';ctx.fillText(g,x,y);
      if(y>h&&Math.random()>.975)drops[i]=0;else drops[i]++;
    }
  }
  requestAnimationFrame(tick);
})();

let termTimer;
function startTerm(){
  clearTimeout(termTimer);
  const el=$('termLine'),lines=t('term');let li=0,ci=0;
  (function step(){
    if(ci<=lines[li].length){el.innerHTML=esc(lines[li].slice(0,ci))+'<span class="bar">&nbsp;</span>';ci++;termTimer=setTimeout(step,32)}
    else termTimer=setTimeout(()=>{ci=0;li=(li+1)%lines.length;step()},1400);
  })();
}
const SCRAMBLE='!<>-_\\/[]{}—=+*^?#01';
function scrambleInto(el,finalText,duration=600){
  const chars=finalText.split(''),total=Math.round(duration/30),reveal=chars.map((_,i)=>Math.floor(total*(i/chars.length)));let frame=0;
  (function tick(){
    el.textContent=chars.map((ch,i)=>ch===' '?' ':(frame>=reveal[i]?ch:SCRAMBLE[Math.floor(Math.random()*SCRAMBLE.length)])).join('');
    if(frame++<=total)setTimeout(tick,30);
  })();
}
function countUp(el,to,duration=900){
  const start=performance.now();
  (function tick(now){const p=Math.min(1,(now-start)/duration);el.textContent=Math.floor(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)})(start);
}
let actx;
function tone(type,f1,f2,dur,vol=.05,exp=true){
  if(!sound)return;
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const n=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
    o.type=type;o.frequency.setValueAtTime(f1,n);exp?o.frequency.exponentialRampToValueAtTime(f2,n+dur):o.frequency.linearRampToValueAtTime(f2,n+dur);
    g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(.0001,n+dur);o.connect(g);g.connect(actx.destination);o.start(n);o.stop(n+dur);}catch{}
}
const beep=(a=520,b=760,d=.09)=>tone('square',a,b,d);
const errorTone=()=>tone('sawtooth',220,120,.25,.05,false);

const sizeFmt=b=>b>1048576?(b/1048576).toFixed(1)+' MB':Math.ceil(b/1024)+' KB';
const isNew=d=>Date.now()-d<7*24*3600e3;

// ---------------- modals (Esc closes, focus is trapped) ----------------
let lastFocus=null;
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
function openModal(id){
  const m=$(id);if(!m)return;
  if(!document.querySelector('.modal.open'))lastFocus=document.activeElement;
  m.classList.add('open');
  const f=m.querySelector(FOCUSABLE);if(f)f.focus();
}
function closeModal(m){
  m.classList.remove('open');
  if(!document.querySelector('.modal.open')&&lastFocus&&lastFocus.focus)lastFocus.focus();
}
document.addEventListener('keydown',e=>{
  const open=[...document.querySelectorAll('.modal.open')],top=open[open.length-1];
  if(!top)return;
  if(e.key==='Escape'){closeModal(top);return}
  if(e.key==='Tab'){
    const f=[...top.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null);if(!f.length)return;
    const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});

// ---------------- rendering ----------------
function visible(){
  if(focusId)return tools.filter(x=>x.id===focusId);
  let l=tools.filter(x=>filter==='all'||x.category===filter);
  const q=query.trim().toLowerCase();
  if(q)l=l.filter(x=>(x.name+' '+x.description).toLowerCase().includes(q));
  if(sortMode==='downloads')l=[...l].sort((a,b)=>(b.pinned-a.pinned)||b.downloads-a.downloads);
  else if(sortMode==='az')l=[...l].sort((a,b)=>(b.pinned-a.pinned)||a.name.localeCompare(b.name));
  else l=[...l].sort((a,b)=>(b.pinned-a.pinned)||b.date-a.date);
  return l;
}
function dlButton(x){
  if(!x.locked)return `<button class="btn" data-dl="${esc(x.id)}">${t('download')}</button>`;
  if(me.discordEnabled&&!me.discord)return `<a class="btn" href="/auth/discord">${t('lockedLogin')}</a>`;
  return `<button class="btn ghost" disabled>${me.discordEnabled?t('lockedRole'):t('lockedContact')}</button>`;
}
function card(x){
  const slug=x.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
  return `<article class="card">
<div class="termbar" dir="ltr"><i></i><i></i><i></i><span class="mono">guest@grr0upevil:~$ ./${esc(slug)}</span></div>
<div class="thumb">${x.image?`<img src="/thumb/${esc(x.id)}" alt="">`:`<img class="mark" src="/logo.png" alt="">`}
<div class="pill-row">${x.pinned?`<span class="pill pin">${t('pinned')}</span>`:''}<span class="pill ${x.category==='premium'?'premium':'free'}">${x.category==='premium'?t('premium'):t('free')}</span></div>
${isNew(x.date)?`<span class="newtag">${t('newTag')}</span>`:''}</div>
<div class="body"><h3><a class="scramble-name" data-id="${esc(x.id)}" href="/t/${esc(x.id)}">${esc(x.name)}</a></h3><p>${esc(x.description)}</p>
${x.filePassword?`<div class="pw mono"><span>${t('filePw')}: <code>${esc(x.filePassword)}</code></span><button class="btn ghost small" data-copy="${esc(x.filePassword)}">${t('copy')}</button></div>`:''}
${x.sha256?`<div class="hash mono" dir="ltr"><span title="${esc(x.sha256)}">${t('sha')}: ${esc(x.sha256.slice(0,12))}…${esc(x.sha256.slice(-6))}</span><span><button class="btn ghost small" data-copy="${esc(x.sha256)}">${t('copy')}</button> <a class="vt" href="https://www.virustotal.com/gui/file/${esc(x.sha256)}" target="_blank" rel="noopener noreferrer">${t('vt')}</a></span></div>`:''}
${x.changelog&&x.changelog.length?`<details class="log"><summary class="mono">${t('changelog')} (${x.changelog.length})</summary>${x.changelog.map(c=>`<div class="logline mono">${new Date(c.date).toLocaleDateString(lang==='ar'?'ar':undefined)} — ${esc(c.note)}</div>`).join('')}</details>`:''}
<div class="meta mono"><span dir="ltr">${sizeFmt(x.size)}</span> · ${x.downloads} ${t('downloads')} · <button class="linkbtn" data-copyurl="/t/${esc(x.id)}">🔗 ${t('toolLink')}</button></div>
${dlButton(x)}</div></article>`;
}
function render(){
  if(!toolsLoaded)return;
  const l=visible();
  $('grid').innerHTML=l.length?l.map(card).join(''):`<div class="empty">${focusId?t('notFound'):t('noMatch')}</div>`;
  // the decrypt effect plays once per card, not on every keystroke
  document.querySelectorAll('.scramble-name').forEach(el=>{
    if(scrambled.has(el.dataset.id))return;scrambled.add(el.dataset.id);scrambleInto(el,el.textContent,500);
  });
}
function renderStats(animate){
  const dl=tools.reduce((s,x)=>s+x.downloads,0);
  $('statsStrip').innerHTML=`<span>${t('tools')}: <b id="cT">${animate?0:tools.length}</b></span><span>${t('downloads')}: <b id="cD">${animate?0:dl}</b></span>`;
  if(animate){countUp($('cT'),tools.length);countUp($('cD'),dl)}
}
function renderMe(){
  const login=$('dLogin'),user=$('dUser');
  login.hidden=!(me.discordEnabled&&!me.discord);user.hidden=!me.discord;
  if(me.discord)$('dName').textContent=me.discord.username;
}
function renderSettings(){
  const s=settings,site=s.siteTitle||'GRr0upEvil';
  document.title=focusId&&tools.length?document.title:site;
  const h=$('siteTitle');h.textContent=site+' Tools';h.dataset.text=site+' Tools';
  $('aboutText').textContent=s.aboutText||'';$('contactText').textContent=s.contactText||'';
  const d=safeHref(s.discord||'');$('aboutDiscord').href=d;$('contactDiscord').href=d;
  $('termsBody').textContent=(s.termsText&&s.termsText.trim())||t('termsDefault');
}
function applyLang(){
  const html=document.documentElement;html.lang=lang;html.dir=lang==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i]').forEach(el=>{el.textContent=t(el.dataset.i)});
  document.querySelectorAll('[data-ip]').forEach(el=>{el.placeholder=t(el.dataset.ip)});
  $('langBtn').textContent=lang==='ar'?'EN':'عربي';
  $('sndBtn').title=$('sndBtn').ariaLabel=lang==='ar'?'الصوت':'Sound';
  renderStats(false);renderSettings();renderMe();render();startTerm();
  $('visits').textContent=$('visits').dataset.v?t('visits')+': '+$('visits').dataset.v:'visits: ------';
}
function setSound(on){sound=on;store.set('sound',on?'1':'0');$('sndBtn').textContent=on?'🔊':'🔇';$('sndBtn').setAttribute('aria-pressed',on)}

// ---------------- data ----------------
const j=u=>fetch(u).then(r=>r.json());
Promise.all([j('/api/me').catch(()=>me),j('/api/settings').catch(()=>({})),j('/api/team').catch(()=>[])]).then(([m,s,tm])=>{
  me=m;settings=s;renderSettings();renderMe();
  $('team').innerHTML=tm.map(x=>`<a class="member" href="${esc(safeHref(x.link))}" target="_blank" rel="noopener noreferrer"><img class="av" src="${x.image?'/thumb-team/'+esc(x.id):'/logo.png'}" alt=""><b>${esc(x.name)}</b><span>${esc(x.role||'')}</span></a>`).join('');
  return j('/api/tools');
}).then(d=>{
  tools=d;toolsLoaded=true;
  if(focusId){const f=tools.find(x=>x.id===focusId);if(f)document.title=f.name+' — '+(settings.siteTitle||'GRr0upEvil')}
  render();renderStats(true);
}).catch(()=>{toolsLoaded=true;render()});
fetch('/api/visit',{method:'POST'}).then(r=>r.json()).then(v=>{const el=$('visits');el.dataset.v=String(v.count).padStart(6,'0');el.textContent=t('visits')+': '+el.dataset.v});

// ---------------- download flow: consent (+ captcha) -> one-time link ----------------
let consentId=null,cfToken=null,cfWidget=null,tsLoading=null;
function loadTurnstile(){
  if(window.turnstile)return Promise.resolve();
  return tsLoading||(tsLoading=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s)}));
}
function updateGo(){$('cGo').disabled=!($('cAgree').checked&&(!me.turnstileSiteKey||cfToken))}
async function openConsent(id){
  const x=tools.find(v=>v.id===id);if(!x)return;
  consentId=id;cfToken=null;$('cAgree').checked=false;$('cErr').textContent='';$('cTool').textContent=x.name;updateGo();
  openModal('consent');
  if(me.turnstileSiteKey){
    try{await loadTurnstile();
      if(cfWidget!==null)turnstile.reset(cfWidget);
      else cfWidget=turnstile.render('#cf',{sitekey:me.turnstileSiteKey,theme:'dark',callback:tok=>{cfToken=tok;updateGo()},'expired-callback':()=>{cfToken=null;updateGo()},'error-callback':()=>{cfToken=null;updateGo()}});
    }catch{$('cErr').textContent='Captcha failed to load.'}
  }
}
async function doDownload(){
  const go=$('cGo'),orig=go.textContent;go.textContent=t('preparing');go.disabled=true;$('cErr').textContent='';
  try{
    const r=await fetch('/api/dl-link/'+consentId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agree:$('cAgree').checked,cf:cfToken})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      if(d.needLogin){location.href='/auth/discord';return}
      throw new Error(d.error||'Could not prepare the download.');
    }
    beep(300,700,.1);closeModal($('consent'));location.href=d.url;
  }catch(err){errorTone();$('cErr').textContent=err.message}
  go.textContent=orig;cfToken=null;if(cfWidget!==null&&window.turnstile)turnstile.reset(cfWidget);updateGo();
}
$('cAgree').addEventListener('change',updateGo);
$('cGo').addEventListener('click',doDownload);

// ---------------- events ----------------
let searchTimer;
$('search').addEventListener('input',e=>{clearTimeout(searchTimer);const v=e.target.value;searchTimer=setTimeout(()=>{query=v;render()},150)});
$('sort').addEventListener('change',e=>{sortMode=e.target.value;render()});
$('langBtn').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';store.set('lang',lang);applyLang()});
$('sndBtn').addEventListener('click',()=>{setSound(!sound);beep(520,760,.08)});
$('dOut').addEventListener('click',async()=>{await fetch('/auth/logout',{method:'POST'});location.reload()});

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-f],[data-open],[data-close],[data-copy],[data-copyurl],[data-dl],#copyShare,.modal');if(!el)return;
  const d=el.dataset;
  if(d.f){beep();filter=d.f;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b===el));render();return}
  if(d.open){e.preventDefault();beep(420,320,.07);if(d.open==='share')$('shareUrl').value=location.href;openModal(d.open);return}
  if('close' in d){closeModal(el.closest('.modal'));return}
  if(d.copy){navigator.clipboard.writeText(d.copy).catch(()=>{});beep(900,1200,.06);const o=el.textContent;el.textContent=t('copied');setTimeout(()=>el.textContent=o,1200);return}
  if(d.copyurl){navigator.clipboard.writeText(location.origin+d.copyurl).catch(()=>{});beep(900,1200,.06);const o=el.textContent;el.textContent='✓ '+t('copied');setTimeout(()=>el.textContent=o,1200);return}
  if(d.dl){beep();openConsent(d.dl);return}
  if(el.id==='copyShare'){navigator.clipboard.writeText($('shareUrl').value).catch(()=>{});el.textContent=t('copied');return}
  if(el.classList.contains('modal')&&e.target===el)closeModal(el);
});

setSound(sound);applyLang();
