import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";
import {useLiveRefresh} from "./useLiveRefresh";

type Library="ENUMERATOR"|"PARTICIPANT";
type ParticipantTarget="ALL_PARTICIPANTS"|"DIGITAL_SKILLS"|"BUSINESS_SUPPORT"|"SKILL_TRACK";

type Material={
  id:number;
  title:string;
  description:string;
  originalFilename:string;
  sizeBytes:number;
  active:boolean;
  createdAt?:string|null;
  updatedAt?:string|null;
  target?:ParticipantTarget;
  program?:string;
  skillTrack?:string|null;
};

const skillTracks=[
  "WEB_DEVELOPMENT","MOBILE_APP_DEVELOPMENT","SOFTWARE_ENGINEERING_FOUNDATIONS",
  "PYTHON_PROGRAMMING","JAVA_SPRING_BOOT","REACT_FRONTEND_DEVELOPMENT",
  "QA_SOFTWARE_TESTING","DATABASE_MANAGEMENT_SQL","DATA_ANALYSIS","DATA_SCIENCE",
  "UI_UX_DESIGN","DIGITAL_MARKETING","GRAPHIC_DESIGN","SOCIAL_MEDIA_CONTENT_STRATEGY",
  "VIDEO_EDITING_CONTENT_PRODUCTION","CYBERSECURITY_FUNDAMENTALS","NETWORKING_IT_SUPPORT",
  "CLOUD_COMPUTING","CLOUD_ENGINEERING","DEVOPS_ENGINEERING","AI_PRODUCTIVITY_TOOLS",
  "NO_CODE_AUTOMATION","PRODUCT_MANAGEMENT","PROJECT_MANAGEMENT","BUSINESS_ANALYSIS",
  "CUSTOMER_SERVICE","SALES_CRM","ACCOUNTING_BOOKKEEPING_DIGITAL_FINANCE",
  "E_COMMERCE_DIGITAL_RETAIL","ENTREPRENEURSHIP_FOUNDATIONS",
  "VIRTUAL_ASSISTANCE_DIGITAL_BUSINESS","TECHNICAL_WRITING_DOCUMENTATION"
];

function label(value?:string|null){
  if(!value)return "-";
  return String(value).toLowerCase().split("_").map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
}

function fileSize(bytes:number){
  if(!Number.isFinite(bytes)||bytes<=0)return "0 KB";
  if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function titleFromFile(name:string){
  return name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").trim();
}

export default function AdminMaterialLibrary(){
  const[library,setLibrary]=useState<Library>("ENUMERATOR");
  const[enumMaterials,setEnumMaterials]=useState<Material[]>([]);
  const[participantMaterials,setParticipantMaterials]=useState<Material[]>([]);
  const[target,setTarget]=useState<ParticipantTarget>("ALL_PARTICIPANTS");
  const[skillTrack,setSkillTrack]=useState("");
  const[search,setSearch]=useState("");
  const[statusFilter,setStatusFilter]=useState<"ALL"|"ACTIVE"|"INACTIVE">("ALL");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");
  const[edit,setEdit]=useState<Material|null>(null);

  const materials=library==="ENUMERATOR"?enumMaterials:participantMaterials;

  async function load(){
    setError("");
    try{
      const[e,p]=await Promise.all([
        api<Material[]>("/api/admin/material-library/enumerator"),
        api<Material[]>("/api/admin/material-library/participant")
      ]);
      setEnumMaterials(e);
      setParticipantMaterials(p);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load the material libraries.");
    }
  }

  useEffect(()=>{void load();},[]);
  useLiveRefresh(()=>load(),12000);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return materials.filter(item=>{
      const statusOk=statusFilter==="ALL"||(statusFilter==="ACTIVE"?item.active:!item.active);
      const searchOk=!q||[
        item.title,item.description,item.originalFilename,item.target,item.skillTrack,item.program
      ].some(value=>String(value||"").toLowerCase().includes(q));
      return statusOk&&searchOk;
    });
  },[materials,search,statusFilter]);

  async function upload(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");setMessage("");
    const form=e.currentTarget;
    const source=new FormData(form);
    const input=form.elements.namedItem("files") as HTMLInputElement|null;
    const files=input?.files?Array.from(input.files):[];
    if(!files.length){setError("Choose at least one study material file.");return;}

    const baseTitle=String(source.get("title")||"").trim();
    const description=String(source.get("description")||"").trim();
    if(!description){setError("Enter a description for this upload batch.");return;}

    setBusy("upload");
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i];
        setBusy(`upload:${i+1}:${files.length}`);
        const body=new FormData();
        const generatedTitle=files.length===1
          ?(baseTitle||titleFromFile(file.name))
          :`${baseTitle?`${baseTitle} - `:""}${titleFromFile(file.name)}`;
        body.append("title",generatedTitle);
        body.append("description",description);
        body.append("file",file);

        if(library==="ENUMERATOR"){
          await api("/api/admin/training/materials",{method:"POST",body});
        }else{
          body.append("target",target);
          if(target==="SKILL_TRACK"){
            if(!skillTrack)throw new Error("Choose the specific skill track for this participant material.");
            body.append("skillTrack",skillTrack);
          }
          await api("/api/admin/material-library/participant",{method:"POST",body});
        }
      }

      setMessage(`${files.length} study material${files.length===1?"":"s"} uploaded successfully.`);
      form.reset();
      setTarget("ALL_PARTICIPANTS");
      setSkillTrack("");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Study material upload failed.");
    }finally{
      setBusy("");
    }
  }

  function beginEdit(item:Material){
    setEdit({...item});
    if(library==="PARTICIPANT"){
      setTarget(item.target||"DIGITAL_SKILLS");
      setSkillTrack(item.skillTrack||"");
    }
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function saveMetadata(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!edit)return;
    setBusy(`edit:${edit.id}`);setError("");setMessage("");
    try{
      if(library==="ENUMERATOR"){
        await api(`/api/admin/material-library/enumerator/${edit.id}`,{
          method:"PATCH",
          body:JSON.stringify({title:edit.title.trim(),description:edit.description.trim()})
        });
      }else{
        await api(`/api/admin/material-library/participant/${edit.id}`,{
          method:"PATCH",
          body:JSON.stringify({
            target,
            skillTrack:target==="SKILL_TRACK"?skillTrack:null,
            title:edit.title.trim(),
            description:edit.description.trim()
          })
        });
      }
      setMessage("Material details updated.");
      setEdit(null);
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Material details could not be updated.");}
    finally{setBusy("");}
  }

  async function replaceFile(item:Material,file?:File){
    if(!file||!file.size)return;
    if(!window.confirm(`Replace the file attached to "${item.title}"? The material record remains the same but the old stored file will be removed.`))return;
    setBusy(`replace:${item.id}`);setError("");setMessage("");
    try{
      const body=new FormData();
      body.append("file",file);
      const base=library==="ENUMERATOR"?"/api/admin/material-library/enumerator":"/api/admin/material-library/participant";
      await api(`${base}/${item.id}/replace`,{method:"POST",body});
      setMessage("Material file replaced successfully.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Material file could not be replaced.");}
    finally{setBusy("");}
  }

  async function lifecycle(item:Material,next:boolean){
    const base=library==="ENUMERATOR"?"/api/admin/material-library/enumerator":"/api/admin/material-library/participant";
    if(!window.confirm(`${next?"Reactivate":"Deactivate"} "${item.title}"?`))return;
    setBusy(`life:${item.id}`);setError("");setMessage("");
    try{
      await api(next?`${base}/${item.id}/reactivate`:`${base}/${item.id}`,{method:next?"POST":"DELETE"});
      setMessage(next?"Material reactivated.":"Material archived.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Material status could not be changed.");}
    finally{setBusy("");}
  }

  async function permanentDelete(item:Material){
    const base=library==="ENUMERATOR"?"/api/admin/material-library/enumerator":"/api/admin/material-library/participant";
    const typed=window.prompt(`Permanently delete "${item.title}" and its stored file? Type DELETE to continue.`);
    if(typed!=="DELETE")return;
    setBusy(`delete:${item.id}`);setError("");setMessage("");
    try{
      await api(`${base}/${item.id}/permanent?confirm=DELETE`,{method:"DELETE"});
      setMessage("Material permanently deleted.");
      if(edit?.id===item.id)setEdit(null);
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Material could not be permanently deleted.");}
    finally{setBusy("");}
  }

  const activeCount=materials.filter(item=>item.active).length;
  const uploadProgress=busy.startsWith("upload:")?busy.split(":").slice(1):null;

  return <section className="dashboardShell adminShell materialLibraryShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration / Material Library</span>
        <h1>Publish and manage every study resource</h1>
        <p>Keep a visible history of every upload. Add new resources freely, replace the file on an existing record when needed, and target Participant materials precisely.</p>
      </div>
      <div className="actionButtons">
        <Link className="btn outline small" to="/admin/assessment-studio">Assessment Studio</Link>
        <Link className="btn outline small" to="/admin">Back to administration</Link>
      </div>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>{uploadProgress?`Uploading file ${uploadProgress[0]} of ${uploadProgress[1]}...`:"Processing material library action..."}</div>}

    <div className="materialLibraryTabs">
      <button className={library==="ENUMERATOR"?"active":""} type="button" onClick={()=>{setLibrary("ENUMERATOR");setEdit(null);}}>Enumerator Materials</button>
      <button className={library==="PARTICIPANT"?"active":""} type="button" onClick={()=>{setLibrary("PARTICIPANT");setEdit(null);}}>Participant Materials</button>
    </div>

    {edit&&<form className="card materialMetadataEditor" onSubmit={saveMetadata}>
      <div className="tableHead">
        <div><span className="eyebrow">Edit material record</span><h2>{edit.title}</h2><p>The stored file remains unchanged unless you deliberately use Replace file.</p></div>
        <button className="btn outline small" type="button" onClick={()=>setEdit(null)}>Cancel</button>
      </div>
      {library==="PARTICIPANT"&&<div className="materialTargetGrid">
        <label>Who receives this material?
          <select value={target} onChange={e=>{const next=e.target.value as ParticipantTarget;setTarget(next);if(next!=="SKILL_TRACK")setSkillTrack("");}}>
            <option value="ALL_PARTICIPANTS">All Participants</option>
            <option value="DIGITAL_SKILLS">All Digital Skills participants</option>
            <option value="BUSINESS_SUPPORT">Business Support participants</option>
            <option value="SKILL_TRACK">One specific skill track</option>
          </select>
        </label>
        {target==="SKILL_TRACK"&&<label>Skill track
          <select value={skillTrack} onChange={e=>setSkillTrack(e.target.value)} required>
            <option value="">Select skill track</option>
            {skillTracks.map(track=><option key={track} value={track}>{label(track)}</option>)}
          </select>
        </label>}
      </div>}
      <label>Title<input maxLength={180} value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} required/></label>
      <label>Description<textarea rows={4} maxLength={600} value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})} required/></label>
      <button className="btn primary" disabled={busy===`edit:${edit.id}`}>{busy===`edit:${edit.id}`?"Saving...":"Save material details"}</button>
    </form>}

    <div className="materialLibraryLayout">
      <form className="card formCard materialUploadCard" onSubmit={upload}>
        <span className="eyebrow">{library==="ENUMERATOR"?"Enumerator training":"Participant resources"}</span>
        <h2>Upload study materials</h2>
        <p>Select one file or several files at once. Every file becomes its own visible library record.</p>

        {library==="PARTICIPANT"&&<>
          <label>Who should receive these files?
            <select value={target} onChange={e=>{const next=e.target.value as ParticipantTarget;setTarget(next);if(next!=="SKILL_TRACK")setSkillTrack("");}}>
              <option value="ALL_PARTICIPANTS">All Participants</option>
              <option value="DIGITAL_SKILLS">All Digital Skills participants</option>
              <option value="BUSINESS_SUPPORT">Business Support participants</option>
              <option value="SKILL_TRACK">One specific skill track</option>
            </select>
          </label>
          {target==="SKILL_TRACK"&&<label>Skill track
            <select value={skillTrack} onChange={e=>setSkillTrack(e.target.value)} required>
              <option value="">Select skill track</option>
              {skillTracks.map(track=><option key={track} value={track}>{label(track)}</option>)}
            </select>
          </label>}
        </>}

        <label>Title or batch label
          <input name="title" maxLength={180} placeholder="Optional when uploading several files"/>
        </label>
        <label>Description
          <textarea name="description" maxLength={600} rows={5} required placeholder="Explain what these materials cover."/>
        </label>
        <label>Study files
          <input name="files" type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.epub" required/>
        </label>

        <div className="materialUploadNote">
          <strong>Multiple files are supported.</strong>
          <span>If several files are selected, each is saved as a separate material. The filename is used to distinguish each record.</span>
        </div>

        <button className="btn primary full" type="submit" disabled={busy.startsWith("upload")}>
          {busy.startsWith("upload")?"Uploading materials...":"Upload selected materials"}
        </button>
      </form>

      <article className="card materialHistoryCard">
        <div className="materialHistoryHeader">
          <div><span className="eyebrow">Upload history</span><h2>{library==="ENUMERATOR"?"Enumerator Material Library":"Participant Material Library"}</h2><p>{materials.length} records - {activeCount} active.</p></div>
          <div className="materialHistoryFilters">
            <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title, filename, target..."/></label>
            <label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="ALL">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Archived</option></select></label>
          </div>
        </div>

        {filtered.length===0?<div className="emptyState"><h3>No material records found</h3><p>Upload the first study resource or change the filters.</p></div>:
        <div className="materialRecordList">
          {filtered.map(item=><article className={`materialRecord ${item.active?"":"inactive"}`} key={item.id}>
            <div className="materialRecordIcon">{item.originalFilename.split(".").pop()?.toUpperCase()||"FILE"}</div>
            <div className="materialRecordBody">
              <div className="materialRecordTitle">
                <div><strong>{item.title}</strong><span>{item.originalFilename} - {fileSize(item.sizeBytes)}</span></div>
                <b className={`statusPill status-${item.active?"active":"inactive"}`}>{item.active?"Active":"Archived"}</b>
              </div>
              <p>{item.description}</p>
              {library==="PARTICIPANT"&&<div className="materialTargetTags">
                <span>{label(item.target)}</span>
                {item.skillTrack&&<span>{label(item.skillTrack)}</span>}
              </div>}
              <div className="materialRecordMeta">
                <span>{item.createdAt?`Added ${new Date(item.createdAt).toLocaleString()}`:"Existing library record"}</span>
                {item.updatedAt&&<span>Updated {new Date(item.updatedAt).toLocaleString()}</span>}
              </div>
              <div className="assessmentRowActions materialActions">
                <button className="btn outline small" type="button" onClick={()=>beginEdit(item)}>Edit details</button>
                <label className={`btn outline small fileReplaceButton ${busy===`replace:${item.id}`?"disabled":""}`}>
                  {busy===`replace:${item.id}`?"Replacing...":"Replace file"}
                  <input type="file" accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.epub" disabled={busy===`replace:${item.id}`} onChange={e=>{const file=e.target.files?.[0];void replaceFile(item,file);e.currentTarget.value="";}}/>
                </label>
                <button className="btn outline small" type="button" disabled={busy===`life:${item.id}`} onClick={()=>void lifecycle(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
                <button className="btn danger small" type="button" disabled={busy===`delete:${item.id}`} onClick={()=>void permanentDelete(item)}>Delete permanently</button>
              </div>
            </div>
          </article>)}
        </div>}
      </article>
    </div>
  </section>;
}
