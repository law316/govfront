import {createContext,useContext,useEffect,useState} from "react";
import {api,setToken} from "./api";

export type Role="ADMIN"|"ENUMERATOR"|"APPLICANT";
type User={id:number;fullName:string;email:string;role:Role};
type AuthResponse={accessToken:string;expiresInSeconds:number;user:User};
type Ctx={user:User|null;ready:boolean;login:(e:string,p:string)=>Promise<User>;accept:(r:AuthResponse)=>void;logout:()=>Promise<void>};
const C=createContext<Ctx|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
  const[user,setUser]=useState<User|null>(null);
  const[ready,setReady]=useState(false);
  const accept=(r:AuthResponse)=>{setToken(r.accessToken);setUser(r.user)};

  useEffect(()=>{
    let mounted=true;
    api<AuthResponse>("/api/auth/refresh",{method:"POST"})
      .then(r=>{if(mounted)accept(r)})
      .catch(()=>{if(mounted){setToken(null);setUser(null)}})
      .finally(()=>{if(mounted)setReady(true)});
    return()=>{mounted=false};
  },[]);

  useEffect(()=>{
    const onRefresh=(event:Event)=>{
      const r=(event as CustomEvent<AuthResponse>).detail;
      if(r?.accessToken&&r.user)accept(r);
    };
    const onExpired=()=>{setToken(null);setUser(null)};
    window.addEventListener("portal-session-refreshed",onRefresh);
    window.addEventListener("portal-session-expired",onExpired);
    return()=>{
      window.removeEventListener("portal-session-refreshed",onRefresh);
      window.removeEventListener("portal-session-expired",onExpired);
    };
  },[]);

  const login=async(e:string,p:string)=>{
    const r=await api<AuthResponse>("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:p})});
    accept(r);return r.user;
  };

  const logout=async()=>{
    try{await api("/api/auth/logout",{method:"POST"})}
    finally{setToken(null);setUser(null)}
  };

  return <C.Provider value={{user,ready,login,accept,logout}}>{children}</C.Provider>;
}

export const useAuth=()=>{
  const c=useContext(C);
  if(!c)throw new Error("Authentication context is unavailable.");
  return c;
};
