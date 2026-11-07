// Tiny JSON store: kept in memory, written atomically (tmp file + rename) so a crash can't corrupt it.
const fs=require('fs');
const stores=new Set();
class Store{
  constructor(file,def){
    this.file=file;this.timer=null;
    try{this.data=JSON.parse(fs.readFileSync(file,'utf8'))}catch{this.data=def}
    stores.add(this);
    if(!fs.existsSync(file))this.save();
  }
  save(){
    clearTimeout(this.timer);this.timer=null;
    const tmp=this.file+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(this.data,null,2));
    fs.renameSync(tmp,this.file);
  }
  // for high-frequency writes (visits, sessions): batch them
  saveSoon(ms=2000){if(this.timer)return;this.timer=setTimeout(()=>{try{this.save()}catch(e){console.error('save failed:',e.message)}},ms);this.timer.unref?.()}
}
function flushAll(){for(const s of stores)if(s.timer)try{s.save()}catch{}}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{flushAll();process.exit(0)});
process.on('exit',flushAll);
module.exports={Store,flushAll};
