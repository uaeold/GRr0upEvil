const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(u,o){const r=await fetch(u,o);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed');return j}
let toolsCache=[];

async function show(){
  const{admin}=await api('/api/admin/me');$('login').hidden=admin;$('panel').hidden=!admin;
  if(!admin){try{const i=await api('/api/admin/info');$('codeBox').hidden=!i.totp}catch{}}
  else{listTools();listTeam();loadSettings();loadStats();loadLog()}
}
async function loadStats(){const s=await api('/api/admin/stats');
  $('stats').innerHTML=`<span>tools: <b>${s.tools}</b></span><span>downloads: <b>${s.downloads}</b></span><span>team: <b>${s.team}</b></span><span>unique visits: <b>${s.visits}</b></span>`}

function editForm(t){
  return `<form class="editform" data-edit-form="${t.id}">
  <label>Name</label><input name="name" value="${esc(t.name)}" maxlength="80" required>
  <label>Description</label><textarea name="description" rows="3" maxlength="600">${esc(t.description||'')}</textarea>
  <label>Type</label><select name="category"><option value="free"${t.category==='free'?' selected':''}>Free</option><option value="premium"${t.category==='premium'?' selected':''}>Premium</option></select>
  <label>File password</label><input name="filePassword" value="${esc(t.filePassword||'')}" maxlength="100">
  <label>Replace card image (optional)</label><input name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp">
  ${t.image?`<label class="chk"><input type="checkbox" name="removeImage" value="1"><span>Remove current card image</span></label>`:''}
  <label>Replace tool file with a new version (optional — checksum updates automatically)</label><input name="file" type="file">
  <div class="err"></div><div class="btnrow"><button class="btn">Save changes</button><button type="button" class="btn ghost" data-cancel-edit>Cancel</button></div></form>`;
}
async function listTools(){
  toolsCache=await api('/api/tools');
  $('list').innerHTML=toolsCache.map(t=>`<div class="toolrow" data-row="${t.id}"><div class="row">
    <span>${t.pinned?'★ ':''}${esc(t.name)} <small>(${esc(t.category)}, ${t.downloads} downloads)</small></span>
    <span class="btnrow"><button class="btn ghost" data-edit="${t.id}">Edit</button><button class="btn ghost" data-pin="${t.id}">${t.pinned?'Unpin':'Pin'}</button><button class="btn ghost" data-del-tool="${t.id}">Delete</button></span></div>
    <div class="editslot"></div>
    <form class="logform" data-log-form="${t.id}"><input name="note" placeholder="add a changelog note..." maxlength="200"><button class="btn">Add note</button></form></div>`).join('')||'<p class="meta">No tools yet.</p>';
}
async function listTeam(){const d=await api('/api/team');$('teamList').innerHTML=d.map(m=>`<div class="row"><span>${esc(m.name)} <small>${esc(m.role||'')}</small></span><button class="btn ghost" data-del-team="${m.id}">Delete</button></div>`).join('')||'<p class="meta">No members yet.</p>'}
async function loadSettings(){const s=await api('/api/settings');const f=$('sf');for(const k of['siteTitle','discord','aboutText','contactText','termsText'])if(f[k])f[k].value=s[k]||''}
async function loadLog(){const d=await api('/api/admin/loginlog');
  $('loginlog').innerHTML=d.length?d.map(e=>`<div class="row"><span>${new Date(e.time).toLocaleString()}</span><span>${esc(e.ip)}</span><span class="${e.ok===false?'bad':'good'}">${e.ok===false?'FAILED':'OK'}</span></div>`).join(''):'<p class="meta">No logins recorded yet.</p>'}

$('lbtn').onclick=async()=>{$('lerr').textContent='';try{await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('em').value,password:$('pw').value,code:$('code').value})});$('pw').value='';$('code').value='';show()}catch(e){$('lerr').textContent=e.message}};
for(const id of['em','pw','code'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter')$('lbtn').click()});
$('out').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});show()};

$('f').onsubmit=async e=>{e.preventDefault();$('fbtn').textContent='Uploading…';$('fbtn').disabled=true;$('ferr').textContent='';
  try{await api('/api/admin/tools',{method:'POST',body:new FormData(e.target)});e.target.reset();listTools();loadStats()}catch(x){$('ferr').textContent=x.message}
  $('fbtn').textContent='Upload tool';$('fbtn').disabled=false};

$('list').addEventListener('click',async e=>{
  const d=e.target.dataset;
  try{
    if(d.pin){await api('/api/admin/tools/'+d.pin+'/pin',{method:'POST'});listTools()}
    if(d.delTool&&confirm('Delete this tool? This cannot be undone.')){await api('/api/admin/tools/'+d.delTool,{method:'DELETE'});listTools();loadStats()}
    if(d.edit){const row=e.target.closest('[data-row]'),slot=row.querySelector('.editslot');
      slot.innerHTML=slot.innerHTML?'':editForm(toolsCache.find(t=>t.id===d.edit))}
    if('cancelEdit' in d)e.target.closest('.editslot').innerHTML='';
  }catch(x){alert(x.message)}
});
$('list').addEventListener('submit',async e=>{
  e.preventDefault();
  const fe=e.target.dataset.editForm,id=e.target.dataset.logForm;
  if(fe){
    const err=e.target.querySelector('.err'),btn=e.target.querySelector('.btn');err.textContent='';btn.disabled=true;btn.textContent='Saving…';
    try{
      const fd=new FormData(e.target);
      for(const k of['image','file'])if(!fd.get(k)||!fd.get(k).size)fd.delete(k); // don't send empty file fields
      await api('/api/admin/tools/'+fe,{method:'PUT',body:fd});listTools();loadStats();
    }catch(x){err.textContent=x.message;btn.disabled=false;btn.textContent='Save changes'}
    return;
  }
  if(id){
    const note=e.target.note.value.trim();if(!note)return;
    try{await api('/api/admin/tools/'+id+'/changelog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note})});listTools()}catch(x){alert(x.message)}
  }
});

$('tf').onsubmit=async e=>{e.preventDefault();$('tbtn').textContent='Adding…';$('terr').textContent='';
  try{await api('/api/admin/team',{method:'POST',body:new FormData(e.target)});e.target.reset();listTeam();loadStats()}catch(x){$('terr').textContent=x.message}
  $('tbtn').textContent='Add member'};
$('teamList').onclick=async e=>{const id=e.target.dataset.delTeam;if(id&&confirm('Remove this member?')){await api('/api/admin/team/'+id,{method:'DELETE'});listTeam();loadStats()}};

$('sf').onsubmit=async e=>{e.preventDefault();$('sbtn').textContent='Saving…';$('serr').textContent='';
  const f=new FormData(e.target),body={};for(const[k,v]of f.entries())body[k]=v;
  try{await api('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});$('serr').textContent=''}catch(x){$('serr').textContent=x.message}
  $('sbtn').textContent='Save settings'};

show();
