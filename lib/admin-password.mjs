import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const pattern = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/u;
const dummyHash = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(64)}`;

/** @param {string} password @param {Buffer} salt @returns {Promise<Buffer>} */
function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** @param {string} password */
export async function hashAdminPassword(password) {
  if ([...password].length < 14 || Buffer.byteLength(password) > 256) {
    throw new Error("Mật khẩu phải có ít nhất 14 ký tự và không vượt quá 256 byte UTF-8.");
  }
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${key.toString("hex")}`;
}

/** @param {string} password @param {string | undefined} storedHash */
export async function verifyAdminPassword(password, storedHash) {
  const actual = storedHash && pattern.exec(storedHash);
  const [, salt, hash] = actual || pattern.exec(dummyHash);
  const key = await deriveKey(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(key, Buffer.from(hash, "hex")) && Boolean(actual);
}
