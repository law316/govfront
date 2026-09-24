import {FormEvent,useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {api} from "./api";
import {useLiveRefresh} from "./useLiveRefresh";

type Provider={
  id:number;
  name:string;
  summary:string;
  logoUrl?:string|null;
  websiteUrl?:string|null;
  active:boolean;
  offerCount:number;
  createdAt?:string|null;
  updatedAt?:string|null;
};

type Offer={
  id:number;
  providerId:number;
  providerName:string;
  title:string;
  summary:string;
  category:string;
  deliveryFormat:"ONLINE"|"PHYSICAL"|"HYBRID";
  priceNgn?:number|null;
  registrationUrl?:string|null;
  imageUrl?:string|null;
  videoUrl?:string|null;
  status:"COMING_SOON"|"OPEN"|"CLOSED";
  featured:boolean;
  active:boolean;
  sortOrder:number;
};

type ProviderDraft={id?:number;name:string;summary:string;logoUrl:string;websiteUrl:string};
type OfferDraft={
  id?:number;
  providerId:string;
  title:string;
  summary:string;
  category:string;
  deliveryFormat:"ONLINE"|"PHYSICAL"|"HYBRID";
  priceNgn:string;
  registrationUrl:string;
  imageUrl:string;
  videoUrl:string;
  status:"COMING_SOON"|"OPEN"|"CLOSED";
  featured:boolean;
  sortOrder:string;
};

const emptyProvider:ProviderDraft={name:"",summary:"",logoUrl:"",websiteUrl:""};
const emptyOffer:OfferDraft={
  providerId:"",title:"",summary:"",category:"",deliveryFormat:"ONLINE",
  priceNgn:"",registrationUrl:"",imageUrl:"",videoUrl:"",status:"COMING_SOON",
  featured:false,sortOrder:"0"
};

function label(value:string){
  return value.toLowerCase().split("_").map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join(" ");
}

export default function AdminTrainingProviders(){
  const[providers,setProviders]=useState<Provider[]>([]);
  const[offers,setOffers]=useState<Offer[]>([]);
  const[providerDraft,setProviderDraft]=useState<ProviderDraft>({...emptyProvider});
  const[offerDraft,setOfferDraft]=useState<OfferDraft>({...emptyOffer});
  const[tab,setTab]=useState<"providers"|"offers">("providers");
  const[search,setSearch]=useState("");
  const[busy,setBusy]=useState("");
  const[error,setError]=useState("");
  const[message,setMessage]=useState("");

  async function load(){
    setError("");
    try{
      const[p,o]=await Promise.all([
        api<Provider[]>("/api/admin/training-providers"),
        api<Offer[]>("/api/admin/training-providers/offers")
      ]);
      setProviders(p);setOffers(o);
      if(!offerDraft.providerId&&p.length) setOfferDraft(current=>({...current,providerId:String(p[0].id)}));
    }catch(err){setError(err instanceof Error?err.message:"Could not load advanced-training providers.");}
  }

  useEffect(()=>{void load();},[]);
  useLiveRefresh(()=>load(),12000);

  const filteredProviders=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return providers;
    return providers.filter(item=>`${item.name} ${item.summary}`.toLowerCase().includes(q));
  },[providers,search]);

  const filteredOffers=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return offers;
    return offers.filter(item=>`${item.providerName} ${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(q));
  },[offers,search]);

  async function saveProvider(e:FormEvent){
    e.preventDefault();setBusy("provider-save");setError("");setMessage("");
    try{
      const body=JSON.stringify({
        name:providerDraft.name.trim(),summary:providerDraft.summary.trim(),
        logoUrl:providerDraft.logoUrl.trim()||null,websiteUrl:providerDraft.websiteUrl.trim()||null
      });
      if(providerDraft.id){
        await api(`/api/admin/training-providers/${providerDraft.id}`,{method:"PATCH",body});
        setMessage("Training provider updated.");
      }else{
        await api("/api/admin/training-providers",{method:"POST",body});
        setMessage("Training provider created.");
      }
      setProviderDraft({...emptyProvider});await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not save training provider.");}
    finally{setBusy("");}
  }

  async function saveOffer(e:FormEvent){
    e.preventDefault();setBusy("offer-save");setError("");setMessage("");
    try{
      const body=JSON.stringify({
        providerId:Number(offerDraft.providerId),
        title:offerDraft.title.trim(),
        summary:offerDraft.summary.trim(),
        category:offerDraft.category.trim(),
        deliveryFormat:offerDraft.deliveryFormat,
        priceNgn:offerDraft.priceNgn.trim()===""?null:Number(offerDraft.priceNgn),
        registrationUrl:offerDraft.registrationUrl.trim()||null,
        imageUrl:offerDraft.imageUrl.trim()||null,
        videoUrl:offerDraft.videoUrl.trim()||null,
        status:offerDraft.status,
        featured:offerDraft.featured,
        sortOrder:Number(offerDraft.sortOrder||0)
      });
      if(offerDraft.id){
        await api(`/api/admin/training-providers/offers/${offerDraft.id}`,{method:"PATCH",body});
        setMessage("Advanced training offer updated.");
      }else{
        await api("/api/admin/training-providers/offers",{method:"POST",body});
        setMessage("Advanced training offer created.");
      }
      setOfferDraft({...emptyOffer,providerId:providers[0]?String(providers[0].id):""});await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not save advanced training offer.");}
    finally{setBusy("");}
  }

  async function toggleProvider(item:Provider,next:boolean){
    if(!window.confirm(`${next?"Reactivate":"Deactivate"} ${item.name}?`))return;
    setBusy(`provider-toggle:${item.id}`);setError("");setMessage("");
    try{
      await api(
        next?`/api/admin/training-providers/${item.id}/reactivate`:`/api/admin/training-providers/${item.id}`,
        {method:next?"POST":"DELETE"}
      );
      setMessage(next?"Provider reactivated.":"Provider deactivated and hidden from participants.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update provider.");}
    finally{setBusy("");}
  }

  async function deleteProvider(item:Provider){
    const confirm=window.prompt(`Permanently delete ${item.name}? Delete its offers first, then type DELETE.`);
    if(confirm!=="DELETE")return;
    setBusy(`provider-delete:${item.id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/training-providers/${item.id}/permanent?confirm=DELETE`,{method:"DELETE"});
      if(providerDraft.id===item.id)setProviderDraft({...emptyProvider});
      setMessage("Provider permanently deleted.");await load();
    }catch(err){setError(err instanceof Error?err.message:"Permanent provider deletion was blocked.");}
    finally{setBusy("");}
  }

  async function toggleOffer(item:Offer,next:boolean){
    if(!window.confirm(`${next?"Reactivate":"Deactivate"} ${item.title}?`))return;
    setBusy(`offer-toggle:${item.id}`);setError("");setMessage("");
    try{
      await api(
        next?`/api/admin/training-providers/offers/${item.id}/reactivate`:`/api/admin/training-providers/offers/${item.id}`,
        {method:next?"POST":"DELETE"}
      );
      setMessage(next?"Training offer reactivated.":"Training offer deactivated.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update training offer.");}
    finally{setBusy("");}
  }

  async function deleteOffer(item:Offer){
    const confirm=window.prompt(`Permanently delete ${item.title}? Type DELETE.`);
    if(confirm!=="DELETE")return;
    setBusy(`offer-delete:${item.id}`);setError("");setMessage("");
    try{
      await api(`/api/admin/training-providers/offers/${item.id}/permanent?confirm=DELETE`,{method:"DELETE"});
      if(offerDraft.id===item.id)setOfferDraft({...emptyOffer,providerId:providers[0]?String(providers[0].id):""});
      setMessage("Training offer permanently deleted.");await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not permanently delete training offer.");}
    finally{setBusy("");}
  }

  function editProvider(item:Provider){
    setProviderDraft({
      id:item.id,name:item.name,summary:item.summary,
      logoUrl:item.logoUrl||"",websiteUrl:item.websiteUrl||""
    });
    setTab("providers");window.scrollTo({top:0,behavior:"smooth"});
  }

  function editOffer(item:Offer){
    setOfferDraft({
      id:item.id,providerId:String(item.providerId),title:item.title,summary:item.summary,
      category:item.category,deliveryFormat:item.deliveryFormat,
      priceNgn:item.priceNgn==null?"":String(item.priceNgn),
      registrationUrl:item.registrationUrl||"",imageUrl:item.imageUrl||"",
      videoUrl:item.videoUrl||"",status:item.status,featured:item.featured,
      sortOrder:String(item.sortOrder??0)
    });
    setTab("offers");window.scrollTo({top:0,behavior:"smooth"});
  }

  return <section className="dashboardShell adminShell providerAdminShell">
    <div className="dashboardHero">
      <div>
        <span className="eyebrow">Administration / Advanced Training</span>
        <h1>Approved Training Providers</h1>
        <p>Create real provider organisations and the optional advanced training offers participants may access after the core programme.</p>
      </div>
      <Link className="btn outline small" to="/admin">Back to administration</Link>
    </div>

    {error&&<div className="error">{error}</div>}
    {message&&<div className="success">{message}</div>}
    {busy&&<div className="busyNotice"><span className="spinner"/>Saving advanced-training changes...</div>}

    <div className="featureGrid four">
      <article className="card statCard"><small>Providers</small><strong>{providers.length}</strong><p>All configured organisations.</p></article>
      <article className="card statCard"><small>Active providers</small><strong>{providers.filter(x=>x.active).length}</strong><p>Visible when they have active offers.</p></article>
      <article className="card statCard"><small>Training offers</small><strong>{offers.length}</strong><p>All configured advanced programmes.</p></article>
      <article className="card statCard"><small>Open offers</small><strong>{offers.filter(x=>x.active&&x.status==="OPEN").length}</strong><p>Currently open for registration.</p></article>
    </div>

    <div className="adminTabs providerTabs">
      <button className={tab==="providers"?"active":""} type="button" onClick={()=>setTab("providers")}>Providers</button>
      <button className={tab==="offers"?"active":""} type="button" onClick={()=>setTab("offers")}>Training Offers</button>
      <button className="refreshTab" type="button" onClick={()=>void load()}>Refresh</button>
    </div>

    {tab==="providers"&&<>
      <div className="providerBuilderGrid">
        <form className="card formCard providerEditor" onSubmit={saveProvider}>
          <div className="tableHead">
            <div><span className="eyebrow">{providerDraft.id?"Edit provider":"New provider"}</span><h2>{providerDraft.id?providerDraft.name:"Add an approved organisation"}</h2></div>
            {providerDraft.id&&<button className="btn outline small" type="button" onClick={()=>setProviderDraft({...emptyProvider})}>Cancel edit</button>}
          </div>
          <p className="muted">Do not create placeholder companies. Add the actual organisation details when you are ready to publish them.</p>
          <label>Provider / organisation name<input required maxLength={180} value={providerDraft.name} onChange={e=>setProviderDraft({...providerDraft,name:e.target.value})}/></label>
          <label>Provider summary<textarea rows={5} required maxLength={2000} value={providerDraft.summary} onChange={e=>setProviderDraft({...providerDraft,summary:e.target.value})}/></label>
          <label>Logo or brand image URL<input type="url" maxLength={1000} placeholder="https://..." value={providerDraft.logoUrl} onChange={e=>setProviderDraft({...providerDraft,logoUrl:e.target.value})}/></label>
          <label>Website URL<input type="url" maxLength={1000} placeholder="https://..." value={providerDraft.websiteUrl} onChange={e=>setProviderDraft({...providerDraft,websiteUrl:e.target.value})}/></label>
          {providerDraft.logoUrl&&<div className="providerImagePreview"><img src={providerDraft.logoUrl} alt="Provider logo preview"/></div>}
          <button className="btn primary full" type="submit" disabled={busy==="provider-save"}>{busy==="provider-save"?"Saving...":providerDraft.id?"Save provider changes":"Create provider"}</button>
        </form>

        <article className="card providerGuidance">
          <span className="eyebrow">Publishing model</span>
          <h2>Provider and offer are separate records</h2>
          <p>Create the organisation once, then attach one or more advanced training offers to it.</p>
          <div className="providerGuidanceSteps">
            <div><span>1</span><strong>Create the real provider</strong><p>Name, summary, logo and website.</p></div>
            <div><span>2</span><strong>Create its training offer</strong><p>Title, category, fee, format and media.</p></div>
            <div><span>3</span><strong>Control publication</strong><p>Coming Soon, Open or Closed; deactivate any record instantly.</p></div>
          </div>
        </article>
      </div>

      <article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Provider directory</span><h2>Configured organisations</h2></div><label className="providerSearch">Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Provider name..."/></label></div>
        {filteredProviders.length===0?<div className="emptyState"><h3>No providers yet</h3><p>Add your first real training provider above.</p></div>:
        <div className="tableScroll"><table className="providerTable">
          <thead><tr><th>Provider</th><th>Website</th><th>Offers</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filteredProviders.map(item=><tr key={item.id}>
            <td><div className="providerIdentity">{item.logoUrl?<img src={item.logoUrl} alt=""/>:<span>{item.name.slice(0,2).toUpperCase()}</span>}<div><strong>{item.name}</strong><small>{item.summary}</small></div></div></td>
            <td>{item.websiteUrl?<a className="providerExternalLink" href={item.websiteUrl} target="_blank" rel="noreferrer">Open website</a>:"-"}</td>
            <td>{item.offerCount}</td>
            <td><b className={`statusPill status-${item.active?"active":"inactive"}`}>{item.active?"Active":"Inactive"}</b></td>
            <td><div className="actionButtons">
              <button className="btn outline small" type="button" onClick={()=>editProvider(item)}>Edit</button>
              <button className="btn outline small" type="button" onClick={()=>void toggleProvider(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
              <button className="btn danger small" type="button" onClick={()=>void deleteProvider(item)}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
      </article>
    </>}

    {tab==="offers"&&<>
      <div className="providerBuilderGrid">
        <form className="card formCard providerEditor" onSubmit={saveOffer}>
          <div className="tableHead">
            <div><span className="eyebrow">{offerDraft.id?"Edit offer":"New training offer"}</span><h2>{offerDraft.id?offerDraft.title:"Publish advanced training"}</h2></div>
            {offerDraft.id&&<button className="btn outline small" type="button" onClick={()=>setOfferDraft({...emptyOffer,providerId:providers[0]?String(providers[0].id):""})}>Cancel edit</button>}
          </div>

          <label>Provider<select required value={offerDraft.providerId} onChange={e=>setOfferDraft({...offerDraft,providerId:e.target.value})}><option value="">Select provider</option>{providers.map(p=><option key={p.id} value={p.id}>{p.name}{p.active?"":" (inactive)"}</option>)}</select></label>
          <label>Training title<input required maxLength={180} value={offerDraft.title} onChange={e=>setOfferDraft({...offerDraft,title:e.target.value})}/></label>
          <label>Training summary<textarea rows={6} required maxLength={3000} value={offerDraft.summary} onChange={e=>setOfferDraft({...offerDraft,summary:e.target.value})}/></label>
          <div className="providerFormGrid">
            <label>Category<input required maxLength={120} placeholder="e.g. Cloud & Infrastructure" value={offerDraft.category} onChange={e=>setOfferDraft({...offerDraft,category:e.target.value})}/></label>
            <label>Delivery format<select value={offerDraft.deliveryFormat} onChange={e=>setOfferDraft({...offerDraft,deliveryFormat:e.target.value as OfferDraft["deliveryFormat"]})}><option value="ONLINE">Online</option><option value="PHYSICAL">Physical</option><option value="HYBRID">Hybrid</option></select></label>
            <label>Fee (NGN)<input type="number" min="0" step="0.01" placeholder="Leave blank if not set" value={offerDraft.priceNgn} onChange={e=>setOfferDraft({...offerDraft,priceNgn:e.target.value})}/></label>
            <label>Publication status<select value={offerDraft.status} onChange={e=>setOfferDraft({...offerDraft,status:e.target.value as OfferDraft["status"]})}><option value="COMING_SOON">Coming Soon</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
            <label>Sort order<input type="number" min="0" max="9999" value={offerDraft.sortOrder} onChange={e=>setOfferDraft({...offerDraft,sortOrder:e.target.value})}/></label>
            <label className="providerCheck"><input type="checkbox" checked={offerDraft.featured} onChange={e=>setOfferDraft({...offerDraft,featured:e.target.checked})}/><span>Feature this training</span></label>
          </div>
          <label>Registration URL<input type="url" maxLength={1000} placeholder={offerDraft.status==="OPEN"?"Required while status is Open":"https://..."} value={offerDraft.registrationUrl} onChange={e=>setOfferDraft({...offerDraft,registrationUrl:e.target.value})}/></label>
          <label>Training image URL<input type="url" maxLength={1000} placeholder="https://..." value={offerDraft.imageUrl} onChange={e=>setOfferDraft({...offerDraft,imageUrl:e.target.value})}/></label>
          <label>Optional video URL<input type="url" maxLength={1000} placeholder="YouTube, Vimeo or approved training video URL" value={offerDraft.videoUrl} onChange={e=>setOfferDraft({...offerDraft,videoUrl:e.target.value})}/></label>
          {offerDraft.imageUrl&&<div className="providerImagePreview wide"><img src={offerDraft.imageUrl} alt="Training preview"/></div>}
          <button className="btn primary full" type="submit" disabled={busy==="offer-save"||providers.length===0}>{busy==="offer-save"?"Saving...":offerDraft.id?"Save training changes":"Create training offer"}</button>
        </form>

        <article className="card providerGuidance">
          <span className="eyebrow">Participant presentation</span>
          <h2>Everything is Admin-controlled</h2>
          <p>Only active providers with active offers are returned to participants. An Open offer must have a registration link.</p>
          <div className="providerGuidanceSteps">
            <div><span>C</span><strong>Coming Soon</strong><p>Visible as an upcoming opportunity; no registration action.</p></div>
            <div><span>O</span><strong>Open</strong><p>Registration link can be shown to eligible participants.</p></div>
            <div><span>X</span><strong>Closed</strong><p>Remains visible for information but cannot be registered for.</p></div>
          </div>
        </article>
      </div>

      <article className="card tableWrap">
        <div className="tableHead"><div><span className="eyebrow">Advanced training catalogue</span><h2>Configured offers</h2></div><label className="providerSearch">Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Training, category or provider..."/></label></div>
        {filteredOffers.length===0?<div className="emptyState"><h3>No training offers yet</h3><p>Create a provider first, then publish its first advanced-training offer.</p></div>:
        <div className="tableScroll"><table className="providerTable trainingOfferTable">
          <thead><tr><th>Training</th><th>Provider</th><th>Format / Fee</th><th>Publication</th><th>Actions</th></tr></thead>
          <tbody>{filteredOffers.map(item=><tr key={item.id}>
            <td><div className="trainingOfferIdentity">{item.imageUrl&&<img src={item.imageUrl} alt=""/>}<div><strong>{item.title}{item.featured&&<span className="featuredTag">Featured</span>}</strong><small>{item.category}</small><p>{item.summary}</p></div></div></td>
            <td>{item.providerName}</td>
            <td><strong>{label(item.deliveryFormat)}</strong><small>{item.priceNgn==null?"Fee not set":`NGN ${Number(item.priceNgn).toLocaleString()}`}</small></td>
            <td><b className={`statusPill status-${item.status.toLowerCase()}`}>{label(item.status)}</b><small>{item.active?"Active record":"Inactive record"}</small></td>
            <td><div className="actionButtons">
              <button className="btn outline small" type="button" onClick={()=>editOffer(item)}>Edit</button>
              <button className="btn outline small" type="button" onClick={()=>void toggleOffer(item,!item.active)}>{item.active?"Deactivate":"Reactivate"}</button>
              <button className="btn danger small" type="button" onClick={()=>void deleteOffer(item)}>Delete</button>
              {item.videoUrl&&<a className="btn outline small" href={item.videoUrl} target="_blank" rel="noreferrer">Video</a>}
            </div></td>
          </tr>)}</tbody>
        </table></div>}
      </article>
    </>}
  </section>;
}
