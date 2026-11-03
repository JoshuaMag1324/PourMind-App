// Dependency injection keeps the authorization logic executable in tests.
export function createDeleteAccountHandler({createClient,env}) {
 return async request => {
 const origin=request.headers.get('origin');
 const allowed=(env('ALLOWED_ORIGINS')||'https://joshuamag1324.github.io').split(',').map(x=>x.trim());
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&allowed.includes(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.includes(origin))return respond(403,{error:'Origin not allowed.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return respond(405,{error:'Use POST.'});
 const authorization=request.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return respond(401,{error:'Sign in again before deleting your account.'});
 let publicKey,secret;
 try{publicKey=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;secret=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default;}catch{}
 const url=env('SUPABASE_URL');publicKey=publicKey||env('SUPABASE_ANON_KEY');secret=secret||env('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!publicKey||!secret)return respond(503,{error:'Account deletion has not been configured. Your account has not been deleted.'});
 try {
 const body=await request.json();
 if(body.confirmation!=='DELETE'||typeof body.password!=='string'||!body.password||body.password.length>1024)return respond(400,{error:'Enter your current password and type DELETE.'});
 const authOptions={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const publicClient=createClient(url,publicKey,authOptions);
 const {data:identity,error:identityError}=await publicClient.auth.getUser(authorization.slice(7));
 if(identityError||!identity?.user?.email)return respond(401,{error:'Your session expired. Sign in again.'});
 // Reauthentication happens on the server; a forged client confirmation is insufficient.
 const {data:verified,error:passwordError}=await publicClient.auth.signInWithPassword({email:identity.user.email,password:body.password});
 if(passwordError||verified?.user?.id!==identity.user.id)return respond(401,{error:'The password is incorrect. Your account has not been deleted.'});
 if(verified?.session?.access_token){const {data:assurance,error:assuranceError}=await publicClient.auth.mfa.getAuthenticatorAssuranceLevel();if(assuranceError||assurance?.nextLevel==='aal2')return respond(403,{error:'This account requires additional verification. Contact support for secure deletion.'});}
 const admin=createClient(url,secret,authOptions);
 // The target comes exclusively from the validated bearer token, never from the request body.
 const {error:deleteError}=await admin.auth.admin.deleteUser(identity.user.id,false);
 if(deleteError)return respond(503,{error:'Deletion could not be completed. Your account has not been confirmed deleted; please retry or contact support.'});
 return respond(200,{deleted:true});
 }catch{return respond(400,{error:'Unable to process deletion. Please retry or contact support.'});}
 };
}
