export type ImportedQuestionType="MULTIPLE_CHOICE"|"YES_NO"|"WRITTEN";

export type ImportedQuestion={
  type:ImportedQuestionType;
  questionText:string;
  options:string[];
  correctIndex:number|null;
  sourceNumber:number;
  needsReview:boolean;
};

export type ImportResult={
  questions:ImportedQuestion[];
  warnings:string[];
};

type WorkingQuestion={
  number:number;
  text:string;
  options:string[];
  inlineAnswer?:string;
  markedCorrectIndex?:number;
};

const QUESTION_START=[
  /^\s*(\d{1,3})[\.\)\-:]\s+(.+)$/,
  /^\s*Q(?:UESTION)?\s*(\d{1,3})[\.\)\-:]?\s+(.+)$/i
];
const OPTION_START=/^\s*([A-H])[\.\)\-:]\s+(.+)$/i;
const INLINE_ANSWER=/^\s*(?:CORRECT\s+ANSWER|ANSWER|ANS)\s*[:\-]\s*(.+?)\s*$/i;
const ANSWER_KEY_HEADER=/^\s*(?:ANSWER\s+KEY|ANSWERS|CORRECT\s+ANSWERS)\s*:?\s*$/i;

function clean(value:string){
  return value.replace(/\u00a0/g," ").replace(/\r/g,"").replace(/[ \t]+/g," ").trim();
}
function comparable(value:string){
  return clean(value).toLowerCase().replace(/[.,;:!?\'"()[\]{}]/g,"").replace(/\s+/g," ");
}
function getQuestionStart(line:string){
  for(const pattern of QUESTION_START){
    const match=line.match(pattern);
    if(match)return {number:Number(match[1]),text:clean(match[2])};
  }
  return null;
}
function isCorrectMarker(value:string){
  return /\s*(?:\[\s*CORRECT\s*\]|\(\s*CORRECT\s*\)|\*\s*CORRECT\s*\*|CORRECT\s*$|\u2713\s*$)\s*/i.test(value);
}
function stripCorrectMarker(value:string){
  return clean(value.replace(/\s*(?:\[\s*CORRECT\s*\]|\(\s*CORRECT\s*\)|\*\s*CORRECT\s*\*|CORRECT\s*$|\u2713\s*$)\s*/ig,""));
}
function parseAnswerPairs(value:string,key:Map<number,string>){
  const patterns=[
    /(?:^|[,;\s]+)(\d{1,3})\s*[\.\)\-:=]\s*([A-H]|YES|NO|TRUE|FALSE)(?=$|[,;\s]+)/gi,
    /(?:^|[,;\s]+)(\d{1,3})\s+([A-H]|YES|NO|TRUE|FALSE)(?=$|[,;\s]+)/gi
  ];
  for(const pattern of patterns){
    let match:RegExpExecArray|null;
    while((match=pattern.exec(value))!==null)key.set(Number(match[1]),match[2].toUpperCase());
  }
}
function parseAnswerKey(lines:string[]){
  const key=new Map<number,string>();
  let inKey=false;
  for(const raw of lines){
    const line=clean(raw);
    if(!line)continue;
    if(ANSWER_KEY_HEADER.test(line)){inKey=true;continue;}
    const header=line.match(/^\s*(?:ANSWER\s+KEY|ANSWERS|CORRECT\s+ANSWERS)\s*:\s*(.+)$/i);
    if(header){inKey=true;parseAnswerPairs(header[1],key);continue;}
    if(inKey)parseAnswerPairs(line,key);
  }
  return key;
}
function answerToIndex(answer:string|undefined,options:string[]){
  if(!answer)return null;
  const value=clean(answer).replace(/^[\(\[]|[\)\]]$/g,"").trim();
  if(/^[A-H]$/i.test(value)){
    const index=value.toUpperCase().charCodeAt(0)-65;
    return index>=0&&index<options.length?index:null;
  }
  const cmp=comparable(value);
  const exact=options.findIndex(option=>comparable(option)===cmp);
  if(exact>=0)return exact;
  if(cmp==="yes"||cmp==="true")return options.findIndex(option=>["yes","true"].includes(comparable(option)));
  if(cmp==="no"||cmp==="false")return options.findIndex(option=>["no","false"].includes(comparable(option)));
  return null;
}
function classify(options:string[]):ImportedQuestionType{
  if(options.length===0)return "WRITTEN";
  const values=options.map(comparable);
  if(values.length===2&&values.includes("yes")&&values.includes("no"))return "YES_NO";
  return "MULTIPLE_CHOICE";
}

export function parseAssessmentText(text:string):ImportResult{
  const lines=text.split(/\n/).map(clean);
  const answerKey=parseAnswerKey(lines);
  const warnings:string[]=[];
  const working:WorkingQuestion[]=[];
  let current:WorkingQuestion|null=null;
  let currentOption=-1;
  let inAnswerKey=false;

  const push=()=>{
    if(current&&current.text.trim())working.push(current);
    current=null;currentOption=-1;
  };

  for(const line of lines){
    if(!line)continue;
    if(ANSWER_KEY_HEADER.test(line)||/^\s*(?:ANSWER\s+KEY|ANSWERS|CORRECT\s+ANSWERS)\s*:/i.test(line)){
      push();inAnswerKey=true;continue;
    }
    if(inAnswerKey)continue;

    const q=getQuestionStart(line);
    if(q){push();current={number:q.number,text:q.text,options:[]};continue;}
    if(!current)continue;

    const answer=line.match(INLINE_ANSWER);
    if(answer){current.inlineAnswer=clean(answer[1]);continue;}

    const option=line.match(OPTION_START);
    if(option){
      const value=clean(option[2]);
      if(isCorrectMarker(value))current.markedCorrectIndex=current.options.length;
      current.options.push(stripCorrectMarker(value));
      currentOption=current.options.length-1;
      continue;
    }

    if(currentOption>=0&&current.options.length)current.options[currentOption]=clean(`${current.options[currentOption]} ${line}`);
    else current.text=clean(`${current.text} ${line}`);
  }
  push();

  if(working.length===0){
    return {questions:[],warnings:["No numbered questions were detected. Use numbering such as 1. Question text, followed by A. Option, B. Option, and Answer: B or an Answer Key."]};
  }

  const questions=working.slice(0,100).map(item=>{
    let options=item.options.filter(Boolean).slice(0,8);
    const originalOptions=[...options];
    const type=classify(options);

    let detected=item.markedCorrectIndex!=null?item.markedCorrectIndex:answerToIndex(item.inlineAnswer||answerKey.get(item.number),options);

    if(type==="YES_NO"){
      const yes=originalOptions.findIndex(option=>comparable(option)==="yes");
      const no=originalOptions.findIndex(option=>comparable(option)==="no");
      if(detected===yes)detected=0;
      else if(detected===no)detected=1;
      else detected=null;
      options=["Yes","No"];
    }

    const correctIndex=type==="WRITTEN"?null:detected;
    return {
      type,
      questionText:item.text,
      options,
      correctIndex,
      sourceNumber:item.number,
      needsReview:type!=="WRITTEN"&&correctIndex==null
    } satisfies ImportedQuestion;
  });

  if(working.length>100)warnings.push(`The document contained ${working.length} questions. Only the first 100 were imported because one question set can contain at most 100 questions.`);
  const incomplete=questions.filter(question=>question.needsReview).length;
  if(incomplete)warnings.push(`${incomplete} question${incomplete===1?" needs":"s need"} the correct answer selected before saving.`);
  return {questions,warnings};
}
