import {createContext,useContext,useEffect,useState} from "react";
import {api,setToken} from "./api";
export type Role="ADMIN"|"ENUMERATOR"|"APPLICANT";
type User={id:number;fullName:string;email:string;role:Role};
type AuthResponse={accessToken:string;expiresInSeconds:number;user:User};
type Ctx={user:User|null;ready:boolean;login:(e:string,p:string)=>Promise<User>;accept:(r:AuthResponse)=>void;logout:()=>Promise<void>};
const C=createContext<Ctx|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
 const[user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 const accept=(r:AuthResponse)=>{setToken(r.accessToken);setUser(r.user)};
 useEffect(()=>{api<AuthResponse>("/api/auth/refresh",{method:"POST"}).then(accept).catch(()=>{setToken(null);setUser(null)}).finally(()=>setReady(true))},[]);
 const login=async(e:string,p:string)=>{const r=await api<AuthResponse>("/api/auth/login",{method:"POST",body:JSON.stringify({email:e,password:p})});accept(r);return r.user};
 const logout=async()=>{try{await api("/api/auth/logout",{method:"POST"})}finally{setToken(null);setUser(null)}};
 return <C.Provider value={{user,ready,login,accept,logout}}>{children}</C.Provider>
}
export const useAuth=()=>{const c=useContext(C);if(!c)throw new Error("AuthProvider missing");return c}
