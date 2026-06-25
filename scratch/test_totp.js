import * as OTPAuth from 'otpauth';

const secret = 'ZK6SBSDKJVPYG2KEVAVW3ZRMW4M6OJMX';
let totp = new OTPAuth.TOTP({
  issuer: 'ElderSea',
  label: 'ZeWolf929',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: OTPAuth.Secret.fromBase32(secret)
});

console.log("Searching for 708344 in range of -120 to +120 minutes...");
const targetCode = '708344';
let found = false;

// 30 seconds interval, 120 minutes is 240 intervals
for (let i = -240; i <= 240; i++) {
  const time = Date.now() + i * 30 * 1000;
  const code = totp.generate({ timestamp: time });
  if (code === targetCode) {
    console.log(`Found match! Time delta: ${i * 30} seconds (${(i * 30 / 60).toFixed(1)} minutes)`);
    console.log("Time at match:", new Date(time).toISOString());
    found = true;
    break;
  }
}

if (!found) {
  console.log("No match found in range of -120 to +120 minutes.");
}
