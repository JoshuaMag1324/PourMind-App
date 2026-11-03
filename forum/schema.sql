begin;
-- Run once in the Supabase SQL editor. Existing private app drafts are never imported.
create schema if not exists forum_private;
revoke all on schema forum_private from public, anon, authenticated;
create table if not exists forum_private.recipes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 author text not null, title text not null, kind text not null check(kind in ('Cocktail','Shot')),
 ingredients jsonb not null, steps jsonb not null, glass text not null, garnish text not null,
 notes text not null, version integer not null default 1, hidden boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists forum_private.reviews (
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references forum_private.recipes on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, author text not null,
 rating integer not null check(rating between 1 and 5), body text not null,
 version integer not null, hidden boolean not null default false, created_at timestamptz not null default now(),
 unique(recipe_id,owner_id)
);
create table if not exists forum_private.moderators(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists forum_private.reports (
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references forum_private.recipes on delete cascade,
 reporter uuid not null references auth.users(id) on delete cascade, reason text not null,
 resolved boolean not null default false, created_at timestamptz not null default now(), unique(recipe_id,reporter)
);
alter table forum_private.recipes enable row level security;
alter table forum_private.reviews enable row level security;
alter table forum_private.moderators enable row level security;
alter table forum_private.reports enable row level security;
revoke all on all tables in schema forum_private from public, anon, authenticated;
create or replace function public.forum_list(search_text text default '', recipe_kind text default '') returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (
 select p.id,p.title,p.author,p.kind,p.notes,p.created_at,p.owner_id=auth.uid() as is_owner,p.version,
 (select round(avg(v.rating),1) from forum_private.reviews v where v.recipe_id=p.id and not v.hidden and v.version=p.version) as rating,
 (select count(*) from forum_private.reviews v where v.recipe_id=p.id and not v.hidden and v.version=p.version) as review_count
 from forum_private.recipes p where not p.hidden and (recipe_kind='' or p.kind=recipe_kind)
 and (search_text='' or p.title ilike '%'||left(search_text,100)||'%' or p.ingredients::text ilike '%'||left(search_text,100)||'%')
 order by p.created_at desc limit 100) r;
$$;
create or replace function public.forum_get(recipe_id uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('recipe',jsonb_build_object('id',p.id,'title',p.title,'author',p.author,'kind',p.kind,'ingredients',p.ingredients,'steps',p.steps,'glass',p.glass,'garnish',p.garnish,'notes',p.notes,'version',p.version,'is_owner',p.owner_id=auth.uid()),
 'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'author',v.author,'rating',v.rating,'body',v.body,'version',v.version,'is_owner',v.owner_id=auth.uid()) order by v.created_at desc) from forum_private.reviews v where v.recipe_id=p.id and not v.hidden),'[]'::jsonb))
 from forum_private.recipes p where p.id=recipe_id and not p.hidden;
$$;
create or replace function public.forum_publish(recipe jsonb, recipe_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; item jsonb; amount numeric;
begin
 perform forum_private.require_member();
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if recipe_id is not null and not exists(select 1 from forum_private.recipes where id=recipe_id and owner_id=uid and not hidden) then raise exception 'You can edit only your visible recipes.'; end if;
 if recipe_id is null and (select count(*) from forum_private.recipes where owner_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'Please wait before posting more recipes.'; end if;
 if length(trim(coalesce(recipe->>'title',''))) not between 3 and 80 or length(trim(coalesce(recipe->>'author',''))) not between 2 and 60 or length(coalesce(recipe->>'notes','')) not between 20 and 2000 or coalesce(recipe->>'kind','') not in ('Cocktail','Shot') then raise exception 'Add a name, display name, drink type and at least 20 characters of teaching notes.'; end if;
 if jsonb_typeof(recipe->'ingredients') is distinct from 'array' or jsonb_typeof(recipe->'steps') is distinct from 'array' then raise exception 'Ingredients and method must be lists.'; end if;
 if jsonb_array_length(recipe->'ingredients') not between 2 and 20 or jsonb_array_length(recipe->'steps') not between 2 and 15 then raise exception 'Add 2–20 ingredients and 2–15 method steps.'; end if;
 for item in select value from jsonb_array_elements(recipe->'ingredients') loop
 if jsonb_typeof(item)<>'string' or length(item#>>'{}')>200 or (item#>>'{}') !~* '^[0-9]+(\.[0-9]+)? (oz|dashes?|drops?|pieces?|wedges?|slices?|leaves?|sprigs?|pinches?|beans?) .+' then raise exception 'Measure each ingredient, for example 2 oz gin or 2 dashes bitters.'; end if;
 if split_part(item#>>'{}',' ',1)::numeric<=0 then raise exception 'Ingredient amounts must be positive.'; end if;
 if (item#>>'{}') ~* '^[0-9]+(\.[0-9]+)? oz ' then amount:=split_part(item#>>'{}',' ',1)::numeric; if amount<0.5 or mod(amount,0.5)<>0 then raise exception 'Use whole or half ounces, minimum 0.5 oz.'; end if; end if;
 end loop;
 for item in select value from jsonb_array_elements(recipe->'steps') loop
 if jsonb_typeof(item)<>'string' or length(trim(item#>>'{}')) not between 5 and 600 then raise exception 'Each method step needs 5–600 characters.'; end if;
 end loop;
 if length(trim(coalesce(recipe->>'glass',''))) not between 2 and 100 or length(trim(coalesce(recipe->>'garnish',''))) not between 2 and 100 then raise exception 'Add a glass and garnish (or None).'; end if;
 if recipe_id is null then
 insert into forum_private.recipes(owner_id,author,title,kind,ingredients,steps,glass,garnish,notes) values(uid,trim(recipe->>'author'),trim(recipe->>'title'),recipe->>'kind',recipe->'ingredients',recipe->'steps',recipe->>'glass',recipe->>'garnish',recipe->>'notes') returning id into rid;
 else
 update forum_private.recipes set author=trim(recipe->>'author'),title=trim(recipe->>'title'),kind=recipe->>'kind',ingredients=recipe->'ingredients',steps=recipe->'steps',glass=recipe->>'glass',garnish=recipe->>'garnish',notes=recipe->>'notes',version=version+1,updated_at=now() where id=recipe_id and owner_id=uid returning id into rid;
 end if; return rid;
end $$;
create or replace function public.forum_review(recipe_id uuid, display_name text, stars integer, tasting_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ver integer;
begin
 perform forum_private.require_member();
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select version into ver from forum_private.recipes where id=recipe_id and not hidden and not filter_pending and owner_id<>uid and not exists(select 1 from forum_private.suspensions where user_id=owner_id) and not exists(select 1 from forum_private.blocks where (blocker=uid and blocked=owner_id) or (blocker=owner_id and blocked=uid));
 if ver is null then raise exception 'You cannot review your own recipe or an unavailable recipe.'; end if;
 if length(trim(coalesce(display_name,''))) not between 2 and 60 or stars not between 1 and 5 or stars is null or length(trim(coalesce(tasting_notes,''))) not between 12 and 1200 then raise exception 'Add your name, 1–5 stars and tasting notes of 12–1200 characters.'; end if;
 if (select count(*) from forum_private.reviews where owner_id=uid and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before reviewing more recipes.'; end if;
 insert into forum_private.reviews(recipe_id,owner_id,author,rating,body,version) values(recipe_id,uid,trim(display_name),stars,trim(tasting_notes),ver)
 on conflict on constraint reviews_recipe_id_owner_id_key do update set author=excluded.author,rating=excluded.rating,body=excluded.body,version=excluded.version,created_at=now();
end $$;
create or replace function public.forum_delete(target_id uuid, target_kind text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if target_kind='recipe' then delete from forum_private.recipes where id=target_id and owner_id=auth.uid();
 elsif target_kind='review' then delete from forum_private.reviews where id=target_id and owner_id=auth.uid();
 else raise exception 'Unknown item.'; end if;
 if not found then raise exception 'You can delete only your own content.'; end if;
end $$;
create or replace function public.forum_report(recipe_id uuid, reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to report.'; end if;
 if length(trim(coalesce(reason,''))) not between 12 and 500 then raise exception 'Explain the issue in 12–500 characters.'; end if;
 if not exists(select 1 from forum_private.recipes where id=recipe_id and not hidden) then raise exception 'Recipe unavailable.'; end if;
 insert into forum_private.reports(recipe_id,reporter,reason) values(recipe_id,auth.uid(),reason) on conflict on constraint reports_recipe_id_reporter_key do update set reason=excluded.reason,resolved=false;
end $$;
create or replace function public.forum_moderation() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then return null; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'recipe_id',r.recipe_id,'title',p.title,'reason',r.reason,'hidden',p.hidden)) from forum_private.reports r join forum_private.recipes p on p.id=r.recipe_id where not r.resolved),'[]'::jsonb);
end $$;
create or replace function public.forum_moderate(report_id uuid, hide_recipe boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required.'; end if;
 update forum_private.recipes set hidden=hide_recipe where id=(select recipe_id from forum_private.reports where id=report_id);
 update forum_private.reports set resolved=true where id=report_id;
end $$;
revoke all on function public.forum_list(text,text),public.forum_get(uuid),public.forum_publish(jsonb,uuid),public.forum_review(uuid,text,integer,text),public.forum_delete(uuid,text),public.forum_report(uuid,text),public.forum_moderation(),public.forum_moderate(uuid,boolean) from public,anon,authenticated;
grant execute on function public.forum_list(text,text),public.forum_get(uuid) to anon,authenticated;
grant execute on function public.forum_publish(jsonb,uuid),public.forum_review(uuid,text,integer,text),public.forum_delete(uuid,text),public.forum_report(uuid,text),public.forum_moderation(),public.forum_moderate(uuid,boolean) to authenticated;

alter table forum_private.recipes add column if not exists filter_pending boolean not null default false;
alter table forum_private.reviews add column if not exists filter_pending boolean not null default false;
create table if not exists forum_private.blocks (
 blocker uuid not null references auth.users(id) on delete cascade,
 blocked uuid not null references auth.users(id) on delete cascade,
 display_name text not null, created_at timestamptz not null default now(),
 primary key(blocker,blocked), check(blocker<>blocked)
);
create table if not exists forum_private.suspensions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null, created_at timestamptz not null default now()
);
create table if not exists forum_private.content_rules (
 pattern text primary key, enabled boolean not null default true
);
insert into forum_private.content_rules(pattern) values
 ('\m(kill yourself|you should die)\M'),
 ('(https?://|www\.|javascript:|<script|onerror\s*=)'),
 ('\m(buy followers|guaranteed profit|free crypto)\M'),
 ('\m(fuck(ing|er|ers)?|motherfuck(ing|er|ers)?|bullshit)\M'),
 ('\m(drink until you (pass out|black out)|chug until you (pass out|black out))\M') on conflict do nothing;
create table if not exists forum_private.content_reports (
 id uuid primary key default gen_random_uuid(), target_id uuid not null,
 target_kind text not null check(target_kind in ('recipe','review')),
 reporter uuid references auth.users(id) on delete cascade,
 reason text not null, resolved boolean not null default false,
 created_at timestamptz not null default now(),
 unique nulls not distinct(target_id,target_kind,reporter)
);
create table if not exists forum_private.moderation_log (
 id uuid primary key default gen_random_uuid(), target_id uuid not null,
 target_kind text not null, action text not null, reason text not null,
 moderator uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists forum_private.support_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 message text not null, resolved boolean not null default false, created_at timestamptz not null default now()
);
alter table forum_private.blocks enable row level security;
alter table forum_private.suspensions enable row level security;
alter table forum_private.content_rules enable row level security;
alter table forum_private.content_reports enable row level security;
alter table forum_private.moderation_log enable row level security;
alter table forum_private.support_requests enable row level security;
revoke all on all tables in schema forum_private from public,anon,authenticated;
-- Copy legacy reports without changing existing users or recipes.
insert into forum_private.content_reports(id,target_id,target_kind,reporter,reason,resolved,created_at)
 select id,recipe_id,'recipe',reporter,reason,resolved,created_at from forum_private.reports on conflict do nothing;
create or replace function forum_private.require_member() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in first.'; end if;
 if exists(select 1 from forum_private.suspensions where user_id=uid) then raise exception 'Your community account is suspended. Contact support or delete your account in Account & safety.'; end if;
 return uid;
end $$;
create or replace function forum_private.is_blocked(other_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from forum_private.blocks where blocker=auth.uid() and blocked=other_user);
$$;
create or replace function forum_private.filter_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare body text;
begin
 if TG_TABLE_NAME='recipes' then body:=concat_ws(' ',new.author,new.title,new.ingredients::text,new.steps::text,new.notes,new.glass,new.garnish);
 else body:=concat_ws(' ',new.author,new.body); end if;
 new.filter_pending:=exists(select 1 from forum_private.content_rules where enabled and body ~* pattern);
 return new;
end $$;
create or replace function forum_private.queue_filtered() returns trigger
language plpgsql security definer set search_path='' as $$
declare kind text:=case when TG_TABLE_NAME='recipes' then 'recipe' else 'review' end;
begin
 if new.filter_pending then
 insert into forum_private.content_reports(target_id,target_kind,reason)
 values(new.id,kind,'Automatic content filter: review this content before publishing.')
 on conflict on constraint content_reports_target_id_target_kind_reporter_key do update set resolved=false,reason=excluded.reason,created_at=now();
 else update forum_private.content_reports set resolved=true where target_id=new.id and target_kind=kind and reporter is null; end if;
 return new;
end $$;
create or replace function forum_private.cleanup_content() returns trigger
language plpgsql security definer set search_path='' as $$
declare kind text:=case when TG_TABLE_NAME='recipes' then 'recipe' else 'review' end;
begin
 delete from forum_private.content_reports where target_id=old.id and target_kind=kind;
 delete from forum_private.moderation_log where target_id=old.id and target_kind=kind;
 return old;
end $$;
drop trigger if exists forum_filter on forum_private.recipes;
create trigger forum_filter before insert or update of title,author,ingredients,steps,notes,glass,garnish on forum_private.recipes for each row execute function forum_private.filter_content();
drop trigger if exists forum_filter on forum_private.reviews;
create trigger forum_filter before insert or update of author,body on forum_private.reviews for each row execute function forum_private.filter_content();
drop trigger if exists forum_queue on forum_private.recipes;
create trigger forum_queue after insert or update on forum_private.recipes for each row execute function forum_private.queue_filtered();
drop trigger if exists forum_queue on forum_private.reviews;
create trigger forum_queue after insert or update on forum_private.reviews for each row execute function forum_private.queue_filtered();
drop trigger if exists forum_cleanup on forum_private.recipes;
create trigger forum_cleanup after delete on forum_private.recipes for each row execute function forum_private.cleanup_content();
drop trigger if exists forum_cleanup on forum_private.reviews;
create trigger forum_cleanup after delete on forum_private.reviews for each row execute function forum_private.cleanup_content();
create or replace function public.forum_list(search_text text default '', recipe_kind text default '') returns jsonb
language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (
 select p.id,p.title,p.author,p.kind,p.notes,p.created_at,p.owner_id=auth.uid() as is_owner,p.version,
 case when p.hidden then 'removed' when p.filter_pending then 'pending' else 'published' end as status,
 (select round(avg(v.rating),1) from forum_private.reviews v where v.recipe_id=p.id and not v.hidden and not v.filter_pending and v.version=p.version and not forum_private.is_blocked(v.owner_id) and not exists(select 1 from forum_private.suspensions where user_id=v.owner_id)) as rating,
 (select count(*) from forum_private.reviews v where v.recipe_id=p.id and not v.hidden and not v.filter_pending and v.version=p.version and not forum_private.is_blocked(v.owner_id) and not exists(select 1 from forum_private.suspensions where user_id=v.owner_id)) as review_count
 from forum_private.recipes p where ((not p.hidden and not p.filter_pending) or p.owner_id=auth.uid())
 and not forum_private.is_blocked(p.owner_id) and not exists(select 1 from forum_private.suspensions where user_id=p.owner_id)
 and (recipe_kind='' or p.kind=recipe_kind)
 and (search_text='' or p.title ilike '%'||left(search_text,100)||'%' or p.ingredients::text ilike '%'||left(search_text,100)||'%')
 order by p.created_at desc limit 100) r;
$$;
create or replace function public.forum_get(recipe_id uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('recipe',jsonb_build_object('id',p.id,'title',p.title,'author',p.author,'kind',p.kind,'ingredients',p.ingredients,'steps',p.steps,'glass',p.glass,'garnish',p.garnish,'notes',p.notes,'version',p.version,'is_owner',p.owner_id=auth.uid(),'status',case when p.hidden then 'removed' when p.filter_pending then 'pending' else 'published' end),
 'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'author',v.author,'rating',v.rating,'body',v.body,'version',v.version,'is_owner',v.owner_id=auth.uid(),'status',case when v.hidden then 'removed' when v.filter_pending then 'pending' else 'published' end) order by v.created_at desc) from forum_private.reviews v where v.recipe_id=p.id and ((not v.hidden and not v.filter_pending) or v.owner_id=auth.uid()) and not forum_private.is_blocked(v.owner_id) and not exists(select 1 from forum_private.suspensions where user_id=v.owner_id)),'[]'::jsonb))
 from forum_private.recipes p where p.id=recipe_id and ((not p.hidden and not p.filter_pending) or p.owner_id=auth.uid()) and not forum_private.is_blocked(p.owner_id) and not exists(select 1 from forum_private.suspensions where user_id=p.owner_id);
$$;
create or replace function public.forum_safety() returns jsonb
language sql security definer set search_path='' as $$
 select case when auth.uid() is null then null else jsonb_build_object(
 'suspended',exists(select 1 from forum_private.suspensions where user_id=auth.uid()),
 'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',blocked,'name',display_name)) from forum_private.blocks where blocker=auth.uid()),'[]'::jsonb)) end;
$$;
create or replace function public.forum_block(target_id uuid,target_kind text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); other_user uuid; name text;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'Sign in first.'; end if;
 if target_kind='recipe' then select owner_id,author into other_user,name from forum_private.recipes where id=target_id and not hidden and not filter_pending;
 elsif target_kind='review' then select owner_id,author into other_user,name from forum_private.reviews where id=target_id and not hidden and not filter_pending;
 end if;
 if other_user is null or other_user=uid then raise exception 'Choose another available community member.'; end if;
 insert into forum_private.blocks(blocker,blocked,display_name) values(uid,other_user,name) on conflict(blocker,blocked) do nothing;
end $$;
create or replace function public.forum_unblock(blocked_user uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 delete from forum_private.blocks where blocker=auth.uid() and blocked=blocked_user;
end $$;
create or replace function public.forum_flag(target_id uuid,target_kind text,reason text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=forum_private.require_member(); available boolean;
begin
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if length(trim(coalesce(reason,''))) not between 12 and 500 then raise exception 'Explain the issue in 12–500 characters.'; end if;
 if target_kind='recipe' then select true into available from forum_private.recipes where id=target_id and not hidden and not filter_pending;
 elsif target_kind='review' then select true into available from forum_private.reviews v join forum_private.recipes p on p.id=v.recipe_id where v.id=target_id and not v.hidden and not v.filter_pending and not p.hidden and not p.filter_pending; end if;
 if available is distinct from true then raise exception 'Content unavailable.'; end if;
 if (select count(*) from forum_private.content_reports where reporter=uid and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before sending more reports.'; end if;
 insert into forum_private.content_reports(target_id,target_kind,reporter,reason) values(target_id,target_kind,uid,trim(reason))
 on conflict on constraint content_reports_target_id_target_kind_reporter_key do update set reason=excluded.reason,resolved=false,created_at=now();
end $$;
create or replace function public.forum_report(recipe_id uuid,reason text) returns void
language sql security definer set search_path='' as $$ select public.forum_flag(recipe_id,'recipe',reason); $$;
create or replace function public.forum_moderation() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then return null; end if;
 return coalesce((select jsonb_agg(item order by resolved,created_at desc) from (
 select r.resolved,r.created_at,jsonb_build_object('id',r.id,'target_id',r.target_id,'kind',r.target_kind,'recipe_id',coalesce(p.id,v.recipe_id),'title',coalesce(p.title,parent.title),'author',coalesce(p.author,v.author),'content',case when r.target_kind='recipe' then concat_ws(E'\n',p.ingredients::text,p.steps::text,p.notes) else v.body end,'reason',r.reason,'resolved',r.resolved,'created_at',r.created_at,'hidden',coalesce(p.hidden,v.hidden),'pending',coalesce(p.filter_pending,v.filter_pending),'suspended',exists(select 1 from forum_private.suspensions where user_id=coalesce(p.owner_id,v.owner_id))) as item
 from forum_private.content_reports r left join forum_private.recipes p on r.target_kind='recipe' and p.id=r.target_id left join forum_private.reviews v on r.target_kind='review' and v.id=r.target_id left join forum_private.recipes parent on parent.id=v.recipe_id
 order by r.resolved,r.created_at desc limit 200) q),'[]'::jsonb);
end $$;
create or replace function public.forum_take_action(report_id uuid,action text,explanation text) returns void
language plpgsql security definer set search_path='' as $$
declare report forum_private.content_reports; subject uuid;
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required.'; end if;
 if action not in ('dismiss','remove','restore','suspend','unsuspend') or action is null then raise exception 'Choose a moderation action.'; end if;
 if length(trim(coalesce(explanation,''))) not between 12 and 500 then raise exception 'Explain your decision in 12–500 characters.'; end if;
 select * into report from forum_private.content_reports where id=report_id for update;
 if not found then raise exception 'Report unavailable.'; end if;
 if report.target_kind='recipe' then select owner_id into subject from forum_private.recipes where id=report.target_id;
 else select owner_id into subject from forum_private.reviews where id=report.target_id; end if;
 if subject is null then raise exception 'Content unavailable.'; end if;
 if action='dismiss' and ((report.target_kind='recipe' and exists(select 1 from forum_private.recipes where id=report.target_id and filter_pending)) or (report.target_kind='review' and exists(select 1 from forum_private.reviews where id=report.target_id and filter_pending))) then raise exception 'Approve or remove filtered content before resolving its report.'; end if;
 if action in ('suspend','unsuspend') then
 if subject=auth.uid() or exists(select 1 from forum_private.moderators where user_id=subject) then raise exception 'Moderator accounts must be managed by the app owner.'; end if;
 if action='suspend' then insert into forum_private.suspensions(user_id,reason) values(subject,explanation) on conflict(user_id) do update set reason=excluded.reason;
 else delete from forum_private.suspensions where user_id=subject; end if;
 elsif action in ('remove','restore') then
 if report.target_kind='recipe' then update forum_private.recipes set hidden=(action='remove'),filter_pending=false where id=report.target_id;
 else update forum_private.reviews set hidden=(action='remove'),filter_pending=false where id=report.target_id; end if;
 end if;
 update forum_private.content_reports set resolved=true where target_id=report.target_id and target_kind=report.target_kind;
 insert into forum_private.moderation_log(target_id,target_kind,action,reason,moderator) values(report.target_id,report.target_kind,action,explanation,auth.uid());
end $$;
create or replace function public.forum_moderate(report_id uuid,hide_recipe boolean) returns void
language sql security definer set search_path='' as $$ select public.forum_take_action(report_id,case when hide_recipe then 'remove' else 'restore' end,'Moderator reviewed this report.'); $$;
create or replace function public.forum_support(message text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then raise exception 'Sign in to contact support.'; end if;
 if length(trim(coalesce(message,''))) not between 12 and 2000 then raise exception 'Write 12–2000 characters.'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from forum_private.support_requests where user_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Your requests are saved. Please wait before sending more.'; end if;
 insert into forum_private.support_requests(user_id,message) values(auth.uid(),trim(message));
end $$;
alter table forum_private.support_requests add column if not exists reply text not null default '';
create or replace function public.forum_support_queue() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then return null; end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select id,message,reply,resolved,created_at from forum_private.support_requests order by resolved,created_at desc limit 100) r),'[]'::jsonb);
end $$;
create or replace function public.forum_resolve_support(request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required.'; end if;
 update forum_private.support_requests set resolved=true where id=request_id;
end $$;
create or replace function public.forum_publish(recipe jsonb, recipe_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid uuid; item jsonb; amount numeric;
begin
 perform forum_private.require_member();
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if recipe_id is not null and not exists(select 1 from forum_private.recipes where id=recipe_id and owner_id=uid and not hidden) then raise exception 'You can edit only your visible recipes.'; end if;
 if recipe_id is null and (select count(*) from forum_private.recipes where owner_id=uid and created_at>now()-interval '1 hour')>=5 then raise exception 'Please wait before posting more recipes.'; end if;
 if length(trim(coalesce(recipe->>'title',''))) not between 3 and 80 or length(trim(coalesce(recipe->>'author',''))) not between 2 and 60 or length(coalesce(recipe->>'notes','')) not between 20 and 2000 or coalesce(recipe->>'kind','') not in ('Cocktail','Shot') then raise exception 'Add a name, display name, drink type and at least 20 characters of teaching notes.'; end if;
 if jsonb_typeof(recipe->'ingredients') is distinct from 'array' or jsonb_typeof(recipe->'steps') is distinct from 'array' then raise exception 'Ingredients and method must be lists.'; end if;
 if jsonb_array_length(recipe->'ingredients') not between 2 and 20 or jsonb_array_length(recipe->'steps') not between 2 and 15 then raise exception 'Add 2–20 ingredients and 2–15 method steps.'; end if;
 for item in select value from jsonb_array_elements(recipe->'ingredients') loop
 if jsonb_typeof(item)<>'string' or length(item#>>'{}')>200 or (item#>>'{}') !~* '^[0-9]+(\.[0-9]+)? (oz|dashes?|drops?|pieces?|wedges?|slices?|leaves?|sprigs?|pinches?|beans?) .+' then raise exception 'Measure each ingredient, for example 2 oz gin or 2 dashes bitters.'; end if;
 if split_part(item#>>'{}',' ',1)::numeric<=0 then raise exception 'Ingredient amounts must be positive.'; end if;
 if (item#>>'{}') ~* '^[0-9]+(\.[0-9]+)? oz ' then amount:=split_part(item#>>'{}',' ',1)::numeric; if amount<0.5 or mod(amount,0.5)<>0 then raise exception 'Use whole or half ounces, minimum 0.5 oz.'; end if; end if;
 end loop;
 for item in select value from jsonb_array_elements(recipe->'steps') loop
 if jsonb_typeof(item)<>'string' or length(trim(item#>>'{}')) not between 5 and 600 then raise exception 'Each method step needs 5–600 characters.'; end if;
 end loop;
 if length(trim(coalesce(recipe->>'glass',''))) not between 2 and 100 or length(trim(coalesce(recipe->>'garnish',''))) not between 2 and 100 then raise exception 'Add a glass and garnish (or None).'; end if;
 if recipe_id is null then
 insert into forum_private.recipes(owner_id,author,title,kind,ingredients,steps,glass,garnish,notes) values(uid,trim(recipe->>'author'),trim(recipe->>'title'),recipe->>'kind',recipe->'ingredients',recipe->'steps',recipe->>'glass',recipe->>'garnish',recipe->>'notes') returning id into rid;
 else
 update forum_private.recipes set author=trim(recipe->>'author'),title=trim(recipe->>'title'),kind=recipe->>'kind',ingredients=recipe->'ingredients',steps=recipe->'steps',glass=recipe->>'glass',garnish=recipe->>'garnish',notes=recipe->>'notes',version=version+1,updated_at=now() where id=recipe_id and owner_id=uid returning id into rid;
 end if; return rid;
end $$;
create or replace function public.forum_review(recipe_id uuid, display_name text, stars integer, tasting_notes text) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ver integer;
begin
 perform forum_private.require_member();
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select version into ver from forum_private.recipes where id=recipe_id and not hidden and not filter_pending and owner_id<>uid and not exists(select 1 from forum_private.suspensions where user_id=owner_id) and not exists(select 1 from forum_private.blocks where (blocker=uid and blocked=owner_id) or (blocker=owner_id and blocked=uid));
 if ver is null then raise exception 'You cannot review your own recipe or an unavailable recipe.'; end if;
 if length(trim(coalesce(display_name,''))) not between 2 and 60 or stars not between 1 and 5 or stars is null or length(trim(coalesce(tasting_notes,''))) not between 12 and 1200 then raise exception 'Add your name, 1–5 stars and tasting notes of 12–1200 characters.'; end if;
 if (select count(*) from forum_private.reviews where owner_id=uid and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before reviewing more recipes.'; end if;
 insert into forum_private.reviews(recipe_id,owner_id,author,rating,body,version) values(recipe_id,uid,trim(display_name),stars,trim(tasting_notes),ver)
 on conflict on constraint reviews_recipe_id_owner_id_key do update set author=excluded.author,rating=excluded.rating,body=excluded.body,version=excluded.version,created_at=now();
end $$;

revoke all on all functions in schema forum_private from public,anon,authenticated;
revoke all on function public.forum_safety(),public.forum_block(uuid,text),public.forum_unblock(uuid),public.forum_flag(uuid,text,text),public.forum_take_action(uuid,text,text),public.forum_support(text),public.forum_support_queue(),public.forum_resolve_support(uuid) from public,anon,authenticated;
grant execute on function public.forum_safety(),public.forum_block(uuid,text),public.forum_unblock(uuid),public.forum_flag(uuid,text,text),public.forum_take_action(uuid,text,text),public.forum_support(text),public.forum_support_queue(),public.forum_resolve_support(uuid) to authenticated;

alter table forum_private.support_requests add column if not exists reply text not null default '';
create or replace function public.forum_support_history() returns jsonb
language sql security definer set search_path='' as $$
 select coalesce((select jsonb_agg(to_jsonb(r)) from (select id,message,reply,resolved,created_at from forum_private.support_requests where user_id=auth.uid() order by created_at desc limit 100) r),'[]'::jsonb);
$$;
create or replace function public.forum_reply_support(request_id uuid,response text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from forum_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required.'; end if;
 if length(trim(coalesce(response,''))) not between 12 and 2000 then raise exception 'Write a reply of 12–2000 characters.'; end if;
 update forum_private.support_requests set reply=trim(response),resolved=true where id=request_id;
 if not found then raise exception 'Support request unavailable.'; end if;
end $$;
revoke all on function public.forum_support_history(),public.forum_reply_support(uuid,text) from public,anon,authenticated;
grant execute on function public.forum_support_history(),public.forum_reply_support(uuid,text) to authenticated;
commit;
