import {useRef,useState} from "react";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {parseAssessmentText} from "./assessmentDocumentParser";
import type {ImportedQuestion} from "./assessmentDocumentParser";

pdfjsLib.GlobalWorkerOptions.workerSrc=pdfWorker;

type Props={disabled?:boolean;onImport:(questions:ImportedQuestion[])=>void};

async function pdfText(file:File){
  const data=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data}).promise;
  const pages:string[]=[];

  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    const page=await pdf.getPage(pageNumber);
    const content=await page.getTextContent();
    const rows=new Map<number,Array<{x:number;text:string}>>();

    for(const item of content.items as Array<any>){
      if(typeof item?.str!=="string"||!item.str.trim())continue;
      const x=Number(item.transform?.[4]||0);
      const y=Math.round(Number(item.transform?.[5]||0)*2)/2;
      const row=rows.get(y)||[];
      row.push({x,text:item.str});
      rows.set(y,row);
    }

    pages.push([...rows.entries()]
      .sort((a,b)=>b[0]-a[0])
      .map(([,items])=>items.sort((a,b)=>a.x-b.x).map(item=>item.text).join(" ").trim())
      .filter(Boolean)
      .join("\n"));
  }
  return pages.join("\n");
}

async function documentText(file:File){
  const extension=file.name.split(".").pop()?.toLowerCase();
  if(extension==="pdf")return pdfText(file);
  if(extension==="docx"){
    const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    return result.value||"";
  }
  if(extension==="txt")return file.text();
  throw new Error("Use a PDF, DOCX or TXT question document.");
}

export default function AssessmentDocumentImporter({disabled,onImport}:Props){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const[busy,setBusy]=useState(false);
  const[fileName,setFileName]=useState("");
  const[summary,setSummary]=useState("");
  const[warnings,setWarnings]=useState<string[]>([]);
  const[error,setError]=useState("");

  async function choose(file?:File){
    if(!file||busy||disabled)return;
    setBusy(true);setError("");setWarnings([]);setSummary("");setFileName(file.name);

    try{
      if(file.size>12*1024*1024)throw new Error("The question document is too large. Use a file below 12 MB.");
      const text=await documentText(file);
      if(!text.trim())throw new Error("No readable text was found. If this is a scanned PDF made from pictures, convert it to a text PDF or DOCX first.");

      const result=parseAssessmentText(text);
      if(!result.questions.length)throw new Error(result.warnings[0]||"No questions could be detected in this document.");

      onImport(result.questions);
      const review=result.questions.filter(question=>question.needsReview).length;
      setWarnings(result.warnings);
      setSummary(`${result.questions.length} question${result.questions.length===1?"":"s"} added to the draft${review?` - ${review} need a correct answer selected.`:"."}`);
    }catch(err){
      setError(err instanceof Error?err.message:"The question document could not be read.");
    }finally{
      setBusy(false);
      if(inputRef.current)inputRef.current.value="";
    }
  }

  return <article className="card assessmentImportCard">
    <div className="assessmentImportIntro">
      <div>
        <span className="eyebrow">Fast question import</span>
        <h2>Upload PDF or Microsoft Word questions</h2>
        <p>Upload an existing test instead of typing every question again. Questions become normal editable draft cards before you save the set.</p>
      </div>
      <label className={`btn secondary assessmentImportButton ${disabled||busy?"disabled":""}`}>
        {busy?"Reading document...":"Upload question document"}
        <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={disabled||busy} onChange={event=>void choose(event.target.files?.[0])}/>
      </label>
    </div>

    <div className="assessmentImportGuide">
      <strong>Best document format</strong>
      <code>{`1. Question text\nA. First answer\nB. Second answer\nC. Third answer\nD. Fourth answer\nAnswer: B`}</code>
      <span>An Answer Key such as <b>1-B, 2-C, 3-A</b> is also recognised. If the correct answer is not written in the document, the question is still imported and you simply click the correct answer on its draft card.</span>
    </div>

    {fileName&&<div className="assessmentImportFile"><strong>{fileName}</strong>{busy&&<span>Extracting questions...</span>}</div>}
    {summary&&<div className="success">{summary}</div>}
    {warnings.map((warning,index)=><div className="assessmentImportWarning" key={index}>{warning}</div>)}
    {error&&<div className="error">{error}</div>}
    <small className="assessmentImportFootnote">Text-based PDF, DOCX and TXT are supported. Scanned image-only PDFs need text conversion before import.</small>
  </article>;
}
