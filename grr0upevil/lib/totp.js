// RFC 6238 TOTP (Google Authenticator / Authy / 1Password compatible), no dependencies.
const crypto=require('crypto');
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32decode(s){
  let bits='';for(const c of s.replace(/[\s=]/g,'').toUpperCase()){const i=A.indexOf(c);if(i<0)throw new Error('bad base32');bits+=i.toString(2).padStart(5,'0')}
  const out=[];for(let i=0;i+8<=bits.length;i+=8)out.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(out);
}
function b32encode(buf){let bits='',out='';for(const b of buf)bits+=b.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i+=5)out+=A[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return out}
function hotp(key,counter){
  const c=Buffer.alloc(8);c.writeBigUInt64BE(BigInt(counter));
  const h=crypto.createHmac('sha1',key).update(c).digest(),o=h[19]&15;
  return String(((h.readUInt32BE(o)&0x7fffffff)%1e6)).padStart(6,'0');
}
function verify(secret,code,now=Date.now()){
  code=String(code||'').replace(/\s/g,'');if(!/^\d{6}$/.test(code))return false;
  let key;try{key=b32decode(secret)}catch{return false}
  const step=Math.floor(now/30000);let ok=false;
  for(const d of[-1,0,1]){const exp=hotp(key,step+d);if(crypto.timingSafeEqual(Buffer.from(exp),Buffer.from(code)))ok=true}
  return ok;
}
const generateSecret=()=>b32encode(crypto.randomBytes(20));
module.exports={verify,generateSecret,hotp,b32decode};
