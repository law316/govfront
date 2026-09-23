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

  const activeCount=questions.filter(q=>q.active).length;

  return <section className="dashboardShell adminShell examBankShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration / Assessment</span>
        <h1>Enumerator Question Bank</h1>
        <p>Create, review and maintain a professional qualification assessment without duplicating questions.</p>
      </div>
      <Link className="btn outline small" to="/admin">Back to administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Saving assessment changes...</div>}

    <div className="featureGrid three">
      <article className="card statCard"><small>Total questions</small><strong>{questions.length}</strong><p>All active and archived records.</p></article>
      <article className="card statCard"><small>Active in exam</small><strong>{activeCount}</strong><p>Included when a new timed session begins.</p></article>
      <article className="card statCard"><small>Archived</small><strong>{questions.length-activeCount}</strong><p>Preserved but excluded from new attempts.</p></article>
    </div>

    <div className="examBankLayout">
      <form className="card formCard examEditor" onSubmit={save}>
        <div className="tableHead">
          <div><span className="eyebrow">{draft.id?"Edit question":"New question"}</span><h2>{draft.id?`Question #${draft.id}`:"Create assessment question"}</h2></div>
          {draft.id&&<button type="button" className="btn outline small" onClick={()=>setDraft({...emptyDraft})}>Cancel edit</button>}
        </div>
        <p>Use one clear question and four distinct answer options. The backend rejects duplicate question text automatically.</p>
        <label>Question<textarea rows={4} maxLength={900} required value={draft.questionText} onChange={e=>setDraft({...draft,questionText:e.target.value})}/></label>
        <div className="examOptionEditor">
          {(["A","B","C","D"] as const).map(letter=>{
            const key=`option${letter}` as "optionA"|"optionB"|"optionC"|"optionD";
            return <label key={letter}>Option {letter}<input maxLength={400} required value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>;
          })}
        </div>
        <label>Correct answer
          <select value={draft.correctOption} onChange={e=>setDraft({...draft,correctOption:e.target.value})}>
            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
          </select>
        </label>
        <button className="btn primary full" disabled={busy==="save"}>{busy==="save"?"Saving...":draft.id?"Save question changes":"Add question to bank"}</button>
      </form>

      <article className="card examBankList">
        <div className="examBankTools">
          <div><span className="eyebrow">Question library</span><h2>Review assessment</h2></div>
          <label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search question or option..."/></label>
          <label>Status<select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Archived</option></select></label>
        </div>

        {filtered.length===0?<div className="emptyState"><h3>No questions found</h3><p>Add the first qualification question or change the filter.</p></div>:
        <div className="examQuestionBankCards">
          {filtered.map((item,index)=><article className={`examBankQuestion ${item.active?"":"inactive"}`} key={item.id}>
            <div className="examBankQuestionHead">
              <div><span>#{item.id}</span><strong>{item.questionText}</strong></div>
              <b className={`statusPill status-${item.active?"active":"inactive"}`}>{item.active?"Active":"Archived"}</b>
            </div>
            <div className="examBankOptions">
              {(["A","B","C","D"] as const).map(letter=>{
                const key=`option${letter}` as "optionA"|"optionB"|"optionC"|"optionD";
                return <div className={item.correctOption===letter?"correct":""} key={letter}><b>{letter}</b><span>{item[key]}</span>{item.correctOption===letter&&<em>Correct</em>}</div>;
              })}
            </div>
            <div className="actionButtons">
              <button className="btn outline small" type="button" onClick={()=>beginEdit(item)}>Edit</button>
              <button className="btn outline small" type="button" disabled={busy.endsWith(`:${item.id}`)} onClick={()=>void setActive(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
            </div>
          </article>)}
        </div>}
      </article>
    </div>
  </section>;
}
