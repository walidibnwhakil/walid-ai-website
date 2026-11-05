import {parentPort,workerData} from 'node:worker_threads';import {simulate} from './simulation-v2.js';
const {pool,bank,indices}=workerData;let rows=[];
for(const i of indices){const target=pool[i];rows.push({ideal:simulate(target,pool,bank),noisy:simulate(target,pool,bank,{noisy:true})});if(rows.length===50){parentPort.postMessage(rows);rows=[];}}
if(rows.length)parentPort.postMessage(rows);parentPort.close();
