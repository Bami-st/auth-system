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
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/result\.error\.errors/g, 'result.error.issues');
    fs.writeFileSync(file, content);
  }
});
