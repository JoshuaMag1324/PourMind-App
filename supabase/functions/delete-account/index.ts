import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createDeleteAccountHandler } from './handler.mjs';
Deno.serve(createDeleteAccountHandler({createClient,env:(name:string)=>Deno.env.get(name)}));
