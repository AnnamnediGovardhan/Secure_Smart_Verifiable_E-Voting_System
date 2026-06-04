// OTP verification (NEW). In production send via SMS/email provider.
const store = new Map(); // voterId -> { code, expires }

export function issueOtp(voterId) {
  const code = ("" + Math.floor(100000 + Math.random() * 900000));
  store.set(voterId, { code, expires: Date.now() + 5 * 60 * 1000 });
  console.log(`[otp] ${voterId} -> ${code} (deliver via SMS/email in prod)`);
  return true;
}

export function verifyOtp(voterId, code) {
  const e = store.get(voterId);
  if (!e || e.expires < Date.now()) return false;
  const ok = e.code === code;
  if (ok) store.delete(voterId);
  return ok;
}
