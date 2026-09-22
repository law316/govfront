import {useEffect,useMemo,useState} from "react";
import {api} from "./api";

type Announcement={id:number;title:string;message:string;audience:string;createdAt:string};
type ProgrammeCurrent={deadlineAt:string;secondsRemaining:number;expired:boolean;announcements:Announcement[]};

function formatUnit(value:number,label:string){
  return <div className="countdownUnit"><strong>{String(Math.max(0,value)).padStart(2,"0")}</strong><small>{label}</small></div>;
}

export default function ProgrammeNoticeBoard(){
  const[data,setData]=useState<ProgrammeCurrent|null>(null);
  const[remaining,setRemaining]=useState(0);

  useEffect(()=>{
    api<ProgrammeCurrent>("/api/programme/current")
      .then(result=>{setData(result);setRemaining(Math.max(0,result.secondsRemaining||0));})
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!data)return;
    const timer=window.setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);
    return ()=>window.clearInterval(timer);
  },[data]);

  const parts=useMemo(()=>{
    let seconds=remaining;
    const days=Math.floor(seconds/86400);seconds%=86400;
    const hours=Math.floor(seconds/3600);seconds%=3600;
    const minutes=Math.floor(seconds/60);seconds%=60;
    return {days,hours,minutes,seconds};
  },[remaining]);

  if(!data)return null;

  return <section className="programmeNoticeBoard">
    <div className="countdownPanel">
      <div>
        <span className="eyebrow">Programme timeline</span>
        <h2>{remaining>0?"Time remaining in the current programme window":"Current programme window has closed"}</h2>
        <p>{remaining>0?`Current deadline: ${new Date(data.deadlineAt).toLocaleString()}`:"Wait for programme administration to publish or extend the next deadline."}</p>
      </div>
      <div className="countdownGrid" aria-label="Programme countdown">
        {formatUnit(parts.days,"Days")}
        {formatUnit(parts.hours,"Hours")}
        {formatUnit(parts.minutes,"Minutes")}
        {formatUnit(parts.seconds,"Seconds")}
      </div>
    </div>

    {data.announcements.length>0&&<div className="announcementBoard">
      <div className="announcementBoardHead"><span className="eyebrow">Programme announcements</span><h2>Latest notices</h2></div>
      <div className="announcementCards">
        {data.announcements.slice(0,6).map(item=><article className="announcementCard" key={item.id}>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
          <h3>{item.title}</h3>
          <p>{item.message}</p>
        </article>)}
      </div>
    </div>}
  </section>;
}
