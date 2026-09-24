import {useEffect,useRef} from "react";

export function useLiveRefresh(
  refresh:()=>void|Promise<void>,
  intervalMs=10000,
  enabled=true
){
  const refreshRef=useRef(refresh);
  refreshRef.current=refresh;

  useEffect(()=>{
    if(!enabled)return;

    let running=false;

    const run=async()=>{
      if(running||document.visibilityState==="hidden")return;
      running=true;
      try{
        await refreshRef.current();
      }catch{
        // Individual screens already handle their own refresh errors.
      }finally{
        running=false;
      }
    };

    const timer=window.setInterval(()=>void run(),intervalMs);
    const onFocus=()=>void run();
    const onOnline=()=>void run();
    const onVisibility=()=>{
      if(document.visibilityState==="visible")void run();
    };

    window.addEventListener("focus",onFocus);
    window.addEventListener("online",onOnline);
    document.addEventListener("visibilitychange",onVisibility);

    return()=>{
      window.clearInterval(timer);
      window.removeEventListener("focus",onFocus);
      window.removeEventListener("online",onOnline);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[intervalMs,enabled]);
}
