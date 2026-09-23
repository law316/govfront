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
  const[reviewing,setReviewing]=useState(false);
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const submittedRef=useRef(false);

  async function loadOverview(){
    setError("");
    try{setOverview(await api<Overview>("/api/exam/overview"));}
    catch(err){setError(err instanceof Error?err.message:"Could not load the qualification assessment.");}
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
    setBusy("start");setError("");setResult(null);setReviewing(false);submittedRef.current=false;
    try{
      const next=await api<Session>("/api/exam/start",{method:"POST"});
      setSession(next);
      setRemaining(Math.max(0,next.secondsRemaining));
      setCurrent(0);
    }catch(err){setError(err instanceof Error?err.message:"Could not start the assessment.");}
    finally{setBusy("");}
  }

  async function submit(auto=false){
    if(!session||submittedRef.current)return;
    const unanswered=session.questions.filter(q=>!answers[q.id]).length;
    if(!auto&&unanswered>0&&!window.confirm(`${unanswered} question${unanswered===1?" is":"s are"} unanswered. Submit anyway?`))return;
    if(!auto&&!window.confirm("Submit this qualification assessment now? Your answers cannot be changed after submission."))return;

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
      setReviewing(false);
      await loadOverview();
    }catch(err){
      submittedRef.current=false;
      setError(err instanceof Error?err.message:"Assessment submission failed.");
    }finally{setBusy("");}
  }

  useEffect(()=>{
    if(session&&remaining===0&&!submittedRef.current)void submit(true);
  },[remaining,session]);

  const answeredCount=useMemo(()=>{
    if(!session)return 0;
    return session.questions.filter(q=>Boolean(answers[q.id])).length;
  },[session,answers]);

  if(!overview&&!error)return <section className="surveyExamShell"><div className="surveyLoading card"><span className="spinner"/>Preparing secure assessment...</div></section>;

  if(result)return <section className="surveyExamShell surveyResultScreen">
    <div className={`surveyResultCard ${result.passed?"passed":"retry"}`}>
      <span className="eyebrow">Qualification result</span>
      <div className="surveyScoreCircle"><strong>{result.score}%</strong><small>final score</small></div>
      <h1>{result.passed?"Assessment completed successfully":"Assessment not yet passed"}</h1>
      <p>{result.message}</p>
      <div className="surveyResultActions">
        <Link className="btn primary" to="/enumerator">Return to dashboard</Link>
        {!result.passed&&<button className="btn outline" type="button" onClick={()=>{setResult(null);void start();}}>Start another attempt</button>}
      </div>
    </div>
  </section>;

  if(!session)return <section className="surveyExamShell surveyIntroScreen">
    <div className="surveyIntroPanel">
      <div className="surveyIntroMain">
        <span className="surveyBrand">NES Assessment Centre</span>
        <span className="eyebrow">Enumerator Qualification</span>
        <h1>Complete your qualification assessment</h1>
        <p className="surveyLead">This assessment opens in a dedicated, distraction-free workspace. Once you begin, the official server timer starts and the active session remains the same if you refresh or reopen the page.</p>

        <div className="surveyMetricGrid">
          <div><small>Questions</small><strong>{overview?.questionCount??0}</strong></div>
          <div><small>Time allowed</small><strong>{overview?.durationMinutes??30} min</strong></div>
          <div><small>Pass mark</small><strong>{overview?.passMark??70}%</strong></div>
          <div><small>Latest score</small><strong>{overview?.latestScore==null?"Not attempted":`${overview.latestScore}%`}</strong></div>
        </div>

        <div className="surveyInstructions">
          <h3>Before you begin</h3>
          <ol>
            <li>Read one question at a time and choose the best answer.</li>
            <li>Use Previous, Next or the numbered navigator to move around the form.</li>
            <li>You can review unanswered questions before final submission.</li>
            <li>The assessment submits automatically when the official timer reaches zero.</li>
          </ol>
        </div>

        {error&&<div className="error">{error}</div>}
        {(overview?.questionCount??0)>0
          ?<button className="btn primary surveyBeginButton" type="button" disabled={busy==="start"} onClick={()=>void start()}>
            {busy==="start"?"Preparing secure session...":overview?.activeSessionId?"Resume active assessment":"Begin assessment"}
          </button>
          :<div className="examUnavailable">The administrator has not published an active qualification assessment yet.</div>}
      </div>

      <aside className="surveyIntroAside">
        <div className="surveyShield">✓</div>
        <h3>Secure timed session</h3>
        <p>Your countdown comes from the backend session, not from a fresh browser timer.</p>
        <Link to="/enumerator">Return to training dashboard</Link>
      </aside>
    </div>
  </section>;

  const question=session.questions[current];
  if(!question){
    return <section className="surveyExamShell"><div className="surveyResultCard retry"><h1>Question could not be loaded</h1><p>Return to the dashboard and reopen the Exam Centre.</p><button className="btn primary" type="button" onClick={()=>navigate("/enumerator")}>Return to dashboard</button></div></section>;
  }

  const progress=session.totalQuestions?Math.round((answeredCount/session.totalQuestions)*100):0;
  const unanswered=session.questions.filter(q=>!answers[q.id]);

  if(reviewing)return <section className="surveyExamShell surveyActiveScreen">
    <header className="surveyExamHeader">
      <div><span className="surveyBrand">NES Assessment Centre</span><strong>Review your answers</strong></div>
      <div className={`surveyTimer ${remaining<=300?"urgent":""}`}><small>Time remaining</small><strong>{formatClock(remaining)}</strong></div>
    </header>
    <div className="surveyProgressBar"><span style={{width:`${progress}%`}}/></div>

    <main className="surveyReviewCard">
      <span className="eyebrow">Final review</span>
      <h1>Check your assessment before submission</h1>
      <p>{answeredCount} of {session.totalQuestions} questions answered. {unanswered.length?`${unanswered.length} still need attention.`:"Every question has an answer."}</p>

      <div className="surveyReviewGrid">
        {session.questions.map((q,index)=><button
          key={q.id}
          type="button"
          className={answers[q.id]?"answered":"unanswered"}
          onClick={()=>{setCurrent(index);setReviewing(false);}}
        >
          <span>{index+1}</span>
          <div><strong>Question {index+1}</strong><small>{answers[q.id]?`Answered ${answers[q.id]}`:"Not answered"}</small></div>
          <em>{answers[q.id]?"✓":"!"}</em>
        </button>)}
      </div>

      <div className="surveyReviewActions">
        <button className="btn outline" type="button" onClick={()=>setReviewing(false)}>Continue reviewing</button>
        <button className="btn primary" type="button" disabled={busy==="submit"} onClick={()=>void submit(false)}>{busy==="submit"?"Submitting...":"Submit final assessment"}</button>
      </div>
    </main>
  </section>;

  return <section className="surveyExamShell surveyActiveScreen">
    <header className="surveyExamHeader">
      <div>
        <span className="surveyBrand">NES Assessment Centre</span>
        <strong>Enumerator Qualification Assessment</strong>
      </div>
      <div className={`surveyTimer ${remaining<=300?"urgent":""}`}>
        <small>Time remaining</small>
        <strong>{formatClock(remaining)}</strong>
      </div>
    </header>

    <div className="surveyProgressBand">
      <div className="surveyProgressText"><span>Question {current+1} of {session.totalQuestions}</span><span>{answeredCount} answered</span></div>
      <div className="surveyProgressBar"><span style={{width:`${progress}%`}}/></div>
    </div>

    {error&&<div className="error surveyError">{error}</div>}

    <div className="surveyWorkspace">
      <aside className="surveyNavigator">
        <div className="surveyNavigatorHeading"><strong>Question navigator</strong><small>Select any question</small></div>
        <div className="surveyNumberGrid">
          {session.questions.map((q,index)=><button
            type="button"
            key={q.id}
            className={`${index===current?"current":""} ${answers[q.id]?"answered":""}`}
            onClick={()=>setCurrent(index)}
            aria-label={`Question ${index+1}${answers[q.id]?", answered":", unanswered"}`}
          >{index+1}</button>)}
        </div>
        <div className="surveyLegend"><span><i className="done"/>Answered</span><span><i className="current"/>Current</span></div>
        <button className="btn outline full" type="button" onClick={()=>setReviewing(true)}>Review all answers</button>
      </aside>

      <main className="surveyQuestionStage">
        <div className="surveyQuestionCard">
          <div className="surveyQuestionMeta">
            <span>Question {current+1}</span>
            <span className={answers[question.id]?"answeredState":"unansweredState"}>{answers[question.id]?"Answered":"Select one answer"}</span>
          </div>

          <h1>{question.questionText}</h1>

          <div className="surveyAnswerList" role="radiogroup" aria-label={`Question ${current+1}`}>
            {question.options.map((option,index)=>{
              const value=String.fromCharCode(65+index);
              const selected=answers[question.id]===value;
              return <button
                type="button"
                role="radio"
                aria-checked={selected}
                key={value}
                className={selected?"selected":""}
                onClick={()=>setAnswers(previous=>({...previous,[question.id]:value}))}
              >
                <span className="surveyAnswerRadio">{selected?<i/>:null}</span>
                <b>{value}</b>
                <span>{option}</span>
              </button>;
            })}
          </div>

          <div className="surveyQuestionActions">
            <button className="btn outline" type="button" disabled={current===0} onClick={()=>setCurrent(v=>Math.max(0,v-1))}>Previous</button>
            {current<session.questions.length-1
              ?<button className="btn primary" type="button" onClick={()=>setCurrent(v=>Math.min(session.questions.length-1,v+1))}>Next</button>
              :<button className="btn primary" type="button" onClick={()=>setReviewing(true)}>Review answers</button>}
          </div>
        </div>
      </main>
    </div>

    <footer className="surveyExamFooter">
      <span>{unanswered.length} unanswered</span>
      <button className="textButton" type="button" onClick={()=>setReviewing(true)}>Review & submit</button>
    </footer>
  </section>;
}
