import {useEffect,useMemo,useRef,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {api} from "./api";

type Overview={
  questionCount:number;
  durationMinutes:number;
  passMark:number;
  status:string;
  latestScore?:number|null;
  activeSessionId?:number|null;
  activeSessionDeadlineAt?:string|null;
};

type Question={id:number;questionText:string;options:string[]};
type Session={
  sessionId:number;
  startedAt:string;
  deadlineAt:string;
  secondsRemaining:number;
  totalQuestions:number;
  questions:Question[];
};

type Result={score:number;passed:boolean;message:string};

function formatClock(total:number){
  const safe=Math.max(0,total);
  const minutes=Math.floor(safe/60);
  const seconds=safe%60;
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

export default function EnumeratorExamCenter(){
  const navigate=useNavigate();
  const[overview,setOverview]=useState<Overview|null>(null);
  const[session,setSession]=useState<Session|null>(null);
  const[answers,setAnswers]=useState<Record<number,string>>({});
  const[current,setCurrent]=useState(0);
  const[remaining,setRemaining]=useState(0);
  const[result,setResult]=useState<Result|null>(null);
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const submittedRef=useRef(false);

  async function loadOverview(){
    setError("");
    try{
      setOverview(await api<Overview>("/api/exam/overview"));
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load the qualification assessment.");
    }
  }

  useEffect(()=>{void loadOverview();},[]);

  useEffect(()=>{
    if(!session)return;
    const tick=()=>{
      const next=Math.max(0,Math.floor((new Date(session.deadlineAt).getTime()-Date.now())/1000));
      setRemaining(next);
    };
    tick();
    const timer=window.setInterval(tick,1000);
    return()=>window.clearInterval(timer);
  },[session]);

  async function start(){
    setBusy("start");setError("");setResult(null);submittedRef.current=false;
    try{
      const next=await api<Session>("/api/exam/start",{method:"POST"});
      setSession(next);
      setRemaining(Math.max(0,next.secondsRemaining));
      setCurrent(0);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not start the assessment.");
    }finally{setBusy("");}
  }

  async function submit(auto=false){
    if(!session||submittedRef.current)return;
    const unanswered=session.questions.filter(q=>!answers[q.id]).length;
    if(!auto&&unanswered>0&&!window.confirm(`${unanswered} question${unanswered===1?" is":"s are"} unanswered. Submit anyway?`))return;
    if(!auto&&!window.confirm("Submit this qualification assessment? You will see your result immediately."))return;

    submittedRef.current=true;
    setBusy("submit");setError("");
    try{
      const response=await api<Result>(`/api/exam/sessions/${session.sessionId}/submit`,{
        method:"POST",
        body:JSON.stringify({
          answers:Object.entries(answers).map(([questionId,selectedOption])=>({
            questionId:Number(questionId),selectedOption
          }))
        })
      });
      setResult(response);
      setSession(null);
      await loadOverview();
    }catch(err){
      submittedRef.current=false;
      setError(err instanceof Error?err.message:"Assessment submission failed.");
    }finally{setBusy("");}
  }

  useEffect(()=>{
    if(session&&remaining===0&&!submittedRef.current){
      void submit(true);
    }
  },[remaining,session]);

  const answeredCount=useMemo(()=>{
    if(!session)return 0;
    return session.questions.filter(q=>Boolean(answers[q.id])).length;
  },[session,answers]);

  if(!overview&&!error)return <section className="examCentreShell"><div className="card center">Preparing secure exam centre...</div></section>;

  if(result)return <section className="examCentreShell">
    <div className={`examResultCard ${result.passed?"passed":"retry"}`}>
      <span className="eyebrow">Qualification result</span>
      <div className="examScoreRing"><strong>{result.score}%</strong><small>score</small></div>
      <h1>{result.passed?"Qualification completed":"Assessment not yet passed"}</h1>
      <p>{result.message}</p>
      <div className="examResultActions">
        <Link className="btn primary" to="/enumerator">Return to dashboard</Link>
        {!result.passed&&<button className="btn outline" type="button" onClick={()=>{setResult(null);void start();}}>Start another attempt</button>}
      </div>
    </div>
  </section>;

  if(!session)return <section className="examCentreShell">
    <div className="examIntroCard">
      <div className="examIntroCopy">
        <span className="eyebrow">Enumerator Qualification Centre</span>
        <h1>Professional qualification assessment</h1>
        <p>Start only when you are ready. Once the test begins, the server starts the official countdown and your active session continues until it is submitted or expires.</p>
        <div className="examRules">
          <div><small>Questions</small><strong>{overview?.questionCount??0}</strong></div>
          <div><small>Time allowed</small><strong>{overview?.durationMinutes??30} min</strong></div>
          <div><small>Pass mark</small><strong>{overview?.passMark??70}%</strong></div>
          <div><small>Latest score</small><strong>{overview?.latestScore==null?"Not attempted":`${overview.latestScore}%`}</strong></div>
        </div>
        <ul className="examInstructionList">
          <li>Read every question carefully before selecting an answer.</li>
          <li>You can move backward and forward before final submission.</li>
          <li>The numbered navigator shows answered and unanswered questions.</li>
          <li>The test submits automatically when the official time expires.</li>
        </ul>
        {error&&<div className="error">{error}</div>}
        {(overview?.questionCount??0)>0
          ?<button className="btn primary examStartButton" type="button" disabled={busy==="start"} onClick={()=>void start()}>
            {busy==="start"?"Preparing secure session...":overview?.activeSessionId?"Resume active assessment":"Begin assessment"}
          </button>
          :<div className="examUnavailable">The administrator has not published an active qualification assessment yet.</div>}
      </div>
      <aside className="examIntegrityPanel">
        <span className="examShield">✓</span>
        <h3>Timed assessment</h3>
        <p>The official deadline is issued by the server when the test starts. Closing or refreshing the page does not create a new timer while that session remains active.</p>
        <Link to="/enumerator">Return to training dashboard</Link>
      </aside>
    </div>
  </section>;

  const question=session.questions[current];
  if(!question){
    return <section className="examCentreShell">
      <div className="examResultCard retry">
        <span className="eyebrow">Assessment session</span>
        <h1>Question could not be loaded</h1>
        <p>The current question index is no longer available. Return to the dashboard and reopen the Exam Centre.</p>
        <div className="examResultActions">
          <button className="btn primary" type="button" onClick={()=>navigate("/enumerator")}>Return to dashboard</button>
        </div>
      </div>
    </section>;
  }

  return <section className="examCentreShell">
    <header className="examTopbar">
      <div>
        <span className="eyebrow">Enumerator Qualification Assessment</span>
        <strong>Question {current+1} of {session.totalQuestions}</strong>
      </div>
      <div className={`examTimer ${remaining<=300?"urgent":""}`}>
        <small>Time remaining</small>
        <strong>{formatClock(remaining)}</strong>
      </div>
    </header>

    {error&&<div className="error">{error}</div>}

    <div className="examWorkspace">
      <aside className="examNavigator">
        <div className="examProgressSummary">
          <strong>{answeredCount}/{session.totalQuestions}</strong>
          <span>answered</span>
        </div>
        <div className="examNumberGrid">
          {session.questions.map((q,index)=><button
            type="button"
            key={q.id}
            className={`${index===current?"current":""} ${answers[q.id]?"answered":""}`}
            onClick={()=>setCurrent(index)}
          >{index+1}</button>)}
        </div>
        <div className="examLegend"><span><i className="legendAnswered"/>Answered</span><span><i className="legendCurrent"/>Current</span></div>
      </aside>

      <main className="examQuestionCard">
        <div className="examQuestionMeta">
          <span>Question {current+1}</span>
          <span>{answers[question.id]?"Answered":"Not answered"}</span>
        </div>
        <h2>{question.questionText}</h2>

        <div className="examOptions">
          {question.options.map((option,index)=>{
            const value=String.fromCharCode(65+index);
            const selected=answers[question.id]===value;
            return <button
              type="button"
              key={value}
              className={selected?"selected":""}
              onClick={()=>setAnswers(previous=>({...previous,[question.id]:value}))}
            >
              <b>{value}</b><span>{option}</span><i>{selected?"✓":""}</i>
            </button>;
          })}
        </div>

        <div className="examNavActions">
          <button className="btn outline" type="button" disabled={current===0} onClick={()=>setCurrent(v=>Math.max(0,v-1))}>Previous</button>
          {current<session.questions.length-1
            ?<button className="btn primary" type="button" onClick={()=>setCurrent(v=>Math.min(session.questions.length-1,v+1))}>Next question</button>
            :<button className="btn primary" type="button" disabled={busy==="submit"} onClick={()=>void submit(false)}>{busy==="submit"?"Submitting...":"Review & submit"}</button>}
        </div>
      </main>
    </div>

    <footer className="examFooter">
      <span>{session.totalQuestions-answeredCount} unanswered</span>
      <button className="textButton examSubmitLink" type="button" disabled={busy==="submit"} onClick={()=>void submit(false)}>Submit assessment now</button>
    </footer>
  </section>;
}
