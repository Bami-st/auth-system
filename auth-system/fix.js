const fs = require('fs');

const zodFiles = [
  'src/app/(auth)/forgot-password/page.tsx',
  'src/app/(auth)/reset-password/page.tsx',
  'src/app/(auth)/signin/page.tsx',
  'src/app/(auth)/signup/page.tsx',
  'src/app/(auth)/verify-email/page.tsx',
  'src/app/api/auth/forgot-password/route.ts',
  'src/app/api/auth/resend-code/route.ts',
  'src/app/api/auth/reset-password/route.ts',
  'src/app/api/auth/signin/route.ts',
  'src/app/api/auth/signup/route.ts',
  'src/app/api/auth/verify-email/route.ts',
];

zodFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/validationResult\.error\.errors/g, 'validationResult.error.issues');
  content = content.replace(/error\.errors\.forEach\(err/g, 'error.issues.forEach((err: any)');
  content = content.replace(/error\.issues\[0\]\.message/g, 'error.issues[0].message');
  fs.writeFileSync(file, content);
});

// Fix argon2
const pwdFile = 'src/lib/auth/password.ts';
let pwdContent = fs.readFileSync(pwdFile, 'utf8');
pwdContent = pwdContent.replace(/const ARGON2_OPTIONS: argon2\.Options =/g, 'const ARGON2_OPTIONS: any =');
pwdContent = pwdContent.replace(/return argon2\.hash\(plaintext, ARGON2_OPTIONS\);/g, 'const hash = await argon2.hash(plaintext, ARGON2_OPTIONS);\n  return hash.toString();');
fs.writeFileSync(pwdFile, pwdContent);
