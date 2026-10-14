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
 if uid is null then raise exception 'Sign in to post a recipe.'; end if;
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
 if uid is null then raise exception 'Sign in to review.'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 select version into ver from forum_private.recipes where id=recipe_id and not hidden and owner_id<>uid;
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
