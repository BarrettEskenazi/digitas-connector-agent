const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'));
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/agent',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"code":"unavailable"}'}));
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   async function check(){const b=await page.evaluate(()=>cur().board);assert.equal(b.workstreams.reduce((s,w)=>s+w.share,0),100);assert.equal(b.contract.length,6);assert(b.workstreams.some(w=>w.responsible==='Digitas'));assert(b.ranking.length>=4&&b.ranking.length<=6);assert(b.workstreams.every(w=>typeof w.responsible==='string'&&typeof w.accountable==='string'));assert.equal(await page.locator('#log .err').count(),0);}
   for(const name of ['Nike','Chase','Toyota','Acme Widgets','rentahuman ai']){await page.locator('#co').fill(name);await page.locator('#coForm button').click();await check();assert.equal(await page.evaluate(()=>cur().board.opportunity.client),name);}
   async function send(text){await page.locator('#input').fill(text);await page.locator('#send').click();await check();
    if(text==='Add MSL')assert(await page.evaluate(()=>cur().board.workstreams.some(w=>w.responsible==='MSL')));
    if(text==='Remove MSL')assert(await page.evaluate(()=>cur().board.workstreams.every(w=>![w.responsible,w.accountable,w.consulted].includes('MSL'))));
    if(text==='Make Starcom the lead')assert(await page.evaluate(()=>cur().board.workstreams.every(w=>w.accountable==='Starcom')));
   }
   await send('Ok next is a company called rentahuman ai that needs social media marketing for their ai labor marketplace with 500,000 budget');
   assert.equal(await page.evaluate(()=>cur().board.fee),500000);assert.equal(await page.evaluate(()=>cur().board.lead.agency),'Digitas');assert.match(await page.evaluate(()=>cur().board.workstreams[0].name),/Social/);
   for(const text of ['Make Digitas the lead','Give Digitas a bigger share','Add Publicis Sapient','What could cause friction?']){await page.getByRole('button',{name:text,exact:true}).click();await check();}
   for(const text of ['Make Starcom the lead','Add MSL','Remove MSL','Set the fee to $2M','hi'])await send(text);
   assert.equal(await page.evaluate(()=>cur().board.fee),2000000);assert.match(await page.evaluate(()=>cur().board.contract[2].text),/2,000,000/);
   assert.equal(await page.evaluate(()=>cur().board.lead.agency),'Starcom');
   for(const n of ['1','2','3']){await page.selectOption('#rounds',n);await page.click('#refine');await check();}
   await page.click('[data-id="pepsico"]');
   for(const text of ['Make Digitas the lead','Give Digitas a bigger share','Add Publicis Sapient','What could cause friction?']){await page.getByRole('button',{name:text,exact:true}).click();assert.equal(await page.locator('.sources a').count(),2);await check();}
   await page.locator('#share-0').fill('73');await page.locator('#share-0').press('Tab');await check();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.click('#tab-external');await page.click('#tab-roi');await page.click('#tab-internal');
   assert.deepEqual(errors,[]);
   console.log(`${engine.name()} ${width}px: offline scenarios passed`);
   // Successful patch and stale response cannot overwrite user edits.
   await page.unroute('**/api/agent');
   await page.route('**/api/agent',async route=>{await new Promise(r=>setTimeout(r,150));await route.fulfill({json:{need:'Tailored hypothetical need',board:{fee:1,lead:{agency:'Outside agency'}}}});});
   await page.evaluate(()=>live=true);await page.locator('#co').fill('Nike');await page.locator('#coForm button').click();
   await page.waitForFunction(()=>cur().source==='ai');await check();assert.notEqual(await page.evaluate(()=>cur().board.fee),1);
   await page.locator('#coForm button').click();await send('Set the fee to $2M');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>cur().board.fee),2000000);
   await page.unroute('**/api/agent');
   await page.route('**/api/agent',route=>route.fulfill({status:503,json:{code:'unavailable'}}));
   await page.locator('#coForm button').click();await page.waitForFunction(()=>document.querySelector('#log').textContent.includes('Live AI is busy'));
   await check();assert.deepEqual(errors,[]);
   console.log(`${engine.name()} ${width}px: AI patch, stale reply and failure checks passed`);
   await page.close();
  }}finally{await browser.close();}
 }}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
