import {BrowserRouter,Link,NavLink,Navigate,Route,Routes,useNavigate,useSearchParams} from "react-router-dom";
import {FormEvent,useEffect,useState} from "react";
import {AuthProvider,useAuth,Role} from "./Auth";
import {api,download} from "./api";

const PORTAL_NAME="Enumerator Recruitment & Training Portal";

function Layout({children}:{children:React.ReactNode}){
  const{user,logout}=useAuth();

  return <div className="shell">
    <header>
      <Link className="brand" to="/">
        <span className="mark">ER</span>
        <span>
          <b>{PORTAL_NAME}</b>
          <small>Recruit - Train - Qualify - Deploy</small>
        </span>
      </Link>

      <nav>
        <NavLink to="/">Home</NavLink>

        {!user&&<>
          <NavLink to="/register">Become an Enumerator</NavLink>
          <NavLink to="/login">Sign in</NavLink>
        </>}

        {user?.role==="ENUMERATOR"&&<>
          <NavLink to="/enumerator">Dashboard</NavLink>
          <button type="button" onClick={()=>void logout()}>Sign out</button>
        </>}

        {user?.role==="ADMIN"&&<>
          <NavLink to="/admin">Admin Console</NavLink>
          <button type="button" onClick={()=>void logout()}>Sign out</button>
        </>}
      </nav>
    </header>

    <main>{children}</main>

    <footer>
      <div>
        <b>{PORTAL_NAME}</b>
        <p>Enumerator recruitment, training, qualification and controlled field access.</p>
      </div>
      <p>Secure role-based portal</p>
    </footer>
  </div>;
}

function Guard({role,children}:{role?:Role;children:React.ReactNode}){
  const{user,ready}=useAuth();

  if(!ready)return <div className="card center">Checking secure session...</div>;
  if(!user)return <Navigate to="/login" replace/>;
  if(role&&user.role!==role)return <Navigate to="/" replace/>;

  return <>{children}</>;
}

const slides=[
  ["/slide1.svg","Join the Enumerator Network","Create your field account and complete your Enumerator profile."],
  ["/slide2.svg","Train Before You Deploy","Unlock approved study materials and prepare for the qualification assessment."],
  ["/slide3.svg","Qualify for Field Access","Pass the assessment to receive your Enumerator ID, active access code and participant-registration link."]
];

function Home(){
  const[i,setI]=useState(0);

  useEffect(()=>{
    const timer=setInterval(()=>setI(v=>(v+1)%slides.length),5000);
    return()=>clearInterval(timer);
  },[]);

  return <>
    <section className="hero">
      <img src={slides[i][0]} alt=""/>
      <div className="shade"/>
      <div className="heroText">
        <span>Enumerator recruitment portal</span>
        <h1>{slides[i][1]}</h1>
        <p>{slides[i][2]}</p>
        <div>
          <Link className="btn light" to="/register">Register as Enumerator</Link>
          <Link className="btn ghost" to="/login">Enumerator sign in</Link>
        </div>
      </div>
    </section>

    <section className="section">
      <span className="eyebrow">Qualification pathway</span>
      <h2>One clear process from registration to field deployment</h2>
      <p className="lead">Every Enumerator completes the same controlled workflow before receiving participant-registration access.</p>

      <div className="grid3">
        <article className="card">
          <h3>1. Create your account</h3>
          <p>Register with your contact details, location and passport photograph.</p>
        </article>

        <article className="card">
          <h3>2. Complete training payment</h3>
          <p>Use the secure payment flow to unlock the Enumerator training library.</p>
        </article>

        <article className="card">
          <h3>3. Study approved materials</h3>
          <p>Download and study the materials published by the programme administrator.</p>
        </article>

        <article className="card">
          <h3>4. Take the assessment</h3>
          <p>Complete the qualification examination from your secure dashboard.</p>
        </article>

        <article className="card">
          <h3>5. Become qualified</h3>
          <p>Successful Enumerators receive their unique Enumerator ID.</p>
        </article>

        <article className="card">
          <h3>6. Receive field access</h3>
          <p>Qualified Enumerators receive the active access code and participant-platform link.</p>
        </article>
      </div>
    </section>
  </>;
}

function Login(){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState("");
  const{login}=useAuth();
  const navigate=useNavigate();

  async function submit(e:FormEvent){
    e.preventDefault();
    setError("");

    try{
      const user=await login(email,password);
      navigate(user.role==="ADMIN"?"/admin":user.role==="ENUMERATOR"?"/enumerator":"/");
    }catch(err){
      setError(err instanceof Error?err.message:"Sign in failed");
    }
  }

  return <section className="auth">
    <form className="form" onSubmit={submit}>
      <span className="eyebrow">Secure portal access</span>
      <h1>Sign in</h1>
      <p>Enumerators and the programme administrator sign in here.</p>

      {error&&<div className="error">{error}</div>}

      <label>Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
      </label>

      <label>Password
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>
      </label>

      <button className="btn primary" type="submit">Sign in</button>
    </form>
  </section>;
}

function EnumeratorSignup(){
  const{accept}=useAuth();
  const navigate=useNavigate();
  const[error,setError]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");

    const fd=new FormData(e.currentTarget);
    const passport=fd.get("passport") as File;

    if(!passport||!passport.size){
      setError("Passport photograph is required.");
      return;
    }

    if(passport.size>2097152){
      setError("Passport photograph must be 2 MB or less.");
      return;
    }

    try{
      const response=await api<any>("/api/auth/enumerator/signup",{method:"POST",body:fd});
      accept(response);
      navigate("/enumerator");
    }catch(err){
      setError(err instanceof Error?err.message:"Registration failed");
    }
  }

  return <section className="auth">
    <form className="form wide" onSubmit={submit}>
      <span className="eyebrow">Enumerator recruitment</span>
      <h1>Create your Enumerator account</h1>
      <p>After registration, your dashboard will guide you through payment, training, assessment and qualification.</p>

      {error&&<div className="error">{error}</div>}

      <div className="fields">
        <label>Full name<input name="fullName" autoComplete="name" required/></label>
        <label>Email<input name="email" type="email" autoComplete="email" required/></label>
        <label>Phone<input name="phone" autoComplete="tel" required/></label>
        <label>State<input name="state" required/></label>
        <label>LGA<input name="lga" required/></label>
        <label>Residential address<input name="address" autoComplete="street-address" required/></label>
        <label>Password<input name="password" type="password" minLength={10} autoComplete="new-password" required/></label>
        <label>Passport photograph<input name="passport" type="file" accept="image/jpeg,image/png,image/webp" required/></label>
      </div>

      <label className="check">
        <input name="termsAccepted" type="checkbox" value="true" required/>
        I confirm that the information supplied is correct.
      </label>

      <button className="btn primary" type="submit">Create Enumerator account</button>
    </form>
  </section>;
}

function EnumeratorDash(){
  const[data,setData]=useState<any>();
  const[materials,setMaterials]=useState<any[]>([]);
  const[questions,setQuestions]=useState<any[]>([]);
  const[answers,setAnswers]=useState<Record<number,string>>({});
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");

  const load=async()=>{
    setError("");

    try{
      const profile=await api<any>("/api/enumerator/me");
      setData(profile);

      if(["PAID","QUALIFIED"].includes(profile.status)){
        const[library,exam]=await Promise.all([
          api<any[]>("/api/training/materials"),
          api<any[]>("/api/exam/questions")
        ]);
        setMaterials(library);
        setQuestions(exam);
      }
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load Enumerator dashboard");
    }
  };

  useEffect(()=>{void load()},[]);

  const pay=async()=>{
    setError("");

    try{
      const response=await api<any>("/api/payments/initiate",{
        method:"POST",
        body:JSON.stringify({purpose:"ENUMERATOR_REGISTRATION"})
      });

      window.location.assign(response.checkoutUrl);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not start payment");
    }
  };

  async function submitExam(e:FormEvent){
    e.preventDefault();
    setError("");
    setMessage("");

    try{
      const response=await api<any>("/api/exam/submit",{
        method:"POST",
        body:JSON.stringify({
          answers:Object.entries(answers).map(([questionId,selectedOption])=>({
            questionId:Number(questionId),
            selectedOption
          }))
        })
      });

      setMessage(`${response.message} Score ${response.score}%`);
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Assessment submission failed");
    }
  }

  if(!data&&!error)return <div className="card center">Loading Enumerator dashboard...</div>;

  return <section className="section">
    <div className="dashHead">
      <div>
        <span className="eyebrow">Enumerator dashboard</span>
        <h1>{data?`Welcome, ${data.fullName}`:"Dashboard"}</h1>
      </div>
      {data&&<b className="pill">{data.status}</b>}
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}

    {data&&<>
      <div className="grid3">
        <article className="card profile">
          <img src={data.passportUrl} alt={`${data.fullName} passport`}/>
          <div>
            <h3>Profile</h3>
            <p>{data.email}</p>
            <p>{data.phone}</p>
            <p>{data.lga}, {data.state}</p>
          </div>
        </article>

        <article className="card">
          <h3>Enumerator ID</h3>
          <strong className="metric">{data.enumeratorCode||"Not assigned yet"}</strong>
          <p>Your unique field identity is issued after qualification.</p>
        </article>

        <article className="card">
          <h3>Assessment score</h3>
          <strong className="metric">{data.examScore==null?"Not attempted":`${data.examScore}%`}</strong>
          <p>Your latest qualification result.</p>
        </article>
      </div>

      {data.status==="PENDING_PAYMENT"&&
        <article className="card dark">
          <span className="eyebrow">Training access</span>
          <h2>Unlock Enumerator training</h2>
          <p>Complete the training-access payment to unlock study materials and the qualification assessment.</p>
          <button className="btn light" type="button" onClick={()=>void pay()}>Proceed to secure payment</button>
        </article>
      }

      {["PAID","QUALIFIED"].includes(data.status)&&<>
        <article className="card">
          <span className="eyebrow">Training library</span>
          <h2>Approved study materials</h2>

          {materials.length
            ?materials.map(item=>
              <button
                className="resource"
                type="button"
                key={item.id}
                onClick={()=>void download(`/api/training/materials/${item.id}/download`,item.originalFilename)}
              >
                <span><b>{item.title}</b><small>{item.description}</small></span>
                <b>Download</b>
              </button>
            )
            :<p>No study material has been published yet.</p>
          }
        </article>

        {data.status!=="QUALIFIED"&&
          <form className="card" onSubmit={submitExam}>
            <span className="eyebrow">Qualification assessment</span>
            <h2>Enumerator examination</h2>

            {!questions.length&&<p>The administrator has not published assessment questions yet.</p>}

            {questions.map((question,index)=>
              <fieldset key={question.id}>
                <legend>{index+1}. {question.questionText}</legend>

                {question.options.map((option:string,optionIndex:number)=>{
                  const value=String.fromCharCode(65+optionIndex);

                  return <label key={value}>
                    <input
                      type="radio"
                      name={`q${question.id}`}
                      required
                      onChange={()=>setAnswers(previous=>({...previous,[question.id]:value}))}
                    />
                    {" "}{value}. {option}
                  </label>;
                })}
              </fieldset>
            )}

            {!!questions.length&&<button className="btn primary" type="submit">Submit assessment</button>}
          </form>
        }
      </>}

      {data.status==="QUALIFIED"&&
        <article className="card dark">
          <span className="eyebrow">Qualified field access</span>
          <h2>Participant recruitment credentials</h2>
          <p>Use the currently active access code together with your Enumerator ID when registering participants on the separate participant platform.</p>

          <strong className="code">{data.activeAccessCode||"Waiting for administrator access code"}</strong>

          {data.referralLink&&<>
            <input readOnly value={data.referralLink} aria-label="Participant registration link"/>
            <button className="btn light" type="button" onClick={()=>void navigator.clipboard.writeText(data.referralLink)}>Copy participant link</button>
          </>}
        </article>
      }
    </>}
  </section>;
}

function Admin(){
  const[stats,setStats]=useState<any>();
  const[enumerators,setEnumerators]=useState<any[]>([]);
  const[payments,setPayments]=useState<any[]>([]);
  const[transactionIds,setTransactionIds]=useState<Record<string,string>>({});
  const[activeTab,setActiveTab]=useState<"overview"|"payments"|"training"|"access">("overview");
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState("");

  const load=async()=>{
    setError("");

    try{
      const[summary,registry,paymentRows]=await Promise.all([
        api<any>("/api/admin/stats"),
        api<any[]>("/api/admin/enumerators"),
        api<any[]>("/api/admin/payments")
      ]);

      setStats(summary);
      setEnumerators(registry);
      setPayments(paymentRows);

      const providerIds:Record<string,string>={};
      paymentRows.forEach(payment=>{
        if(payment.providerTransactionId){
          providerIds[payment.txRef]=String(payment.providerTransactionId);
        }
      });
      setTransactionIds(current=>({...providerIds,...current}));
    }catch(err){
      setError(err instanceof Error?err.message:"Could not load administration data");
    }
  };

  useEffect(()=>{void load()},[]);

  async function createCode(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("code");

    const form=new FormData(e.currentTarget);

    try{
      const response=await api<any>("/api/admin/access-codes",{
        method:"POST",
        body:JSON.stringify({
          code:form.get("code")||null,
          validityDays:Number(form.get("validityDays"))
        })
      });

      setMessage(`Active field code: ${response.code}`);
      e.currentTarget.reset();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not create access code");
    }finally{
      setBusy("");
    }
  }

  async function uploadMaterial(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("material");

    try{
      await api("/api/admin/training/materials",{
        method:"POST",
        body:new FormData(e.currentTarget)
      });

      setMessage("Study material published successfully.");
      e.currentTarget.reset();
    }catch(err){
      setError(err instanceof Error?err.message:"Material upload failed");
    }finally{
      setBusy("");
    }
  }

  async function addQuestion(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("question");

    try{
      const payload=Object.fromEntries(new FormData(e.currentTarget));

      await api("/api/admin/exam/questions",{
        method:"POST",
        body:JSON.stringify(payload)
      });

      setMessage("Exam question added successfully.");
      e.currentTarget.reset();
    }catch(err){
      setError(err instanceof Error?err.message:"Could not add exam question");
    }finally{
      setBusy("");
    }
  }

  async function verifyPayment(txRef:string){
    setError("");
    setMessage("");

    const raw=(transactionIds[txRef]||"").trim();
    if(!raw||!Number.isFinite(Number(raw))||Number(raw)<=0){
      setError("Enter the Flutterwave transaction ID before verification.");
      return;
    }

    setBusy(`payment:${txRef}`);

    try{
      const response=await api<any>(`/api/admin/payments/${encodeURIComponent(txRef)}/verify`,{
        method:"POST",
        body:JSON.stringify({transactionId:Number(raw)})
      });

      if(!response.verified){
        setError(response.message||"Flutterwave did not verify this payment.");
        return;
      }

      setMessage(response.message||"Payment verified successfully.");
      await load();
    }catch(err){
      setError(err instanceof Error?err.message:"Payment verification failed");
    }finally{
      setBusy("");
    }
  }

  const pendingPayments=payments.filter(payment=>payment.status==="PENDING").length;
  const verifiedPayments=payments.filter(payment=>payment.status==="SUCCESSFUL").length;
  const failedPayments=payments.filter(payment=>payment.status==="FAILED").length;

  return <section className="section adminSection">
    <div className="dashHead">
      <div>
        <span className="eyebrow">Private administration</span>
        <h1>Enumerator programme control centre</h1>
        <p className="lead compactLead">Only the configured administrator can access these controls.</p>
      </div>
      <b className="pill adminOnly">ADMIN ONLY</b>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}

    <div className="adminTabs" role="tablist" aria-label="Admin sections">
      <button className={activeTab==="overview"?"active":""} type="button" onClick={()=>setActiveTab("overview")}>Overview</button>
      <button className={activeTab==="payments"?"active":""} type="button" onClick={()=>setActiveTab("payments")}>
        Payments {pendingPayments>0&&<span className="tabCount">{pendingPayments}</span>}
      </button>
      <button className={activeTab==="training"?"active":""} type="button" onClick={()=>setActiveTab("training")}>Training & Exam</button>
      <button className={activeTab==="access"?"active":""} type="button" onClick={()=>setActiveTab("access")}>Access Code</button>
      <button className="refreshTab" type="button" onClick={()=>void load()}>Refresh data</button>
    </div>

    {activeTab==="overview"&&<>
      {stats&&
        <div className="stats adminStats">
          <div><small>Registered Enumerators</small><b>{stats.enumerators}</b></div>
          <div><small>Qualified</small><b>{stats.qualifiedEnumerators}</b></div>
          <div><small>Verified payment value</small><b>NGN {Number(stats.totalVerifiedPaymentsNgn||0).toLocaleString()}</b></div>
          <div><small>Pending payments</small><b>{pendingPayments}</b></div>
        </div>
      }

      <article className="card table adminTable">
        <div className="tableHead">
          <div>
            <span className="eyebrow">Enumerator registry</span>
            <h2>Registered Enumerators</h2>
          </div>
          <span className="recordCount">{enumerators.length} record{enumerators.length===1?"":"s"}</span>
        </div>

        {enumerators.length===0
          ?<div className="emptyState"><h3>No Enumerators yet</h3><p>New registrations will appear here automatically.</p></div>
          :<table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>State</th>
                <th>Enumerator ID</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>

            <tbody>
              {enumerators.map((item,index)=>
                <tr key={item.id??index}>
                  <td><strong>{item.fullName}</strong></td>
                  <td>{item.email}</td>
                  <td>{item.phone}</td>
                  <td>{item.state}</td>
                  <td>{item.enumeratorCode||"-"}</td>
                  <td><span className={`statusTag status-${String(item.status).toLowerCase()}`}>{item.status}</span></td>
                  <td>{item.examScore==null?"-":`${item.examScore}%`}</td>
                </tr>
              )}
            </tbody>
          </table>
        }
      </article>
    </>}

    {activeTab==="payments"&&<>
      <div className="stats paymentStats">
        <div><small>All payments</small><b>{payments.length}</b></div>
        <div><small>Pending</small><b>{pendingPayments}</b></div>
        <div><small>Verified</small><b>{verifiedPayments}</b></div>
        <div><small>Failed</small><b>{failedPayments}</b></div>
      </div>

      <article className="card table adminTable">
        <div className="tableHead">
          <div>
            <span className="eyebrow">Payment operations</span>
            <h2>Verify Enumerator payments</h2>
            <p>Verification checks Flutterwave before access is granted.</p>
          </div>
        </div>

        {payments.length===0
          ?<div className="emptyState"><h3>No payment records yet</h3><p>Enumerator checkout attempts will appear here.</p></div>
          :<table>
            <thead>
              <tr>
                <th>Enumerator</th>
                <th>Reference</th>
                <th>Purpose</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Provider status</th>
                <th>Flutterwave ID</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {payments.map(payment=>
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.fullName||"Unknown user"}</strong>
                    <small className="tableSub">{payment.email||""}</small>
                  </td>
                  <td className="mono">{payment.txRef}</td>
                  <td>{payment.purpose}</td>
                  <td>{payment.currency} {Number(payment.amount||0).toLocaleString()}</td>
                  <td><span className={`statusTag status-${String(payment.status).toLowerCase()}`}>{payment.status}</span></td>
                  <td>{payment.providerStatus||"-"}</td>
                  <td>
                    {payment.status==="SUCCESSFUL"
                      ?<span className="mono">{payment.providerTransactionId||"-"}</span>
                      :<input
                        className="transactionInput"
                        inputMode="numeric"
                        placeholder="Transaction ID"
                        value={transactionIds[payment.txRef]||""}
                        onChange={e=>setTransactionIds(current=>({...current,[payment.txRef]:e.target.value.replace(/\D/g,"")}))}
                        aria-label={`Flutterwave transaction ID for ${payment.txRef}`}
                      />
                    }
                  </td>
                  <td>
                    {payment.status==="SUCCESSFUL"
                      ?<span className="verifiedText">Verified</span>
                      :<button
                        className="btn primary smallBtn"
                        type="button"
                        disabled={busy===`payment:${payment.txRef}`}
                        onClick={()=>void verifyPayment(payment.txRef)}
                      >
                        {busy===`payment:${payment.txRef}`?"Verifying...":"Verify payment"}
                      </button>
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        }
      </article>
    </>}

    {activeTab==="training"&&
      <div className="grid2 adminForms">
        <form className="card" onSubmit={uploadMaterial}>
          <span className="eyebrow">Training library</span>
          <h2>Publish study material</h2>
          <p>Only paid Enumerators can access published training materials.</p>

          <label>Title<input name="title" required maxLength={180}/></label>
          <label>Description<input name="description" required maxLength={600}/></label>
          <label>Training file<input name="file" type="file" accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.epub" required/></label>

          <button className="btn primary" type="submit" disabled={busy==="material"}>
            {busy==="material"?"Uploading...":"Upload material"}
          </button>
        </form>

        <form className="card" onSubmit={addQuestion}>
          <span className="eyebrow">Qualification exam</span>
          <h2>Add exam question</h2>
          <p>Questions published here are shown only to Enumerators with verified training access.</p>

          <label>Question<input name="questionText" required maxLength={900}/></label>

          {["A","B","C","D"].map(option=>
            <label key={option}>Option {option}<input name={`option${option}`} required maxLength={400}/></label>
          )}

          <label>Correct answer
            <select name="correctOption" defaultValue="A">
              <option>A</option>
              <option>B</option>
              <option>C</option>
              <option>D</option>
            </select>
          </label>

          <button className="btn primary" type="submit" disabled={busy==="question"}>
            {busy==="question"?"Adding...":"Add question"}
          </button>
        </form>
      </div>
    }

    {activeTab==="access"&&
      <div className="accessLayout">
        <form className="card accessCard" onSubmit={createCode}>
          <span className="eyebrow">Field control</span>
          <h2>Create or rotate access code</h2>
          <p>Creating a new code deactivates the previous active code. Qualified Enumerators use the current code on the participant platform.</p>

          <label>Custom code
            <input name="code" maxLength={32} placeholder="Leave blank to generate automatically"/>
          </label>

          <label>Validity period
            <select name="validityDays" defaultValue="1">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>

          <button className="btn primary" type="submit" disabled={busy==="code"}>
            {busy==="code"?"Activating...":"Activate new access code"}
          </button>
        </form>

        <article className="card infoCard">
          <span className="eyebrow">How field access works</span>
          <h2>Controlled participant registration</h2>
          <ol>
            <li>Enumerator completes payment and training.</li>
            <li>Enumerator passes the qualification assessment.</li>
            <li>You activate the current field access code.</li>
            <li>Qualified Enumerators receive the participant-platform link and code.</li>
            <li>Rotating the code invalidates the previous active code.</li>
          </ol>
        </article>
      </div>
    }
  </section>;
}

function Callback(){
  const[params]=useSearchParams();
  const[message,setMessage]=useState("Verifying payment...");
  const{user}=useAuth();

  useEffect(()=>{
    const id=params.get("transaction_id");
    const ref=params.get("tx_ref");
    const status=params.get("status");

    if(status!=="successful"||!id||!ref){
      setMessage("Payment was not completed.");
      return;
    }

    api<any>("/api/payments/verify",{
      method:"POST",
      body:JSON.stringify({transactionId:Number(id),txRef:ref})
    })
      .then(response=>setMessage(response.message))
      .catch(err=>setMessage(err instanceof Error?err.message:"Payment verification failed"));
  },[params]);

  return <section className="auth">
    <div className="form center">
      <span className="eyebrow">Secure payment</span>
      <h1>Payment verification</h1>
      <p>{message}</p>
      <Link className="btn primary" to={user?.role==="ENUMERATOR"?"/enumerator":"/"}>Return to dashboard</Link>
    </div>
  </section>;
}

export default function App(){
  return <BrowserRouter>
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<EnumeratorSignup/>}/>
          <Route path="/enumerators/register" element={<Navigate to="/register" replace/>}/>
          <Route path="/enumerator" element={<Guard role="ENUMERATOR"><EnumeratorDash/></Guard>}/>
          <Route path="/admin" element={<Guard role="ADMIN"><Admin/></Guard>}/>
          <Route path="/payment/callback" element={<Guard><Callback/></Guard>}/>

          <Route path="/support/*" element={<Navigate to="/" replace/>}/>
          <Route path="/applicant/*" element={<Navigate to="/" replace/>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </Layout>
    </AuthProvider>
  </BrowserRouter>;
}
