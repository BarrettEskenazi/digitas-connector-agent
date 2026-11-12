// Free public-company lookup. Only fixed Wikipedia endpoints are requested.
// Maintained identities cover names whose public meaning is easy for an LLM to confuse.
const IDENTITIES = [
 {name:'RentAHuman',aliases:['rentahuman','rentahuman ai','rentahuman.ai','rent a human'],summary:'RentAHuman is a marketplace connecting AI agents and people with humans who perform real-world and remote tasks. Its marketing must reach both task buyers/agent developers and human workers; it is not a marketplace selling synthetic workers.',sector:'social',website:'https://rentahuman.ai',source:'https://rentahuman.ai/about',title:'RentAHuman — About'},
 {name:'Nike',aliases:['nike','nike inc'],summary:'Nike designs and sells athletic footwear, apparel and sports equipment. A proposed Digitas engagement can connect brand storytelling, digital shopping and member/customer journeys.',sector:'retail',website:'https://www.nike.com',source:'https://about.nike.com',title:'Nike — Company information'},
 {name:'Chase',aliases:['chase','chase bank','jpmorgan chase'],summary:'Chase is the consumer and commercial banking business of JPMorgan Chase, offering banking, credit cards, lending and related financial services. Proposed marketing work must account for financial-services compliance.',sector:'finance',website:'https://www.chase.com',source:'https://www.chase.com/digital/resources/about-chase',title:'Chase — About Chase'},
 {name:'Toyota',aliases:['toyota','toyota motor corporation'],summary:'Toyota is an automotive manufacturer selling vehicles through a global dealer network. A proposed marketing engagement can connect vehicle discovery, test-drive or dealer leads, and owner/customer journeys.',sector:'auto',website:'https://global.toyota',source:'https://global.toyota/en/company/profile/',title:'Toyota — Company profile'}
];
const normalize=s=>s.toLowerCase().replace(/https?:\/\//g,'').replace(/www\./g,'').replace(/[^a-z0-9]/g,'');
const cache=new Map();
function maintained(name){
 const item=IDENTITIES.find(i=>i.aliases.some(a=>normalize(a)===normalize(name)));
 return item?{name:item.name,summary:item.summary,sector:item.sector,website:item.website,status:'identified',basis:'Maintained public-source company profile',sources:[{title:item.title,url:item.source}]}:null;
}
function sectorFor(summary){
 const text=summary.toLowerCase();
 if(/\b(bank|banking|financial|insurance|payments|credit)\b/.test(text))return 'finance';
 if(/\b(automotive|automaker|automobile|vehicles|motor vehicles)\b/.test(text))return 'auto';
 if(/\b(airline|lodging|hospitality|travel|hotel|cruise|homestays?|accommodation|vacation rentals?)\b/.test(text))return 'travel';
 if(/\b(health|healthcare|pharmaceutical|medical|biotechnology)\b/.test(text))return 'health';
 if(/\b(restaurant|fast food|coffeehouse|food service)\b/.test(text))return 'qsr';
 if(/\b(software|technology|robotics|electronics|marketplace|artificial intelligence|online platform)\b/.test(text))return 'tech';
 if(/\b(retailer|retail|footwear|apparel|clothing|cosmetics|department store)\b/.test(text))return 'retail';
 if(/\b(food|beverage|consumer goods|packaged goods)\b/.test(text))return 'cpg';
 return undefined;
}
async function lookupCompany(name){
 const known=maintained(name);if(known)return known;
 const key=normalize(name),cached=cache.get(key);if(cached&&cached.until>Date.now())return cached.result;
 const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:`${name} company`,gsrlimit:'4',prop:'extracts|info',exintro:'1',explaintext:'1',exsentences:'3',inprop:'url',format:'json'});
 let result={name,summary:'No confident public-source match found. Supply the official website or a one-sentence description to identify this business. The proposal below is provisional.',status:'unverified',basis:'Company identity needs confirmation',sources:[]};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 try{
  const response=await fetch(`https://en.wikipedia.org/w/api.php?${params}`,{headers:{'User-Agent':'DigitasConnectorStudentPrototype/1.0 (public company research)'},signal:controller.signal});
  if(response.ok){
   const data=await response.json();
   const pages=Object.values(data.query?.pages||{}).sort((a,b)=>a.index-b.index);
   const page=pages.find(p=>{
    const title=normalize(p.title);return p.extract&&key.length>=3&&(title.includes(key)||key.includes(title))&&/company|corporation|brand|bank|manufacturer|retailer|business|platform|airline|hotel|restaurant|organization|firm/i.test(p.extract);
   });
   if(page&&/^https:\/\/en\.wikipedia\.org\/wiki\//.test(page.fullurl||''))result={name:page.title,summary:page.extract.slice(0,1100),sector:sectorFor(page.extract),status:'identified',basis:'Public-source match from Wikipedia; verify the intended company',sources:[{title:page.title+' — Wikipedia',url:page.fullurl}]};
  }
 }catch(_){}finally{clearTimeout(timer);}
 cache.set(key,{result,until:Date.now()+(result.status==='identified'?300000:30000)});
 if(cache.size>100)cache.delete(cache.keys().next().value);
 return result;
}
module.exports={lookupCompany};
