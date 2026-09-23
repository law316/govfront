import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";

type SupportMessage={id:number;senderRole:string;senderName:string;message:string;createdAt:string};
type SupportTicket={id:number;userId:number;userRole:string;fullName:string;email:string;category:string;subject:string;paymentTxRef?:string|null;status:string;createdAt:string;lastMessageAt:string;messages:SupportMessage[]};
const pretty=(value:string)=>value.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,x=>x.toUpperCase());

export default function AdminSupport(){
  const[tickets,setTickets]=useState<SupportTicket[]>([]);
  const[selectedId,setSelectedId]=useState<number|null>(null);
  const[search,setSearch]=useState("");
  const[status,setStatus]=useState("ALL");
  const[reply,setReply]=useState("");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  const selected=useMemo(()=>tickets.find(x=>x.id===selectedId)||tickets[0]||null,[tickets,selectedId]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return tickets.filter(ticket=>(status==="ALL"||ticket.status===status)&&(!q||[ticket.fullName,ticket.email,ticket.subject,ticket.category,ticket.paymentTxRef||""].join(" ").toLowerCase().includes(q)));
  },[tickets,search,status]);

  async function load(){
    setBusy("load");setError("");
    try{
      const rows=await api<SupportTicket[]>("/api/admin/support");
      setTickets(rows);
      if(rows.length&&!selectedId)setSelectedId(rows[0].id);
    }catch(err){setError(err instanceof Error?err.message:"Could not load support inbox.");}
    finally{setBusy("");}
  }
  useEffect(()=>{void load();},[]);

  async function sendReply(e:FormEvent){
    e.preventDefault();if(!selected)return;
    setBusy("reply");setError("");setNotice("");
    try{
      const updated=await api<SupportTicket>(`/api/admin/support/${selected.id}/messages`,{method:"POST",body:JSON.stringify({message:reply})});
      setReply("");setTickets(current=>current.map(x=>x.id===updated.id?updated:x));setNotice("Support reply sent.");
    }catch(err){setError(err instanceof Error?err.message:"Support reply failed.");}
    finally{setBusy("");}
  }

  async function changeStatus(next:string){
    if(!selected)return;
    setBusy("status");setError("");setNotice("");
    try{
      const updated=await api<SupportTicket>(`/api/admin/support/${selected.id}/status`,{method:"PATCH",body:JSON.stringify({status:next})});
      setTickets(current=>current.map(x=>x.id===updated.id?updated:x));setNotice(`Ticket marked ${pretty(next)}.`);
    }catch(err){setError(err instanceof Error?err.message:"Ticket status could not be updated.");}
    finally{setBusy("");}
  }

  return <section className="dashboardShell adminShell supportShell">
    <div className="dashboardHero"><div><span className="eyebrow">Administration / Support</span><h1>Support Inbox</h1><p>Review payment exceptions and programme questions, reply directly and resolve conversations.</p></div><Link className="btn outline small" to="/admin">Back to administration</Link></div>
    {busy&&<div className="busyNotice"><span className="spinner"/>Loading or saving support information...</div>}
    {error&&<div className="error">{error}</div>}
    {notice&&<div className="success">{notice}</div>}

    <div className="supportAdminLayout">
      <article className="card supportInbox">
        <div className="supportFilters"><label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email, subject, payment reference..."/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">All</option><option value="OPEN">Open</option><option value="WAITING_ON_ADMIN">Waiting on Admin</option><option value="WAITING_ON_USER">Waiting on User</option><option value="RESOLVED">Resolved</option></select></label></div>
        <div className="ticketList">{filtered.length===0?<div className="emptyState">No support tickets match this filter.</div>:filtered.map(ticket=><button type="button" key={ticket.id} className={`ticketItem ${selected?.id===ticket.id?"selected":""}`} onClick={()=>setSelectedId(ticket.id)}><span><strong>{ticket.subject}</strong><small>{ticket.fullName} - {ticket.email}</small><small>{pretty(ticket.category)}</small></span><em>{pretty(ticket.status)}</em></button>)}</div>
      </article>

      <article className="card conversationCard">
        {!selected?<div className="emptyState">Select a ticket.</div>:<>
          <div className="conversationHeader"><div><span className="eyebrow">Ticket #{selected.id} - {selected.userRole}</span><h2>{selected.subject}</h2><p><strong>{selected.fullName}</strong> - {selected.email}</p><p>{pretty(selected.category)} - {pretty(selected.status)}</p>{selected.paymentTxRef&&<p className="mono">Payment ref: {selected.paymentTxRef}</p>}</div><div className="supportStatusActions"><button className="btn outline small" type="button" disabled={!!busy} onClick={()=>void changeStatus("OPEN")}>Open</button><button className="btn outline small" type="button" disabled={!!busy} onClick={()=>void changeStatus("WAITING_ON_ADMIN")}>Waiting on Admin</button><button className="btn outline small" type="button" disabled={!!busy} onClick={()=>void changeStatus("WAITING_ON_USER")}>Waiting on User</button><button className="btn primary small" type="button" disabled={!!busy} onClick={()=>void changeStatus("RESOLVED")}>Resolve</button></div></div>
          <div className="messageThread">{selected.messages.map(item=><div key={item.id} className={`supportMessage ${item.senderRole==="ADMIN"?"adminMessage":"userMessage"}`}><div><strong>{item.senderRole==="ADMIN"?"Administration":item.senderName}</strong><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.message}</p></div>)}</div>
          <form className="replyComposer" onSubmit={sendReply}><textarea rows={4} required value={reply} onChange={e=>setReply(e.target.value)} placeholder="Reply to this user..."/><button className="btn primary" disabled={busy==="reply"}>{busy==="reply"?"Sending...":"Send reply"}</button></form>
        </>}
      </article>
    </div>
  </section>;
}
