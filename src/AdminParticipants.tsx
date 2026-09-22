import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";

type ParticipantTab="registry"|"materials"|"assessment"|"plans";
type Programme="DIGITAL_SKILLS"|"BUSINESS_SUPPORT";

const skillTracks=[
  "WEB_DEVELOPMENT",
  "DATA_ANALYSIS",
  "UI_UX_DESIGN",
  "DIGITAL_MARKETING",
  "GRAPHIC_DESIGN",
  "CYBERSECURITY_FUNDAMENTALS",
  "CLOUD_COMPUTING",
  "AI_PRODUCTIVITY_TOOLS",
  "VIDEO_EDITING_CONTENT_PRODUCTION",
  "VIRTUAL_ASSISTANCE_DIGITAL_BUSINESS"
];

const reviewStatuses=[
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "REVIEWED",
  "SHORTLISTED",
  "NOT_SHORTLISTED"
];

function label(value?:string|null){
  if(!value)return "-";
  return String(value)
    .toLowerCase()
    .split("_")
    .map(part=>part.charAt(0).toUpperCase()+part.slice(1))
    .join(" ");
}

function Status({value}:{value?:string|null}){
  const raw=value||"UNKNOWN";
  return <b className={`statusPill status-${raw.toLowerCase()}`}>{label(raw)}</b>;
}

function ProgrammeFields({programme,track,setProgramme,setTrack}:{programme:Programme;track:string;setProgramme:(value:Programme)=>void;setTrack:(value:string)=>void}){
  return <>
    <label>Pathway
      <select value={programme} onChange={e=>{
        const next=e.target.value as Programme;
        setProgramme(next);
        if(next==="BUSINESS_SUPPORT")setTrack("");
      }}>
        <option value="DIGITAL_SKILLS">Digital Skills & Enterprise</option>
        <option value="BUSINESS_SUPPORT">Business Startup & Proposal</option>
      </select>
    </label>

    {programme==="DIGITAL_SKILLS"&&
      <label>Skill track
        <select value={track} onChange={e=>setTrack(e.target.value)}>
          <option value="">General digital pathway</option>
          {skillTracks.map(item=><option key={item} value={item}>{label(item)}</option>)}
        </select>
      </label>
    }
  </>;
}

export default function AdminParticipants(){
  const[activeTab,setActiveTab]=useState<ParticipantTab>("registry");
  const[participants,setParticipants]=useState<any[]>([]);
  const[materials,setMaterials]=useState<any[]>([]);
  const[questions,setQuestions]=useState<any[]>([]);
  const[plans,setPlans]=useState<any[]>([]);
  const[search,setSearch]=useState("");
  const[pathwayFilter,setPathwayFilter]=useState("ALL");
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState("");
  const[materialProgramme,setMaterialProgramme]=useState<Programme>("DIGITAL_SKILLS");
  const[materialTrack,setMaterialTrack]=useState("");
  const[questionProgramme,setQuestionProgramme]=useState<Programme>("DIGITAL_SKILLS");
  const[questionTrack,setQuestionTrack]=useState("");
  const[reviewState,setReviewState]=useState<Record<number,{status:string;feedback:string}>>({});

  const load=async()=>{
    setError("");
    try{
      const[participantRows,materialRows,questionRows,planRows]=await Promise.all([
        api<any[]>("/api/admin/participants"),
        api<any[]>("/api/admin/participants/materials"),
        api<any[]>("/api/admin/participants/exam/questions"),
        api<any[]>("/api/admin/participants/business-plans")
      ]);

      setParticipants(participantRows);
      setMaterials(materialRows);
      setQuestions(questionRows);
      setPlans(planRows);

      const nextReviewState:Record<number,{status:string;feedback:string}>={};
      planRows.forEach(plan=>{
        nextReviewState[plan.id]={
          status:reviewStatuses.includes(plan.status)?plan.status:"UNDER_REVIEW",
          feedback:plan.adminFeedback||""
        };
      });
      setReviewState(nextReviewState);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load participant administration data.");
    }
  };

  useEffect(()=>{void load();},[]);

  const filteredParticipants=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return participants.filter(item=>{
      const pathwayOk=pathwayFilter==="ALL"||item.program===pathwayFilter;
      const searchOk=!q||[
        item.fullName,
        item.email,
        item.phone,
        item.participantCode,
        item.referredBy,
        item.state,
        item.lga
      ].some(value=>String(value||"").toLowerCase().includes(q));
      return pathwayOk&&searchOk;
    });
  },[participants,search,pathwayFilter]);

  const totals=useMemo(()=>({
    total:participants.length,
    digital:participants.filter(item=>item.program==="DIGITAL_SKILLS").length,
    business:participants.filter(item=>item.program==="BUSINESS_SUPPORT").length,
    resources:participants.filter(item=>item.resourcesUnlocked).length,
    passed:participants.filter(item=>item.assessmentPassed).length,
    shortlisted:plans.filter(item=>item.status==="SHORTLISTED").length
  }),[participants,plans]);

  async function uploadMaterial(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("material-upload");

    try{
      const source=new FormData(e.currentTarget);
      const body=new FormData();
      body.append("program",materialProgramme);
      if(materialProgramme==="DIGITAL_SKILLS"&&materialTrack)body.append("skillTrack",materialTrack);
      body.append("title",String(source.get("title")||""));
      body.append("description",String(source.get("description")||""));
      const file=source.get("file");
      if(!(file instanceof File)||!file.size)throw new Error("Select a material file.");
      body.append("file",file);

      await api("/api/admin/participants/materials",{method:"POST",body});
      setMessage("Participant material published successfully.");
      e.currentTarget.reset();
      setMaterialProgramme("DIGITAL_SKILLS");
      setMaterialTrack("");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Participant material upload failed.");
    }finally{
      setBusy("");
    }
  }

  async function deactivateMaterial(id:number){
    if(!window.confirm("Deactivate this participant material? Existing records remain preserved."))return;
    setError("");
    setMessage("");
    setBusy(`material:${id}`);

    try{
      await api(`/api/admin/participants/materials/${id}`,{method:"DELETE"});
      setMessage("Participant material deactivated.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not deactivate participant material.");
    }finally{
      setBusy("");
    }
  }

  async function addQuestion(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("question-add");

    try{
      const form=new FormData(e.currentTarget);
      await api("/api/admin/participants/exam/questions",{
        method:"POST",
        body:JSON.stringify({
          program:questionProgramme,
          skillTrack:questionProgramme==="DIGITAL_SKILLS"&&questionTrack?questionTrack:null,
          questionText:String(form.get("questionText")||""),
          optionA:String(form.get("optionA")||""),
          optionB:String(form.get("optionB")||""),
          optionC:String(form.get("optionC")||""),
          optionD:String(form.get("optionD")||""),
          correctOption:String(form.get("correctOption")||"A")
        })
      });

      setMessage("Participant assessment question added.");
      e.currentTarget.reset();
      setQuestionProgramme("DIGITAL_SKILLS");
      setQuestionTrack("");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not add participant assessment question.");
    }finally{
      setBusy("");
    }
  }

  async function deactivateQuestion(id:number){
    if(!window.confirm("Deactivate this participant assessment question?"))return;
    setError("");
    setMessage("");
    setBusy(`question:${id}`);

    try{
      await api(`/api/admin/participants/exam/questions/${id}`,{method:"DELETE"});
      setMessage("Participant assessment question deactivated.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not deactivate participant assessment question.");
    }finally{
      setBusy("");
    }
  }

  async function saveReview(plan:any){
    const draft=reviewState[plan.id]||{status:"UNDER_REVIEW",feedback:""};
    if(draft.status==="REVISION_REQUIRED"&&!draft.feedback.trim()){
      setError("Feedback is required when requesting a revision.");
      return;
    }

    setError("");
    setMessage("");
    setBusy(`plan:${plan.id}`);

    try{
      await api(`/api/admin/participants/business-plans/${plan.id}/review`,{
        method:"PATCH",
        body:JSON.stringify({
          status:draft.status,
          feedback:draft.feedback.trim()||null
        })
      });
      setMessage(`Review updated for ${plan.participantName}.`);
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not update business-plan review.");
    }finally{
      setBusy("");
    }
  }

  return <section className="dashboardShell adminShell participantAdmin">
    <div className="dashboardHero participantAdminHero">
      <div>
        <span className="eyebrow">Administration / Participants</span>
        <h1>Participant Management</h1>
        <p>Monitor participant registration, pathway access, resources, assessments and business-plan review from one secure workspace.</p>
      </div>
      <Link className="btn outline small adminBackButton" to="/admin">Back to main administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}

    <div className="featureGrid four participantStatGrid">
      <article className="card statCard"><small>Participants</small><strong>{totals.total}</strong><p>All Enumerator-created participant records.</p></article>
      <article className="card statCard"><small>Digital Skills</small><strong>{totals.digital}</strong><p>Participants on the digital pathway.</p></article>
      <article className="card statCard"><small>Business Support</small><strong>{totals.business}</strong><p>Participants preparing business proposals.</p></article>
      <article className="card statCard"><small>Resources unlocked</small><strong>{totals.resources}</strong><p>Participants with verified resource provisioning.</p></article>
    </div>

    <div className="adminTabs participantTabs" role="tablist" aria-label="Participant administration sections">
      <button className={activeTab==="registry"?"active":""} type="button" onClick={()=>setActiveTab("registry")}>Participant Registry</button>
      <button className={activeTab==="materials"?"active":""} type="button" onClick={()=>setActiveTab("materials")}>Materials</button>
      <button className={activeTab==="assessment"?"active":""} type="button" onClick={()=>setActiveTab("assessment")}>Assessments</button>
      <button className={activeTab==="plans"?"active":""} type="button" onClick={()=>setActiveTab("plans")}>
        Business Plans {plans.filter(item=>["SUBMITTED","RESUBMITTED"].includes(item.status)).length>0&&
          <span className="tabCount">{plans.filter(item=>["SUBMITTED","RESUBMITTED"].includes(item.status)).length}</span>}
      </button>
      <button className="refreshTab" type="button" onClick={()=>void load()}>Refresh participant data</button>
    </div>

    {activeTab==="registry"&&<>
      <div className="participantFilters card">
        <div>
          <span className="eyebrow">Registry controls</span>
          <h2>Participant records</h2>
        </div>
        <label>Search
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email, participant ID, Enumerator ID..."/>
        </label>
        <label>Pathway
          <select value={pathwayFilter} onChange={e=>setPathwayFilter(e.target.value)}>
            <option value="ALL">All pathways</option>
            <option value="DIGITAL_SKILLS">Digital Skills & Enterprise</option>
            <option value="BUSINESS_SUPPORT">Business Startup & Proposal</option>
          </select>
        </label>
      </div>

      <article className="card tableWrap">
        <div className="tableHead">
          <div>
            <span className="eyebrow">Participant registry</span>
            <h2>Registration and programme progress</h2>
            <p className="muted">Participant accounts become active only after the Enumerator registration payment is verified. Resource access unlocks after the participant resource-provisioning payment is verified.</p>
          </div>
          <span className="recordCount">{filteredParticipants.length} shown</span>
        </div>

        {filteredParticipants.length===0
          ?<div className="emptyState"><h3>No participant records found</h3><p>Try another filter or wait for qualified Enumerators to complete participant registration.</p></div>
          :<div className="tableScroll">
            <table className="participantTable">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Pathway</th>
                  <th>Enumerator</th>
                  <th>Registration payment</th>
                  <th>Resources</th>
                  <th>Assessment</th>
                  <th>Programme status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(item=>
                  <tr key={item.id}>
                    <td>
                      <strong>{item.fullName}</strong>
                      <small className="tableSub mono">{item.participantCode||"-"}</small>
                      <small className="tableSub">{item.email}</small>
                      <small className="tableSub">{item.phone}</small>
                      <small className="tableSub">{item.lga}, {item.state}</small>
                    </td>
                    <td>
                      <strong>{label(item.program)}</strong>
                      {item.skillTrack&&<small className="tableSub">{label(item.skillTrack)}</small>}
                    </td>
                    <td><span className="mono">{item.referredBy||"-"}</span></td>
                    <td>{item.accountEnabled?<Status value="SUCCESSFUL"/>:<Status value="PENDING"/>}</td>
                    <td>{item.resourcesUnlocked?<Status value="UNLOCKED"/>:<Status value="PENDING"/>}</td>
                    <td>
                      {item.assessmentScore==null
                        ?<span className="muted">Not attempted</span>
                        :<>
                          <strong>{item.assessmentScore}%</strong>
                          <small className="tableSub">{item.assessmentPassed?"Passed":"Not passed"}</small>
                        </>
                      }
                    </td>
                    <td>
                      <Status value={item.participantStatus}/>
                      {item.businessPlanStatus&&<small className="tableSub">Plan: {label(item.businessPlanStatus)}</small>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        }
      </article>
    </>}

    {activeTab==="materials"&&
      <div className="participantSplit">
        <form className="card formCard participantForm" onSubmit={uploadMaterial}>
          <span className="eyebrow">Participant resources</span>
          <h2>Publish pathway material</h2>
          <p>Participants can see approved material listings for their pathway. Download access is enabled only after the one-time resource-provisioning payment is verified.</p>

          <ProgrammeFields
            programme={materialProgramme}
            track={materialTrack}
            setProgramme={setMaterialProgramme}
            setTrack={setMaterialTrack}
          />

          <label>Title<input name="title" maxLength={180} required/></label>
          <label>Description<textarea name="description" maxLength={600} rows={4} required/></label>
          <label>Material file<input name="file" type="file" accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.epub" required/></label>

          <button className="btn primary full" type="submit" disabled={busy==="material-upload"}>
            {busy==="material-upload"?"Uploading...":"Publish participant material"}
          </button>

          <p className="adminHint">To replace a material, deactivate the old version and publish the updated file. The historical record remains preserved.</p>
        </form>

        <article className="card tableWrap participantListCard">
          <div className="tableHead">
            <div>
              <span className="eyebrow">Resource catalogue</span>
              <h2>Published participant materials</h2>
            </div>
            <span className="recordCount">{materials.length} records</span>
          </div>

          {materials.length===0
            ?<div className="emptyState"><h3>No participant materials yet</h3><p>Publish the first pathway resource using the form.</p></div>
            :<div className="tableScroll">
              <table>
                <thead><tr><th>Material</th><th>Pathway</th><th>Track</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {materials.map(item=>
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><small className="tableSub">{item.originalFilename}</small><small className="tableSub">{item.description}</small></td>
                      <td>{label(item.program)}</td>
                      <td>{label(item.skillTrack)}</td>
                      <td><Status value={item.active?"ACTIVE":"INACTIVE"}/></td>
                      <td>
                        {item.active
                          ?<button className="btn outline small" type="button" disabled={busy===`material:${item.id}`} onClick={()=>void deactivateMaterial(item.id)}>
                            {busy===`material:${item.id}`?"Working...":"Deactivate"}
                          </button>
                          :<span className="muted">Archived</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          }
        </article>
      </div>
    }

    {activeTab==="assessment"&&
      <div className="participantSplit">
        <form className="card formCard participantForm" onSubmit={addQuestion}>
          <span className="eyebrow">Participant assessment</span>
          <h2>Add pathway question</h2>
          <p>Create assessment questions for the business pathway, a specific digital skill track, or the general digital pathway.</p>

          <ProgrammeFields
            programme={questionProgramme}
            track={questionTrack}
            setProgramme={setQuestionProgramme}
            setTrack={setQuestionTrack}
          />

          <label>Question<textarea name="questionText" maxLength={900} rows={4} required/></label>
          {["A","B","C","D"].map(option=>
            <label key={option}>Option {option}<input name={`option${option}`} maxLength={400} required/></label>
          )}
          <label>Correct answer
            <select name="correctOption" defaultValue="A">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>

          <button className="btn primary full" type="submit" disabled={busy==="question-add"}>
            {busy==="question-add"?"Adding...":"Add participant question"}
          </button>
        </form>

        <article className="card tableWrap participantListCard">
          <div className="tableHead">
            <div>
              <span className="eyebrow">Assessment bank</span>
              <h2>Participant questions</h2>
            </div>
            <span className="recordCount">{questions.length} records</span>
          </div>

          {questions.length===0
            ?<div className="emptyState"><h3>No participant questions yet</h3><p>Add the first pathway assessment question.</p></div>
            :<div className="tableScroll">
              <table>
                <thead><tr><th>Question</th><th>Pathway</th><th>Track</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {questions.map(item=>
                    <tr key={item.id}>
                      <td><strong>{item.questionText}</strong></td>
                      <td>{label(item.program)}</td>
                      <td>{label(item.skillTrack)}</td>
                      <td><Status value={item.active?"ACTIVE":"INACTIVE"}/></td>
                      <td>
                        {item.active
                          ?<button className="btn outline small" type="button" disabled={busy===`question:${item.id}`} onClick={()=>void deactivateQuestion(item.id)}>
                            {busy===`question:${item.id}`?"Working...":"Deactivate"}
                          </button>
                          :<span className="muted">Archived</span>}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          }
        </article>
      </div>
    }

    {activeTab==="plans"&&<>
      <div className="featureGrid four participantStatGrid">
        <article className="card statCard"><small>Business plans</small><strong>{plans.length}</strong><p>All saved participant proposals.</p></article>
        <article className="card statCard"><small>Awaiting review</small><strong>{plans.filter(item=>["SUBMITTED","RESUBMITTED"].includes(item.status)).length}</strong><p>Submitted proposals requiring attention.</p></article>
        <article className="card statCard"><small>Revision requested</small><strong>{plans.filter(item=>item.status==="REVISION_REQUIRED").length}</strong><p>Participants asked to revise their proposal.</p></article>
        <article className="card statCard"><small>Shortlisted</small><strong>{totals.shortlisted}</strong><p>Proposals marked for further consideration.</p></article>
      </div>

      {plans.length===0
        ?<div className="card emptyState"><h3>No business plans yet</h3><p>Submitted participant proposals will appear here for review.</p></div>
        :<div className="businessPlanGrid">
          {plans.map(plan=>{
            const draft=reviewState[plan.id]||{status:"UNDER_REVIEW",feedback:""};
            return <article className="card businessPlanCard" key={plan.id}>
              <div className="businessPlanHeader">
                <div>
                  <span className="eyebrow">{plan.participantCode||"Participant"}</span>
                  <h2>{plan.businessName||"Business proposal"}</h2>
                  <p><strong>{plan.participantName}</strong> · {plan.participantEmail}</p>
                </div>
                <Status value={plan.status}/>
              </div>

              <div className="proposalSummary">
                <div><small>Sector</small><strong>{plan.sector||"-"}</strong></div>
                <div><small>Location</small><strong>{plan.location||"-"}</strong></div>
                <div><small>Current stage</small><strong>{plan.currentStage||"-"}</strong></div>
                <div><small>Expected jobs</small><strong>{plan.expectedJobs??"-"}</strong></div>
                <div><small>Amount required</small><strong>{plan.amountRequired==null?"-":`NGN ${Number(plan.amountRequired).toLocaleString()}`}</strong></div>
              </div>

              <details className="planDetails">
                <summary>Review full proposal</summary>
                <div className="proposalTextGrid">
                  <section><h3>Problem</h3><p>{plan.problem||"-"}</p></section>
                  <section><h3>Solution</h3><p>{plan.solution||"-"}</p></section>
                  <section><h3>Target customers</h3><p>{plan.targetCustomers||"-"}</p></section>
                  <section><h3>Use of funds</h3><p>{plan.useOfFunds||"-"}</p></section>
                  <section className="wide"><h3>Implementation plan</h3><p>{plan.implementationPlan||"-"}</p></section>
                  {plan.additionalNotes&&<section className="wide"><h3>Additional notes</h3><p>{plan.additionalNotes}</p></section>}
                </div>
              </details>

              <div className="reviewPanel">
                <label>Review decision
                  <select value={draft.status} onChange={e=>setReviewState(current=>({
                    ...current,
                    [plan.id]:{...draft,status:e.target.value}
                  }))}>
                    {reviewStatuses.map(status=><option key={status} value={status}>{label(status)}</option>)}
                  </select>
                </label>

                <label>Administrator feedback
                  <textarea
                    rows={5}
                    maxLength={12000}
                    value={draft.feedback}
                    onChange={e=>setReviewState(current=>({
                      ...current,
                      [plan.id]:{...draft,feedback:e.target.value}
                    }))}
                    placeholder="Give clear feedback, especially when requesting a revision."
                  />
                </label>

                <button className="btn primary" type="button" disabled={busy===`plan:${plan.id}`} onClick={()=>void saveReview(plan)}>
                  {busy===`plan:${plan.id}`?"Saving review...":"Save review decision"}
                </button>
              </div>
            </article>;
          })}
        </div>
      }
    </>}
  </section>;
}
