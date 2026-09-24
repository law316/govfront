import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {api} from "./api";
import {useLiveRefresh} from "./useLiveRefresh";

type SupportMessage={id:number;senderUserId:number;senderRole:string;senderName:string;message:string;createdAt:string};
type SupportTicket={id:number;userId:number;userRole:string;fullName:string;email:string;category:string;subject:string;paymentTxRef?:string|null;status:string;createdAt:string;updatedAt:string;lastMessageAt:string;messages:SupportMessage[]};

const categories=[
  ["PAYMENT_NOT_REFLECTED","Payment not reflected"],
  ["LOGIN_ISSUE","Login issue"],
  ["REGISTRATION_ISSUE","Registration issue"],
  ["TRAINING_MATERIAL","Training / material issue"],
  ["ASSESSMENT","Assessment issue"],
  ["BUSINESS_PLAN","Business plan issue"],
  ["OTHER","Other"]
] as const;

const pretty=(value:string)=>value.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,x=>x.toUpperCase());

export default function SupportCenter(){
  const[params]=useSearchParams();
  const[tickets,setTickets]=useState<SupportTicket[]>([]);
  const[selectedId,setSelectedId]=useState<number|null>(null);
  const[category,setCategory]=useState(params.get("category")||"PAYMENT_NOT_REFLECTED");
  const[subject,setSubject]=useState(params.get("category")==="PAYMENT_NOT_REFLECTED"?"Payment not reflected":"");
  const[paymentTxRef,setPaymentTxRef]=useState(params.get("paymentTxRef")||params.get("tx_ref")||"");
  const[newMessage,setNewMessage]=useState("");
  const[reply,setReply]=useState("");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  const selected=useMemo(()=>tickets.find(x=>x.id===selectedId)||tickets[0]||null,[tickets,selectedId]);

  async function load(){
    setError("");
    try{
      const rows=await api<SupportTicket[]>("/api/support");
      setTickets(rows);
      if(rows.length&&!selectedId)setSelectedId(rows[0].id);
    }catch(err){setError(err instanceof Error?err.message:"Could not load support messages.");}
  }

  useEffect(()=>{void load();},[]);
  useLiveRefresh(()=>load(),12000);

  async function createTicket(e:FormEvent){
    e.preventDefault();
    setBusy("create");setError("");setNotice("");
    try{
      const created=await api<SupportTicket>("/api/support",{
        method:"POST",
        body:JSON.stringify({category,subject,message:newMessage,paymentTxRef:paymentTxRef.trim()||null})
      });
      setSubject("");setNewMessage("");setPaymentTxRef("");
      setNotice("Support request sent. Administration can now see and reply to this conversation.");
      await load();setSelectedId(created.id);
    }catch(err){setError(err instanceof Error?err.message:"Support request could not be sent.");}
    finally{setBusy("");}
  }

  async function sendReply(e:FormEvent){
    e.preventDefault();
    if(!selected)return;
    setBusy("reply");setError("");setNotice("");
    try{
      const updated=await api<SupportTicket>(`/api/support/${selected.id}/messages`,{
        method:"POST",body:JSON.stringify({message:reply})
      });
      setReply("");
      setTickets(current=>current.map(x=>x.id===updated.id?updated:x));
      setNotice("Reply sent to administration.");
    }catch(err){setError(err instanceof Error?err.message:"Reply could not be sent.");}
    finally{setBusy("");}
  }

  return <section className="dashboardShell supportShell">
    <div className="dashboardHero">
      <div><span className="eyebrow">Contact Support</span><h1>Programme Support Centre</h1><p>Report payment, registration, training or programme issues and continue the conversation here.</p></div>
      <Link className="btn outline small" to="/">Back</Link>
    </div>

    {busy&&<div className="busyNotice"><span className="spinner"/>Processing your support request...</div>}
    {error&&<div className="error">{error}</div>}
    {notice&&<div className="success">{notice}</div>}

    <div className="supportGrid">
      <form className="card formCard" onSubmit={createTicket}>
        <span className="eyebrow">New support request</span><h2>Tell us what happened</h2>
        <label>Issue type<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Subject<input maxLength={180} required value={subject} onChange={e=>setSubject(e.target.value)}/></label>
        {category==="PAYMENT_NOT_REFLECTED"&&<label>Payment reference, if available<input maxLength={100} value={paymentTxRef} onChange={e=>setPaymentTxRef(e.target.value)} placeholder="Transaction reference"/></label>}
        <label>Message<textarea rows={7} maxLength={12000} required value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Describe the issue clearly, including what you tried."/></label>
        <button className="btn primary full" disabled={busy==="create"}>{busy==="create"?"Sending...":"Send to Support"}</button>
      </form>

      <article className="card supportTickets">
        <div className="tableHead"><div><span className="eyebrow">My support history</span><h2>Conversations</h2></div><button className="btn outline small" type="button" disabled={!!busy} onClick={()=>void load()}>Refresh</button></div>
        {tickets.length===0?<div className="emptyState">No support conversations yet.</div>:<div className="ticketList">{tickets.map(ticket=><button type="button" key={ticket.id} className={`ticketItem ${selected?.id===ticket.id?"selected":""}`} onClick={()=>setSelectedId(ticket.id)}><span><strong>{ticket.subject}</strong><small>{pretty(ticket.category)}</small></span><em>{pretty(ticket.status)}</em></button>)}</div>}
      </article>
    </div>

    {selected&&<article className="card conversationCard">
      <div className="conversationHeader"><div><span className="eyebrow">Support conversation #{selected.id}</span><h2>{selected.subject}</h2><p>{pretty(selected.category)} - {pretty(selected.status)}</p>{selected.paymentTxRef&&<p className="mono">Payment ref: {selected.paymentTxRef}</p>}</div></div>
      <div className="messageThread">{selected.messages.map(item=><div key={item.id} className={`supportMessage ${item.senderRole==="ADMIN"?"adminMessage":"userMessage"}`}><div><strong>{item.senderRole==="ADMIN"?"Programme Support":item.senderName}</strong><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.message}</p></div>)}</div>
      <form className="replyComposer" onSubmit={sendReply}><textarea rows={4} required value={reply} onChange={e=>setReply(e.target.value)} placeholder="Write a reply..."/><button className="btn primary" disabled={busy==="reply"}>{busy==="reply"?"Sending...":"Send reply"}</button></form>
    </article>}
  </section>;
}
