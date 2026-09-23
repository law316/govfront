import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";

type Tab="enum-materials"|"participant-materials"|"participant-questions"|"announcements"|"access";
type EditTarget={kind:"enum-material"|"participant-material"|"participant-question"|"announcement";item:any}|null;

function label(value?:string|null){
  if(!value)return "-";
  return String(value).toLowerCase().split("_").map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
}

export default function AdminContentControl(){
  const[tab,setTab]=useState<Tab>("enum-materials");
  const[enumMaterials,setEnumMaterials]=useState<any[]>([]);
  const[participantMaterials,setParticipantMaterials]=useState<any[]>([]);
  const[participantQuestions,setParticipantQuestions]=useState<any[]>([]);
  const[announcements,setAnnouncements]=useState<any[]>([]);
  const[accessCodes,setAccessCodes]=useState<any[]>([]);
  const[deadline,setDeadline]=useState<any|null>(null);
  const[editTarget,setEditTarget]=useState<EditTarget>(null);
  const[search,setSearch]=useState("");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  async function load(){
    setError("");
    try{
      const[e,p,q,a,c,d]=await Promise.all([
        api<any[]>("/api/admin/training/materials"),
        api<any[]>("/api/admin/participants/materials"),
        api<any[]>("/api/admin/participants/exam/questions"),
        api<any[]>("/api/admin/programme/announcements"),
        api<any[]>("/api/admin/access-codes"),
        api<any>("/api/admin/programme/deadline")
      ]);
      setEnumMaterials(e);setParticipantMaterials(p);setParticipantQuestions(q);
      setAnnouncements(a);setAccessCodes(c);setDeadline(d);
    }catch(err){setError(err instanceof Error?err.message:"Could not load Admin content controls.");}
  }

  useEffect(()=>{void load();},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const rows=tab==="enum-materials"?enumMaterials:
      tab==="participant-materials"?participantMaterials:
      tab==="participant-questions"?participantQuestions:
      tab==="announcements"?announcements:accessCodes;
    if(!q)return rows;
    return rows.filter(item=>Object.values(item).some(value=>String(value??"").toLowerCase().includes(q)));
  },[tab,enumMaterials,participantMaterials,participantQuestions,announcements,accessCodes,search]);

  async function saveEdit(e:FormEvent){
    e.preventDefault();
    if(!editTarget)return;
    const{kind,item}=editTarget;
    setBusy(`edit:${kind}:${item.id}`);setError("");setMessage("");
    try{
      if(kind==="enum-material"){
        await api(`/api/admin/training/materials/${item.id}`,{method:"PATCH",body:JSON.stringify({title:item.title,description:item.description})});
      }else if(kind==="participant-material"){
        await api(`/api/admin/participants/materials/${item.id}`,{method:"PATCH",body:JSON.stringify({title:item.title,description:item.description})});
      }else if(kind==="participant-question"){
        await api(`/api/admin/participants/exam/questions/${item.id}`,{
          method:"PATCH",
          body:JSON.stringify({
            program:item.program,skillTrack:item.skillTrack||null,questionText:item.questionText,
            optionA:item.optionA,optionB:item.optionB,optionC:item.optionC,optionD:item.optionD,correctOption:item.correctOption
          })
        });
      }else{
        await api(`/api/admin/programme/announcements/${item.id}`,{
          method:"PATCH",
          body:JSON.stringify({title:item.title,message:item.message,audience:item.audience})
        });
      }
      setEditTarget(null);
      setMessage("Changes saved successfully.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not save changes.");}
    finally{setBusy("");}
  }

  async function activeAction(kind:"enum-material"|"participant-material"|"participant-question"|"announcement"|"access",item:any,next:boolean){
    const base=
      kind==="enum-material"?"/api/admin/training/materials":
      kind==="participant-material"?"/api/admin/participants/materials":
      kind==="participant-question"?"/api/admin/participants/exam/questions":
      kind==="announcement"?"/api/admin/programme/announcements":"/api/admin/access-codes";

    if(!window.confirm(`${next?"Reactivate":"Deactivate"} this record?`))return;
    setBusy(`active:${kind}:${item.id}`);setError("");setMessage("");
    try{
      if(kind==="access"){
        await api(`${base}/${item.id}/${next?"reactivate":"deactivate"}`,{method:"POST"});
      }else{
        await api(next?`${base}/${item.id}/reactivate`:`${base}/${item.id}`,{method:next?"POST":"DELETE"});
      }
      setMessage(next?"Record reactivated.":"Record deactivated.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update record visibility.");}
    finally{setBusy("");}
  }

  async function permanentDelete(kind:"enum-material"|"participant-material"|"participant-question"|"announcement"|"access",item:any){
    const typed=window.prompt("Permanent Delete cannot be undone. Type DELETE to continue.");
    if(typed!=="DELETE")return;

    const url=
      kind==="enum-material"?`/api/admin/training/materials/${item.id}/permanent?confirm=DELETE`:
      kind==="participant-material"?`/api/admin/participants/materials/${item.id}/permanent?confirm=DELETE`:
      kind==="participant-question"?`/api/admin/participants/exam/questions/${item.id}/permanent?confirm=DELETE`:
      kind==="announcement"?`/api/admin/programme/announcements/${item.id}/permanent?confirm=DELETE`:
      `/api/admin/access-codes/${item.id}?confirm=DELETE`;

    setBusy(`delete:${kind}:${item.id}`);setError("");setMessage("");
    try{
      await api(url,{method:"DELETE"});
      if(editTarget?.item?.id===item.id)setEditTarget(null);
      setMessage("Record permanently deleted.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Permanent deletion was blocked because the record is still required by protected history.");
    }finally{setBusy("");}
  }

  async function resetDeadline(){
    if(!window.confirm("Reset the current programme deadline to the default future window?"))return;
    setBusy("deadline-reset");setError("");setMessage("");
    try{
      setDeadline(await api("/api/admin/programme/deadline/reset",{method:"POST"}));
      setMessage("Programme deadline reset.");
    }catch(err){setError(err instanceof Error?err.message:"Could not reset deadline.");}
    finally{setBusy("");}
  }

  const kindForTab=(): "enum-material"|"participant-material"|"participant-question"|"announcement"|"access" =>
    tab==="enum-materials"?"enum-material":
    tab==="participant-materials"?"participant-material":
    tab==="participant-questions"?"participant-question":
    tab==="announcements"?"announcement":"access";

  const rowTitle=(item:any)=>
    tab==="participant-questions"?item.questionText:
    tab==="announcements"?item.title:
    tab==="access"?item.code:item.title;

  return <section className="dashboardShell adminShell contentControlShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration / Master Content Control</span>
        <h1>Edit, archive or permanently delete Admin-created content</h1>
        <p>Use this workspace to correct mistakes cleanly across training resources, assessment questions, announcements and field access records.</p>
      </div>
      <Link className="btn outline small" to="/admin">Back to administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Processing Admin action...</div>}

    <div className="contentControlSummary">
      <article><small>Enumerator resources</small><strong>{enumMaterials.length}</strong></article>
      <article><small>Participant resources</small><strong>{participantMaterials.length}</strong></article>
      <article><small>Participant questions</small><strong>{participantQuestions.length}</strong></article>
      <article><small>Announcements</small><strong>{announcements.length}</strong></article>
      <article><small>Access codes</small><strong>{accessCodes.length}</strong></article>
    </div>

    <div className="adminTabs contentControlTabs">
      <button className={tab==="enum-materials"?"active":""} onClick={()=>setTab("enum-materials")}>Enumerator Resources</button>
      <button className={tab==="participant-materials"?"active":""} onClick={()=>setTab("participant-materials")}>Participant Resources</button>
      <button className={tab==="participant-questions"?"active":""} onClick={()=>setTab("participant-questions")}>Participant Questions</button>
      <button className={tab==="announcements"?"active":""} onClick={()=>setTab("announcements")}>Announcements</button>
      <button className={tab==="access"?"active":""} onClick={()=>setTab("access")}>Access & Deadline</button>
      <button className="refreshTab" onClick={()=>void load()}>Refresh</button>
    </div>

    {tab==="access"&&<section className="card deadlineControlCard">
      <div><span className="eyebrow">Programme timeline</span><h2>Current deadline</h2><p>{deadline?.deadlineAt?new Date(deadline.deadlineAt).toLocaleString():"No deadline loaded"}</p></div>
      <div className="actionButtons">
        <Link className="btn outline small" to="/admin/operations">Edit deadline</Link>
        <button className="btn danger small" type="button" disabled={busy==="deadline-reset"} onClick={()=>void resetDeadline()}>{busy==="deadline-reset"?"Resetting...":"Reset deadline"}</button>
      </div>
    </section>}

    <div className="contentControlTools card">
      <div><span className="eyebrow">Content library</span><h2>{label(tab)}</h2></div>
      <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search this section..."/></label>
    </div>

    {editTarget&&<form className="card contentControlEditor" onSubmit={saveEdit}>
      <div className="tableHead">
        <div><span className="eyebrow">Edit record</span><h2>{rowTitle(editTarget.item)}</h2></div>
        <button className="btn outline small" type="button" onClick={()=>setEditTarget(null)}>Cancel</button>
      </div>

      {(editTarget.kind==="enum-material"||editTarget.kind==="participant-material")&&<>
        <label>Title<input maxLength={180} required value={editTarget.item.title} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,title:e.target.value}})}/></label>
        <label>Description<textarea rows={5} maxLength={600} required value={editTarget.item.description} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,description:e.target.value}})}/></label>
      </>}

      {editTarget.kind==="participant-question"&&<>
        <label>Question<textarea rows={4} maxLength={900} required value={editTarget.item.questionText} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,questionText:e.target.value}})}/></label>
        <div className="examOptionEditor">
          {(["A","B","C","D"] as const).map(letter=>{
            const key=`option${letter}`;
            return <label key={letter}>Option {letter}<input maxLength={400} required value={editTarget.item[key]||""} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,[key]:e.target.value}})}/></label>;
          })}
        </div>
        <label>Correct answer<select value={editTarget.item.correctOption} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,correctOption:e.target.value}})}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></label>
      </>}

      {editTarget.kind==="announcement"&&<>
        <label>Title<input maxLength={180} required value={editTarget.item.title} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,title:e.target.value}})}/></label>
        <label>Message<textarea rows={7} maxLength={12000} required value={editTarget.item.message} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,message:e.target.value}})}/></label>
        <label>Audience<select value={editTarget.item.audience} onChange={e=>setEditTarget({...editTarget,item:{...editTarget.item,audience:e.target.value}})}><option value="ALL">All registered users</option><option value="ENUMERATORS">Enumerators only</option><option value="PARTICIPANTS">Participants only</option></select></label>
      </>}

      <button className="btn primary" disabled={busy.startsWith("edit:")}>Save changes</button>
    </form>}

    <article className="card tableWrap contentControlTable">
      {filtered.length===0?<div className="emptyState"><h3>No records found</h3><p>This section is empty or your search returned no match.</p></div>:
      <div className="tableScroll"><table>
        <thead><tr><th>Record</th><th>Details</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{filtered.map(item=>{
          const kind=kindForTab();
          const active=Boolean(item.active);
          const details=
            tab==="participant-questions"?`${label(item.program)}${item.skillTrack?` · ${label(item.skillTrack)}`:""}`:
            tab==="announcements"?`${label(item.audience)} · ${new Date(item.createdAt).toLocaleString()}`:
            tab==="access"?(item.expiresAt?`Expires ${new Date(item.expiresAt).toLocaleString()}`:"No expiry"):
            item.originalFilename||item.description||"-";
          return <tr key={`${tab}:${item.id}`}>
            <td><strong>{rowTitle(item)}</strong>{item.description&&tab!=="enum-materials"&&tab!=="participant-materials"?<small className="tableSub">{item.description}</small>:null}</td>
            <td>{details}</td>
            <td><b className={`statusPill status-${active?"active":"inactive"}`}>{active?"Active":"Inactive"}</b></td>
            <td><div className="actionButtons">
              {kind!=="access"&&<button className="btn outline small" type="button" onClick={()=>setEditTarget({kind:kind as "enum-material"|"participant-material"|"participant-question"|"announcement",item:{...item}})}>Edit</button>}
              <button className="btn outline small" type="button" disabled={busy===`active:${kind}:${item.id}`} onClick={()=>void activeAction(kind,item,!active)}>{active?"Deactivate":"Reactivate"}</button>
              <button className="btn danger small" type="button" disabled={busy===`delete:${kind}:${item.id}`} onClick={()=>void permanentDelete(kind,item)}>{busy===`delete:${kind}:${item.id}`?"Deleting...":"Delete"}</button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>}
    </article>

    <div className="contentProtectionNote">
      <strong>Protected history remains protected.</strong>
      <p>Payment verification, Admin override audit records and other protected financial history are not deleted from this content workspace.</p>
    </div>
  </section>;
}
