// Run:  node totp-setup.js   -> prints a secret. Put it in .env as ADMIN_TOTP_SECRET and add it to your authenticator app.
const {generateSecret}=require('./lib/totp');
const s=generateSecret(),label=encodeURIComponent('GRr0upEvil Admin');
console.log('\nADMIN_TOTP_SECRET='+s+'\n');
console.log('Add it manually in your authenticator app (type: time-based), or open this URI as a QR code:');
console.log('otpauth://totp/'+label+'?secret='+s+'&issuer=GRr0upEvil\n');
