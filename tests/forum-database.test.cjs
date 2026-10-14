const assert=require('node:assert/strict'),fs=require('node:fs');
const {Client}=require(process.env.PG_MODULE||'pg');
const db=new Client({connectionString:process.env.FORUM_TEST_DATABASE||'postgres://postgres@127.0.0.1:54329/postgres'});
const alice='11111111-1111-1111-1111-111111111111',bob='22222222-2222-2222-2222-222222222222',mod='33333333-3333-3333-3333-333333333333';
async function as(uid,sql,args=[]){await db.query('begin');try{await db.query(`set local role ${uid?'authenticated':'anon'}`);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid||'']);return(await db.query(sql,args)).rows;}finally{await db.query('rollback');}}
async function commitAs(uid,sql,args=[]){await db.query('begin');try{await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);const result=(await db.query(sql,args)).rows;await db.query('commit');return result;}catch(e){await db.query('rollback');throw e;}}
(async()=>{await db.connect();await db.query(`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);await db.query('insert into auth.users values($1),($2),($3)',[alice,bob,mod]);await db.query(fs.readFileSync('forum/schema.sql','utf8'));await db.query('insert into forum_private.moderators values($1)',[mod]);
const recipe={title:'Ginger Test Sour',author:'Alice',kind:'Cocktail',ingredients:['2 oz bourbon','0.5 oz lemon juice','0.5 oz ginger syrup'],steps:['Shake with ice until chilled.','Strain into a chilled glass.'],glass:'Coupe',garnish:'Lemon twist',notes:'Ginger adds warmth while fresh lemon balances the sweetness.'};
await assert.rejects(as(null,'select public.forum_publish($1)',[recipe]),/permission denied/);
const id=(await commitAs(alice,'select public.forum_publish($1) as id',[recipe]))[0].id;
assert.equal((await as(null,'select public.forum_list() as feed'))[0].feed.length,1);
await assert.rejects(as(bob,'select * from forum_private.recipes'),/permission denied/);
await assert.rejects(as(bob,'select public.forum_publish($1,$2)',[recipe,id]),/only your/);
await assert.rejects(as(alice,'select public.forum_review($1,$2,$3,$4)',[id,'Alice',5,'Absolutely love this cocktail.']),/own recipe/);
await commitAs(bob,'select public.forum_review($1,$2,$3,$4)',[id,'Bob',4,'Bright acidity and lovely ginger finish.']);
await commitAs(bob,'select public.forum_review($1,$2,$3,$4)',[id,'Bob',5,'A second tasting was even better.']);
let feed=(await as(null,'select public.forum_list() as feed'))[0].feed;assert.equal(feed[0].review_count,1);assert.equal(feed[0].rating,5);
await commitAs(alice,'select public.forum_publish($1,$2)',[{...recipe,title:'Updated Ginger Sour'},id]);feed=(await as(null,'select public.forum_list() as feed'))[0].feed;assert.equal(feed[0].review_count,0);assert.equal(feed[0].rating,null);
const detail=(await as(null,'select public.forum_get($1) as detail',[id]))[0].detail;assert.equal(detail.reviews[0].version,1);assert.equal(detail.recipe.version,2);assert.ok(!JSON.stringify(detail).includes(bob));
await assert.rejects(as(alice,'select public.forum_publish($1)',[{...recipe,ingredients:['0.35 oz bourbon','1 oz lemon juice']}]),/whole or half/);
await assert.rejects(as(bob,'select public.forum_delete($1,$2)',[id,'recipe']),/own content/);
await commitAs(bob,'select public.forum_report($1,$2)',[id,'Recipe description needs review by the moderator.']);assert.equal((await as(bob,'select public.forum_moderation() as queue'))[0].queue,null);
const reports=(await as(mod,'select public.forum_moderation() as queue'))[0].queue;await assert.rejects(as(bob,'select public.forum_moderate($1,true)',[reports[0].id]),/Moderator/);await commitAs(mod,'select public.forum_moderate($1,true)',[reports[0].id]);assert.equal((await as(null,'select public.forum_get($1) as detail',[id]))[0].detail,null);await assert.rejects(as(alice,'select public.forum_publish($1,$2)',[recipe,id]),/visible recipes/);
console.log('Forum database: anonymous access, ownership, privacy, ratings, versions, validation and moderation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.end());
