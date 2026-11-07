const express=require('express'),session=require('express-session'),multer=require('multer'),crypto=require('crypto'),fs=require('fs'),path=require('path');
const {Store,flushAll}=require('./lib/jsondb'),makeSessionStore=require('./lib/sessionstore'),totp=require('./lib/totp');
const E=process.env,{ADMIN_EMAIL,ADMIN_PASSWORD,SESSION_SECRET,PORT=3000}=E;
if(!ADMIN_EMAIL||!ADMIN_PASSWORD||!SESSION_SECRET){console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET (see .env.example)');process.exit(1)}

// ---------- config ----------
const ADMIN_PATH='/'+((E.ADMIN_PATH||'admin').replace(/^\/+|\/+$/g,'')||'admin');
const TOTP_SECRET=E.ADMIN_TOTP_SECRET||'';
const D={id:E.DISCORD_CLIENT_ID,secret:E.DISCORD_CLIENT_SECRET,guild:E.DISCORD_GUILD_ID,role:E.DISCORD_PREMIUM_ROLE_ID,redirect:E.DISCORD_REDIRECT_URI};
const DISCORD_ON=!!(D.id&&D.secret&&D.guild&&D.role&&D.redirect);
const TS={site:E.TURNSTILE_SITE_KEY,secret:E.TURNSTILE_SECRET},TS_ON=!!(TS.site&&TS.secret);
const HOOK=(()=>{try{const u=new URL(E.DISCORD_WEBHOOK_URL||'');return u.protocol==='https:'&&/(^|\.)discord(app)?\.com$/.test(u.hostname)?u.href:''}catch{return''}})();

const DIR=path.resolve(E.DATA_DIR||path.join(__dirname,'data')),UP=path.resolve(E.UPLOAD_DIR||path.join(__dirname,'uploads'));
fs.mkdirSync(UP,{recursive:true});fs.mkdirSync(DIR,{recursive:true});
const tools=new Store(path.join(DIR,'tools.json'),[]),team=new Store(path.join(DIR,'team.json'),[]),visits=new Store(path.join(DIR,'visits.json'),{count:0}),loginlog=new Store(path.join(DIR,'loginlog.json'),[]);
const settings=new Store(path.join(DIR,'settings.json'),{});
settings.data={siteTitle:'GRr0upEvil',discord:'https://discord.gg/hedQeJbPD',aboutText:'GRr0upEvil publishes tools for people who want fast, reliable software. Join the Discord for updates and support.',contactText:'For questions, priority support or custom tools, message us on Discord.',termsText:'',...settings.data};

// ---------- helpers ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>{try{const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)}catch{return false}};
const safeUrl=u=>{try{const x=new URL(String(u).trim());return x.protocol==='http:'||x.protocol==='https:'?x.href:''}catch{return''}};
const baseUrl=req=>(E.PUBLIC_URL||req.protocol+'://'+req.get('host')).replace(/\/+$/,'');
const sha256File=p=>new Promise((res,rej)=>{const h=crypto.createHash('sha256');fs.createReadStream(p).on('data',d=>h.update(d)).on('end',()=>res(h.digest('hex'))).on('error',rej)});
function imgMime(p){try{const fd=fs.openSync(p,'r'),b=Buffer.alloc(12);fs.readSync(fd,b,0,12,0);fs.closeSync(fd);
  if(b[0]===0x89&&b.toString('latin1',1,4)==='PNG')return'image/png';
  if(b[0]===0xFF&&b[1]===0xD8)return'image/jpeg';
  if(b.toString('latin1',0,3)==='GIF')return'image/gif';
  if(b.toString('latin1',0,4)==='RIFF'&&b.toString('latin1',8,12)==='WEBP')return'image/webp';}catch{}return null}
const unlinkUp=n=>{if(n)fs.unlink(path.join(UP,n),()=>{})};
function notify(title,desc,url){
  if(!HOOK)return;
  fetch(HOOK,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
    body:JSON.stringify({allowed_mentions:{parse:[]},embeds:[{title:String(title).slice(0,250),description:String(desc||'').slice(0,500),url,color:0xe4142b,timestamp:new Date().toISOString()}]})}).catch(()=>{});
}

// ---------- rate limiting (in memory, swept regularly) ----------
const buckets={};
const recent=(key,ip,win)=>{const b=buckets[key]=buckets[key]||{};return b[ip]=(b[ip]||[]).filter(t=>Date.now()-t<win)};
const limited=(key,ip,max,win)=>recent(key,ip,win).length>=max;
const hit=(key,ip,win)=>recent(key,ip,win).push(Date.now());
setInterval(()=>{for(const b of Object.values(buckets))for(const ip in b){b[ip]=b[ip].filter(t=>Date.now()-t<3600e3);if(!b[ip].length)delete b[ip]}},10*60e3).unref();

const app=express();app.disable('x-powered-by');app.set('trust proxy',1);app.use(express.json({limit:'50kb'}));

// ---------- security headers + CSP ----------
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  if(req.secure)res.setHeader('Strict-Transport-Security','max-age=15552000');
  next();
});
// block cross-site state-changing requests (CSRF defence in depth on top of SameSite cookies)
app.use((req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const o=req.get('origin');
  if(o){let h='';try{h=new URL(o).host}catch{}
    if(![req.get('host'),req.get('x-forwarded-host')].filter(Boolean).includes(h))return res.status(403).json({error:'Cross-origin request blocked.'})}
  next();
});
app.use(session({store:makeSessionStore(path.join(DIR,'.sessions.json')),name:'gsid',secret:SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:'auto',maxAge:6*3600e3}}));

// ---------- uploads ----------
const diskName=(q,f,cb)=>cb(null,crypto.randomBytes(16).toString('hex'));
const uploadTool=multer({storage:multer.diskStorage({destination:UP,filename:diskName}),limits:{fileSize:(+E.MAX_MB||500)*1048576}});
const uploadImg=multer({storage:multer.diskStorage({destination:UP,filename:diskName}),limits:{fileSize:8*1048576}});
const uploaded=req=>[...(req.file?[req.file]:[]),...Object.values(req.files||{}).flat()];
const dropUploads=req=>uploaded(req).forEach(f=>fs.unlink(f.path,()=>{}));
const runUpload=mw=>(req,res,next)=>mw(req,res,err=>{if(err){dropUploads(req);return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'File is too large.':'Upload failed.'})}next()});
const toolFields=uploadTool.fields([{name:'file',maxCount:1},{name:'image',maxCount:1}]);

// ---------- auth ----------
const auth=(req,res,next)=>req.session.admin?next():res.status(401).json({error:'Not logged in.'});
const entitled=req=>!!req.session.admin||(DISCORD_ON&&!!(req.session.discord&&req.session.discord.premium));
const logLogin=(ip,ok)=>{loginlog.data.unshift({time:Date.now(),ip,ok});loginlog.data=loginlog.data.slice(0,200);loginlog.saveSoon(500)};

app.get('/api/admin/info',(req,res)=>res.json({totp:!!TOTP_SECRET}));
app.post('/api/admin/login',(req,res)=>{
  const ip=req.ip,WIN=15*60e3;
  if(limited('login',ip,5,WIN))return res.status(429).json({error:'Too many failed attempts. Try again in 15 minutes.'});
  const{email,password,code}=req.body||{};
  const a=same(email,ADMIN_EMAIL),b=same(password,ADMIN_PASSWORD),c=!TOTP_SECRET||totp.verify(TOTP_SECRET,code);
  logLogin(ip,a&&b&&c);
  if(!(a&&b&&c)){hit('login',ip,WIN);return res.status(401).json({error:TOTP_SECRET?'Wrong email, password or code.':'Wrong email or password.'})}
  req.session.regenerate(err=>{
    if(err)return res.status(500).json({error:'Server error.'});
    req.session.admin=true;req.session.save(()=>res.json({ok:true}));
  });
});
app.post('/api/admin/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/me',(req,res)=>res.json({admin:!!req.session.admin}));
app.get('/api/admin/loginlog',auth,(req,res)=>res.json(loginlog.data.slice(0,50)));
app.get('/api/admin/stats',auth,(req,res)=>res.json({tools:tools.data.length,downloads:tools.data.reduce((s,t)=>s+t.downloads,0),team:team.data.length,visits:visits.data.count}));

// ---------- visitor info (Discord login state, captcha key) ----------
app.get('/api/me',(req,res)=>{
  res.set('Cache-Control','no-store');
  const d=req.session.discord;
  res.json({discordEnabled:DISCORD_ON,discord:d?{username:d.username,premium:!!d.premium}:null,turnstileSiteKey:TS_ON?TS.site:null});
});

// ---------- Discord login (premium access by server role) ----------
const dj=async(url,opt)=>{const r=await fetch(url,{...opt,signal:AbortSignal.timeout(10000)});return{ok:r.ok,j:await r.json().catch(()=>({}))}};
app.get('/auth/discord',(req,res)=>{
  if(!DISCORD_ON)return res.status(404).send('Discord login is not enabled.');
  const state=crypto.randomBytes(16).toString('hex');req.session.oauthState=state;
  const q=new URLSearchParams({client_id:D.id,redirect_uri:D.redirect,response_type:'code',scope:'identify guilds.members.read',state,prompt:'none'});
  req.session.save(()=>res.redirect('https://discord.com/oauth2/authorize?'+q));
});
app.get('/auth/discord/callback',async(req,res)=>{
  if(!DISCORD_ON)return res.status(404).send('Discord login is not enabled.');
  const{code,state}=req.query;
  if(!code||!state||!req.session.oauthState||!same(state,req.session.oauthState))return res.status(400).send('Invalid login state. Go back and try again.');
  delete req.session.oauthState;
  try{
    const tk=await dj('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:D.id,client_secret:D.secret,grant_type:'authorization_code',code:String(code),redirect_uri:D.redirect})});
    if(!tk.ok||!tk.j.access_token)throw new Error('token');
    const H={Authorization:'Bearer '+tk.j.access_token};
    const me=await dj('https://discord.com/api/users/@me',{headers:H});if(!me.ok)throw new Error('me');
    const mem=await dj('https://discord.com/api/users/@me/guilds/'+encodeURIComponent(D.guild)+'/member',{headers:H});
    const premium=mem.ok&&Array.isArray(mem.j.roles)&&mem.j.roles.includes(D.role);
    req.session.discord={id:me.j.id,username:String(me.j.global_name||me.j.username||'user').slice(0,40),premium};
    req.session.save(()=>res.redirect('/'));
  }catch{res.status(502).send('Discord login failed. Go back and try again.')}
});
app.post('/auth/logout',(req,res)=>{delete req.session.discord;res.json({ok:true})});

// ---------- visits (one per visitor per day, bots ignored) ----------
app.post('/api/visit',(req,res)=>{
  const today=new Date().toISOString().slice(0,10);
  const seen=(req.headers.cookie||'').includes('gv='+today),bot=/bot|crawl|spider|curl|wget|headless/i.test(req.get('user-agent')||'');
  if(!seen&&!bot){visits.data.count++;visits.saveSoon();res.cookie('gv',today,{maxAge:86400e3,httpOnly:true,sameSite:'lax',secure:req.secure})}
  res.json({count:visits.data.count});
});
app.get('/api/visit',(req,res)=>res.json({count:visits.data.count}));

// ---------- tools ----------
const publicTool=(t,req)=>{const{stored,...o}=t;if(t.category==='premium'&&!entitled(req)){delete o.filePassword;o.locked=true}return o};
app.get('/api/tools',(req,res)=>{
  res.set('Cache-Control','no-store');
  const list=tools.data.map(t=>publicTool(t,req));
  list.sort((a,b)=>(b.pinned-a.pinned)||(b.date-a.date));
  res.json(list);
});
app.post('/api/admin/tools',auth,runUpload(toolFields),async(req,res)=>{
  try{
    const{name,description,category,filePassword}=req.body||{};
    const file=req.files?.file?.[0],image=req.files?.image?.[0];
    if(!file||!name||!name.trim()){dropUploads(req);return res.status(400).json({error:'Name and file are required.'})}
    if(image&&!imgMime(image.path)){dropUploads(req);return res.status(400).json({error:'Card image must be PNG, JPG, GIF or WEBP.'})}
    const t={id:crypto.randomBytes(6).toString('hex'),name:name.trim().slice(0,80),description:(description||'').slice(0,600),category:category==='premium'?'premium':'free',filePassword:(filePassword||'').slice(0,100),stored:file.filename,original:file.originalname,size:file.size,sha256:await sha256File(file.path),image:image?image.filename:null,downloads:0,date:Date.now(),pinned:false,changelog:[]};
    tools.data.unshift(t);tools.save();
    notify('New tool: '+t.name,t.description,baseUrl(req)+'/t/'+t.id);
    res.json({ok:true});
  }catch(e){dropUploads(req);console.error(e);res.status(500).json({error:'Upload failed.'})}
});
app.put('/api/admin/tools/:id',auth,runUpload(toolFields),async(req,res)=>{
  try{
    const t=tools.data.find(x=>x.id===req.params.id);
    if(!t){dropUploads(req);return res.status(404).json({error:'Not found.'})}
    const b=req.body||{},file=req.files?.file?.[0],image=req.files?.image?.[0];
    if(image&&!imgMime(image.path)){dropUploads(req);return res.status(400).json({error:'Card image must be PNG, JPG, GIF or WEBP.'})}
    if(b.name!==undefined){const n=String(b.name).trim().slice(0,80);if(!n){dropUploads(req);return res.status(400).json({error:'Name cannot be empty.'})}t.name=n}
    if(b.description!==undefined)t.description=String(b.description).slice(0,600);
    if(b.category!==undefined)t.category=b.category==='premium'?'premium':'free';
    if(b.filePassword!==undefined)t.filePassword=String(b.filePassword).slice(0,100);
    if(image){unlinkUp(t.image);t.image=image.filename}else if(b.removeImage==='1'&&t.image){unlinkUp(t.image);t.image=null}
    let updated=false;
    if(file){
      const sha=await sha256File(file.path);unlinkUp(t.stored);
      Object.assign(t,{stored:file.filename,original:file.originalname,size:file.size,sha256:sha});
      t.changelog=t.changelog||[];t.changelog.unshift({date:Date.now(),note:'File updated'});updated=true;
    }
    tools.save();
    if(updated)notify('Updated: '+t.name,'A new version of the file was uploaded.',baseUrl(req)+'/t/'+t.id);
    res.json({ok:true});
  }catch(e){dropUploads(req);console.error(e);res.status(500).json({error:'Update failed.'})}
});
app.delete('/api/admin/tools/:id',auth,(req,res)=>{
  const t=tools.data.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:'Not found.'});
  unlinkUp(t.stored);unlinkUp(t.image);
  tools.data=tools.data.filter(x=>x!==t);tools.save();res.json({ok:true});
});
app.post('/api/admin/tools/:id/pin',auth,(req,res)=>{
  const t=tools.data.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:'Not found.'});
  t.pinned=!t.pinned;tools.save();res.json({ok:true,pinned:t.pinned});
});
app.post('/api/admin/tools/:id/changelog',auth,(req,res)=>{
  const t=tools.data.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:'Not found.'});
  const note=String(req.body?.note||'').trim().slice(0,200);if(!note)return res.status(400).json({error:'Note is required.'});
  t.changelog=t.changelog||[];t.changelog.unshift({date:Date.now(),note});tools.save();
  notify('Changelog: '+t.name,note,baseUrl(req)+'/t/'+t.id);
  res.json({ok:true});
});
function sendImg(res,name){
  const p=path.join(UP,name),m=imgMime(p);if(!m)return res.status(404).end();
  res.type(m);res.set('Cache-Control','public, max-age=3600');res.sendFile(p);
}
app.get('/thumb/:id',(req,res)=>{const t=tools.data.find(x=>x.id===req.params.id);if(!t||!t.image)return res.status(404).end();sendImg(res,t.image)});
app.get('/thumb-team/:id',(req,res)=>{const m=team.data.find(x=>x.id===req.params.id);if(!m||!m.image)return res.status(404).end();sendImg(res,m.image)});

// ---------- downloads: terms acceptance + premium check + captcha -> one-time link ----------
const tokens=new Map(); // token -> {id, exp}
const sweepTokens=()=>{const now=Date.now();for(const[k,v]of tokens)if(v.exp<now)tokens.delete(k)};
async function verifyTurnstile(tok,ip){
  if(!tok||typeof tok!=='string')return false;
  try{
    const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:TS.secret,response:tok,remoteip:ip}),signal:AbortSignal.timeout(8000)});
    return !!(await r.json()).success;
  }catch{return false}
}
app.post('/api/dl-link/:id',async(req,res)=>{
  sweepTokens();const ip=req.ip,WIN=10*60e3;
  if(limited('dl',ip,40,WIN))return res.status(429).json({error:'Too many download requests. Slow down and try again shortly.'});
  hit('dl',ip,WIN);
  const t=tools.data.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:'Not found.'});
  if(req.body?.agree!==true)return res.status(400).json({error:'You must accept the terms of use and disclaimer first.',needAgree:true});
  if(t.category==='premium'&&!entitled(req))return res.status(403).json({error:DISCORD_ON?'This tool needs the Premium role on our Discord. Sign in with Discord first.':'This is a premium tool. Contact us on Discord.',needLogin:DISCORD_ON&&!req.session.discord});
  if(TS_ON&&!(await verifyTurnstile(req.body?.cf,ip)))return res.status(400).json({error:'Captcha check failed. Please try again.',captcha:true});
  const token=crypto.randomBytes(20).toString('hex');
  tokens.set(token,{id:t.id,exp:Date.now()+10*60e3});
  res.json({url:'/dl/'+token});
});
app.get('/dl/:token',(req,res)=>{
  sweepTokens();
  const rec=tokens.get(req.params.token);
  if(!rec||rec.exp<Date.now())return res.status(410).send('This link expired or was already used. Go back and click Download again.');
  tokens.delete(req.params.token);
  const t=tools.data.find(x=>x.id===rec.id);if(!t)return res.status(404).send('Not found');
  t.downloads++;tools.saveSoon();
  res.download(path.join(UP,t.stored),t.original,err=>{if(err&&!res.headersSent)res.status(404).send('File missing.')});
});

// ---------- team ----------
app.post('/api/admin/team',auth,runUpload(uploadImg.single('image')),(req,res)=>{
  const{name,role,link}=req.body||{};
  if(!name||!name.trim()){dropUploads(req);return res.status(400).json({error:'Name is required.'})}
  if(req.file&&!imgMime(req.file.path)){dropUploads(req);return res.status(400).json({error:'Photo must be PNG, JPG, GIF or WEBP.'})}
  let l='';if(link&&link.trim()){l=safeUrl(link);if(!l){dropUploads(req);return res.status(400).json({error:'Link must start with http:// or https://'})}}
  team.data.push({id:crypto.randomBytes(6).toString('hex'),name:name.trim().slice(0,60),role:(role||'').slice(0,80),link:l.slice(0,200),image:req.file?req.file.filename:null});
  team.save();res.json({ok:true});
});
app.delete('/api/admin/team/:id',auth,(req,res)=>{
  const m=team.data.find(x=>x.id===req.params.id);if(!m)return res.status(404).json({error:'Not found.'});
  unlinkUp(m.image);team.data=team.data.filter(x=>x!==m);team.save();res.json({ok:true});
});
app.get('/api/team',(req,res)=>res.json(team.data));

// ---------- settings ----------
app.get('/api/settings',(req,res)=>res.json(settings.data));
app.post('/api/admin/settings',auth,(req,res)=>{
  const b=req.body||{},cur=settings.data,pick=(k,max)=>b[k]!==undefined?String(b[k]).slice(0,max):cur[k];
  let discord=b.discord!==undefined?String(b.discord).trim():cur.discord;
  if(discord){discord=safeUrl(discord);if(!discord)return res.status(400).json({error:'Discord link must start with http:// or https://'})}
  settings.data={siteTitle:pick('siteTitle',60),discord:discord.slice(0,200),aboutText:pick('aboutText',500),contactText:pick('contactText',500),termsText:pick('termsText',4000)};
  settings.save();res.json({ok:true});
});

// ---------- pages ----------
const INDEX=fs.readFileSync(path.join(__dirname,'public','index.html'),'utf8');
function renderIndex(req,res,t){
  const s=settings.data,base=baseUrl(req),site=s.siteTitle||'GRr0upEvil';
  const title=t?t.name+' — '+site:site+' Tools',desc=(t?t.description:s.aboutText)||'',url=base+(t?'/t/'+t.id:'/'),img=base+(t&&t.image?'/thumb/'+t.id:'/logo.png');
  const og=`<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc.slice(0,200))}"><meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary_large_image"><meta name="description" content="${esc(desc.slice(0,160))}"><link rel="canonical" href="${esc(url)}">`;
  res.set('Content-Type','text/html; charset=utf-8').send(INDEX.replace('<!--OG-->',()=>og).replace(/<title>.*?<\/title>/,()=>'<title>'+esc(title)+'</title>'));
}
app.get('/',(req,res)=>renderIndex(req,res,null));
app.get('/t/:id',(req,res)=>{const t=tools.data.find(x=>x.id===req.params.id);if(!t)return res.redirect('/');renderIndex(req,res,t)});
app.get(ADMIN_PATH,(req,res)=>{res.set('Cache-Control','no-store');res.sendFile(path.join(__dirname,'views','admin.html'))});
app.use(express.static(path.join(__dirname,'public'),{index:false,maxAge:'1h'}));
app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);res.status(500).json({error:'Server error.'})});

// ---------- optional automatic backups ----------
const BACKUP_HOURS=+E.BACKUP_INTERVAL_HOURS||0;
if(BACKUP_HOURS>0){
  const runBackup=require('./backup.js');
  setInterval(()=>{flushAll();runBackup().catch(e=>console.error('Backup failed:',e.message))},BACKUP_HOURS*3600e3);
  console.log('Automatic backups every '+BACKUP_HOURS+' hour(s).');
}

// fill in checksums for tools uploaded before this version
(async()=>{for(const t of tools.data)if(!t.sha256&&t.stored){try{t.sha256=await sha256File(path.join(UP,t.stored));tools.save()}catch{}}})();

app.listen(PORT,()=>console.log(`Running on port ${PORT} | admin: ${ADMIN_PATH} | 2FA: ${TOTP_SECRET?'on':'off'} | Discord premium: ${DISCORD_ON?'on':'off'} | captcha: ${TS_ON?'on':'off'} | webhook: ${HOOK?'on':'off'}`));
