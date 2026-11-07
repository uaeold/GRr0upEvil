// File-backed session store (no extra dependency): sessions survive restarts and expired ones get swept.
const session=require('express-session');
const {Store}=require('./jsondb');
const DEFAULT_TTL=6*3600e3;
module.exports=function(file){
  class FileStore extends session.Store{
    constructor(){
      super();this.s=new Store(file,{});
      const sweep=()=>{const now=Date.now();let ch=false;for(const[k,v]of Object.entries(this.s.data))if(v.exp<now){delete this.s.data[k];ch=true}if(ch)this.s.saveSoon(1000)};
      sweep();setInterval(sweep,15*60e3).unref();
    }
    _exp(sess){const e=sess&&sess.cookie&&sess.cookie.expires;return e?new Date(e).getTime():Date.now()+DEFAULT_TTL}
    get(sid,cb){const r=this.s.data[sid];if(!r||r.exp<Date.now()){if(r){delete this.s.data[sid];this.s.saveSoon(1000)}return cb(null,null)}cb(null,r.sess)}
    set(sid,sess,cb){this.s.data[sid]={sess:JSON.parse(JSON.stringify(sess)),exp:this._exp(sess)};this.s.saveSoon(1000);cb&&cb()}
    touch(sid,sess,cb){const r=this.s.data[sid];if(r){r.sess.cookie=JSON.parse(JSON.stringify(sess.cookie));r.exp=this._exp(sess);this.s.saveSoon(5000)}cb&&cb()}
    destroy(sid,cb){delete this.s.data[sid];this.s.saveSoon(1000);cb&&cb()}
  }
  return new FileStore();
};
