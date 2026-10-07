import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EXAMPLE_SCRIPT } from '../demoBank.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const css = fs.readFileSync(path.join(here, '../client/styles.css'), 'utf8');
const logo = fs.readFileSync(path.join(here, '../client/public/logo-mark.png')).toString('base64');
const boot = fs
  .readFileSync(path.join(here, 'share-boot.js'), 'utf8')
  .replace('__DATA__', JSON.stringify(EXAMPLE_SCRIPT).replace(/</g, '\\u003c'));
const html = fs
  .readFileSync(path.join(here, 'share-shell.html'), 'utf8')
  .replace('%%CSS%%', css)
  .replaceAll('%%LOGO%%', logo)
  .replace('%%BOOT%%', boot);
const out = path.join(root, '04_발표', '공명스테이션_예시.html');
fs.writeFileSync(out, html);
console.log('wrote', out, html.length);
