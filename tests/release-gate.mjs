import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../docs/activation-status.json',import.meta.url),'utf8'));
const pending=Object.entries(data).filter(([,value])=>value!==true).map(([key])=>key);
if(pending.length){console.error('COMMERCIAL RELEASE BLOCKED:',pending.join(', '));process.exitCode=1;}else console.log('Evidence checks complete; manual production approval still required.');
