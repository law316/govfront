const BASE=(import.meta.env.VITE_API_URL||"http://localhost:8080").replace(/\/+$/,"");
let token:string|null=null;
export const setToken=(v:string|null)=>token=v;
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const h=new Headers(options.headers||{});
  if(!(options.body instanceof FormData)&&!h.has("Content-Type"))h.set("Content-Type","application/json");
  if(token)h.set("Authorization",`Bearer ${token}`);
  const r=await fetch(`${BASE}${path}`,{...options,headers:h,credentials:"include"});
  if(!r.ok){let m=`Request failed (${r.status})`;try{const b=await r.json();m=b.message||m}catch{}throw new Error(m)}
  if(r.status===204)return undefined as T;
  const t=await r.text();return t?JSON.parse(t):undefined as T;
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
    const h=new Headers();
    if(token)h.set("Authorization",`Bearer ${token}`);

    const r=await fetch(`${BASE}${path}`,{headers:h,credentials:"include"});
    if(!r.ok)throw new Error("Download could not be completed.");

    const b=await r.blob();
    const u=URL.createObjectURL(b);
    const a=document.createElement("a");
    a.href=u;
    a.download=name;
    a.style.display="none";
    a.rel="noopener";
    document.body.appendChild(a);
    a.click();

    window.setTimeout(()=>{
      a.remove();
      URL.revokeObjectURL(u);
    },60000);
  }finally{
    activeDownloads.delete(path);
  }
}
