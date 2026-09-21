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
export async function download(path:string,name:string){
  const h=new Headers();if(token)h.set("Authorization",`Bearer ${token}`);
  const r=await fetch(`${BASE}${path}`,{headers:h,credentials:"include"});if(!r.ok)throw new Error("Download failed");
  const b=await r.blob(),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);
}
