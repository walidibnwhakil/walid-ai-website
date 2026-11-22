/* Riddlex owner review, kept inside the authenticated portal.
   Firestore owner permissions remain the final authority for every write. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  let started=false, auth=null, db=null;
  const scripts = [
    '/firebase-config.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
  ];
  function message(text){$('#riddlex-status').textContent=text}
  function loadScript(url){
    return new Promise((resolve,reject)=>{
      const el=document.createElement('script');el.src=url;el.async=false;
      el.onload=resolve;el.onerror=()=>reject(new Error('Could not load authentication tools.'));
      document.head.append(el);
    });
  }
  async function loadPending(){
    if(!db||!auth?.currentUser||auth.currentUser.isAnonymous){message('Use the authorized owner Google account to review submissions.');return}
    const list=$('#riddlex-pending');list.replaceChildren();message('Loading pending names…');
    try{
      const snapshot=await db.collection('riddlex_entries').where('status','==','pending').limit(60).get();
      if(snapshot.empty){message('No pending submissions.');return}
      message(snapshot.size+' pending submissions · '+(auth.currentUser.email||'signed in'));
      snapshot.forEach(doc=>{
        const data=doc.data(),item=document.createElement('article');item.className='riddlex-item';
        const name=document.createElement('h3');name.textContent=(data.nameEn||'Unnamed')+(data.nameBn?' · '+data.nameBn:'');
        const meta=document.createElement('p');meta.textContent=
          'Confirmations: '+Number(data.confirmations||0)+(data.adult?' · No image allowed':'');
        item.append(name,meta);
        if(typeof data.image==='string'&&!data.adult&&/^data:image\/(?:webp|jpeg);base64,/.test(data.image)){
          const image=document.createElement('img');image.src=data.image;image.alt='Submitted image for review';image.loading='lazy';item.append(image);
        }
        const actions=document.createElement('div');actions.className='toolbar';
        for(const status of ['approved','rejected']){
          const button=document.createElement('button');button.type='button';
          button.textContent=status==='approved'?'Approve':'Reject';
          if(status==='rejected')button.className='secondary-button';
          button.onclick=async()=>{
            button.disabled=true;message('Updating '+(data.nameEn||'entry')+'…');
            try{
              await doc.ref.update({status,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
              item.remove();message('Entry '+status+'. Changes saved to Firestore.');
            }catch(error){message('Update denied or failed. Verify that the Google account has owner access.');button.disabled=false}
          };
          actions.append(button);
        }
        item.append(actions);list.append(item);
      });
    }catch(error){message('Cannot read pending submissions. Sign in using the Firebase owner account.')}
  }
  async function activate(){
    if(!sessionStorage.getItem('walidAdminAccess'))return;
    if(started){if(auth?.currentUser&&!auth.currentUser.isAnonymous)void loadPending();return}
    started=true;message('Connecting to Firebase…');
    try{
      for(const url of scripts)await loadScript(url);
      if(!firebase.apps.length)firebase.initializeApp(window.WALID_FIREBASE_CONFIG);
      auth=firebase.auth();db=firebase.firestore();
      $('#riddlex-google').onclick=async()=>{
        try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());await loadPending()}
        catch{message('Google sign-in was cancelled or failed.')}
      };
      $('#riddlex-reload').onclick=loadPending;
      auth.onAuthStateChanged(user=>{
        $('#riddlex-google').textContent=user&&!user.isAnonymous?'Switch Google account':'Sign in with Google';
        if(user&&!user.isAnonymous)void loadPending();
        else message('Sign in with the authorized Firebase owner account.');
      });
    }catch(error){message(error.message);started=false}
  }
  function signOut(){if(auth?.currentUser)void auth.signOut().catch(()=>{});$('#riddlex-pending')?.replaceChildren()}
  window.WalidAdminApprovals={activate,signOut};
})();
