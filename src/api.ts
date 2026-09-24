const BASE=(import.meta.env.VITE_API_URL||"http://localhost:8080").replace(/\/+$/,"");

type SessionResponse={
  accessToken:string;
  expiresInSeconds:number;
  user:{id:number;fullName:string;email:string;role:"ADMIN"|"ENUMERATOR"|"APPLICANT"};
};

let token:string|null=null;
let refreshPromise:Promise<SessionResponse|null>|null=null;

export const setToken=(v:string|null)=>{token=v};

function emit(name:"portal-session-refreshed"|"portal-session-expired",detail?:SessionResponse){
  window.dispatchEvent(new CustomEvent(name,{detail}));
}

async function renewSession():Promise<SessionResponse|null>{
  if(!refreshPromise){
    refreshPromise=(async()=>{
      try{
        const r=await fetch(`${BASE}/api/auth/refresh`,{
          method:"POST",
          credentials:"include",
          headers:{"Content-Type":"application/json"}
        });
        if(!r.ok){token=null;emit("portal-session-expired");return null;}
        const t=await r.text();
        const session=(t?JSON.parse(t):null) as SessionResponse|null;
        if(!session?.accessToken){token=null;emit("portal-session-expired");return null;}
        token=session.accessToken;
        emit("portal-session-refreshed",session);
        return session;
      }catch{
        token=null;
        emit("portal-session-expired");
        return null;
      }
    })().finally(()=>{refreshPromise=null});
  }
  return refreshPromise;
}

function mayRenew(path:string){
  return !path.startsWith("/api/auth/login")
    && !path.startsWith("/api/auth/refresh")
    && !path.startsWith("/api/auth/enumerator/signup");
}

async function request(path:string,options:RequestInit={},retry401=true):Promise<Response>{
  const h=new Headers(options.headers||{});
  if(!(options.body instanceof FormData)&&!h.has("Content-Type"))h.set("Content-Type","application/json");
  if(token)h.set("Authorization",`Bearer ${token}`);
  else h.delete("Authorization");

  let r=await fetch(`${BASE}${path}`,{...options,headers:h,credentials:"include"});

  if(r.status===401&&retry401&&mayRenew(path)){
    const renewed=await renewSession();
    if(renewed)r=await request(path,options,false);
  }
  return r;
}

async function failureMessage(r:Response){
  if(r.status===401)return "Your sign-in session has ended. Please sign in again and retry.";
  let m=`Request failed (${r.status})`;
  try{const b=await r.json();m=b.message||b.error||m}catch{}
  return m;
}

export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const r=await request(path,options,true);
  if(!r.ok)throw new Error(await failureMessage(r));
  if(r.status===204)return undefined as T;
  const t=await r.text();
  return t?JSON.parse(t):undefined as T;
}

const activeDownloads=new Set<string>();
const recentDownloads=new Map<string,number>();

export async function download(path:string,name:string){
  const now=Date.now();
  if(activeDownloads.has(path))return;
  if(now-(recentDownloads.get(path)||0)<4000)return;

  activeDownloads.add(path);
  recentDownloads.set(path,now);
  try{
    const r=await request(path,{},true);
    if(!r.ok)throw new Error(await failureMessage(r));

    const b=await r.blob();
    const u=URL.createObjectURL(b);
    const a=document.createElement("a");
    a.href=u;a.download=name;a.style.display="none";a.rel="noopener";
    document.body.appendChild(a);a.click();
    window.setTimeout(()=>{a.remove();URL.revokeObjectURL(u)},60000);
  }finally{
    activeDownloads.delete(path);
  }
}
