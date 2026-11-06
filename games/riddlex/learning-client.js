const api=()=>String(window.WALID_AI_API||'').replace(/\/$/,'');

export async function currentToken(){
 const auth=window.firebase?.apps?.length?window.firebase.auth():null;
 const user=auth?.currentUser;
 return user?user.getIdToken():'';
}

async function request(path,{method='GET',body}={}){
 const token=await currentToken();
 const controller=new AbortController(),timeout=method==='GET'?2500:20000,timer=setTimeout(()=>controller.abort(),timeout);
 let response;
 try{response=await fetch(api()+path,{method,signal:controller.signal,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 finally{clearTimeout(timer)}
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'Learning is temporarily unavailable.');
 return data;
}

export async function loadLearned(category){
 if(!api())return [];
 const results=await Promise.allSettled([
  request('/api/riddlex/knowledge?category='+encodeURIComponent(category)),
  currentToken().then(token=>token?request('/api/riddlex/private?category='+encodeURIComponent(category)):({entries:[]})),
 ]);
 const unique=new Map();
 for(const result of results)if(result.status==='fulfilled')for(const entry of result.value.entries||[])if(entry?.id&&entry?.name&&entry?.category===category&&entry.facts&&typeof entry.facts==='object'&&!(entry.visibility==='private'&&entry.approvedEntityId))unique.set(entry.id,entry);
 return [...unique.values()];
}

export async function submitLearning(body){
 if(!await currentToken())throw new Error('Sign in to your Walid AI account first so this target can be saved privately.');
 return request('/api/riddlex/submissions',{method:'POST',body});
}

export async function loadPrivateLearning(){return request('/api/riddlex/private');}
export async function deletePrivateLearning(id){return request('/api/riddlex/private/'+encodeURIComponent(id),{method:'DELETE'});}
export async function loadRevealImage(entry){
 if(entry.image?.data)return `data:${entry.image.mime};base64,${entry.image.data}`;
 if(!entry.imageAvailable)return '';
 const scope=entry.visibility==='private'?'private':'global';
 const result=await request('/api/riddlex/images/'+encodeURIComponent(entry.id)+'?scope='+scope);
 return result.image?.data?`data:${result.image.mime};base64,${result.image.data}`:'';
}
