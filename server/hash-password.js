#!/usr/bin/env node
/**
 * Usage: npm run hash-password -- 'her-secure-password'
 * Put the printed hash in ADMIN_PASSWORD_HASH on DigitalOcean.
 */
const bcrypt = require("bcryptjs");

const plain = process.argv[2];
if (!plain) {
  console.error("Usage: npm run hash-password -- 'your-password'");
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 12);
console.log(hash);
