import {BrowserRouter,Link,NavLink,Navigate,Route,Routes,useLocation,useNavigate,useSearchParams} from "react-router-dom";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {AuthProvider,useAuth,Role} from "./Auth";
import {api,download} from "./api";

const PORTAL_NAME="National Enterprise & Skills Support Portal";

const steps=[
  {
    title:"Enumerator Registration",
    text:"Create your Enumerator profile and submit the required identification details."
  },
  {
    title:"Training Access",
    text:"Complete the approved registration payment to unlock programme materials."
  },
  {
    title:"Assessment",
    text:"Study the published materials and complete the Enumerator qualification test."
  },
  {
    title:"Field Deployment",
    text:"Qualified Enumerators receive an Enumerator ID, active access code and participant registration link."
  }
];

const programmeAreas=[
  {
    image:"/images/nigeria-youth-professionals.jpg",
    title:"Youth Enterprise & Digital Skills",
    text:"Supporting organised outreach to young Nigerians interested in practical skills and enterprise opportunities."
  },
  {
    image:"/images/nigeria-farmers.jpg",
    title:"Agriculture & Community Outreach",
    text:"Supporting field registration and programme access for farmers and communities."
  }
];

function Layout({children}:{children:React.ReactNode}){
  const{user,logout}=useAuth();
  const[open,setOpen]=useState(false);
  const location=useLocation();

  useEffect(()=>{setOpen(false);},[location.pathname]);

  return <div className="siteShell">
    <div className="nationalBand" aria-hidden="true">
      <span/><span/><span/>
    </div>

    <header className="topbar">
      <div className="topbarInner">
        <Link className="brand" to="/">
          <span className="brandSeal">NES</span>
          <span className="brandText">
            <b>{PORTAL_NAME}</b>
            <small>Enumerator Recruitment & Training</small>
          </span>
        </Link>

        <button
          className={`menuToggle ${open?"active":""}`}
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={()=>setOpen(v=>!v)}
        >
          <span/>
          <span/>
          <span/>
        </button>

        <div className={`navWrap ${open?"open":""}`}>
          <nav className="mainNav">
            <NavLink to="/">Home</NavLink>
            {!user&&<NavLink to="/register">Enumerator Registration</NavLink>}
            {!user&&<NavLink to="/login">Login</NavLink>}
            {user?.role==="ENUMERATOR"&&<NavLink to="/enumerator">Enumerator Dashboard</NavLink>}
            {user?.role==="ADMIN"&&<NavLink to="/admin">Administration</NavLink>}
          </nav>

          {user&&<div className="topActions">
            <button className="btn outline small" type="button" onClick={()=>void logout()}>Sign out</button>
          </div>}
        </div>
      </div>
    </header>

    <main className="pageBody">{children}</main>

    <footer className="footer">
      <div className="footerInner">
        <div>
          <b>{PORTAL_NAME}</b>
          <p>Enumerator registration, training, assessment and field access.</p>
        </div>
        <div className="footerNote">
          <span>Enumerator Portal</span>
          <span>Administration Portal</span>
        </div>
      </div>
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

function SectionIntro({eyebrow,title,text}:{eyebrow:string;title:string;text?:string}){
  return <div className="sectionIntro">
    <span className="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    {text&&<p className="lead">{text}</p>}
  </div>;
}

function Home(){
  return <>
    <section className="nationalHero">
      <div className="nationalHeroImage">
        <img src="/images/nigeria-farmers.jpg" alt="Nigerian farmers during a field harvest"/>
        <div className="imageCaption">
          <span>Enumerator Recruitment</span>
          <strong>Supporting access across communities</strong>
        </div>
      </div>

      <div className="nationalHeroContent">
        <span className="portalKicker">National Enterprise & Skills Support Portal</span>
        <h1>Enumerator Recruitment & Training</h1>
        <p className="heroLead">
          Register as an Enumerator, complete the required training and assessment, and receive field access after qualification.
        </p>

        <div className="heroActions nationalActions">
          <Link className="btn primary" to="/register">Register as Enumerator</Link>
          <Link className="btn outline" to="/login">Enumerator Login</Link>
        </div>

        <div className="heroNotice">
          <strong>Enumerator Portal</strong>
          <p>Participant registration is handled on a separate platform after Enumerator qualification.</p>
        </div>
      </div>
    </section>

    <section className="quickAccess" aria-label="Programme access">
      <div>
        <small>01</small>
        <span>Register</span>
      </div>
      <div>
        <small>02</small>
        <span>Complete Training</span>
      </div>
      <div>
        <small>03</small>
        <span>Take Assessment</span>
      </div>
      <div>
        <small>04</small>
        <span>Receive Field Access</span>
      </div>
    </section>

    <section className="section">
      <SectionIntro
        eyebrow="Enumerator Process"
        title="How the programme works"
        text="Complete each stage in sequence before moving into field registration."
      />

      <div className="featureGrid four processGrid">
        {steps.map((step,i)=>
          <article key={step.title} className="card processCard">
            <span className="stepBadge">0{i+1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        )}
      </div>
    </section>

    <section className="section programmeSection">
      <SectionIntro
        eyebrow="Programme Reach"
        title="Supporting youth, enterprise and communities"
        text="Qualified Enumerators help extend programme registration and support access across different communities."
      />

      <div className="programmeGrid">
        {programmeAreas.map(area=>
          <article key={area.title} className="programmeCard">
            <img src={area.image} alt={area.title}/>
            <div>
              <h3>{area.title}</h3>
              <p>{area.text}</p>
            </div>
          </article>
        )}
      </div>
    </section>

    <section className="closingBanner">
      <div>
        <span className="eyebrow">Enumerator Recruitment</span>
        <h2>Ready to begin?</h2>
        <p>Create your Enumerator account and continue from your dashboard.</p>
      </div>
      <Link className="btn primary" to="/register">Start Registration</Link>
    </section>
  </>;
}

function AuthShell({eyebrow,title,description,asideTitle,asideText,bullets,children}:{eyebrow:string;title:string;description:string;asideTitle:string;asideText:string;bullets:string[];children:React.ReactNode}){
  return <section className="authSection">
    <div className="authIntro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="authVisual">
        <img src="/images/nigeria-youth-professionals.jpg" alt="Nigerian professionals working together"/>
      </div>
    </div>

    <aside className="authAside">
      <span className="eyebrow">Why this portal</span>
      <h2>{asideTitle}</h2>
      <p>{asideText}</p>
      <ul className="asideList">
        {bullets.map(item=><li key={item}>{item}</li>)}
      </ul>
    </aside>

    <div className="authCard">
      {children}
    </div>
  </section>;
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

  return <AuthShell
    eyebrow="Secure access"
    title="Enumerator and Administration Login"
    description="Enter your registered email address and password to continue."
    asideTitle="Portal Access"
    asideText="Enumerators access their training dashboard. Administration controls remain restricted to the administrator account."
    bullets={[
      "Role-based routing after login",
      "Protected admin operations",
      "Access your account from desktop or mobile"
    ]}
  >
    <form className="form" onSubmit={submit}>
      {error&&<div className="error">{error}</div>}

      <label>Email
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
      </label>

      <label>Password
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>
      </label>

      <button className="btn primary full" type="submit">Sign in</button>
    </form>
  </AuthShell>;
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

  return <AuthShell
    eyebrow="Enumerator onboarding"
    title="Enumerator Registration"
    description="Complete the form below to create your Enumerator account."
    asideTitle="After Registration"
    asideText="After registration, complete payment, study the training materials and take the qualification assessment."
    bullets={[
      "Complete the required registration payment",
      "Administrator-published materials and test",
      "Enumerator ID and field access after qualification"
    ]}
  >
    <form className="form wide" onSubmit={submit}>
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
        I confirm that the supplied information is accurate.
      </label>

      <button className="btn primary full" type="submit">Create Enumerator account</button>
    </form>
  </AuthShell>;
}

function StatusPill({value}:{value:string}){
  return <b className={`statusPill status-${String(value).toLowerCase()}`}>{value}</b>;
}

function EnumeratorDash(){
  const[data,setData]=useState<any>();
  const[materials,setMaterials]=useState<any[]>([]);
  const[questions,setQuestions]=useState<any[]>([]);
  const[answers,setAnswers]=useState<Record<number,string>>({});
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState("");

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

  useEffect(()=>{void load();},[]);

  const pay=async()=>{
    setError("");

    try{
      setBusy("payment");
      const response=await api<any>("/api/payments/initiate",{
        method:"POST",
        body:JSON.stringify({purpose:"ENUMERATOR_REGISTRATION"})
      });

      window.location.assign(response.checkoutUrl);
    }catch(err){
      setError(err instanceof Error?err.message:"Could not start payment");
      setBusy("");
    }
  };

  async function submitExam(e:FormEvent){
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy("exam");

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
    }finally{
      setBusy("");
    }
  }

  const progressLabel=useMemo(()=>{
    if(!data)return "Loading";
    if(data.status==="PENDING_PAYMENT")return "Pending payment";
    if(data.status==="PAID")return "Training active";
    if(data.status==="QUALIFIED")return "Qualified";
    return data.status;
  },[data]);

  if(!data&&!error)return <div className="card center panel">Loading Enumerator dashboard...</div>;

  return <section className="dashboardShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Enumerator dashboard</span>
        <h1>{data?`Welcome, ${data.fullName}`:"Enumerator dashboard"}</h1>
        <p>Your workflow is arranged clearly: payment, training, assessment, qualification and field deployment.</p>
      </div>
      {data&&<StatusPill value={data.status}/>}
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}

    {data&&<>
      <div className="featureGrid three">
        <article className="card profileCard">
          <img src={data.passportUrl} alt={`${data.fullName} passport`}/>
          <div>
            <span className="eyebrow">Profile</span>
            <h3>{data.fullName}</h3>
            <p>{data.email}</p>
            <p>{data.phone}</p>
            <p>{data.lga}, {data.state}</p>
          </div>
        </article>

        <article className="card statCard">
          <small>Enumerator ID</small>
          <strong>{data.enumeratorCode||"Not assigned yet"}</strong>
          <p>Issued after successful qualification.</p>
        </article>

        <article className="card statCard">
          <small>Assessment progress</small>
          <strong>{progressLabel}</strong>
          <p>{data.examScore==null?"No score yet":`Latest score: ${data.examScore}%`}</p>
        </article>
      </div>

      {data.status==="PENDING_PAYMENT"&&
        <article className="panel bannerPanel">
          <div>
            <span className="eyebrow">Unlock training access</span>
            <h2>Complete your Enumerator payment</h2>
            <p>Once payment is verified, your training materials and qualification test become available inside this dashboard.</p>
          </div>
          <button className="btn primary" type="button" disabled={busy==="payment"} onClick={()=>void pay()}>
            {busy==="payment"?"Redirecting...":"Proceed to secure payment"}
          </button>
        </article>
      }

      {["PAID","QUALIFIED"].includes(data.status)&&<>
        <div className="dashboardColumns">
          <article className="card resourcePanel">
            <span className="eyebrow">Training library</span>
            <h2>Approved study materials</h2>

            {materials.length
              ?<div className="resourceList">
                {materials.map(item=>
                  <button
                    className="resource"
                    type="button"
                    key={item.id}
                    onClick={()=>void download(`/api/training/materials/${item.id}/download`,item.originalFilename)}
                  >
                    <span>
                      <b>{item.title}</b>
                      <small>{item.description}</small>
                    </span>
                    <em>Download</em>
                  </button>
                )}
              </div>
              :<p className="muted">No study material has been published yet.</p>
            }
          </article>

          {data.status!=="QUALIFIED"&&
            <form className="card examPanel" onSubmit={submitExam}>
              <span className="eyebrow">Qualification test</span>
              <h2>Enumerator assessment</h2>

              {!questions.length&&<p className="muted">The administrator has not published assessment questions yet.</p>}

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
                        checked={answers[question.id]===value}
                        onChange={()=>setAnswers(previous=>({...previous,[question.id]:value}))}
                      />
                      {" "}{value}. {option}
                    </label>;
                  })}
                </fieldset>
              )}

              {!!questions.length&&<button className="btn primary full" type="submit" disabled={busy==="exam"}>{busy==="exam"?"Submitting...":"Submit assessment"}</button>}
            </form>
          }
        </div>
      </>}

      {data.status==="QUALIFIED"&&
        <article className="panel fieldAccessPanel">
          <div>
            <span className="eyebrow">Qualified field access</span>
            <h2>You are ready for the second platform</h2>
            <p>Use the active access code and the participant-registration link when beginning field registration.</p>
          </div>

          <div className="accessCardGrid">
            <div className="accessTile">
              <small>Active access code</small>
              <strong>{data.activeAccessCode||"Waiting for administrator code"}</strong>
            </div>

            <div className="accessTile wide">
              <small>Participant platform link</small>
              {data.referralLink
                ?<>
                  <input readOnly value={data.referralLink} aria-label="Participant registration link"/>
                  <button className="btn secondary small" type="button" onClick={()=>void navigator.clipboard.writeText(data.referralLink)}>Copy link</button>
                </>
                :<p className="muted">The participant-platform link will appear here when available.</p>
              }
            </div>
          </div>
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

  useEffect(()=>{void load();},[]);

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
      setError("Enter the Payment transaction ID before verification.");
      return;
    }

    setBusy(`payment:${txRef}`);

    try{
      const response=await api<any>(`/api/admin/payments/${encodeURIComponent(txRef)}/verify`,{
        method:"POST",
        body:JSON.stringify({transactionId:Number(raw)})
      });

      if(!response.verified){
        setError(response.message||"The payment provider did not verify this payment.");
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

  return <section className="dashboardShell adminShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration</span>
        <h1>Programme Administration</h1>
        <p>Manage Enumerator records, payments, training materials, assessment questions and field access codes.</p>
      </div>
      <StatusPill value="ADMIN ONLY"/>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}

    <div className="adminTabs" role="tablist" aria-label="Admin sections">
      <button className={activeTab==="overview"?"active":""} type="button" onClick={()=>setActiveTab("overview")}>Overview</button>
      <button className={activeTab==="payments"?"active":""} type="button" onClick={()=>setActiveTab("payments")}>
        Payments {pendingPayments>0&&<span className="tabCount">{pendingPayments}</span>}
      </button>
      <button className={activeTab==="training"?"active":""} type="button" onClick={()=>setActiveTab("training")}>Training and Exam</button>
      <button className={activeTab==="access"?"active":""} type="button" onClick={()=>setActiveTab("access")}>Access Code</button>
      <button className="refreshTab" type="button" onClick={()=>void load()}>Refresh data</button>
    </div>

    {activeTab==="overview"&&<>
      {stats&&
        <div className="featureGrid four">
          <article className="card statCard"><small>Registered Enumerators</small><strong>{stats.enumerators}</strong><p>All created Enumerator accounts.</p></article>
          <article className="card statCard"><small>Qualified</small><strong>{stats.qualifiedEnumerators}</strong><p>Enumerators who passed the assessment.</p></article>
          <article className="card statCard"><small>Verified payment value</small><strong>NGN {Number(stats.totalVerifiedPaymentsNgn||0).toLocaleString()}</strong><p>Total verified value.</p></article>
          <article className="card statCard"><small>Pending payments</small><strong>{pendingPayments}</strong><p>Awaiting Payment provider verification.</p></article>
        </div>
      }

      <article className="card tableWrap">
        <div className="tableHead">
          <div>
            <span className="eyebrow">Enumerator registry</span>
            <h2>Registered Enumerators</h2>
          </div>
          <span className="recordCount">{enumerators.length} record{enumerators.length===1?"":"s"}</span>
        </div>

        {enumerators.length===0
          ?<div className="emptyState"><h3>No Enumerators yet</h3><p>New registrations will appear here automatically.</p></div>
          :<div className="tableScroll">
            <table>
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
                    <td><StatusPill value={item.status}/></td>
                    <td>{item.examScore==null?"-":`${item.examScore}%`}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        }
      </article>
    </>}

    {activeTab==="payments"&&<>
      <div className="featureGrid four">
        <article className="card statCard"><small>All payments</small><strong>{payments.length}</strong><p>Total payment records.</p></article>
        <article className="card statCard"><small>Pending</small><strong>{pendingPayments}</strong><p>Waiting for verification.</p></article>
        <article className="card statCard"><small>Verified</small><strong>{verifiedPayments}</strong><p>Successful verified payments.</p></article>
        <article className="card statCard"><small>Failed</small><strong>{failedPayments}</strong><p>Failed or rejected attempts.</p></article>
      </div>

      <article className="card tableWrap">
        <div className="tableHead">
          <div>
            <span className="eyebrow">Payment operations</span>
            <h2>Verify Enumerator payments</h2>
            <p className="muted">Payment verification is completed before training access is granted.</p>
          </div>
        </div>

        {payments.length===0
          ?<div className="emptyState"><h3>No payment records yet</h3><p>Enumerator checkout attempts will appear here.</p></div>
          :<div className="tableScroll">
            <table>
              <thead>
                <tr>
                  <th>Enumerator</th>
                  <th>Reference</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Provider status</th>
                  <th>Transaction ID</th>
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
                    <td><StatusPill value={payment.status}/></td>
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
                          aria-label={`Payment transaction ID for ${payment.txRef}`}
                        />
                      }
                    </td>
                    <td>
                      {payment.status==="SUCCESSFUL"
                        ?<span className="verifiedText">Verified</span>
                        :<button
                          className="btn primary small"
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
          </div>
        }
      </article>
    </>}

    {activeTab==="training"&&
      <div className="featureGrid two">
        <form className="card formCard" onSubmit={uploadMaterial}>
          <span className="eyebrow">Training library</span>
          <h2>Publish study material</h2>
          <p>Only paid Enumerators can access these materials.</p>

          <label>Title<input name="title" required maxLength={180}/></label>
          <label>Description<input name="description" required maxLength={600}/></label>
          <label>Training file<input name="file" type="file" accept=".pdf,.docx,.pptx,.xlsx,.csv,.txt,.epub" required/></label>

          <button className="btn primary full" type="submit" disabled={busy==="material"}>{busy==="material"?"Uploading...":"Upload material"}</button>
        </form>

        <form className="card formCard" onSubmit={addQuestion}>
          <span className="eyebrow">Qualification exam</span>
          <h2>Add exam question</h2>
          <p>Questions published here are visible only to Enumerators with verified training access.</p>

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

          <button className="btn primary full" type="submit" disabled={busy==="question"}>{busy==="question"?"Adding...":"Add question"}</button>
        </form>
      </div>
    }

    {activeTab==="access"&&
      <div className="featureGrid two">
        <form className="card formCard" onSubmit={createCode}>
          <span className="eyebrow">Field control</span>
          <h2>Create or rotate access code</h2>
          <p>Creating a new code deactivates the previous active code. Qualified Enumerators then use the current code on the second platform.</p>

          <label>Custom code<input name="code" maxLength={32} placeholder="Leave blank to generate automatically"/></label>
          <label>Validity period
            <select name="validityDays" defaultValue="1">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>

          <button className="btn primary full" type="submit" disabled={busy==="code"}>{busy==="code"?"Activating...":"Activate new access code"}</button>
        </form>

        <article className="card infoCard">
          <span className="eyebrow">Field deployment model</span>
          <h2>How this connects to the second frontend</h2>
          <ol>
            <li>Enumerator completes payment and training.</li>
            <li>Enumerator passes the qualification exam.</li>
            <li>Administrator activates the current field access code.</li>
            <li>Qualified Enumerators receive the participant-platform link and code.</li>
            <li>The second frontend is reserved for participant registrations only.</li>
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

  return <section className="authSection singlePanel">
    <div className="authCard soloCard">
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
