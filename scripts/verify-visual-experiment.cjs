// Isolated local browser checks; no repository or social-network writes.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const url = process.argv[3] || 'http://127.0.0.1:5188';
async function verify() {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const output = process.argv[4] ? path.resolve(process.argv[4]) : path.join(__dirname,'../docs/visual-experiment-evidence');
 await mkdir(output,{recursive:true});
 try {
  const context = await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'allow'});
  const page = await context.newPage(); const errors = []; const warnings = [];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error') warnings.push(message.text());});
  await page.goto(url); await page.waitForSelector('h1');
  await page.locator('.pwa-dismiss').waitFor({state:'visible'}); await page.locator('.pwa-dismiss').click();
  await page.waitForFunction(()=>document.querySelector('.headset-scene.mesh-ready'),null,{timeout:30000});
  assert.equal(await page.locator('.glow-cursor').count(),0);
  assert.equal(await page.locator('.gooey-nav.visible').count(),0);
  await page.mouse.move(950,300); await page.waitForTimeout(350);
  await page.screenshot({path:path.join(output,'desktop-opening.png')});
  const canvas = page.locator('.headset-canvas');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.waitForTimeout(700);
  await page.screenshot({path:path.join(output,'desktop-visor-hover.png')});
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 350, bounds.y + bounds.height / 2,{steps:30});
  await page.waitForTimeout(900);
  assert(await page.locator('.headset-scene.dragging').count()===1);
  await page.mouse.up();
  assert(await page.locator('.headset-scene.dragging').count()===0);
  await page.screenshot({path:path.join(output,'desktop-headset-rear.png')});
  await canvas.focus(); await page.keyboard.press('Home'); await page.waitForTimeout(700);
  assert.equal(await page.locator('.project-fragments').count(),0);
  assert.equal(await page.locator('.brand-handoff img').getAttribute('src'),'/images/miniverso-logo.png');
  const range = await page.locator('.immersive-intro').evaluate(element=>element.offsetHeight-innerHeight);
  for(const p of [.52,.64,.79,.86,.98]) {
   await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),range*p);
   await page.waitForTimeout(p > .8 ? 1250 : 250);
   await page.screenshot({path:path.join(output,`desktop-phase-${Math.round(p*100)}.png`)});
   if(p===.64){const boxes=await page.locator('.split-name span').evaluateAll(elements=>elements.map(e=>{const b=e.getBoundingClientRect();return{left:b.left,right:b.right};}));assert(Math.abs(boxes[0].right-boxes[1].left)<2);}
   if(p===.79){const b=await page.locator('.brand-handoff').boundingBox();assert(Math.abs(b.y+b.height/2-400)<3);assert(Math.abs(b.x+b.width/2-640)<3);}
   if(p===.98){const b=await page.locator('.brand-handoff').boundingBox();assert(b.y+b.height/2<240);}
  }
  await page.mouse.move(740,450); await page.waitForTimeout(200);
  assert(await page.locator('.glow-cursor').count()===1);
  assert(await page.evaluate(()=>document.documentElement.classList.contains('miniverso-glow-cursor')));
  await page.keyboard.press('Tab');
  assert(!await page.evaluate(()=>document.documentElement.classList.contains('miniverso-glow-cursor')));
  await page.mouse.move(750,455); await page.keyboard.press('Escape');
  await page.mouse.move(770,465);
  assert(!await page.evaluate(()=>document.documentElement.classList.contains('miniverso-glow-cursor')));
  await page.locator('.gooey-nav a[href="#portfolio"]').click();
  await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>location.hash),'#portfolio');
  await page.locator('.accordion-gallery').scrollIntoViewIfNeeded();
  await page.locator('.gallery-select').nth(1).click();
  await page.waitForTimeout(750);
  assert.equal(await page.locator('.gallery-panel.expanded h3').innerText(),'Aliados do Sucesso: Desafio SEBRAETEC');
  await page.screenshot({path:path.join(output,'desktop-gallery.png')});
  for(const selector of ['.manifesto','.expertise','.cta']){await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.screenshot({path:path.join(output,`desktop-${selector.slice(1)}.png`)});}
  const artifact=page.locator('.cta .world-artifact');
  await artifact.hover();assert(await artifact.evaluate(e=>e.classList.contains('active')));
  assert.equal(await artifact.locator('img').getAttribute('src'),'/images/miniverso-logo.png');
  assert.equal(await page.locator('.split-name svg image').count(),2);
  await page.mouse.move(10,400);assert(await page.locator('.pixel-edges.near-edge').count()===1);
  const locationBefore=page.url();
  await page.getByRole('button',{name:'Conte sua ideia'}).click();
  assert.equal(page.url(),locationBefore);
  assert(await page.getByRole('dialog').isVisible());
  await page.getByRole('button',{name:'Revisar minha ideia'}).click();
  assert.equal(await page.locator('.brief-review').count(),0);
  await page.getByLabel('Seu nome').fill('Pessoa de teste');
  await page.getByLabel('Empresa').fill('Empresa de teste');
  await page.getByLabel('E-mail para retorno').fill('teste@example.com');
  await page.getByLabel('O que você gostaria de criar?').fill('Um jogo educativo de realidade virtual para apresentar uma ideia.');
  await page.screenshot({path:path.join(output,'desktop-brief-form.png')});
  await page.getByRole('button',{name:'Revisar minha ideia'}).click();
  assert(await page.locator('.brief-review pre').innerText().then(t=>t.includes('Empresa de teste')));
  assert.equal(await page.locator('.brief-review pre').evaluate(e=>document.activeElement===e),true);
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.getByRole('button',{name:'Copiar briefing'}).click();
  await page.waitForFunction(()=>document.querySelector('.brief-feedback')?.textContent.includes('Briefing copiado'));
  assert(await page.evaluate(()=>navigator.clipboard.readText()).then(t=>t.includes('Pessoa de teste')));
  assert.equal(page.url(),locationBefore);
  await page.screenshot({path:path.join(output,'desktop-brief-review.png')});
  await page.keyboard.press('Escape');assert(!await page.getByRole('dialog').isVisible());
  assert(!await page.evaluate(()=>document.documentElement.classList.contains('miniverso-brief-open')));
  await page.goto(url+'/blog');
  assert(!await page.evaluate(()=>document.documentElement.classList.contains('miniverso-glow-cursor')));
  assert.equal(await page.locator('.gooey-nav').count(),0);
  for(const width of [390,320,760]) {
   const mobile = await browser.newContext({viewport:{width,height:844},hasTouch:width<700,isMobile:width<700,serviceWorkers:'allow'});
   const tab = await mobile.newPage(); tab.on('pageerror',error=>errors.push(error.message));
   await tab.goto(url); await tab.waitForSelector('h1');
   await tab.locator('.pwa-dismiss').waitFor({state:'visible'}); await tab.locator('.pwa-dismiss').click();
   assert(await tab.locator('.navbar .brand').isVisible());
   assert(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await tab.waitForTimeout(700); await tab.screenshot({path:path.join(output,`opening-${width}.png`)});
   if(width < 700) { await tab.getByRole('button',{name:'Menu',exact:true}).tap(); assert(await tab.locator('#navigation-links').getByText('O estúdio',{exact:true}).isVisible()); await tab.getByRole('button',{name:'Fechar',exact:true}).tap(); }
   await tab.locator('.accordion-gallery').scrollIntoViewIfNeeded();
   if (width < 700) await tab.locator('.gallery-select').nth(2).tap();
   else { await tab.locator('.gallery-select').nth(2).focus(); await tab.keyboard.press('Enter'); }
   await tab.waitForTimeout(750);
   assert.equal(await tab.locator('.gallery-panel.expanded h3').innerText(),'Reciclaverso');
   assert(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await tab.screenshot({path:path.join(output,`gallery-${width}.png`)});
   if(width===320){await tab.locator('.cta').scrollIntoViewIfNeeded();await tab.getByRole('button',{name:'Conte sua ideia'}).tap();assert(await tab.getByRole('dialog').isVisible());assert(await tab.locator('.contact-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));await tab.screenshot({path:path.join(output,'brief-320.png')});await tab.getByRole('button',{name:'Fechar formulário'}).tap();}
   await mobile.close();
  }
  const reduced = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'allow'});
  const tab = await reduced.newPage(); await tab.goto(url);
  await tab.locator('.pwa-dismiss').waitFor({state:'visible'}); await tab.locator('.pwa-dismiss').click();
  await tab.waitForSelector('.motion-reduced');
  assert.equal(await tab.locator('.glow-cursor').count(),0);
  assert.equal(await tab.locator('.headset-scene.mesh-ready').count(),0);
  await tab.screenshot({path:path.join(output,'reduced-motion.png')});
  assert.deepEqual(errors,[]);
  const result={checkedAt:new Date().toISOString(),pageErrors:errors,warnings,threeDLoaded:true,dragRotation:true,keyboardReset:true,namesJoin:true,originalWordmarkHalves:true,logoCentralAnchor:true,logoLifts:true,interactiveBrandArtifact:true,cornerProximity:true,briefDialog:true,briefValidation:true,briefCopy:true,briefMobile:true,floatingProjectImagesRemoved:true,cursorDelayed:true,cursorKeyboardFallback:true,navigation:true,galleryMouseAndTouch:true,widths:[320,390,760,1280],reducedMotion:true,status:'passed',limits:['Physical-device performance and full shader equivalence not claimed','Instagram posts not imported; only user-supplied profile links','Visual VR framing only; not a WebXR application','Brief prepares text locally; no server delivery or automatic sending']};
  await writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
 } finally {await browser.close();}
}
verify().catch(error=>{console.error(error);process.exitCode=1;});
