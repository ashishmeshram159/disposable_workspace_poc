// Generate Angular standalone components, pages, routes, and nav from mapping.json
// Usage (inside container): node generator.js [mapping.json]
const fs = require('fs');
const path = require('path');

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
const pascal = (s) => s.replace(/(^\w|[-_\s]\w)/g, (m) => m.replace(/[-_\s]/, '').toUpperCase());
const cmpClass = (name) => `${pascal(name)}Component`;
const cmpSelector = (name) => `app-${kebab(name)}`;
const ensureDir = (d) => fs.mkdirSync(d, { recursive: true });

/* Presets */
function presetHero(name) {
  return `import { Component, Input } from '@angular/core';

@Component({
  selector: '${cmpSelector(name)}',
  standalone: true,
  template: \`
<section class="hero">
  <h1>{{ props?.headline }}</h1>
  <p class="sub">{{ props?.subheadline }}</p>
  <button *ngIf="props?.ctaText">{{ props.ctaText }}</button>
</section>
\`,
  styles: [\`
.hero{padding:48px 24px; text-align:center; border-bottom:1px solid #eee}
.hero h1{margin:0 0 8px 0; font-size:40px; line-height:1.1}
.hero .sub{opacity:.8; margin:0 0 16px}
button{padding:10px 16px; border:1px solid #111; background:#fff; border-radius:8px; cursor:pointer}
\`]
})
export class ${cmpClass(name)} { @Input() props: any = {}; }
`;
}
function presetFeatureGrid(name) {
  return `import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: '${cmpSelector(name)}',
  standalone: true,
  imports: [NgFor, NgIf],
  template: \`
<section class="grid" *ngIf="props?.items?.length">
  <div class="card" *ngFor="let it of props.items">
    <h3>{{ it.title }}</h3>
    <p>{{ it.desc }}</p>
  </div>
</section>
\`,
  styles: [\`
.grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; padding:24px}
.card{border:1px solid #eee; border-radius:12px; padding:16px}
.card h3{margin:0 0 6px 0}
\`]
})
export class ${cmpClass(name)} { @Input() props: any = {}; }
`;
}
function presetRichText(name) {
  return `import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: '${cmpSelector(name)}',
  standalone: true,
  template: \`
<section class="rt" [innerHTML]="safeHtml"></section>
\`,
  styles: [\`
.rt{padding:24px; line-height:1.6}
.rt p{margin:0 0 12px}
\`]
})
export class ${cmpClass(name)} {
  @Input() set props(v: any) {
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(v?.html || '');
  }
  safeHtml: SafeHtml = '';
  constructor(private sanitizer: DomSanitizer) {}
}
`;
}
function presetFooter(name) {
  return `import { Component, Input } from '@angular/core';

@Component({
  selector: '${cmpSelector(name)}',
  standalone: true,
  template: \`
<footer class="footer">
  <span>{{ props?.text || '© Your Company' }}</span>
</footer>
\`,
  styles: [\`
.footer{padding:24px; border-top:1px solid #eee; text-align:center; margin-top:40px}
\`]
})
export class ${cmpClass(name)} { @Input() props: any = {}; }
`;
}
function presetFallback(name) {
  return `import { Component, Input } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  selector: '${cmpSelector(name)}',
  standalone: true,
  imports: [JsonPipe],
  template: \`
<section style="padding:16px; border:1px dashed #bbb; border-radius:12px">
  <strong>${name}</strong>
  <pre>{{ props | json }}</pre>
</section>
\`
})
export class ${cmpClass(name)} { @Input() props: any = {}; }
`;
}
const PRESETS = { 'hero': presetHero, 'feature-grid': presetFeatureGrid, 'rich-text': presetRichText, 'footer': presetFooter };

/* Writers */
function writeComponent(genDir, name, preset) {
  const file = path.join(genDir, `${kebab(name)}.component.ts`);
  const tplFn = PRESETS[preset] || presetFallback;
  fs.writeFileSync(file, tplFn(name), 'utf8');
}
function appStyles(projectDir) {
  const stylesPath = path.join(projectDir, 'src', 'styles.css');
  fs.writeFileSync(stylesPath, `/* Global styles */
*{box-sizing:border-box}
body{font-family: system-ui, Arial, sans-serif; margin:0; color:#111}
a{text-decoration:none; color:inherit}
nav{display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid #eee; align-items:center}
nav a.active{font-weight:700; text-decoration:underline}
.container{max-width:1000px; margin:0 auto}
`, 'utf8');
}
function writeAppComponent(appDir, pages) {
  const file = path.join(appDir, 'app.component.ts');
  const links = pages.map(p => {
    const route = p.route || '';
    const label = p.menuLabel || p.title || (route || 'Home');
    const href = route ? route : '';
    return `<a [routerLink]="'/${href}'" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">${label}</a>`;
  }).join('\n    ');
  fs.writeFileSync(file, `import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: \`
<nav class="container">
  <a [routerLink]="'/'" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Logo</a>
  <span style="flex:1"></span>
  ${links}
</nav>
<div class="container">
  <router-outlet></router-outlet>
</div>
\`
})
export class AppComponent {}
`, 'utf8');
}
function routeEntry(p) {
  const safeName = p.route ? p.route : 'home';
  const fileBase = `page-${kebab(safeName)}`;
  const className = `Page${pascal(safeName)}Component`;
  return { fileBase, className, importPath: `./generated/${fileBase}.component` };
}
function writeRoutes(appDir, pages) {
  const file = path.join(appDir, 'app.routes.ts');
  const items = pages.map(p => {
    const { className, importPath } = routeEntry(p);
    const pathSeg = p.route || '';
    return `{ path: '${pathSeg}', loadComponent: () => import('${importPath}').then(m => m.${className}) }`;
  }).join(',\n  ');
  fs.writeFileSync(file, `import { Routes } from '@angular/router';

export const routes: Routes = [
  ${items}
];
`, 'utf8');
}
function literal(tsValue) { return JSON.stringify(tsValue, null, 2); }
function writePageComponent(genDir, p) {
  const safeName = p.route ? p.route : 'home';
  const fileBase = `page-${kebab(safeName)}.component.ts`;
  const className = `Page${pascal(safeName)}Component`;

  const used = (p.sections || []).map(s => s.component).filter(Boolean);
  const uniqUsed = [...new Set(used)];
  if (p.footer?.component && !uniqUsed.includes(p.footer.component)) uniqUsed.push(p.footer.component);

  const importStmts = [`import { CommonModule } from '@angular/common';`]
    .concat(uniqUsed.map(n => `import { ${cmpClass(n)} } from './${kebab(n)}.component';`))
    .join('\n');

  const importsArr = ['CommonModule'].concat(uniqUsed.map(n => cmpClass(n))).join(', ');

  const fields = [];
  let bodyHtml = p.title ? `<h1 style="margin:24px 0">${p.title}</h1>\n` : '';
  (p.sections || []).forEach((s, idx) => {
    const field = `S${idx + 1}`;
    fields.push(`readonly ${field} = ${literal(s.props || {})};`);
    bodyHtml += `<${cmpSelector(s.component)} [props]="${field}"></${cmpSelector(s.component)}>\n`;
  });
  if (p.footer && p.footer.component) {
    const field = `S${fields.length + 1}`;
    fields.push(`readonly ${field} = ${literal(p.footer.props || {})};`);
    bodyHtml += `<${cmpSelector(p.footer.component)} [props]="${field}"></${cmpSelector(p.footer.component)}>\n`;
  }

  const file = path.join(genDir, fileBase);
  fs.writeFileSync(file, `${importStmts}

import { Component } from '@angular/core';

@Component({
  selector: '${cmpSelector('page-' + safeName)}',
  standalone: true,
  imports: [${importsArr}],
  template: \`
${bodyHtml.trim()}
\`
})
export class ${className} {
  ${fields.join('\n  ')}
}
`, 'utf8');
}

/* Main */
function main() {
  const mappingPath = process.argv[2] || 'mapping.json';
  const mapping = readJSON(mappingPath);

  const projectDir = path.join(process.cwd(), mapping.projectName);
  const appDir = path.join(projectDir, 'src', 'app');
  const genDir = path.join(appDir, 'generated');
  ensureDir(genDir);

  for (const c of (mapping.components || [])) writeComponent(genDir, c.name, c.preset);
  for (const p of (mapping.pages || [])) writePageComponent(genDir, p);

  writeRoutes(appDir, mapping.pages || []);
  writeAppComponent(appDir, mapping.pages || []);
  appStyles(projectDir);
}
main();
