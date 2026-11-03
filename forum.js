'use strict';
globalThis.POURMIND_FORUM_UI = (() => {
 let a, client, user=null, generation=0, current=null;
 const e=x=>a.escapeHTML(String(x??''));
 const button=(action,label,id='',kind='')=>`<button type="button" class="button secondary" data-forum="${action}" data-id="${e(id)}" data-kind="${e(kind)}">${e(label)}</button>`;
 const field=(name,label,value='',area=false)=>`<label class="input-label" for="forum-${name}">${e(label)}</label>${area?`<textarea class="input" rows="4" id="forum-${name}" name="${name}" required maxlength="4000">${e(value)}</textarea>`:`<input class="input" id="forum-${name}" name="${name}" value="${e(value)}" required maxlength="100">`}`;
 const password=(name,label)=>`<label class="input-label" for="forum-${name}">${label}</label><input class="input" id="forum-${name}" name="${name}" type="password" maxlength="1024" required autocomplete="${name==='new-password'?'new-password':'current-password'}" ${name==='new-password'?'minlength="8"':''}>`;
 const message=error=>error?.message||'The community service is unavailable. Please try again.';
 const status=r=>r.status&&r.status!=='published'?`<p class="forum-status" role="status">${r.status==='pending'?'Pending moderation — visible only to you and moderators.':'Removed by a moderator — hidden from the community.'}</p>`:'';
 async function rpc(name,args={}) {const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
 function shell(){
  a.main.innerHTML=`<section class="page-heading"><div class="eyebrow">Made behind the bar</div><h1>Community recipes</h1><p>Share a measured recipe. Try someone else’s creation and leave useful tasting notes.</p></section><div class="actions">${button('new','Post a recipe')}${client?.isDemo?button('account','Switch test user'):button(user?'signout':'account',user?'Sign out':'Sign in')}${user?button('safety','Account & safety'):''}${button('rules','Community rules & support')}<button class="button secondary" data-view="private-recipes">Private recipes</button></div>${client?.isDemo?`<section class="surface forum-demo-notice" role="note"><strong>Community demo · ${e(client.person().name)}</strong><p>Sample recipes and test users. Changes stay in this browser${client.storageAvailable()?'':' for this visit only'} and are not shared with other people. No account or password needed.</p><div class="actions">${button('demo-reset','Reset demo')}${button('demo-exit','Exit demo')}</div></section>`:''}<div id="forum-content" aria-live="polite"></div>`;
 }
 async function render(){
  const token=++generation;shell();const box=a.main.querySelector('#forum-content');
  if(!client){box.innerHTML='<div class="empty-state"><h2>Community is being prepared.</h2><p>The shared recipe service has not been connected yet. Your private recipes are available on this device.</p><button class="button" data-forum="demo-start">Try community demo</button><p>No account needed. Try sample recipes, posting and reviews in this browser.</p></div>';return;}
  box.innerHTML='<p role="status">Loading community recipes…</p>';
  try{
   const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;
   if(token!==generation||!a.main.querySelector('#forum-content'))return;shell();
   a.main.querySelector('#forum-content').innerHTML=`<form id="forum-search" class="actions"><label for="forum-search-text">Find a recipe</label><input class="input" id="forum-search-text" name="search" maxlength="100" placeholder="Name or ingredient"><label for="forum-kind">Drink type</label><select class="input" id="forum-kind" name="kind"><option value="">All drinks</option><option>Cocktail</option><option>Shot</option></select><button class="button">Search</button></form><div id="forum-feed" class="recipe-grid" aria-live="polite"></div><div id="forum-mod"></div>`;
   await loadFeed('','',token);
   if(user){
    const reports=await rpc('forum_moderation');
    if(token===generation&&a.main.querySelector('#forum-mod')&&reports!==null){
     const requests=await rpc('forum_support_queue');
     if(token!==generation||!a.main.querySelector('#forum-mod'))return;
     a.main.querySelector('#forum-mod').innerHTML=`<section class="forum-moderation"><h2>Moderation workspace</h2><p>Review reports promptly. Inspect the content and explain each decision. Resolved reports remain available for restoring content or reinstating an account.</p>${reports.map(r=>`<article class="forum-card"><small>${e(r.kind)} · ${r.resolved?'Resolved':'Needs review'}${r.pending?' · Filtered':''}${r.hidden?' · Removed':''}${r.suspended?' · Author suspended':''}</small><h3>${e(r.title)}</h3><p>By ${e(r.author)}</p><p class="preserve-lines">${e(r.content)}</p><p><strong>Report:</strong> ${e(r.reason)}</p><div class="actions">${button('decision','Remove content',r.id,'remove')}${button('decision','Approve / restore content',r.id,'restore')}${button('decision',r.suspended?'Reinstate author':'Suspend author',r.id,r.suspended?'unsuspend':'suspend')}${button('decision','Dismiss report',r.id,'dismiss')}</div></article>`).join('')||'<p>No reports.</p>'}<h3>Support requests</h3>${(requests||[]).map(r=>`<article class="forum-card"><small>${r.resolved?'Resolved':'Awaiting reply'}</small><p class="preserve-lines">${e(r.message)}</p>${r.reply?`<p><strong>Your reply:</strong> ${e(r.reply)}</p>`:''}${button('support-reply','Reply to request',r.id)}</article>`).join('')||'<p>No support requests.</p>'}</section>`;
    }
   }
  }catch(error){if(token===generation&&a.main.querySelector('#forum-content'))a.main.querySelector('#forum-content').innerHTML=`<div class="empty-state"><h2>Unable to load community.</h2><p>${e(message(error))}</p>${button('refresh','Try again')}</div>`;}
 }
 async function loadFeed(search='',kind='',token=generation){
  const recipes=await rpc('forum_list',{search_text:search,recipe_kind:kind});
  if(token!==generation||!a.main.querySelector('#forum-feed'))return;
  a.main.querySelector('#forum-feed').innerHTML=recipes.map(r=>`<article class="forum-card"><small>${e(r.kind)} · By ${e(r.author)}</small><h2>${e(r.title)}</h2>${status(r)}<p>${e(r.notes.slice(0,180))}</p><p>${r.rating?`${e(r.rating)} / 5 · ${e(r.review_count)} review${r.review_count===1?'':'s'}`:'No reviews yet'}</p>${button('open','View recipe & reviews',r.id)}</article>`).join('')||'<div class="empty-state"><h2>No recipes found.</h2><p>Try another search or share your own measured recipe. Blocked authors are hidden while you’re signed in.</p></div>';
 }
 function rules(){
  const email=globalThis.POURMIND_FORUM_CONFIG?.supportEmail;
  a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Community rules & support</h2><p>Share original, measured drink recipes and constructive tasting notes. Respect other people and credit your inspiration.</p><ul><li>No harassment, threats, hateful or sexually exploitative content.</li><li>No spam, advertising links, impersonation, or private personal information.</li><li>No encouragement of dangerous or excessive drinking.</li><li>Only share content you have permission to publish.</li></ul><p>Reports go privately to moderators. Filtered content stays out of the public feed until approved. Moderators can remove content and suspend accounts. Blocking hides an author’s recipes and reviews for you and prevents review interactions while signed in; public content can still be read when signed out.</p><p>Appeal a moderation decision or ask for help below. Replies appear in Account & safety.</p>${email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?`<p>Contact: <a href="mailto:${e(email)}">${e(email)}</a></p>`:''}${user?`<form id="forum-support">${field('message','Your question or appeal','',true)}<p role="alert"></p><button class="button">Send support request</button></form>`:button('account','Sign in to contact support')}${client?.isDemo?'<p>Demo support requests stay in this browser. No real support team is notified.</p>':''}</div>`);
 }
 function account(){
  if(client?.isDemo){a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Choose a test user</h2><p>Try a creator, reviewer or moderator. These are not real accounts. Reset demo restores deleted test users.</p><div class="actions">${client.availablePeople().map(p=>button('demo-person',p.name,p.id)).join('')}</div></div>`);return;}
  if(!client){a.toast('Community needs a shared database connection before sign-in is available.');return;}
  a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Your community account</h2><p>Sign in to post and review. Your email stays private.</p><form id="forum-account"><label class="input-label" for="forum-email">Email</label><input class="input" id="forum-email" name="email" type="email" required autocomplete="email">${password('password','Password')}<label class="check-label"><input type="checkbox" name="rules" value="accepted"> I agree to the Community rules when creating an account.</label>${button('rules','Read Community rules')}<p role="alert"></p><div class="actions">${button('reset','Reset password')}<button class="button" name="mode" value="login">Sign in</button><button class="button secondary" name="mode" value="signup">Create account</button></div></form></div>`);
 }
 async function safety(){
  if(!user)return account();
  const [data,history]=await Promise.all([rpc('forum_safety'),rpc('forum_support_history')]);
  a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Account & safety</h2>${data?.suspended?'<p role="alert">Your community account is suspended. You can appeal through support or delete your account.</p>':''}<h3>Blocked members</h3><p>Blocked authors are hidden for you while signed in. Unblocking does not notify them.</p>${data?.blocks?.map(b=>`<div class="forum-review"><strong>${e(b.name)}</strong>${button('unblock','Unblock member',b.id)}</div>`).join('')||'<p>You haven’t blocked anyone.</p>'}${client.isDemo?'<p>These are demo accounts. No real passwords are stored.</p>':`<h3>Change password</h3><form id="forum-change-password">${password('current-password','Current password')}${password('new-password','New password')}<p role="alert"></p><button class="button">Change password</button></form>`}<h3>Support & appeals</h3>${button('rules','Contact support / read rules')}${(history||[]).map(r=>`<article class="forum-review"><p>${e(r.message)}</p><p><strong>${r.reply?'Support reply:':'Status:'}</strong> ${e(r.reply||(r.resolved?'Resolved':'Awaiting reply'))}</p></article>`).join('')}<h3>Delete account</h3><p>Deletion permanently removes your community account, published recipes, reviews, blocks and support requests. Private recipes, favorites and My bar on this device stay saved.</p>${button('delete-account','Delete my account')}</div>`);
 }
 function deleteAccountForm(){
  if(!user)return account();
  a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Permanently delete account</h2><p>${client.isDemo?'This deletes the selected demo user and their demo content in this browser only. Reset demo can restore the starting examples.':'This permanently deletes your account and community content. It cannot be undone. Your private device data stays saved.'}</p><form id="forum-delete-account">${client.isDemo?'':password('delete-password','Current password')}${field('confirmation','Type DELETE to confirm')}<p role="alert"></p><button class="button danger">${client.isDemo?'Delete demo account':'Permanently delete my account'}</button></form></div>`);
 }
 function editor(recipe={}){
  if(!user)return account();current=recipe.id||null;
  a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">${current?'Edit your recipe':'Post a recipe'}</h2><p>${client.isDemo?'This saves a demo recipe in this browser only.':'This publishes to the community.'} Use whole or half ounces, minimum 0.5 oz. An edit starts a new recipe version; older reviews remain labeled. Content flagged by the filter is held for moderation.</p><form id="forum-post">${field('title','Recipe name',recipe.title)}${field('author','Public display name',recipe.author||(client.isDemo?client.person().name:''))}<label class="input-label" for="forum-type">Drink type</label><select class="input" id="forum-type" name="kind"><option${recipe.kind==='Cocktail'?' selected':''}>Cocktail</option><option${recipe.kind==='Shot'?' selected':''}>Shot</option></select>${field('ingredients','Measured ingredients — one per line',(recipe.ingredients||[]).join('\n'),true)}<p>For example: 2 oz gin, 0.5 oz lemon juice, or 2 dashes bitters.</p>${field('steps','Method — one step per line',(recipe.steps||[]).join('\n'),true)}${field('glass','Glass',recipe.glass)}${field('garnish','Garnish (or None)',recipe.garnish)}${field('notes','Why it works / tasting notes',recipe.notes,true)}<p role="alert"></p><button class="button">${client.isDemo?(current?'Save updated demo recipe':'Save demo recipe'):(current?'Publish updated recipe':'Publish recipe')}</button></form></div>`);
 }
 async function open(id){
  const data=await rpc('forum_get',{recipe_id:id});if(!data)throw Error('This recipe is unavailable or its author is blocked.');const r=data.recipe;current=r;
  a.openDialog(`<div class="dialog-body"><div class="eyebrow">${client.isDemo?'Demo · Saved in this browser only':'Community'} · ${e(r.kind)} · Version ${r.version}</div><h2 id="dialog-title">${e(r.title)}</h2><p>By ${e(r.author)}</p>${status(r)}${r.is_owner?`<div class="actions">${r.status!=='removed'?button('edit','Edit recipe'):''}${button('delete-recipe','Delete recipe',r.id)}</div>`:''}<h3>What you’ll need</h3><ul>${r.ingredients.map(x=>`<li>${e(x)}</li>`).join('')}</ul><h3>How to make it</h3><ol>${r.steps.map(x=>`<li>${e(x)}</li>`).join('')}</ol><p><strong>Glass:</strong> ${e(r.glass)}<br><strong>Garnish:</strong> ${e(r.garnish)}</p><h3>Why it works</h3><p class="preserve-lines">${e(r.notes)}</p><h3>Reviews & tasting notes</h3>${data.reviews.map(v=>`<article class="forum-review"><strong>${e(v.author)} · ${v.rating} / 5</strong>${status(v)}${v.version!==r.version?'<p><small>Reviewed an earlier recipe version</small></p>':''}<p class="preserve-lines">${e(v.body)}</p><div class="actions">${v.is_owner?button('delete-review','Delete review',v.id):user?button('report','Report review',v.id,'review')+button('block','Block reviewer',v.id,'review'):''}</div></article>`).join('')||'<p>No reviews yet.</p>'}${!user?button('account','Sign in to review'):r.is_owner?'<p>Try another creator’s recipe to leave a review.</p>':r.status&&r.status!=='published'?'':`<form id="forum-review" data-id="${r.id}">${field('author','Public display name',data.reviews.find(v=>v.is_owner)?.author||(client.isDemo?client.person().name:''))}<label class="input-label" for="forum-rating">Rating</label><select id="forum-rating" class="input" name="stars">${[5,4,3,2,1].map(n=>`<option>${n}</option>`).join('')}</select>${field('body','What worked? What would you change?',data.reviews.find(v=>v.is_owner)?.body||'',true)}<p role="alert"></p><button class="button">Save review</button><p>One review per person. Saving again updates your review.</p></form>`}${user&&!r.is_owner?`<div class="actions">${button('report','Report a problem',r.id,'recipe')}${button('block','Block recipe author',r.id,'recipe')}</div>`:''}</div>`);
 }
 async function handleClick(b){
  const id=b.dataset.id,kind=b.dataset.kind;
  switch(b.dataset.forum){
   case'demo-start':case'demo-exit':{const url=new URL(location.href);if(b.dataset.forum==='demo-start')url.searchParams.set('community-demo','1');else url.searchParams.delete('community-demo');url.hash='community';location.assign(url.href);break;}
   case'demo-reset':if(confirm('Reset only the community demo? Your private recipes and app settings will stay saved.')){client.reset();await render();}break;
   case'demo-person':client.switchPerson(id);a.dialog.close();await render();break;
   case'refresh':await render();break;
   case'account':account();break;
   case'rules':rules();break;
   case'safety':await safety();break;
   case'delete-account':deleteAccountForm();break;
   case'unblock':await rpc('forum_unblock',{blocked_user:id});await render();await safety();break;
   case'block':if(confirm('Block this member? Their recipes and reviews will be hidden for you while signed in.')){await rpc('forum_block',{target_id:id,target_kind:kind});a.dialog.close();await render();a.toast('Member blocked. Manage blocked members in Account & safety.');}break;
   case'reset':{const email=document.getElementById('forum-email');if(!email.reportValidity())break;const {error}=await client.auth.resetPasswordForEmail(email.value,{redirectTo:location.href.split('#')[0]+'#community'});if(error)throw error;document.querySelector('#forum-account [role=alert]').textContent='If that email has an account, a reset link will arrive shortly.';break;}
   case'new':editor();break;
   case'edit':editor(current);break;
   case'open':await open(id);break;
   case'signout':{const {error}=await client.auth.signOut();if(error)throw error;user=null;await render();break;}
   case'delete-recipe':case'delete-review':if(confirm('Delete your published content?')){await rpc('forum_delete',{target_id:id,target_kind:b.dataset.forum==='delete-recipe'?'recipe':'review'});a.dialog.close();await render();}break;
   case'report':a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Report ${kind==='review'?'a review':'a recipe'}</h2><p>Your report is private to moderators. For immediate control, you can also block the author.</p><form id="forum-report" data-id="${e(id)}" data-kind="${e(kind||'recipe')}">${field('reason','Explain the problem','',true)}<p role="alert"></p><button class="button">Send report</button></form></div>`);break;
   case'decision':a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">${e(b.textContent)}</h2><p>This changes the real community when connected. Explain your decision for the moderation record.</p><form id="forum-decision" data-id="${e(id)}" data-kind="${e(kind)}">${field('explanation','Reason for this decision','',true)}<p role="alert"></p><button class="button">Confirm moderation action</button></form></div>`);break;
   case'support-reply':a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Reply to support request</h2><form id="forum-support-reply" data-id="${e(id)}">${field('response','Your reply','',true)}<p role="alert"></p><button class="button">Send reply</button></form></div>`);break;
  }
 }
 async function handleSubmit(form,submit){
  const values=Object.fromEntries(new FormData(form));
  switch(form.id){
   case'forum-password-reset':{const {error}=await client.auth.updateUser({password:values['new-password']});if(error)throw error;a.dialog.close();a.toast('Password updated.');await render();break;}
   case'forum-change-password':{const verified=await client.auth.signInWithPassword({email:user.email,password:values['current-password']});if(verified.error)throw verified.error;if(verified.data.user.id!==user.id)throw Error('Sign in again.');const {error}=await client.auth.updateUser({password:values['new-password']});if(error)throw error;await safety();a.toast('Password updated.');break;}
   case'forum-delete-account':{
    if(values.confirmation!=='DELETE')throw Error('Type DELETE exactly to confirm.');
    const result=client.isDemo?await client.deleteAccount():await client.functions.invoke('delete-account',{body:{confirmation:values.confirmation,password:values['delete-password']}});
    if(result.error){let detail;try{detail=await result.error.context?.json();}catch{}throw Error(detail?.error||'Account deletion could not be completed. Your account has not been confirmed deleted. Please retry or contact support.');}
    if(result.data?.deleted!==true)throw Error('Deletion was not confirmed. Please contact support.');
    if(!client.isDemo){try{await client.auth.signOut({scope:'local'});}catch{}user=null;}
    a.dialog.close();await render();a.toast(client.isDemo?'Demo account deleted. Reset demo restores the starting test users.':'Account and community content deleted. Your private device data is unchanged.');break;
   }
   case'forum-search':await loadFeed(values.search,values.kind);break;
   case'forum-account':{
    if(submit.value==='signup'&&values.password.length<8)throw Error('Use a password of at least 8 characters.');
    if(submit.value==='signup'&&values.rules!=='accepted')throw Error('Read and agree to the Community rules before creating an account.');
    const result=submit.value==='signup'?await client.auth.signUp({email:values.email,password:values.password,options:{emailRedirectTo:location.href.split('#')[0]+'#community',data:{community_rules_version:'2026-11'}}}):await client.auth.signInWithPassword({email:values.email,password:values.password});
    if(result.error)throw result.error;user=result.data.user;if(!result.data.session){user=null;form.querySelector('[role=alert]').textContent='Check your email to confirm your account, then sign in.';}else{a.dialog.close();await render();}break;
   }
   case'forum-post':{values.ingredients=values.ingredients.split('\n').map(x=>x.trim()).filter(Boolean);values.steps=values.steps.split('\n').map(x=>x.trim()).filter(Boolean);const id=await rpc('forum_publish',{recipe:values,recipe_id:current||null});await render();await open(id);break;}
   case'forum-review':await rpc('forum_review',{recipe_id:form.dataset.id,display_name:values.author,stars:Number(values.stars),tasting_notes:values.body});await render();await open(form.dataset.id);break;
   case'forum-report':await rpc('forum_flag',{target_id:form.dataset.id,target_kind:form.dataset.kind,reason:values.reason});a.dialog.close();a.toast(client.isDemo?'Demo report saved. Switch to Moderator (demo) to review it.':'Report sent to the moderators.');break;
   case'forum-decision':await rpc('forum_take_action',{report_id:form.dataset.id,action:form.dataset.kind,explanation:values.explanation});a.dialog.close();await render();break;
   case'forum-support':await rpc('forum_support',{message:values.message});await safety();a.toast(client.isDemo?'Demo support request saved in this browser.':'Support request sent. Replies appear in Account & safety.');break;
   case'forum-support-reply':await rpc('forum_reply_support',{request_id:form.dataset.id,response:values.response});a.dialog.close();await render();break;
  }
 }
 function init(api){
  a=api;if(new URLSearchParams(location.search).get('community-demo')==='1')client=POURMIND_FORUM_DEMO.create();
  const config=globalThis.POURMIND_FORUM_CONFIG;
  if(!client&&config?.url&&config?.publishableKey&&globalThis.POURMIND_SUPABASE){
   client=POURMIND_SUPABASE.createClient(config.url,config.publishableKey,{auth:{storageKey:'pourmind:community-session',detectSessionInUrl:true}});
   client.auth.onAuthStateChange((event,session)=>{user=session?.user||null;if(event==='PASSWORD_RECOVERY')setTimeout(()=>a.openDialog(`<div class="dialog-body"><h2 id="dialog-title">Set a new password</h2><form id="forum-password-reset">${password('new-password','New password')}<p role="alert"></p><button class="button">Save password</button></form></div>`),0);});
  }
  document.addEventListener('click',async event=>{const b=event.target.closest('[data-forum]');if(!b||b.disabled)return;b.disabled=true;try{await handleClick(b);}catch(error){a.toast(message(error));}finally{b.disabled=false;}});
  document.addEventListener('submit',async event=>{
   const form=event.target;if(!form.id.startsWith('forum-'))return;event.preventDefault();if(form.dataset.busy)return;form.dataset.busy='true';form.querySelectorAll('button').forEach(b=>b.disabled=true);
   try{await handleSubmit(form,event.submitter);}catch(error){const target=form.querySelector('[role=alert]');if(target)target.textContent=message(error);else a.toast(message(error));}finally{delete form.dataset.busy;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
  });
 }
 return {init,render};
})();
