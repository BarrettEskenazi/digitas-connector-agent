// Strict structured output is supported by Groq GPT-OSS; no runtime dependency.
const text={type:'string'},number={type:'number'},integer={type:'integer'};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,description)=>({type:'array',items,...(description?{description}:{})});
const strings=description=>list(text,description);
const sisters=['Saatchi & Saatchi','Leo','Publicis Sapient','Epsilon','Starcom','Zenith','Spark Foundry','Performics','Publicis Commerce','MSL'];
const agency={type:'string',enum:['Digitas',...sisters]};
module.exports={type:'json_schema',json_schema:{name:'digitas_company_proposal',strict:true,schema:object({board:object({
 opportunity:object({need:text}),
 profile:object({business:text,audience:text,assumptions:strings('Three explicit assumptions, not established client facts.')}),
 proposal:object({title:text,summary:text,objectives:strings('Three proposed outcomes.'),scope:strings('Three to five scope items.'),exclusions:strings('Two exclusions.'),durationWeeks:integer}),
 ranking:list(object({agency:{type:'string',enum:sisters},fit:integer,relationship:integer,overlap:integer,role:text,why:text}),'Four to six Publicis sister candidates. Digitas is not a sister ranking entry.'),
 lead:object({agency,why:text}),
 workstreams:list(object({name:text,responsible:agency,accountable:agency,consulted:agency,share:number,hours:integer,costRate:number,deliverables:strings('Two concrete deliverables.')}),'Four to six workstreams. Digitas must own work; shares total 100.'),
 fee:number,
 budget:object({mediaSpend:number,productionSpend:number,contingency:number,rationale:text}),
 plan:list(object({phase:text,weeks:text,owner:agency,actions:strings('Two specific actions.'),deliverable:text,kpi:text}),'Exactly four sequential delivery phases covering the duration.'),
 kickoff:strings('Four kickoff steps.'),risks:strings('Three relevant risks.')
})})}};
