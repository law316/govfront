import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";

type Question={
  id:number;
  questionText:string;
  optionA:string;
  optionB:string;
  optionC:string;
  optionD:string;
  correctOption:string;
  active:boolean;
};

const emptyDraft={id:null as number|null,questionText:"",optionA:"",optionB:"",optionC:"",optionD:"",correctOption:"A"};

export default function AdminExamBank(){
  const[questions,setQuestions]=useState<Question[]>([]);
  const[draft,setDraft]=useState({...emptyDraft});
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState<"ALL"|"ACTIVE"|"INACTIVE">("ALL");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  async function load(){
    setError("");
    try{setQuestions(await api<Question[]>("/api/admin/exam-bank/questions"));}
    catch(err){setError(err instanceof Error?err.message:"Could not load the Enumerator question bank.");}
  }
  useEffect(()=>{void load();},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return questions.filter(item=>{
      const statusOk=filter==="ALL"||(filter==="ACTIVE"?item.active:!item.active);
      const textOk=!q||[item.questionText,item.optionA,item.optionB,item.optionC,item.optionD].some(v=>v.toLowerCase().includes(q));
      return statusOk&&textOk;
    });
  },[questions,search,filter]);

  function beginEdit(item:Question){
    setDraft({
      id:item.id,questionText:item.questionText,optionA:item.optionA,optionB:item.optionB,
      optionC:item.optionC,optionD:item.optionD,correctOption:item.correctOption
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save(e:FormEvent){
    e.preventDefault();
    setBusy("save");setError("");setMessage("");
    const payload={
      questionText:draft.questionText.trim(),
      optionA:draft.optionA.trim(),optionB:draft.optionB.trim(),
      optionC:draft.optionC.trim(),optionD:draft.optionD.trim(),
      correctOption:draft.correctOption
    };
    try{
      if(draft.id){
        await api(`/api/admin/exam-bank/questions/${draft.id}`,{method:"PATCH",body:JSON.stringify(payload)});
        setMessage("Question updated successfully.");
      }else{
        await api("/api/admin/exam-bank/questions",{method:"POST",body:JSON.stringify(payload)});
        setMessage("Question added to the qualification bank.");
      }
      setDraft({...emptyDraft});
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Question could not be saved.");}
    finally{setBusy("");}
  }

  async function setActive(item:Question,next:boolean){
    const action=next?"reactivate":"deactivate";
    if(!window.confirm(`${next?"Reactivate":"Deactivate"} this question?`))return;
    setBusy(`${action}:${item.id}`);setError("");setMessage("");
    try{
      await api(
        next?`/api/admin/exam-bank/questions/${item.id}/reactivate`:`/api/admin/exam-bank/questions/${item.id}`,
        {method:next?"POST":"DELETE"}
      );
      setMessage(next?"Question reactivated.":"Question deactivated. Existing exam history remains preserved.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:`Could not ${action} question.`);}
    finally{setBusy("");}
  }

  async function permanentDelete(item:Question){
    const typed=window.prompt(`Permanently delete Question #${item.id}? This is only allowed when it is not required by an existing exam session. Type DELETE to continue.`);
    if(typed!=="DELETE")return;
    setBusy(`delete:${item.id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/exam-bank/questions/${item.id}/permanent?confirm=DELETE`,{method:"DELETE"});
      if(draft.id===item.id)setDraft({...emptyDraft});
      setMessage("Question permanently deleted.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Permanent deletion was blocked because this question is still required by exam history.");
    }finally{setBusy("");}
  }

  const activeCount=questions.filter(q=>q.active).length;
  const previewOptions=[
    ["A",draft.optionA],["B",draft.optionB],["C",draft.optionC],["D",draft.optionD]
  ] as const;

  return <section className="dashboardShell adminShell examBankShell assessmentBuilderShell">
    <div className="dashboardHero assessmentBuilderHero">
      <div>
        <span className="eyebrow">Administration / Assessment Builder</span>
        <h1>Enumerator Qualification Form</h1>
        <p>Build the assessment like a professional survey: clear question wording, four answer choices, controlled publishing and safe deletion.</p>
      </div>
      <Link className="btn outline small" to="/admin">Back to administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Processing assessment changes...</div>}

    <div className="featureGrid three">
      <article className="card statCard"><small>Total questions</small><strong>{questions.length}</strong><p>All active and archived records.</p></article>
      <article className="card statCard"><small>Published</small><strong>{activeCount}</strong><p>Available to new exam sessions.</p></article>
      <article className="card statCard"><small>Archived</small><strong>{questions.length-activeCount}</strong><p>Preserved but excluded from new attempts.</p></article>
    </div>

    <div className="assessmentBuilderGrid">
      <form className="card formCard assessmentQuestionEditor" onSubmit={save}>
        <div className="assessmentEditorHeader">
          <div>
            <span className="eyebrow">{draft.id?"Editing question":"Question builder"}</span>
            <h2>{draft.id?`Question #${draft.id}`:"Create a new question"}</h2>
            <p>Write the question exactly as the Enumerator should see it during the assessment.</p>
          </div>
          {draft.id&&<button type="button" className="btn outline small" onClick={()=>setDraft({...emptyDraft})}>Cancel edit</button>}
        </div>

        <label className="assessmentPromptLabel">Question prompt
          <textarea rows={4} maxLength={900} required value={draft.questionText} placeholder="Example: Which action best protects participant information during field registration?" onChange={e=>setDraft({...draft,questionText:e.target.value})}/>
        </label>

        <div className="assessmentOptionBuilder">
          {(["A","B","C","D"] as const).map(letter=>{
            const key=`option${letter}` as "optionA"|"optionB"|"optionC"|"optionD";
            return <label key={letter} className={draft.correctOption===letter?"correctOptionEditor":""}>
              <span className="optionLetter">{letter}</span>
              <input maxLength={400} required value={draft[key]} placeholder={`Answer option ${letter}`} onChange={e=>setDraft({...draft,[key]:e.target.value})}/>
              <button type="button" className="correctChoiceButton" onClick={()=>setDraft({...draft,correctOption:letter})}>{draft.correctOption===letter?"Correct answer":"Mark correct"}</button>
            </label>;
          })}
        </div>

        <div className="assessmentEditorFooter">
          <span>Correct answer: <strong>{draft.correctOption}</strong></span>
          <button className="btn primary" disabled={busy==="save"}>{busy==="save"?"Saving...":draft.id?"Save question changes":"Add question to assessment"}</button>
        </div>
      </form>

      <aside className="card assessmentLivePreview">
        <span className="eyebrow">Participant-style preview</span>
        <div className="previewProgress"><span style={{width:"38%"}}/></div>
        <small>Question preview</small>
        <h2>{draft.questionText.trim()||"Your question will appear here."}</h2>
        <div className="previewAnswers">
          {previewOptions.map(([letter,value])=><div className={draft.correctOption===letter?"correctPreview":""} key={letter}>
            <b>{letter}</b><span>{value.trim()||`Answer option ${letter}`}</span>
          </div>)}
        </div>
        <p>This preview mirrors the clean answer-card experience used in the Exam Centre.</p>
      </aside>
    </div>

    <article className="card assessmentLibrary">
      <div className="examBankTools">
        <div><span className="eyebrow">Question library</span><h2>Assessment form</h2><p>Review, edit, archive, reactivate or permanently remove mistakes.</p></div>
        <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search question or answer..."/></label>
        <label>Status<select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">All</option><option value="ACTIVE">Published</option><option value="INACTIVE">Archived</option></select></label>
      </div>

      {filtered.length===0?<div className="emptyState"><h3>No questions found</h3><p>Add the first qualification question or change the filter.</p></div>:
      <div className="assessmentQuestionList">
        {filtered.map((item,index)=><article className={`assessmentQuestionRow ${item.active?"":"inactive"}`} key={item.id}>
          <div className="assessmentQuestionNumber"><span>{index+1}</span><small>Q{item.id}</small></div>
          <div className="assessmentQuestionBody">
            <div className="assessmentQuestionTitle"><strong>{item.questionText}</strong><b className={`statusPill status-${item.active?"active":"inactive"}`}>{item.active?"Published":"Archived"}</b></div>
            <div className="assessmentAnswerGrid">
              {(["A","B","C","D"] as const).map(letter=>{
                const key=`option${letter}` as "optionA"|"optionB"|"optionC"|"optionD";
                return <div className={item.correctOption===letter?"correct":""} key={letter}><b>{letter}</b><span>{item[key]}</span>{item.correctOption===letter&&<em>Correct</em>}</div>;
              })}
            </div>
            <div className="assessmentRowActions">
              <button className="btn outline small" type="button" onClick={()=>beginEdit(item)}>Edit</button>
              <button className="btn outline small" type="button" disabled={busy.endsWith(`:${item.id}`)} onClick={()=>void setActive(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
              <button className="btn danger small" type="button" disabled={busy===`delete:${item.id}`} onClick={()=>void permanentDelete(item)}>{busy===`delete:${item.id}`?"Deleting...":"Delete permanently"}</button>
            </div>
          </div>
        </article>)}
      </div>}
    </article>
  </section>;
}
