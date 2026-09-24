import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";
import {useLiveRefresh} from "./useLiveRefresh";

type Audience="ENUMERATOR"|"PARTICIPANT";
type Workspace="QUESTIONS"|"REVIEWS";
type QuestionType="MULTIPLE_CHOICE"|"YES_NO"|"WRITTEN";
type Programme="DIGITAL_SKILLS"|"BUSINESS_SUPPORT";

type DraftQuestion={
  key:string;
  type:QuestionType;
  questionText:string;
  options:string[];
  correctIndex:number|null;
};

type SavedQuestion={
  id:number;
  program?:Programme;
  skillTrack?:string|null;
  questionType:QuestionType;
  questionText:string;
  options:string[];
  correctIndex:number;
  active:boolean;
};

type WrittenResponse={
  questionId:number;
  questionText:string;
  answer:string;
};

type ReviewItem={
  id:number;
  audience:Audience;
  sessionId:number;
  profileId:number;
  subjectCode:string;
  status:string;
  submittedAt:string;
  reviewedAt?:string|null;
  finalScore?:number|null;
  passed?:boolean|null;
  writtenResponses:WrittenResponse[];
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

function makeDraft(type:QuestionType="MULTIPLE_CHOICE"):DraftQuestion{
  return {
    key:`draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    questionText:"",
    options:type==="WRITTEN"?[]:type==="YES_NO"?["Yes","No"]:["",""],
    correctIndex:type==="WRITTEN"?null:0
  };
}

export default function AdminAssessmentStudio(){
  const[workspace,setWorkspace]=useState<Workspace>("QUESTIONS");
  const[audience,setAudience]=useState<Audience>("ENUMERATOR");
  const[enumDrafts,setEnumDrafts]=useState<DraftQuestion[]>([makeDraft()]);
  const[participantDrafts,setParticipantDrafts]=useState<DraftQuestion[]>([makeDraft()]);
  const[programme,setProgramme]=useState<Programme>("DIGITAL_SKILLS");
  const[skillTrack,setSkillTrack]=useState("");
  const[enumQuestions,setEnumQuestions]=useState<SavedQuestion[]>([]);
  const[participantQuestions,setParticipantQuestions]=useState<SavedQuestion[]>([]);
  const[reviews,setReviews]=useState<ReviewItem[]>([]);
  const[reviewHistory,setReviewHistory]=useState<ReviewItem[]>([]);
  const[reviewMarks,setReviewMarks]=useState<Record<number,Record<number,boolean>>>({});
  const[editingId,setEditingId]=useState<number|null>(null);
  const[search,setSearch]=useState("");
  const[statusFilter,setStatusFilter]=useState<"ALL"|"ACTIVE"|"INACTIVE">("ALL");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  const drafts=audience==="ENUMERATOR"?enumDrafts:participantDrafts;
  const saved=audience==="ENUMERATOR"?enumQuestions:participantQuestions;

  function updateDrafts(mutator:(rows:DraftQuestion[])=>DraftQuestion[]){
    if(audience==="ENUMERATOR")setEnumDrafts(mutator);
    else setParticipantDrafts(mutator);
  }

  async function load(){
    setError("");
    try{
      const[e,p,r,h]=await Promise.all([
        api<SavedQuestion[]>("/api/admin/assessment-studio/enumerator/questions"),
        api<SavedQuestion[]>("/api/admin/assessment-studio/participant/questions"),
        api<ReviewItem[]>("/api/admin/assessment-studio/reviews"),
        api<ReviewItem[]>("/api/admin/assessment-studio/reviews/history")
      ]);
      setEnumQuestions(e);
      setParticipantQuestions(p);
      setReviews(r);
      setReviewHistory(h);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load the Assessment Studio.");
    }
  }

  useEffect(()=>{void load();},[]);
  useLiveRefresh(()=>load(),12000);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return saved.filter(item=>{
      const statusOk=statusFilter==="ALL"||(statusFilter==="ACTIVE"?item.active:!item.active);
      const textOk=!q||[
        item.questionText,item.questionType,item.program,item.skillTrack,...(item.options||[])
      ].some(value=>String(value||"").toLowerCase().includes(q));
      return statusOk&&textOk;
    });
  },[saved,search,statusFilter]);

  function setQuestion(key:string,patch:Partial<DraftQuestion>){
    updateDrafts(rows=>rows.map(row=>row.key===key?{...row,...patch}:row));
  }

  function changeType(key:string,type:QuestionType){
    updateDrafts(rows=>rows.map(row=>{
      if(row.key!==key)return row;
      if(type==="WRITTEN")return {...row,type,options:[],correctIndex:null};
      if(type==="YES_NO")return {...row,type,options:["Yes","No"],correctIndex:0};
      const options=row.options.length>=2?row.options:["",""];
      return {...row,type,options,correctIndex:row.correctIndex==null?0:Math.min(row.correctIndex,options.length-1)};
    }));
  }

  function addQuestion(){
    if(editingId)return;
    updateDrafts(rows=>[...rows,makeDraft()]);
  }

  function duplicateQuestion(key:string){
    if(editingId)return;
    updateDrafts(rows=>{
      const index=rows.findIndex(row=>row.key===key);
      if(index<0)return rows;
      const source=rows[index];
      const copy:{[K in keyof DraftQuestion]:DraftQuestion[K]}={
        ...source,
        key:`draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        options:[...source.options]
      };
      return [...rows.slice(0,index+1),copy,...rows.slice(index+1)];
    });
  }

  function removeQuestion(key:string){
    if(editingId)return;
    updateDrafts(rows=>{
      const next=rows.filter(row=>row.key!==key);
      return next.length?next:[makeDraft()];
    });
  }

  function moveQuestion(key:string,direction:-1|1){
    if(editingId)return;
    updateDrafts(rows=>{
      const index=rows.findIndex(row=>row.key===key);
      const target=index+direction;
      if(index<0||target<0||target>=rows.length)return rows;
      const next=[...rows];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function addOption(key:string){
    updateDrafts(rows=>rows.map(row=>{
      if(row.key!==key||row.type!=="MULTIPLE_CHOICE"||row.options.length>=8)return row;
      return {...row,options:[...row.options,""]};
    }));
  }

  function removeOption(key:string,index:number){
    updateDrafts(rows=>rows.map(row=>{
      if(row.key!==key||row.type!=="MULTIPLE_CHOICE"||row.options.length<=2)return row;
      const options=row.options.filter((_,i)=>i!==index);
      let correct=row.correctIndex;
      if(correct===index)correct=0;
      else if(correct!=null&&correct>index)correct-=1;
      return {...row,options,correctIndex:correct};
    }));
  }

  function setOption(key:string,index:number,value:string){
    updateDrafts(rows=>rows.map(row=>{
      if(row.key!==key)return row;
      const options=[...row.options];
      options[index]=value;
      return {...row,options};
    }));
  }

  function payload(row:DraftQuestion){
    return {
      type:row.type,
      questionText:row.questionText.trim(),
      options:row.type==="WRITTEN"?[]:row.options.map(option=>option.trim()),
      correctIndex:row.type==="WRITTEN"?null:row.correctIndex
    };
  }

  async function saveQuestionSet(){
    setError("");setMessage("");
    if(!drafts.length){setError("Add at least one question.");return;}

    setBusy("save-set");
    try{
      if(editingId){
        const question=payload(drafts[0]);
        if(audience==="ENUMERATOR"){
          await api(`/api/admin/assessment-studio/enumerator/questions/${editingId}`,{
            method:"PATCH",body:JSON.stringify(question)
          });
        }else{
          await api(`/api/admin/assessment-studio/participant/questions/${editingId}`,{
            method:"PATCH",
            body:JSON.stringify({
              program:programme,
              skillTrack:programme==="DIGITAL_SKILLS"&&skillTrack?skillTrack:null,
              question
            })
          });
        }
        setMessage("Question changes saved successfully.");
      }else if(audience==="ENUMERATOR"){
        await api("/api/admin/assessment-studio/enumerator/questions/batch",{
          method:"POST",
          body:JSON.stringify({questions:drafts.map(payload)})
        });
        setMessage(`${drafts.length} Enumerator question${drafts.length===1?"":"s"} saved as one question set.`);
      }else{
        await api("/api/admin/assessment-studio/participant/questions/batch",{
          method:"POST",
          body:JSON.stringify({
            program:programme,
            skillTrack:programme==="DIGITAL_SKILLS"&&skillTrack?skillTrack:null,
            questions:drafts.map(payload)
          })
        });
        setMessage(`${drafts.length} Participant question${drafts.length===1?"":"s"} saved as one question set.`);
      }

      cancelEdit();
      await load();
      window.scrollTo({top:0,behavior:"smooth"});
    }catch(err){
      setError(err instanceof Error?err.message:"Question set could not be saved.");
    }finally{
      setBusy("");
    }
  }

  function editQuestion(item:SavedQuestion){
    const nextAudience:Audience=item.program?"PARTICIPANT":"ENUMERATOR";
    setAudience(nextAudience);
    setEditingId(item.id);
    const row:DraftQuestion={
      key:`edit-${item.id}`,
      type:item.questionType||"MULTIPLE_CHOICE",
      questionText:item.questionText,
      options:item.questionType==="WRITTEN"?[]:[...(item.options||[])],
      correctIndex:item.questionType==="WRITTEN"?null:Math.max(0,item.correctIndex??0)
    };
    if(nextAudience==="ENUMERATOR")setEnumDrafts([row]);
    else{
      setParticipantDrafts([row]);
      setProgramme(item.program||"DIGITAL_SKILLS");
      setSkillTrack(item.skillTrack||"");
    }
    setWorkspace("QUESTIONS");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function cancelEdit(){
    setEditingId(null);
    if(audience==="ENUMERATOR")setEnumDrafts([makeDraft()]);
    else setParticipantDrafts([makeDraft()]);
  }

  async function lifecycle(item:SavedQuestion,next:boolean){
    const participant=Boolean(item.program);
    const base=participant?"/api/admin/participants/exam/questions":"/api/admin/exam-bank/questions";
    if(!window.confirm(`${next?"Reactivate":"Deactivate"} this question?`))return;
    setBusy(`life:${participant?"p":"e"}:${item.id}`);setError("");setMessage("");
    try{
      await api(next?`${base}/${item.id}/reactivate`:`${base}/${item.id}`,{method:next?"POST":"DELETE"});
      setMessage(next?"Question reactivated.":"Question archived. Existing exam history remains protected.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Question status could not be changed.");}
    finally{setBusy("");}
  }

  async function permanentDelete(item:SavedQuestion){
    const participant=Boolean(item.program);
    const base=participant?"/api/admin/participants/exam/questions":"/api/admin/exam-bank/questions";
    const typed=window.prompt("Permanently delete this question only if it is safe to remove. Type DELETE to continue.");
    if(typed!=="DELETE")return;
    setBusy(`delete:${participant?"p":"e"}:${item.id}`);setError("");setMessage("");
    try{
      await api(`${base}/${item.id}/permanent?confirm=DELETE`,{method:"DELETE"});
      setMessage("Question permanently deleted.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Permanent deletion was blocked because protected history still needs this question.");
    }finally{setBusy("");}
  }

  function setReviewMark(reviewId:number,questionId:number,value:boolean){
    setReviewMarks(current=>({
      ...current,
      [reviewId]:{...(current[reviewId]||{}),[questionId]:value}
    }));
  }

  async function completeReview(item:ReviewItem){
    const marks=reviewMarks[item.id]||{};
    if(item.writtenResponses.some(response=>marks[response.questionId]===undefined)){
      setError("Mark every written response as Correct or Incorrect before completing the review.");
      return;
    }
    if(!window.confirm(`Complete written-answer review for ${item.subjectCode}? The final assessment score will be calculated immediately.`))return;

    setBusy(`review:${item.id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/assessment-studio/reviews/${item.id}`,{
        method:"POST",
        body:JSON.stringify({writtenMarks:marks})
      });
      setMessage(`Written assessment reviewed for ${item.subjectCode}.`);
      setReviewMarks(current=>{const next={...current};delete next[item.id];return next;});
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Written assessment review could not be completed.");
    }finally{setBusy("");}
  }

  const activeCount=saved.filter(item=>item.active).length;

  return <section className="dashboardShell adminShell assessmentStudioShell">
    <div className="dashboardHero assessmentStudioHero">
      <div>
        <span className="eyebrow">Administration / Assessment Studio</span>
        <h1>Build complete tests before publishing</h1>
        <p>Add Question 1, Question 2, Question 3 and as many more as needed. Nothing is saved until you deliberately click <strong>Save Question Set</strong>.</p>
      </div>
      <div className="actionButtons">
        <Link className="btn outline small" to="/admin/material-library">Material Library</Link>
        <Link className="btn outline small" to="/admin">Back to administration</Link>
      </div>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Processing assessment changes...</div>}

    <div className="studioTopTabs">
      <button className={workspace==="QUESTIONS"?"active":""} type="button" onClick={()=>setWorkspace("QUESTIONS")}>Question Sets</button>
      <button className={workspace==="REVIEWS"?"active":""} type="button" onClick={()=>setWorkspace("REVIEWS")}>
        Written Reviews {reviews.length>0&&<span>{reviews.length}</span>}
      </button>
    </div>

    {workspace==="QUESTIONS"&&<>
      <div className="studioAudienceBar card">
        <div>
          <span className="eyebrow">Assessment audience</span>
          <h2>{audience==="ENUMERATOR"?"Enumerator Qualification":"Participant Assessment"}</h2>
          <p>{audience==="ENUMERATOR"?"Questions shown to registered Enumerators after training.":"Questions can target Business Support, all Digital Skills participants, or one specific skill track."}</p>
        </div>
        <div className="segmentedControl">
          <button className={audience==="ENUMERATOR"?"active":""} type="button" onClick={()=>{if(!editingId)setAudience("ENUMERATOR");}}>Enumerators</button>
          <button className={audience==="PARTICIPANT"?"active":""} type="button" onClick={()=>{if(!editingId)setAudience("PARTICIPANT");}}>Participants</button>
        </div>
      </div>

      {audience==="PARTICIPANT"&&<div className="card assessmentTargetCard">
        <div><span className="eyebrow">Who receives this question set?</span><h3>Participant targeting</h3></div>
        <label>Programme
          <select value={programme} disabled={Boolean(editingId)} onChange={e=>{const next=e.target.value as Programme;setProgramme(next);if(next==="BUSINESS_SUPPORT")setSkillTrack("");}}>
            <option value="DIGITAL_SKILLS">Digital Skills & Enterprise</option>
            <option value="BUSINESS_SUPPORT">Business Startup & Proposal</option>
          </select>
        </label>
        {programme==="DIGITAL_SKILLS"&&<label>Skill target
          <select value={skillTrack} disabled={Boolean(editingId)} onChange={e=>setSkillTrack(e.target.value)}>
            <option value="">All Digital Skills participants</option>
            {skillTracks.map(track=><option key={track} value={track}>{label(track)}</option>)}
          </select>
        </label>}
      </div>}

      <section className="questionSetComposer">
        <div className="questionSetHeading">
          <div>
            <span className="eyebrow">{editingId?"Editing saved question":"Draft question set"}</span>
            <h2>{editingId?`Question #${editingId}`:`${drafts.length} draft question${drafts.length===1?"":"s"}`}</h2>
            <p>{editingId?"Save the changes to update this question.":"Use Add another question to keep building. Draft questions stay on this page until the whole set is saved."}</p>
          </div>
          {!editingId&&<button className="btn secondary" type="button" onClick={addQuestion}>+ Add another question</button>}
        </div>

        <div className="questionDraftList">
          {drafts.map((draft,index)=><article className="card questionDraftCard" key={draft.key}>
            <div className="questionDraftHeader">
              <div className="questionSequence"><span>{index+1}</span><div><small>Question</small><strong>{index+1}</strong></div></div>
              {!editingId&&<div className="questionDraftTools">
                <button type="button" title="Move up" disabled={index===0} onClick={()=>moveQuestion(draft.key,-1)}>Up</button>
                <button type="button" title="Move down" disabled={index===drafts.length-1} onClick={()=>moveQuestion(draft.key,1)}>Down</button>
                <button type="button" onClick={()=>duplicateQuestion(draft.key)}>Duplicate</button>
                <button type="button" className="dangerText" onClick={()=>removeQuestion(draft.key)}>Remove</button>
              </div>}
            </div>

            <div className="questionDraftGrid">
              <label>Question type
                <select value={draft.type} onChange={e=>changeType(draft.key,e.target.value as QuestionType)}>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="YES_NO">Yes / No</option>
                  <option value="WRITTEN">Written Answer</option>
                </select>
              </label>
              <div className="questionTypeHint">
                {draft.type==="MULTIPLE_CHOICE"&&<><strong>Automatically marked</strong><span>Add between 2 and 8 answer choices and select one correct answer.</span></>}
                {draft.type==="YES_NO"&&<><strong>Automatically marked</strong><span>Yes and No are created automatically. Choose the correct answer.</span></>}
                {draft.type==="WRITTEN"&&<><strong>Administrator review</strong><span>The candidate writes a response. Final scoring waits for Admin review.</span></>}
              </div>
            </div>

            <label className="questionPromptInput">Question
              <textarea rows={4} maxLength={900} value={draft.questionText} onChange={e=>setQuestion(draft.key,{questionText:e.target.value})} placeholder="Type the complete question exactly as the candidate should see it."/>
            </label>

            {draft.type!=="WRITTEN"&&<div className="dynamicOptionList">
              {draft.options.map((option,optionIndex)=>{
                const letter=String.fromCharCode(65+optionIndex);
                const correct=draft.correctIndex===optionIndex;
                return <div className={`dynamicOptionRow ${correct?"correct":""}`} key={`${draft.key}:${optionIndex}`}>
                  <span className="optionLetter">{letter}</span>
                  <input maxLength={400} value={option} readOnly={draft.type==="YES_NO"} onChange={e=>setOption(draft.key,optionIndex,e.target.value)} placeholder={`Answer choice ${letter}`}/>
                  <button className={`markCorrect ${correct?"selected":""}`} type="button" onClick={()=>setQuestion(draft.key,{correctIndex:optionIndex})}>{correct?"Correct":"Mark correct"}</button>
                  {draft.type==="MULTIPLE_CHOICE"&&draft.options.length>2&&<button className="removeOption" type="button" onClick={()=>removeOption(draft.key,optionIndex)}>Remove</button>}
                </div>;
              })}
              {draft.type==="MULTIPLE_CHOICE"&&draft.options.length<8&&<button className="btn outline small addOptionButton" type="button" onClick={()=>addOption(draft.key)}>+ Add answer option</button>}
            </div>}

            {draft.type==="WRITTEN"&&<div className="writtenPreview">
              <span>Candidate response</span>
              <div>Long-form text response area</div>
              <small>After submission this response appears in Written Reviews for manual marking.</small>
            </div>}
          </article>)}
        </div>

        <div className="questionSetSaveBar">
          <div>
            <strong>{editingId?"Ready to update this question?":`${drafts.length} question${drafts.length===1?"":"s"} in this draft set`}</strong>
            <span>{editingId?"Only this saved question will be updated.":"No draft has been written to the database yet."}</span>
          </div>
          <div className="actionButtons">
            {editingId&&<button className="btn outline" type="button" onClick={cancelEdit}>Cancel edit</button>}
            {!editingId&&<button className="btn outline" type="button" onClick={()=>updateDrafts(()=>[makeDraft()])}>Clear draft</button>}
            <button className="btn primary" type="button" disabled={busy==="save-set"} onClick={()=>void saveQuestionSet()}>
              {busy==="save-set"?"Saving...":editingId?"Save question changes":"Save Question Set"}
            </button>
          </div>
        </div>
      </section>

      <article className="card assessmentLibrary studioQuestionLibrary">
        <div className="examBankTools">
          <div>
            <span className="eyebrow">Saved question history</span>
            <h2>{audience==="ENUMERATOR"?"Enumerator question bank":"Participant question bank"}</h2>
            <p>{saved.length} saved - {activeCount} currently published.</p>
          </div>
          <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions or answers..."/></label>
          <label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="ALL">All</option><option value="ACTIVE">Published</option><option value="INACTIVE">Archived</option></select></label>
        </div>

        {filtered.length===0?<div className="emptyState"><h3>No saved questions found</h3><p>Save the first question set or change the filters.</p></div>:
        <div className="assessmentQuestionList">
          {filtered.map((item,index)=><article className={`assessmentQuestionRow ${item.active?"":"inactive"}`} key={item.id}>
            <div className="assessmentQuestionNumber"><span>{index+1}</span><small>Q{item.id}</small></div>
            <div className="assessmentQuestionBody">
              <div className="assessmentQuestionTitle">
                <div><small>{label(item.questionType)}{item.program?` - ${label(item.program)}${item.skillTrack?` / ${label(item.skillTrack)}`:""}`:""}</small><strong>{item.questionText}</strong></div>
                <b className={`statusPill status-${item.active?"active":"inactive"}`}>{item.active?"Published":"Archived"}</b>
              </div>

              {item.questionType==="WRITTEN"
                ?<div className="savedWrittenType">Written response - administrator review required after submission.</div>
                :<div className="assessmentAnswerGrid">
                  {(item.options||[]).map((option,optionIndex)=><div className={item.correctIndex===optionIndex?"correct":""} key={optionIndex}>
                    <b>{String.fromCharCode(65+optionIndex)}</b><span>{option}</span>{item.correctIndex===optionIndex&&<em>Correct</em>}
                  </div>)}
                </div>}

              <div className="assessmentRowActions">
                <button className="btn outline small" type="button" onClick={()=>editQuestion(item)}>Edit</button>
                <button className="btn outline small" type="button" disabled={busy.includes(`:${item.id}`)} onClick={()=>void lifecycle(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
                <button className="btn danger small" type="button" disabled={busy.includes(`:${item.id}`)} onClick={()=>void permanentDelete(item)}>Delete permanently</button>
              </div>
            </div>
          </article>)}
        </div>}
      </article>
    </>}

    {workspace==="REVIEWS"&&<>
      <div className="featureGrid three">
        <article className="card statCard"><small>Pending written reviews</small><strong>{reviews.length}</strong><p>Submitted assessments waiting for manual marking.</p></article>
        <article className="card statCard"><small>Completed reviews</small><strong>{reviewHistory.filter(item=>item.status==="COMPLETED").length}</strong><p>Written assessments with a final score.</p></article>
        <article className="card statCard"><small>Rule</small><strong>1 by 1</strong><p>Every written response must be marked before final scoring.</p></article>
      </div>

      {reviews.length===0?<div className="card emptyState"><h3>No written responses are waiting</h3><p>When an Enumerator or Participant submits an assessment containing a Written Answer question, it will appear here.</p></div>:
      <div className="writtenReviewList">
        {reviews.map(item=><article className="card writtenReviewCard" key={item.id}>
          <div className="writtenReviewHeader">
            <div><span className="eyebrow">{label(item.audience)} assessment</span><h2>{item.subjectCode}</h2><p>Submitted {new Date(item.submittedAt).toLocaleString()}</p></div>
            <b className="statusPill status-pending">Pending Review</b>
          </div>

          <div className="writtenResponseList">
            {item.writtenResponses.map((response,index)=>{
              const mark=reviewMarks[item.id]?.[response.questionId];
              return <section key={response.questionId} className="writtenResponseCard">
                <span className="questionSequenceMini">Written {index+1}</span>
                <h3>{response.questionText}</h3>
                <div className="candidateWrittenAnswer">{response.answer||"No response submitted."}</div>
                <div className="manualMarkButtons">
                  <button type="button" className={mark===true?"selected correct":""} onClick={()=>setReviewMark(item.id,response.questionId,true)}>Mark Correct</button>
                  <button type="button" className={mark===false?"selected incorrect":""} onClick={()=>setReviewMark(item.id,response.questionId,false)}>Mark Incorrect</button>
                </div>
              </section>;
            })}
          </div>

          <div className="writtenReviewFooter">
            <span>Final percentage combines automatically marked questions with these written marks.</span>
            <button className="btn primary" type="button" disabled={busy===`review:${item.id}`} onClick={()=>void completeReview(item)}>
              {busy===`review:${item.id}`?"Calculating final score...":"Complete Review & Calculate Score"}
            </button>
          </div>
        </article>)}
      </div>}

      {reviewHistory.filter(item=>item.status==="COMPLETED").length>0&&<article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Review history</span><h2>Completed written assessments</h2></div></div>
        <div className="tableScroll"><table>
          <thead><tr><th>Candidate</th><th>Audience</th><th>Reviewed</th><th>Score</th><th>Result</th></tr></thead>
          <tbody>{reviewHistory.filter(item=>item.status==="COMPLETED").map(item=><tr key={item.id}>
            <td><strong>{item.subjectCode}</strong></td>
            <td>{label(item.audience)}</td>
            <td>{item.reviewedAt?new Date(item.reviewedAt).toLocaleString():"-"}</td>
            <td>{item.finalScore==null?"-":`${item.finalScore}%`}</td>
            <td><b className={`statusPill status-${item.passed?"active":"inactive"}`}>{item.passed?"Passed":"Not passed"}</b></td>
          </tr>)}</tbody>
        </table></div>
      </article>}
    </>}
  </section>;
}
