// Backs up data/ (copied) and uploads/ (hard-linked, so snapshots cost almost no extra disk) into backups/<timestamp>/.
// Uploaded files are never modified in place (replaced files get new random names), so hard links are safe snapshots.
// Keeps the newest BACKUP_KEEP (default 7). Run by hand: node backup.js, or set BACKUP_INTERVAL_HOURS in .env.
const fs=require('fs'),path=require('path');
const ROOT=__dirname,DATA=path.resolve(process.env.DATA_DIR||path.join(ROOT,'data')),UPLOADS=path.resolve(process.env.UPLOAD_DIR||path.join(ROOT,'uploads')),BACKUPS=path.resolve(process.env.BACKUP_DIR||path.join(ROOT,'backups')),KEEP=+process.env.BACKUP_KEEP||7;
function copyDir(src,dst,{link=false}={}){
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    if(entry.name.startsWith('.')||entry.name.endsWith('.tmp'))continue; // skip sessions + temp files
    const s=path.join(src,entry.name),d=path.join(dst,entry.name);
    if(entry.isDirectory())copyDir(s,d,{link});
    else if(link){try{fs.linkSync(s,d)}catch{fs.copyFileSync(s,d)}}
    else fs.copyFileSync(s,d);
  }
}
async function run(){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backupsDir=BACKUPS,dest=path.join(backupsDir,stamp);
  fs.mkdirSync(backupsDir,{recursive:true});
  if(fs.existsSync(DATA))copyDir(DATA,path.join(dest,'data'));
  if(fs.existsSync(UPLOADS))copyDir(UPLOADS,path.join(dest,'uploads'),{link:true});
  const all=fs.readdirSync(backupsDir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
  while(all.length>KEEP)fs.rmSync(path.join(backupsDir,all.shift()),{recursive:true,force:true});
  console.log('Backup saved to backups/'+stamp);
  return dest;
}
if(require.main===module)run().catch(e=>{console.error('Backup failed:',e.message);process.exit(1)});
module.exports=run;
