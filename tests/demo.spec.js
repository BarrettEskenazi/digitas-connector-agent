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
   async function check(){const b=await page.evaluate(()=>cur().board);assert.equal(b.workstreams.reduce((s,w)=>s+w.share,0),100);assert.equal(b.contract.length,6);assert(b.workstreams.some(w=>w.responsible==='Digitas'));assert(b.ranking.length>=4&&b.ranking.length<=6);assert(b.workstreams.every(w=>typeof w.responsible==='string'&&typeof w.accountable==='string'));assert.equal(await page.locator('#log .err').count(),0);
    assert(b.proposal.summary.length>100);assert.equal(b.plan.length,4);assert(b.plan.every(p=>p.actions.length>=2&&p.deliverable&&p.kpi));
    assert(b.workstreams.every(w=>w.deliverables.length&&Number.isFinite(w.hours)&&Number.isFinite(w.costRate)));
    const f=await page.evaluate(()=>financials(cur().board));assert.equal(f.rows.reduce((s,w)=>s+w.revenue,0),b.fee);assert.equal(f.contribution,b.fee-f.cost);
    assert.equal(await page.locator('#full-proposal').count(),1);assert.equal(await page.locator('#delivery-plan').count(),1);assert.equal(await page.locator('#cost-breakdown').count(),1);
   }
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
   // Entire proposal may change team, fee and scope; edits reject stale replies.
   await page.unroute('**/api/agent');
   await page.route('**/api/agent',async route=>{
    const request=route.request().postDataJSON();assert.equal(request.fullProposal,true);
    const board=await page.evaluate(()=>{
     const b=structuredClone(cur().board);b.opportunity.need='Connect athletic product discovery to member conversion.';
     b.proposal.title='Nike: member discovery pilot';b.proposal.summary='A company-specific Nike proposal connecting athlete-led product discovery to a measured member journey and commerce conversion pilot. Digitas and complementary specialists coordinate a controlled launch.';
     b.lead={agency:'Publicis Sapient',why:'Owns the commerce platform work in this proposal.'};b.fee=275000;
     b.workstreams[0].name='Athlete-led member activation';b.workstreams.forEach(w=>w.accountable='Publicis Sapient');return b;
    });
    await new Promise(r=>setTimeout(r,300));board.plan.splice(1,0,'');board.workstreams=[board.workstreams[0],board.workstreams[1],board.workstreams[4]];board.lead.agency='Sapient';board.workstreams[2].responsible='Sapient';await route.fulfill({json:board});
   });
   await page.evaluate(()=>live=true);await page.locator('#co').fill('Nike');await page.locator('#coForm button').click();
   await page.waitForFunction(()=>cur().source==='ai');await check();
   assert.equal(await page.evaluate(()=>cur().board.fee),275000);assert.equal(await page.evaluate(()=>cur().board.lead.agency),'Publicis Sapient');
   assert.match(await page.locator('#full-proposal').textContent(),/Nike: member discovery pilot/);
   assert.match(await page.evaluate(()=>cur().board.contract[1].text),/Publicis Sapient/);
   await page.locator('#passThrough').fill('50000');await page.locator('#passThrough').press('Tab');
   assert.equal(await page.evaluate(()=>financials(cur().board).investment),325000);
   await page.locator('.cost-hours').first().fill('100');await page.locator('.cost-hours').first().press('Tab');
   assert.equal(await page.evaluate(()=>financials(cur().board).rows[0].cost),10000);
   assert.match(await page.evaluate(()=>summaryText()),/Delivery plan/);assert.match(await page.evaluate(()=>summaryText()),/325,000/);
   await page.locator('#coForm button').click();await send('Set the fee to $2M');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>cur().board.fee),2000000);
   await page.unroute('**/api/agent');
   await page.route('**/api/agent',route=>route.fulfill({json:{board:{lead:{agency:'Outside agency'},fee:1}}}));
   await page.locator('#coForm button').click();await page.waitForFunction(()=>document.querySelector('#log').textContent.includes('Live AI is busy'));await check();
   assert.equal(await page.evaluate(()=>cur().source),'builtin');
   await page.unroute('**/api/agent');
   await page.route('**/api/agent',route=>route.fulfill({status:503,json:{code:'unavailable'}}));
   await page.locator('#coForm button').click();await page.waitForFunction(()=>document.querySelector('#log').textContent.includes('Live AI is busy'));
   await check();assert.deepEqual(errors,[]);
   console.log(`${engine.name()} ${width}px: full proposal, economics, stale reply and failure checks passed`);
   await page.close();
  }}finally{await browser.close();}
 }}finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
