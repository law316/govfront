import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";
import {NIGERIA_STATES,lgasForState} from "./NigeriaLocations";

type AdminTab="programme"|"payments"|"accounts";
type Audience="ALL"|"ENUMERATORS"|"PARTICIPANTS";
type PaymentPurpose="ENUMERATOR_REGISTRATION"|"PARTICIPANT_REGISTRATION"|"RESOURCE_PROVISIONING";

type DeadlineView={id:number;deadlineAt:string;updatedAt?:string|null;updatedByUserId?:number|null};
type Announcement={
  id:number;title:string;message:string;audience:Audience;createdAt:string;active:boolean;
  emailRequested:boolean;emailTargetCount:number;emailSentCount:number;createdByUserId:number;
};
type PaymentRow={
  id:number;txRef:string;purpose:PaymentPurpose|string;amount:number;currency:string;status:string;
  providerTransactionId?:string|null;providerStatus?:string|null;verifiedAt?:string|null;
  targetParticipantId?:number|null;verificationSource:string;overrideReason?:string|null;overrideAt?:string|null;
  userId?:number;fullName?:string;email?:string;phone?:string;role?:string;
};
type EnumeratorRow={
  id:number;userId:number;fullName:string;email:string;phone:string;state:string;lga:string;address:string;
  enumeratorCode?:string|null;status:string;examScore?:number|null;enabled:boolean;
};
type ParticipantRow={
  id:number;userId:number;participantCode:string;fullName:string;email:string;phone:string;state:string;lga:string;address:string;
  program:string;skillTrack?:string|null;participantStatus:string;resourcesUnlocked:boolean;
  registrationPaidAt?:string|null;resourcePaidAt?:string|null;assessmentScore?:number|null;assessmentPassed:boolean;
  referredBy?:string|null;enabled:boolean;
};
type Summary={
  enumeratorsTotal:number;enumeratorsPendingPayment:number;enumeratorsPaid:number;enumeratorsQualified:number;enumeratorsSuspended:number;
  participantsTotal:number;participantsRegistrationPending:number;participantsResourcesPending:number;participantsTrainingActive:number;participantsSuspended:number;
};

const skillTracks=[
  "WEB_DEVELOPMENT","MOBILE_APP_DEVELOPMENT","SOFTWARE_ENGINEERING_FOUNDATIONS",
  "DATA_ANALYSIS","DATA_SCIENCE","UI_UX_DESIGN","DIGITAL_MARKETING","GRAPHIC_DESIGN",
  "CYBERSECURITY_FUNDAMENTALS","CLOUD_COMPUTING","CLOUD_ENGINEERING","DEVOPS_ENGINEERING",
  "AI_PRODUCTIVITY_TOOLS","PRODUCT_MANAGEMENT","PROJECT_MANAGEMENT","BUSINESS_ANALYSIS",
  "CUSTOMER_SERVICE","ENTREPRENEURSHIP_FOUNDATIONS","VIDEO_EDITING_CONTENT_PRODUCTION",
  "VIRTUAL_ASSISTANCE_DIGITAL_BUSINESS"
];

function label(value?:string|null){
  if(!value)return "-";
  return String(value).toLowerCase().split("_").map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
}

function Status({value}:{value?:string|null}){
  const raw=value||"UNKNOWN";
  return <b className={`statusPill status-${raw.toLowerCase()}`}>{label(raw)}</b>;
}

function toLocalInput(iso?:string|null){
  if(!iso)return "";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return "";
  const pad=(n:number)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminOperations(){
  const[tab,setTab]=useState<AdminTab>("programme");
  const[deadline,setDeadline]=useState<DeadlineView|null>(null);
  const[deadlineInput,setDeadlineInput]=useState("");
  const[extendDays,setExtendDays]=useState("30");
  const[announcements,setAnnouncements]=useState<Announcement[]>([]);
  const[payments,setPayments]=useState<PaymentRow[]>([]);
  const[enumerators,setEnumerators]=useState<EnumeratorRow[]>([]);
  const[participants,setParticipants]=useState<ParticipantRow[]>([]);
  const[summary,setSummary]=useState<Summary|null>(null);
  const[enumFilter,setEnumFilter]=useState("ALL");
  const[participantFilter,setParticipantFilter]=useState("ALL");
  const[accountSearch,setAccountSearch]=useState("");
  const[createEnumeratorState,setCreateEnumeratorState]=useState("");
  const[createParticipantState,setCreateParticipantState]=useState("");
  const[manualPurpose,setManualPurpose]=useState<PaymentPurpose>("ENUMERATOR_REGISTRATION");
  const[manualTarget,setManualTarget]=useState("");
  const[manualReason,setManualReason]=useState("");
  const[overrideReasons,setOverrideReasons]=useState<Record<string,string>>({});
  const[editing,setEditing]=useState<{kind:"enumerator"|"participant";id:number;fullName:string;email:string;phone:string;state:string;lga:string;address:string}|null>(null);
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState("");

  const load=async()=>{
    setError("");
    try{
      const[d,a,p,s,e,pt]=await Promise.all([
        api<DeadlineView>("/api/admin/programme/deadline"),
        api<Announcement[]>("/api/admin/programme/announcements"),
        api<PaymentRow[]>("/api/admin/payment-controls"),
        api<Summary>("/api/admin/operations/summary"),
        api<EnumeratorRow[]>("/api/admin/operations/enumerators"),
        api<ParticipantRow[]>("/api/admin/operations/participants")
      ]);
      setDeadline(d);
      setDeadlineInput(toLocalInput(d.deadlineAt));
      setAnnouncements(a);
      setPayments(p);
      setSummary(s);
      setEnumerators(e);
      setParticipants(pt);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load programme operations.");
    }
  };

  useEffect(()=>{void load();},[]);

  const filteredEnumerators=useMemo(()=>{
    const q=accountSearch.trim().toLowerCase();
    return enumerators.filter(item=>{
      const statusOk=enumFilter==="ALL"||item.status===enumFilter;
      const textOk=!q||[item.fullName,item.email,item.phone,item.enumeratorCode,item.state,item.lga]
        .some(v=>String(v||"").toLowerCase().includes(q));
      return statusOk&&textOk;
    });
  },[enumerators,enumFilter,accountSearch]);

  const filteredParticipants=useMemo(()=>{
    const q=accountSearch.trim().toLowerCase();
    return participants.filter(item=>{
      const statusOk=participantFilter==="ALL"||item.participantStatus===participantFilter;
      const textOk=!q||[item.fullName,item.email,item.phone,item.participantCode,item.referredBy,item.state,item.lga]
        .some(v=>String(v||"").toLowerCase().includes(q));
      return statusOk&&textOk;
    });
  },[participants,participantFilter,accountSearch]);

  const manualTargets=manualPurpose==="ENUMERATOR_REGISTRATION"
    ?enumerators.map(x=>({id:x.id,label:`${x.fullName} Ãƒâ€šÃ‚· ${x.enumeratorCode||"No ID"} Ãƒâ€šÃ‚· ${label(x.status)}`}))
    :participants.map(x=>({id:x.id,label:`${x.fullName} Ãƒâ€šÃ‚· ${x.participantCode} Ãƒâ€šÃ‚· ${label(x.participantStatus)}`}));

  async function saveDeadline(e:FormEvent){
    e.preventDefault();
    if(!deadlineInput){setError("Select a future deadline.");return;}
    setBusy("deadline");
    setError("");setMessage("");
    try{
      const result=await api<DeadlineView>("/api/admin/programme/deadline",{
        method:"PATCH",
        body:JSON.stringify({deadlineAt:new Date(deadlineInput).toISOString()})
      });
      setDeadline(result);
      setDeadlineInput(toLocalInput(result.deadlineAt));
      setMessage("Programme deadline updated.");
    }catch(err){
      setError(err instanceof Error?err.message:"Could not update deadline.");
    }finally{setBusy("");}
  }

  async function extendDeadline(e:FormEvent){
    e.preventDefault();
    const days=Number(extendDays);
    if(!Number.isInteger(days)||days<1||days>365){setError("Extension must be between 1 and 365 days.");return;}
    setBusy("extend");
    setError("");setMessage("");
    try{
      const result=await api<DeadlineView>("/api/admin/programme/deadline/extend",{
        method:"POST",body:JSON.stringify({days})
      });
      setDeadline(result);
      setDeadlineInput(toLocalInput(result.deadlineAt));
      setMessage(`Programme deadline extended by ${days} day${days===1?"":"s"}.`);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not extend deadline.");
    }finally{setBusy("");}
  }

  async function createAnnouncement(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy("announcement");setError("");setMessage("");
    const form=new FormData(e.currentTarget);
    try{
      const result=await api<Announcement>("/api/admin/programme/announcements",{
        method:"POST",
        body:JSON.stringify({
          title:String(form.get("title")||""),
          message:String(form.get("message")||""),
          audience:String(form.get("audience")||"ALL"),
          sendEmail:form.get("sendEmail")==="true"
        })
      });
      setAnnouncements(current=>[result,...current]);
      setMessage(result.emailRequested
        ?`Announcement published. Email sent to ${result.emailSentCount} of ${result.emailTargetCount} eligible account(s).`
        :"Announcement published to user dashboards.");
      e.currentTarget.reset();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not publish announcement.");
    }finally{setBusy("");}
  }

  async function deactivateAnnouncement(id:number){
    if(!window.confirm("Remove this announcement from user dashboards?"))return;
    setBusy(`announcement:${id}`);setError("");setMessage("");
    try{
      await api<void>(`/api/admin/programme/announcements/${id}`,{method:"DELETE"});
      setMessage("Announcement removed from active dashboards.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not deactivate announcement.");}
    finally{setBusy("");}
  }

  async function overridePayment(row:PaymentRow){
    const reason=(overrideReasons[row.txRef]||"").trim();
    if(reason.length<5){setError("Enter a clear reason before manual confirmation.");return;}
    if(!window.confirm(`Manually confirm ${row.txRef}? This grants programme value and is audit logged.`))return;
    setBusy(`override:${row.txRef}`);setError("");setMessage("");
    try{
      const result=await api<PaymentRow>(`/api/admin/payment-controls/${encodeURIComponent(row.txRef)}/override`,{
        method:"POST",body:JSON.stringify({reason})
      });
      setMessage(`Payment ${result.txRef} confirmed by Admin override.`);
      setOverrideReasons(current=>({...current,[row.txRef]:""}));
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Manual payment confirmation failed.");}
    finally{setBusy("");}
  }

  async function manualConfirm(e:FormEvent){
    e.preventDefault();
    if(!manualTarget){setError("Select the account to confirm.");return;}
    if(manualReason.trim().length<5){setError("Enter a clear reason for the manual confirmation.");return;}
    if(!window.confirm("Create an audited manual payment confirmation for this account?"))return;
    setBusy("manual-confirm");setError("");setMessage("");
    try{
      const result=await api<PaymentRow>("/api/admin/payment-controls/manual-confirm",{
        method:"POST",
        body:JSON.stringify({purpose:manualPurpose,targetId:Number(manualTarget),reason:manualReason.trim()})
      });
      setMessage(`Manual confirmation recorded: ${result.txRef}`);
      setManualReason("");setManualTarget("");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not create manual confirmation.");}
    finally{setBusy("");}
  }

  async function createEnumerator(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy("create-enumerator");setError("");setMessage("");
    try{
      const body=new FormData(e.currentTarget);
      await api("/api/admin/operations/enumerators",{method:"POST",body});
      setMessage("Enumerator account created. Registration payment is still pending until verified or manually confirmed.");
      e.currentTarget.reset();
      setCreateEnumeratorState("");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not create Enumerator.");}
    finally{setBusy("");}
  }

  async function createParticipant(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy("create-participant");setError("");setMessage("");
    const form=new FormData(e.currentTarget);
    const program=String(form.get("program")||"DIGITAL_SKILLS");
    try{
      await api("/api/admin/operations/participants",{
        method:"POST",
        body:JSON.stringify({
          enumeratorProfileId:Number(form.get("enumeratorProfileId")),
          fullName:String(form.get("fullName")||""),
          email:String(form.get("email")||""),
          phone:String(form.get("phone")||""),
          state:String(form.get("state")||""),
          lga:String(form.get("lga")||""),
          address:String(form.get("address")||""),
          program,
          skillTrack:program==="DIGITAL_SKILLS"?String(form.get("skillTrack")||"WEB_DEVELOPMENT"):null,
          temporaryPassword:String(form.get("temporaryPassword")||"")
        })
      });
      setMessage("Participant account created. It remains inactive until registration payment is verified or manually confirmed.");
      e.currentTarget.reset();
      setCreateParticipantState("");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not create participant.");}
    finally{setBusy("");}
  }

  async function saveEdit(e:FormEvent){
    e.preventDefault();
    if(!editing)return;
    setBusy("edit-account");setError("");setMessage("");
    try{
      await api(`/api/admin/operations/${editing.kind==="enumerator"?"enumerators":"participants"}/${editing.id}`,{
        method:"PATCH",
        body:JSON.stringify({
          fullName:editing.fullName,email:editing.email,phone:editing.phone,
          state:editing.state,lga:editing.lga,address:editing.address
        })
      });
      setEditing(null);
      setMessage("Account details updated.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update account.");}
    finally{setBusy("");}
  }

  async function deleteAccount(kind:"enumerator"|"participant",id:number,name:string){
    const confirmation=window.prompt(`Permanent delete is only allowed for safe test/unpaid records. Type DELETE to permanently delete ${name}.`);
    if(confirmation!=="DELETE")return;
    setBusy(`delete:${kind}:${id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/operations/${kind==="enumerator"?"enumerators":"participants"}/${id}?confirm=DELETE`,{method:"DELETE"});
      setEditing(null);
      setMessage("Account permanently deleted. Protected financial/audit records cannot be deleted by this action.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Permanent deletion was blocked.");
    }finally{setBusy("");}
  }

  async function qaConfirmParticipant(row:ParticipantRow,purpose:"PARTICIPANT_REGISTRATION"|"RESOURCE_PROVISIONING"){
    const defaultReason="Internal QA test account - Admin override used for workflow testing; no external payment collected.";
    const reason=window.prompt(
      purpose==="PARTICIPANT_REGISTRATION"
        ?`Activate ${row.fullName}'s participant registration for controlled testing. Enter the audit reason:`
        :`Unlock ${row.fullName}'s training resources for controlled testing. Enter the audit reason:`,
      defaultReason
    );
    if(!reason||reason.trim().length<5)return;
    if(!window.confirm("Record this as an audited Admin QA override? It will NOT be labelled as provider-verified payment."))return;

    const key=`qa:${purpose}:${row.id}`;
    setBusy(key);setError("");setMessage("");
    try{
      const result=await api<PaymentRow>("/api/admin/payment-controls/manual-confirm",{
        method:"POST",
        body:JSON.stringify({purpose,targetId:row.id,reason:reason.trim()})
      });
      setMessage(`QA override recorded for ${row.fullName}: ${result.txRef}`);
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not record the QA payment override.");
    }finally{setBusy("");}
  }

  async function accountAction(kind:"enumerator"|"participant",id:number,enabled:boolean){
    const action=enabled?"archive":"reactivate";
    const wording=enabled?"remove this account from active programme access":"reactivate this account";
    if(!window.confirm(`Are you sure you want to ${wording}?`))return;
    setBusy(`${action}:${kind}:${id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/operations/${kind==="enumerator"?"enumerators":"participants"}/${id}/${action}`,{method:"POST"});
      setMessage(enabled?"Account archived/suspended. Audit and payment history were preserved.":"Account reactivated.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:`Could not ${action} account.`);}
    finally{setBusy("");}
  }

  return <section className="dashboardShell adminShell operationsAdmin">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration / Operations</span>
        <h1>Programme Operations Centre</h1>
        <p>Control the programme timeline, publish announcements, supervise payment recognition and manage active accounts.</p>
      </div>
      <Link className="btn outline small adminBackButton" to="/admin">Back to administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Processing administration request...</div>}

    <div className="adminTabs">
      <button className={tab==="programme"?"active":""} onClick={()=>setTab("programme")}>Timeline & Announcements</button>
      <button className={tab==="payments"?"active":""} onClick={()=>setTab("payments")}>Payment Controls</button>
      <button className={tab==="accounts"?"active":""} onClick={()=>setTab("accounts")}>Accounts & Registration</button>
      <button className="refreshTab" onClick={()=>void load()}>Refresh</button>
    </div>

    {tab==="programme"&&<>
      <div className="featureGrid three">
        <article className="card statCard">
          <small>Current deadline</small>
          <strong>{deadline?new Date(deadline.deadlineAt).toLocaleString():"Loading..."}</strong>
          <p>The live countdown shown to registered users is calculated from this deadline.</p>
        </article>
        <article className="card statCard">
          <small>Active announcements</small>
          <strong>{announcements.filter(x=>x.active).length}</strong>
          <p>Visible on matching registered-user dashboards.</p>
        </article>
        <article className="card statCard">
          <small>Email delivery</small>
          <strong>{announcements.reduce((sum,x)=>sum+x.emailSentCount,0)}</strong>
          <p>Total successful announcement email sends recorded.</p>
        </article>
      </div>

      <div className="featureGrid two">
        <form className="card formCard" onSubmit={saveDeadline}>
          <span className="eyebrow">Programme timeline</span>
          <h2>Set exact deadline</h2>
          <p>Use this when you need a specific closing date and time.</p>
          <label>Deadline<input type="datetime-local" required value={deadlineInput} onChange={e=>setDeadlineInput(e.target.value)}/></label>
          <button className="btn primary full" disabled={busy==="deadline"}>{busy==="deadline"?"Saving...":"Save deadline"}</button>
        </form>

        <form className="card formCard" onSubmit={extendDeadline}>
          <span className="eyebrow">Extend timeline</span>
          <h2>Add more days</h2>
          <p>Default extension is 30 days. You can choose any value from 1 to 365 days.</p>
          <label>Days to add<input type="number" min={1} max={365} required value={extendDays} onChange={e=>setExtendDays(e.target.value)}/></label>
          <button className="btn primary full" disabled={busy==="extend"}>{busy==="extend"?"Extending...":"Extend programme"}</button>
        </form>
      </div>

      <div className="participantSplit">
        <form className="card formCard" onSubmit={createAnnouncement}>
          <span className="eyebrow">Announcement Centre</span>
          <h2>Publish announcement</h2>
          <p>The message is saved to matching user dashboards. Email can be requested at the same time.</p>
          <label>Title<input name="title" maxLength={180} required/></label>
          <label>Message<textarea name="message" rows={7} maxLength={12000} required/></label>
          <label>Audience
            <select name="audience" defaultValue="ALL">
              <option value="ALL">All registered users</option>
              <option value="ENUMERATORS">Enumerators only</option>
              <option value="PARTICIPANTS">Participants only</option>
            </select>
          </label>
          <label className="check"><input name="sendEmail" type="checkbox" value="true"/> Send this announcement to registered email addresses</label>
          <button className="btn primary full" disabled={busy==="announcement"}>{busy==="announcement"?"Publishing...":"Publish announcement"}</button>
        </form>

        <article className="card tableWrap">
          <div className="tableHead"><div><span className="eyebrow">Announcement history</span><h2>Published notices</h2></div></div>
          {announcements.length===0?<div className="emptyState">No announcements yet.</div>:
          <div className="tableScroll"><table><thead><tr><th>Announcement</th><th>Audience</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{announcements.map(item=><tr key={item.id}>
            <td><strong>{item.title}</strong><small className="tableSub">{item.message}</small><small className="tableSub">{new Date(item.createdAt).toLocaleString()}</small></td>
            <td>{label(item.audience)}</td>
            <td>{item.emailRequested?`${item.emailSentCount}/${item.emailTargetCount} sent`:"Dashboard only"}</td>
            <td><Status value={item.active?"ACTIVE":"INACTIVE"}/></td>
            <td>{item.active?<button className="btn outline small" type="button" disabled={busy===`announcement:${item.id}`} onClick={()=>void deactivateAnnouncement(item.id)}>Remove</button>:<span className="muted">Archived</span>}</td>
          </tr>)}</tbody></table></div>}
        </article>
      </div>
    </>}

    {tab==="payments"&&<>
      <div className="featureGrid three">
        <article className="card statCard"><small>Payment records</small><strong>{payments.length}</strong><p>Provider and Admin-confirmed records.</p></article>
        <article className="card statCard"><small>Provider verified</small><strong>{payments.filter(x=>x.status==="SUCCESSFUL"&&x.verificationSource==="PROVIDER").length}</strong><p>Verified through the provider workflow.</p></article>
        <article className="card statCard"><small>Admin override</small><strong>{payments.filter(x=>x.verificationSource==="ADMIN_OVERRIDE").length}</strong><p>Manual confirmations with an audit reason.</p></article>
      </div>

      <form className="card formCard manualConfirmForm" onSubmit={manualConfirm}>
        <span className="eyebrow">Manual payment confirmation</span>
        <h2>Confirm a registration or resource payment manually</h2>
        <p>For real payment exceptions, verify the payment evidence first. For your own controlled QA accounts, use a clear QA reason stating that no external payment was collected. Every action is recorded as an Admin override, never as provider verification.</p>
        <div className="fields">
          <label>Purpose
            <select value={manualPurpose} onChange={e=>{setManualPurpose(e.target.value as PaymentPurpose);setManualTarget("");}}>
              <option value="ENUMERATOR_REGISTRATION">Enumerator registration</option>
              <option value="PARTICIPANT_REGISTRATION">Participant registration</option>
              <option value="RESOURCE_PROVISIONING">Participant resource provisioning</option>
            </select>
          </label>
          <label>Target account
            <select required value={manualTarget} onChange={e=>setManualTarget(e.target.value)}>
              <option value="">Select account</option>
              {manualTargets.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
        </div>
        <label>Audit reason<textarea rows={3} value={manualReason} onChange={e=>setManualReason(e.target.value)} placeholder="Example: Confirmed against bank statement / payment support review" required/></label>
        <button className="btn primary" disabled={busy==="manual-confirm"}>{busy==="manual-confirm"?"Confirming...":"Confirm payment manually"}</button>
      </form>

      <article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Payment audit</span><h2>All payment records</h2><p className="muted">Automatic provider recognition remains the normal route. Manual controls are available for exceptions.</p></div></div>
        <div className="tableScroll"><table className="operationsPaymentTable">
          <thead><tr><th>User</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Verification</th><th>Reference</th><th>Exception action</th></tr></thead>
          <tbody>{payments.map(row=><tr key={row.id}>
            <td><strong>{row.fullName||"Unknown"}</strong><small className="tableSub">{row.email||""}</small></td>
            <td>{label(row.purpose)}</td>
            <td>{row.currency} {Number(row.amount||0).toLocaleString()}</td>
            <td><Status value={row.status}/></td>
            <td><strong>{label(row.verificationSource)}</strong>{row.overrideReason&&<small className="tableSub">{row.overrideReason}</small>}</td>
            <td className="mono">{row.txRef}</td>
            <td>{row.status==="SUCCESSFUL"?<span className="verifiedText">Completed</span>:<div className="overrideCell">
              <input placeholder="Reason" value={overrideReasons[row.txRef]||""} onChange={e=>setOverrideReasons(current=>({...current,[row.txRef]:e.target.value}))}/>
              <button className="btn outline small" type="button" disabled={busy===`override:${row.txRef}`} onClick={()=>void overridePayment(row)}>Admin confirm</button>
            </div>}</td>
          </tr>)}</tbody>
        </table></div>
      </article>
    </>}

    {tab==="accounts"&&<>
      {summary&&<div className="featureGrid four">
        <article className="card statCard"><small>Enumerators</small><strong>{summary.enumeratorsTotal}</strong><p>{summary.enumeratorsQualified} qualified Ãƒâ€šÃ‚· {summary.enumeratorsPendingPayment} payment pending</p></article>
        <article className="card statCard"><small>Enumerator suspended</small><strong>{summary.enumeratorsSuspended}</strong><p>Removed from active login until reactivated.</p></article>
        <article className="card statCard"><small>Participants</small><strong>{summary.participantsTotal}</strong><p>{summary.participantsRegistrationPending} registration pending Ãƒâ€šÃ‚· {summary.participantsResourcesPending} resources pending</p></article>
        <article className="card statCard"><small>Participant suspended</small><strong>{summary.participantsSuspended}</strong><p>Archived from active access with history preserved.</p></article>
      </div>}

      <div className="featureGrid two">
        <form className="card formCard" onSubmit={createEnumerator}>
          <span className="eyebrow">Admin registration</span><h2>Create Enumerator</h2>
          <div className="fields">
            <label>Full name<input name="fullName" required/></label>
            <label>Email<input name="email" type="email" required/></label>
            <label>Phone<input name="phone" required/></label>
            <label>State<select name="state" required value={createEnumeratorState} onChange={e=>setCreateEnumeratorState(e.target.value)}><option value="">Select State</option>{NIGERIA_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select></label>
            <label>LGA<select name="lga" required disabled={!createEnumeratorState} defaultValue=""><option value="">Select LGA</option>{lgasForState(createEnumeratorState).map(lga=><option key={lga} value={lga}>{lga}</option>)}</select></label>
            <label>Address<input name="address" minLength={8} placeholder="House number / street / community" required/></label>
            <label>Password<input name="password" type="password" minLength={10} required/></label>
            <label>Passport<input name="passport" type="file" accept="image/jpeg,image/png,image/webp" required/></label>
          </div>
          <button className="btn primary full" disabled={busy==="create-enumerator"}>{busy==="create-enumerator"?"Creating...":"Create Enumerator"}</button>
        </form>

        <form className="card formCard" onSubmit={createParticipant}>
          <span className="eyebrow">Admin registration</span><h2>Create Participant</h2>
          <div className="fields">
            <label>Qualified Enumerator
              <select name="enumeratorProfileId" required defaultValue="">
                <option value="" disabled>Select Enumerator</option>
                {enumerators.filter(x=>x.status==="QUALIFIED").map(x=><option key={x.id} value={x.id}>{x.fullName} Ãƒâ€šÃ‚· {x.enumeratorCode}</option>)}
              </select>
            </label>
            <label>Full name<input name="fullName" required/></label>
            <label>Email<input name="email" type="email" required/></label>
            <label>Phone<input name="phone" required/></label>
            <label>State<select name="state" required value={createParticipantState} onChange={e=>setCreateParticipantState(e.target.value)}><option value="">Select State</option>{NIGERIA_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select></label>
            <label>LGA<select name="lga" required disabled={!createParticipantState} defaultValue=""><option value="">Select LGA</option>{lgasForState(createParticipantState).map(lga=><option key={lga} value={lga}>{lga}</option>)}</select></label>
            <label>Address<input name="address" minLength={8} placeholder="House number / street / community" required/></label>
            <label>Pathway
              <select name="program" defaultValue="DIGITAL_SKILLS">
                <option value="DIGITAL_SKILLS">Digital Skills & Enterprise</option>
                <option value="BUSINESS_SUPPORT">Business Startup & Proposal</option>
              </select>
            </label>
            <label>Digital skill track
              <select name="skillTrack" defaultValue="WEB_DEVELOPMENT">
                {skillTracks.map(x=><option key={x} value={x}>{label(x)}</option>)}
              </select>
            </label>
            <label>Temporary password<input name="temporaryPassword" type="text" minLength={10} required/></label>
          </div>
          <button className="btn primary full" disabled={busy==="create-participant"}>{busy==="create-participant"?"Creating...":"Create Participant"}</button>
        </form>
      </div>

      <article className="card accountControls">
        <div className="tableHead"><div><span className="eyebrow">Account controls</span><h2>Search, update, archive or reactivate</h2></div></div>
        <div className="accountFilters">
          <label>Search<input value={accountSearch} onChange={e=>setAccountSearch(e.target.value)} placeholder="Name, email, ID, state..."/></label>
          <label>Enumerator stage<select value={enumFilter} onChange={e=>setEnumFilter(e.target.value)}>
            <option value="ALL">All</option><option value="PENDING_PAYMENT">Pending payment</option><option value="PAID">Paid</option><option value="QUALIFIED">Qualified</option><option value="SUSPENDED">Suspended</option>
          </select></label>
          <label>Participant stage<select value={participantFilter} onChange={e=>setParticipantFilter(e.target.value)}>
            <option value="ALL">All</option>
            {["REGISTRATION_PENDING","RESOURCES_PENDING","TRAINING_ACTIVE","ASSESSMENT_PENDING","PLAN_PENDING","PLAN_SUBMITTED","UNDER_REVIEW","REVISION_REQUIRED","REVIEWED","SHORTLISTED","NOT_SHORTLISTED","SUSPENDED"].map(x=><option key={x} value={x}>{label(x)}</option>)}
          </select></label>
        </div>
      </article>

      {editing&&<form className="card formCard editAccountPanel" onSubmit={saveEdit}>
        <div className="tableHead"><div><span className="eyebrow">Edit account</span><h2>{editing.fullName}</h2></div><button className="btn outline small" type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
        <div className="fields">
          <label>Full name<input value={editing.fullName} onChange={e=>setEditing({...editing,fullName:e.target.value})}/></label>
          <label>Email<input type="email" value={editing.email} onChange={e=>setEditing({...editing,email:e.target.value})}/></label>
          <label>Phone<input value={editing.phone} onChange={e=>setEditing({...editing,phone:e.target.value})}/></label>
          <label>State<select value={editing.state} onChange={e=>setEditing({...editing,state:e.target.value,lga:""})}><option value="">Select State</option>{NIGERIA_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select></label>
          <label>LGA<select value={editing.lga} disabled={!editing.state} onChange={e=>setEditing({...editing,lga:e.target.value})}><option value="">Select LGA</option>{lgasForState(editing.state).map(lga=><option key={lga} value={lga}>{lga}</option>)}</select></label>
          <label>Address<input minLength={8} value={editing.address} onChange={e=>setEditing({...editing,address:e.target.value})}/></label>
        </div>
        <button className="btn primary" disabled={busy==="edit-account"}>{busy==="edit-account"?"Saving...":"Save account changes"}</button>
      </form>}

      <article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Enumerator accounts</span><h2>Enumerator stages</h2></div><span className="recordCount">{filteredEnumerators.length} shown</span></div>
        <div className="tableScroll"><table><thead><tr><th>Enumerator</th><th>Location</th><th>Status</th><th>Score</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>{filteredEnumerators.map(row=><tr key={row.id}>
          <td><strong>{row.fullName}</strong><small className="tableSub">{row.email}</small><small className="tableSub mono">{row.enumeratorCode||"-"}</small></td>
          <td>{row.lga}, {row.state}</td><td><Status value={row.status}/></td><td>{row.examScore==null?"-":`${row.examScore}%`}</td><td>{row.enabled?"Yes":"No"}</td>
          <td className="actionButtons"><button className="btn outline small" type="button" onClick={()=>setEditing({kind:"enumerator",id:row.id,fullName:row.fullName,email:row.email,phone:row.phone,state:row.state,lga:row.lga,address:row.address})}>Edit</button>
          <button className="btn outline small" type="button" disabled={busy.endsWith(`:enumerator:${row.id}`)} onClick={()=>void accountAction("enumerator",row.id,row.enabled)}>{row.enabled?"Archive":"Reactivate"}</button>
          <button className="btn danger small" type="button" disabled={busy===`delete:enumerator:${row.id}`} onClick={()=>void deleteAccount("enumerator",row.id,row.fullName)}>{busy===`delete:enumerator:${row.id}`?"Deleting...":"Delete"}</button></td>
        </tr>)}</tbody></table></div>
      </article>

      <article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Participant accounts</span><h2>Participant stages</h2></div><span className="recordCount">{filteredParticipants.length} shown</span></div>
        <div className="tableScroll"><table><thead><tr><th>Participant</th><th>Pathway</th><th>Enumerator</th><th>Status</th><th>Resources</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>{filteredParticipants.map(row=><tr key={row.id}>
          <td><strong>{row.fullName}</strong><small className="tableSub">{row.email}</small><small className="tableSub mono">{row.participantCode}</small></td>
          <td>{label(row.program)}{row.skillTrack&&<small className="tableSub">{label(row.skillTrack)}</small>}</td><td className="mono">{row.referredBy||"-"}</td><td><Status value={row.participantStatus}/></td><td>{row.resourcesUnlocked?"Unlocked":"Pending"}</td><td>{row.enabled?"Yes":"No"}</td>
          <td className="actionButtons">
          {!row.registrationPaidAt&&<button className="btn qa small" type="button" disabled={busy===`qa:PARTICIPANT_REGISTRATION:${row.id}`} onClick={()=>void qaConfirmParticipant(row,"PARTICIPANT_REGISTRATION")}>{busy===`qa:PARTICIPANT_REGISTRATION:${row.id}`?"Activating...":"Test: Activate"}</button>}
          {!!row.registrationPaidAt&&!row.resourcePaidAt&&row.enabled&&<button className="btn qa small" type="button" disabled={busy===`qa:RESOURCE_PROVISIONING:${row.id}`} onClick={()=>void qaConfirmParticipant(row,"RESOURCE_PROVISIONING")}>{busy===`qa:RESOURCE_PROVISIONING:${row.id}`?"Unlocking...":"Test: Unlock resources"}</button>}
          <button className="btn outline small" type="button" onClick={()=>setEditing({kind:"participant",id:row.id,fullName:row.fullName,email:row.email,phone:row.phone,state:row.state,lga:row.lga,address:row.address})}>Edit</button>
          <button className="btn outline small" type="button" disabled={busy.endsWith(`:participant:${row.id}`)} onClick={()=>void accountAction("participant",row.id,row.enabled)}>{row.enabled?"Archive":"Reactivate"}</button>
          <button className="btn danger small" type="button" disabled={busy===`delete:participant:${row.id}`} onClick={()=>void deleteAccount("participant",row.id,row.fullName)}>{busy===`delete:participant:${row.id}`?"Deleting...":"Delete"}</button></td>
        </tr>)}</tbody></table></div>
      </article>
    </>}
  </section>;
}
