import { useState, useEffect, useCallback } from "react";
import store from "./storage.js";

/* ═══════════════════════════════════════
   Constants & Config
   ═══════════════════════════════════════ */
const STEPS = [
  { id: "info", title: "일반 현황", icon: "📋", desc: "동아리 기본 정보" },
  { id: "problem", title: "창업 동기 및 문제 발견", icon: "🔍", desc: "배점 25점" },
  { id: "customer", title: "고객 이해 및 시장 탐색", icon: "👥", desc: "배점 20점" },
  { id: "solution", title: "솔루션 및 아이템 구체화", icon: "💡", desc: "배점 25점" },
  { id: "business", title: "비즈니스 모델 및 성장 전략", icon: "📈", desc: "배점 15점" },
  { id: "team", title: "팀 역량 및 학습 계획", icon: "🤝", desc: "배점 15점" },
];

const EVAL_CRITERIA = [
  { id: "problem", name: "창업 동기 및 문제 발견", max: 25, min: 15, subs: ["창업 동기의 진정성", "문제 인식의 명확성", "사회적/시장적 맥락"] },
  { id: "customer", name: "고객 이해 및 시장 탐색", max: 20, min: 12, subs: ["고객 정의", "Pain Point 분석", "시장/경쟁 분석"] },
  { id: "solution", name: "솔루션 및 아이템 구체화", max: 25, min: 15, subs: ["해결방안 혁신성", "핵심기능 구체성", "개발계획 실현가능성"] },
  { id: "business", name: "비즈니스 모델 및 성장 전략", max: 15, min: 9, subs: ["수익모델 타당성", "마케팅 전략", "자금운용 적정성"] },
  { id: "team", name: "팀 역량 및 학습 계획", max: 15, min: 9, subs: ["팀 구성", "역할 분담", "역량 보완 계획"] },
];

const STAGE_CONFIG = {
  1: {
    name: "Start-up", desc: "아이디어 개발 단계", max: 400000,
    items: [
      { id: "meeting", name: "멘토링 회의비", maxAmt: 200000, hint: "회의 당 학생 1인 2만원 이내, 지도교수 3만원 이내" },
      { id: "expert", name: "전문가 활용비", maxAmt: 200000, hint: "외부 전문가 자문비 (실무경력 3년 이상, 1인 20만원, 1회)" },
    ],
    note: "1단계는 운영지원비(회의비, 전문가 활용비)만 집행 가능합니다."
  },
  2: {
    name: "Scale-up", desc: "시제품 제작 단계", max: 2500000,
    items: [
      { id: "meeting", name: "멘토링 회의비", maxAmt: 200000, hint: "회의 당 학생 1인 2만원 이내, 지도교수 3만원 이내" },
      { id: "expert", name: "전문가 활용비", maxAmt: 200000, hint: "외부 전문가 자문비 (실무경력 3년 이상, 1인 20만원, 1회)" },
      { id: "material", name: "시제품 제작비 (재료비)", maxAmt: null, hint: "소모성 재료 구입만 가능, 사무용품/기자재 불가" },
      { id: "outsource", name: "시제품 제작비 (외주용역비)", maxAmt: null, hint: "외부 전문 업체에 위탁하는 용역비" },
    ],
    note: "2단계는 1단계 항목 + 시제품 제작비(재료비, 외주용역비)를 집행할 수 있습니다."
  },
  3: {
    name: "Star", desc: "창업 및 마케팅 단계", max: 4000000,
    items: [
      { id: "meeting", name: "멘토링 회의비", maxAmt: 200000, hint: "회의 당 학생 1인 2만원 이내, 지도교수 3만원 이내" },
      { id: "expert", name: "전문가 활용비", maxAmt: 200000, hint: "외부 전문가 자문비 (실무경력 3년 이상, 1인 20만원, 1회)" },
      { id: "material", name: "시제품 제작비 (재료비)", maxAmt: null, hint: "소모성 재료 구입만 가능" },
      { id: "outsource", name: "시제품 제작비 (외주용역비)", maxAmt: null, hint: "외부 전문 업체에 위탁하는 용역비" },
      { id: "promo", name: "홍보비", maxAmt: 1000000, hint: "홈페이지, 홍보 영상, 온라인 광고 등 (활동기간 이내 집행)" },
    ],
    note: "3단계는 1·2단계 항목 + 홍보비 + 창업준비터 지원.\n※ 팀원의 최소 50% 이상이 사업자등록 창업자여야 인정됩니다."
  }
};

const genId = () => Math.random().toString(36).substring(2, 10);
const fmt = (n) => n?.toLocaleString("ko-KR") || "0";
const now = () => new Date().toISOString();

const emptyApp = () => ({
  id: genId(), status: "draft", currentStep: 0, createdAt: now(), updatedAt: now(),
  info: { clubName: "", clubIntro: "", itemName: "", itemDesc: "", output: "", stage: "1", repName: "", repDept: "", repId: "", profName: "", profDept: "", isFusion: false },
  problem: { motivation: "", background: "", context: "", contextResult: "", marketContext: "" },
  customer: { target: "", painPoint: "", painResult: "", market: "", marketResult: "" },
  solution: { features: "", featureResult: "", devPlan: "", devResult: "" },
  business: { model: "", modelResult: "", sustainability: "", schedule: [{ content: "", period: "", detail: "" }], budgetItems: {}, bizRegFiles: [] },
  team: { leader: { name: "", career: "", skills: "", education: "" }, members: [{ name: "", career: "", skills: "", education: "" }], roles: "", roleResult: "" },
});

/* ═══════════════════════════════════════
   Prompt Generation
   ═══════════════════════════════════════ */
function generatePrompt(step, data) {
  const info = data.info || {};
  const prompts = {
    problem_motivation: `나는 ${info.repDept || "(본인의 학과)"}를 전공하는 대학생입니다.\n평소 ${data.problem?.background || "(일상생활/학교/아르바이트 등 경험한 맥락)"}에서\n${data.problem?.motivation || "(구체적으로 불편했던 점이나 문제 상황)"}을 경험했습니다.\n이 문제를 해결하고 싶은 이유는 ${data.problem?.context || "(개인적 동기, 가치관, 비전)"}이기 때문입니다.\n\n위 내용을 바탕으로 창업 아이템의 배경과 필요성을 300~500자로 작성해줘.\n문제의 심각성, 현재 해결되지 않는 이유, 해결했을 때의 기대효과를 포함해줘.`,
    problem_context: `내가 해결하려는 문제는 ${data.problem?.motivation || "(문제 요약)"}입니다.\n이 문제와 관련된 산업/분야는 ${info.itemDesc || "(관련 산업 또는 키워드)"}입니다.\n타겟 대상은 ${data.customer?.target || "(어떤 사람들이 이 문제를 겪는지)"}입니다.\n\n이 문제의 사회적 배경과 시장 현황을 300~500자로 분석해줘.\n최신 통계나 트렌드를 포함하고, 이 문제가 앞으로 더 중요해질 이유를 설명해줘.`,
    customer_pain: `우리가 만들려는 제품/서비스는 ${info.itemName || "(아이템명)"} - ${info.itemDesc || "(아이템 설명)"}입니다.\n이 아이템을 가장 필요로 할 사람은 ${data.customer?.target || "(예상 고객층)"}입니다.\n이 고객들이 현재 겪고 있는 불편함은 ${data.customer?.painPoint || "(구체적 불편 사항)"}입니다.\n\n위 내용을 바탕으로 다음을 300~500자로 정리해줘.\n1) 핵심 고객 페르소나\n2) 고객의 핵심 Pain Point 3가지\n3) 기존 대안의 한계점`,
    customer_market: `우리 아이템 분야는 ${info.itemDesc || "(산업/분야 키워드)"}입니다.\n타겟 시장은 ${data.customer?.market || "(국내/해외, 어떤 시장)"}입니다.\n\n위 분야의 시장 규모, 성장률, 주요 경쟁사를 조사하여 300~400자로 정리해줘.\n경쟁사와의 비교표도 만들어줘.`,
    solution_features: `우리가 만들 제품/서비스는 ${info.itemName || "(아이템명)"}입니다.\n형태는 ${info.output || "(모바일 앱/웹서비스 등)"}입니다.\n핵심 기능:\n${data.solution?.features || "- 기능1:\n- 기능2:\n- 기능3:"}\n\n위 내용을 바탕으로 다음을 400~600자로 정리해줘.\n1) 제품/서비스 개요 및 사용 시나리오\n2) 핵심 기능 3가지 상세 설명\n3) 경쟁 제품 대비 차별화 포인트`,
    solution_dev: `우리 팀의 개발 역량은 ${data.solution?.devPlan || "(기술 스택)"}입니다.\n활동 기간은 2026년 5월 ~ 2027년 1월(약 9개월)입니다.\n최종 목표 산출물은 ${info.output || "(산출물)"}입니다.\n\n월별 개발 로드맵을 표 형태로 만들어줘. 단계별 산출물과 완료 기준 포함.`,
    business_model: `우리 제품/서비스는 ${info.itemName || "(아이템명)"} - ${info.itemDesc || "(설명)"}입니다.\n수익 창출 방법: ${data.business?.model || "(유료 판매/구독/광고 등)"}\n\n다음을 300~500자로 작성해줘.\n1) 비즈니스 모델 캔버스 요약\n2) 초기 6개월 마케팅 전략\n3) 목표 사용자 수/매출 목표`,
    team_roles: `우리 팀은 총 ${(data.team?.members?.length || 0) + 1}명입니다.\n- ${data.team?.leader?.name || "대표"}: ${data.team?.leader?.skills || "(역량)"}\n${(data.team?.members || []).map((m, i) => `- ${m.name || `팀원${i+1}`}: ${m.skills || "(역량)"}`).join("\n")}\n부족한 역량: ${data.team?.roles || "(부족한 역량)"}\n\n팀원별 역할 분담표와 역량 보완 학습 계획을 정리해줘.`,
  };
  return prompts[step] || "";
}

/* ═══════════════════════════════════════
   PDF Generation
   ═══════════════════════════════════════ */
function generatePdfContent(data) {
  const info = data.info || {};
  const stg = STAGE_CONFIG[parseInt(info.stage) || 1];
  const budgetItems = data.business?.budgetItems || {};
  const totalBudget = Object.values(budgetItems).reduce((s, b) => s + (parseInt(b.amount) || 0), 0);
  const members = data.team?.members || [];
  const leader = data.team?.leader || {};
  const schedules = data.business?.schedule || [];

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page{size:A4;margin:20mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:11pt;color:#222;line-height:1.6}
.cover{text-align:center;padding-top:120px;page-break-after:always}
.cover h1{font-size:28pt;color:#1B4F8A;margin:10px 0}.cover h2{font-size:22pt;color:#1B4F8A}
.cover .sub{font-size:12pt;color:#888;margin:20px 0 60px}
.cover table{margin:0 auto;border-collapse:collapse;width:60%}
.cover td{padding:8px 16px;border:1px solid #ccc;font-size:10pt}
.cover td:first-child{background:#E8F0FA;font-weight:bold;color:#1B4F8A;width:120px;text-align:center}
h2.section{font-size:14pt;color:#1B4F8A;border-bottom:2px solid #1B4F8A;padding-bottom:4px;margin:24px 0 12px;page-break-after:avoid}
h3.sub{font-size:12pt;color:#333;margin:16px 0 8px}
.content{white-space:pre-wrap;font-size:10.5pt;margin-bottom:12px;line-height:1.7}
table.data{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:10pt}
table.data th{background:#1B4F8A;color:white;padding:6px 8px;text-align:center}
table.data td{border:1px solid #ccc;padding:6px 8px}
.footer{text-align:center;font-size:9pt;color:#888;margin-top:30px}
.badge{display:inline-block;background:#E8F0FA;color:#1B4F8A;padding:2px 10px;border-radius:4px;font-size:9pt;font-weight:bold}
.no-print{margin:30px 0;text-align:center}
@media print{.no-print{display:none}}
</style></head><body>
<div class="cover">
<p style="font-size:14pt;color:#888;">2026학년도</p>
<h1>YUHAN 창업동아리</h1><h2>사업계획서</h2>
<p class="sub">유한대학교 창업지원센터</p>
<table>
<tr><td>동아리명</td><td>${info.clubName||"-"}</td></tr>
<tr><td>아이템명</td><td>${info.itemName||"-"}</td></tr>
<tr><td>대표학생</td><td>${info.repName||"-"} (${info.repDept||"-"}, ${info.repId||"-"})</td></tr>
<tr><td>지도교수</td><td>${info.profName||"-"} (${info.profDept||"-"})</td></tr>
<tr><td>신청단계</td><td>${info.stage}단계 (${stg.name})</td></tr>
<tr><td>산출물</td><td>${info.output||"-"}</td></tr>
</table></div>

<h2 class="section">1. 창업 동기 및 문제 발견 (25점)</h2>
<h3 class="sub">1-1. 내가 발견한 문제와 창업 동기</h3>
<div class="content">${data.problem?.contextResult||"(미입력)"}</div>
<h3 class="sub">1-2. 문제의 사회적·시장적 맥락</h3>
<div class="content">${data.problem?.marketContext||"(미입력)"}</div>

<h2 class="section">2. 고객 이해 및 시장 탐색 (20점)</h2>
<h3 class="sub">2-1. 목표 고객 및 Pain Point</h3>
<div class="content">${data.customer?.painResult||"(미입력)"}</div>
<h3 class="sub">2-2. 시장 규모 및 경쟁 현황</h3>
<div class="content">${data.customer?.marketResult||"(미입력)"}</div>

<h2 class="section">3. 솔루션 및 아이템 구체화 (25점)</h2>
<h3 class="sub">3-1. 핵심 기능 및 차별성</h3>
<div class="content">${data.solution?.featureResult||"(미입력)"}</div>
<h3 class="sub">3-2. 개발/구체화 계획</h3>
<div class="content">${data.solution?.devResult||"(미입력)"}</div>

<h2 class="section">4. 비즈니스 모델 및 성장 전략 (15점)</h2>
<h3 class="sub">4-1. 수익 모델 및 마케팅 전략</h3>
<div class="content">${data.business?.modelResult||"(미입력)"}</div>
<h3 class="sub">4-2. 사업 지속 계획</h3>
<div class="content">${data.business?.sustainability||"(미입력)"}</div>
<h3 class="sub">4-3. 사업추진 일정</h3>
<table class="data"><tr><th>순번</th><th>추진 내용</th><th>추진 기간</th><th>세부 내용</th></tr>
${schedules.map((s,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${s.content||""}</td><td>${s.period||""}</td><td>${s.detail||""}</td></tr>`).join("")}</table>
<h3 class="sub">4-4. 활동 지원금 집행 계획 <span class="badge">${info.stage}단계 ${stg.name} / 최대 ${fmt(stg.max)}원</span></h3>
<table class="data"><tr><th>항목</th><th>산출근거</th><th style="width:100px;text-align:right">금액(원)</th></tr>
${stg.items.map(item=>{const b=budgetItems[item.id]||{};return`<tr><td>${item.name}${item.maxAmt?` (최대 ${fmt(item.maxAmt)}원)`:""}</td><td>${b.basis||""}</td><td style="text-align:right">${fmt(parseInt(b.amount)||0)}</td></tr>`;}).join("")}
<tr style="background:#f5f5f5;font-weight:bold"><td colspan="2" style="text-align:center">합계</td><td style="text-align:right">${fmt(totalBudget)}</td></tr></table>

<h2 class="section">5. 팀 역량 및 학습 계획 (15점)</h2>
<h3 class="sub">5-1. 대표학생</h3>
<table class="data"><tr><th>성명</th><th>관련 경력</th><th>자격증/보유기술</th><th>창업교육 이수</th></tr>
<tr><td>${leader.name||"-"}</td><td>${leader.career||"-"}</td><td>${leader.skills||"-"}</td><td>${leader.education||"-"}</td></tr></table>
<h3 class="sub">5-2. 팀원</h3>
<table class="data"><tr><th>성명</th><th>관련 경력</th><th>자격증/보유기술</th><th>창업교육 이수</th></tr>
${members.map(m=>`<tr><td>${m.name||"-"}</td><td>${m.career||"-"}</td><td>${m.skills||"-"}</td><td>${m.education||"-"}</td></tr>`).join("")}</table>
<h3 class="sub">5-3. 역할 분담 및 학습 계획</h3>
<div class="content">${data.team?.roleResult||"(미입력)"}</div>
<div class="footer"><p>유한대학교 지역공유 취·창업지원처 창업지원센터</p><p>신청 ID: ${data.id} | 출력일: ${new Date().toLocaleDateString("ko-KR")}</p></div>
<div class="no-print"><button onclick="window.print()" style="padding:12px 40px;background:#1B4F8A;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:bold">🖨️ PDF로 인쇄/저장</button></div>
</body></html>`;
}

function openPdf(data) {
  const html = generatePdfContent(data);
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

/* ═══════════════════════════════════════
   UI Components
   ═══════════════════════════════════════ */
function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return (<div className="fixed top-4 right-4 z-50" style={{animation:"slideIn .3s ease"}}><div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium"><span>✓</span>{message}</div></div>);
}

function CopyBtn({ text, label = "프롬프트 복사" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  return (<button onClick={copy} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${copied?"bg-emerald-500 text-white":"bg-amber-400 hover:bg-amber-500 text-amber-900"}`}>{copied?"✓ 복사됨!":`📋 ${label}`}</button>);
}

function PromptBox({ title, prompt }) {
  return (<div className="border-2 border-amber-300 rounded-xl overflow-hidden my-4"><div className="bg-amber-100 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2"><span className="font-bold text-amber-800 text-sm">🤖 {title}</span><CopyBtn text={prompt}/></div><div className="bg-amber-50 px-4 py-3"><pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{prompt}</pre></div></div>);
}

function Field({ label, required, hint, children }) {
  return (<div className="mb-5"><label className="block text-sm font-bold text-gray-700 mb-1.5">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>{hint&&<p className="text-xs text-blue-500 mb-1.5">※ {hint}</p>}{children}</div>);
}
function Input({ value, onChange, placeholder, ...props }) {
  return <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm transition" {...props}/>;
}
function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm transition resize-y leading-relaxed"/>;
}
function Select({ value, onChange, options }) {
  return (<select value={value||""} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none text-sm bg-white">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>);
}
function ProgressBar({ current, total }) {
  return (<div className="mb-6"><div className="flex justify-between text-xs text-gray-500 mb-1.5"><span>진행률</span><span>{current+1}/{total}</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{width:`${((current+1)/total)*100}%`}}/></div></div>);
}

/* ═══════════════════════════════════════
   Step Forms (각 단계 입력 폼)
   ═══════════════════════════════════════ */

// Step 1: 일반 현황
function StepInfo({ data, update }) {
  const d = data.info||{}; const u=(k,v)=>update("info",{...d,[k]:v});
  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700">동아리 기본 정보를 입력합니다. 이 정보는 AI 프롬프트 생성에도 활용됩니다.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
      <Field label="동아리명" required><Input value={d.clubName} onChange={v=>u("clubName",v)} placeholder="동아리 이름"/></Field>
      <Field label="창업 아이템명" required hint="10글자 이내"><Input value={d.itemName} onChange={v=>u("itemName",v)} placeholder="예: 프레시키퍼" maxLength={10}/></Field>
    </div>
    <Field label="동아리 소개" required hint="3줄 이내"><Textarea value={d.clubIntro} onChange={v=>u("clubIntro",v)} placeholder="동아리의 설립 배경, 목표, 주요 활동 등" rows={3}/></Field>
    <Field label="아이템 소개" required><Textarea value={d.itemDesc} onChange={v=>u("itemDesc",v)} placeholder="예: AI 이미지 인식 기술이 적용된 식재료 관리 기능의 모바일 앱 서비스" rows={2}/></Field>
    <Field label="목표 산출물" required><Input value={d.output} onChange={v=>u("output",v)} placeholder="예: 안드로이드 앱 1개, 웹사이트 1개"/></Field>
    <Field label="신청 단계" required>
      <Select value={d.stage} onChange={v=>u("stage",v)} options={[{value:"1",label:"1단계 Start-up (아이디어 개발, 최대 40만원)"},{value:"2",label:"2단계 Scale-up (시제품 제작, 최대 250만원)"},{value:"3",label:"3단계 Star (창업 및 마케팅, 최대 400만원)"}]}/>
      {d.stage==="3"&&<p className="text-xs text-red-500 mt-1 font-medium">⚠ 3단계는 팀원의 최소 50% 이상이 사업자등록 창업자여야 인정됩니다.</p>}
    </Field>
    <Field label="융합 창업동아리 여부" hint="2개 이상 학과 학생으로 구성 시 (지원금 최대 2배)"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={d.isFusion||false} onChange={e=>u("isFusion",e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/><span className="text-sm">예, 융합 창업동아리입니다</span></label></Field>
    <div className="border-t pt-5 mt-5"><h3 className="font-bold text-gray-800 mb-4">대표학생 정보</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-x-6"><Field label="이름" required><Input value={d.repName} onChange={v=>u("repName",v)} placeholder="홍길동"/></Field><Field label="학과" required><Input value={d.repDept} onChange={v=>u("repDept",v)} placeholder="컴퓨터공학과"/></Field><Field label="학번" required><Input value={d.repId} onChange={v=>u("repId",v)} placeholder="20260001"/></Field></div></div>
    <div className="border-t pt-5 mt-5"><h3 className="font-bold text-gray-800 mb-4">지도교수 정보</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"><Field label="이름" required><Input value={d.profName} onChange={v=>u("profName",v)} placeholder="김교수"/></Field><Field label="학과" required><Input value={d.profDept} onChange={v=>u("profDept",v)} placeholder="컴퓨터공학과"/></Field></div></div>
  </div>);
}

// Step 2: 창업 동기 및 문제 발견
function StepProblem({ data, update }) {
  const d=data.problem||{}; const u=(k,v)=>update("problem",{...d,[k]:v});
  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700 font-semibold">💡 창업에 관심을 갖게 된 동기와 발견한 문제를 서술합니다.</p><p className="text-xs text-blue-500 mt-1">입력란을 채우면 AI 프롬프트가 자동 생성됩니다.</p></div>
    <h3 className="font-bold text-gray-800 mb-3 text-lg">1-1. 내가 발견한 문제와 창업 동기</h3>
    <Field label="경험한 맥락" required hint="문제를 발견한 상황"><Input value={d.background} onChange={v=>u("background",v)} placeholder="예: 학교 근처에서 자취하면서"/></Field>
    <Field label="발견한 문제/불편함" required><Textarea value={d.motivation} onChange={v=>u("motivation",v)} placeholder="예: 혼자 사는 학생들이 식재료 유통기한을 놓쳐 자주 버리는 것" rows={3}/></Field>
    <Field label="해결하고 싶은 이유" required><Input value={d.context} onChange={v=>u("context",v)} placeholder="예: 음식물 낭비를 줄이고 자취생들의 식비 절약에 기여하고 싶음"/></Field>
    <PromptBox title="AI 프롬프트 - 위 내용이 자동 반영됩니다" prompt={generatePrompt("problem_motivation",data)}/>
    <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.contextResult} onChange={v=>u("contextResult",v)} placeholder="AI가 생성한 내용을 여기에 붙여넣고 수정..." rows={8}/></Field>
    <div className="border-t pt-6 mt-6"><h3 className="font-bold text-gray-800 mb-3 text-lg">1-2. 문제의 사회적·시장적 맥락</h3>
      <PromptBox title="AI 프롬프트 - 시장 맥락 분석" prompt={generatePrompt("problem_context",data)}/>
      <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.marketContext} onChange={v=>u("marketContext",v)} placeholder="AI가 생성한 내용..." rows={8}/></Field></div>
  </div>);
}

// Step 3: 고객 이해 및 시장 탐색
function StepCustomer({ data, update }) {
  const d=data.customer||{}; const u=(k,v)=>update("customer",{...d,[k]:v});
  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700 font-semibold">👥 목표 고객 정의, 시장 규모, 경쟁 현황을 분석합니다.</p></div>
    <h3 className="font-bold text-gray-800 mb-3 text-lg">2-1. 목표 고객 및 Pain Point</h3>
    <Field label="예상 고객층" required><Input value={d.target} onChange={v=>u("target",v)} placeholder="예: 20대 1인가구 자취 대학생"/></Field>
    <Field label="고객이 겪는 불편함" required><Textarea value={d.painPoint} onChange={v=>u("painPoint",v)} placeholder="예: 냉장고 식재료 파악 어려움, 적정 구매량 판단 불가" rows={3}/></Field>
    <PromptBox title="AI 프롬프트 - 고객 분석" prompt={generatePrompt("customer_pain",data)}/>
    <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.painResult} onChange={v=>u("painResult",v)} placeholder="고객 페르소나, Pain Point, 기존 대안의 한계..." rows={8}/></Field>
    <div className="border-t pt-6 mt-6"><h3 className="font-bold text-gray-800 mb-3 text-lg">2-2. 시장 규모 및 경쟁 현황</h3>
      <Field label="타겟 시장" required><Input value={d.market} onChange={v=>u("market",v)} placeholder="예: 국내 푸드테크/식품관리 앱 시장"/></Field>
      <PromptBox title="AI 프롬프트 - 시장 분석" prompt={generatePrompt("customer_market",data)}/>
      <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.marketResult} onChange={v=>u("marketResult",v)} placeholder="시장 규모, 성장률, 경쟁사 비교..." rows={8}/></Field></div>
  </div>);
}

// Step 4: 솔루션 및 아이템 구체화
function StepSolution({ data, update }) {
  const d=data.solution||{}; const u=(k,v)=>update("solution",{...d,[k]:v});
  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700 font-semibold">💡 제품/서비스의 핵심 기능과 개발 계획을 구체화합니다.</p></div>
    <h3 className="font-bold text-gray-800 mb-3 text-lg">3-1. 핵심 기능 및 차별성</h3>
    <Field label="핵심 기능" required><Textarea value={d.features} onChange={v=>u("features",v)} placeholder={"예:\n- AI 이미지 인식으로 식재료 자동 등록\n- 유통기한 임박 시 알림\n- 보유 식재료 기반 레시피 추천"} rows={4}/></Field>
    <PromptBox title="AI 프롬프트 - 솔루션 구체화" prompt={generatePrompt("solution_features",data)}/>
    <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.featureResult} onChange={v=>u("featureResult",v)} placeholder="제품 개요, 사용 시나리오, 핵심 기능, 차별화 포인트..." rows={8}/></Field>
    <div className="border-t pt-6 mt-6"><h3 className="font-bold text-gray-800 mb-3 text-lg">3-2. 개발/구체화 계획</h3>
      <Field label="개발 역량 및 기술 스택" required><Textarea value={d.devPlan} onChange={v=>u("devPlan",v)} placeholder="예: Python 중급, Flutter 초급, Firebase 사용 가능" rows={2}/></Field>
      <PromptBox title="AI 프롬프트 - 개발 로드맵" prompt={generatePrompt("solution_dev",data)}/>
      <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.devResult} onChange={v=>u("devResult",v)} placeholder="월별 개발 로드맵..." rows={8}/></Field></div>
  </div>);
}

// Step 5: 비즈니스 모델 및 성장 전략
function StepBusiness({ data, update }) {
  const d=data.business||{}; const u=(k,v)=>update("business",{...d,[k]:v});
  const stage=parseInt(data.info?.stage||"1"); const stg=STAGE_CONFIG[stage];
  const isFusion=data.info?.isFusion; const maxBudget=isFusion?stg.max*2:stg.max;
  const budgetItems=d.budgetItems||{};
  const totalBudget=Object.values(budgetItems).reduce((s,b)=>s+(parseInt(b.amount)||0),0);
  const schedules=d.schedule||[{content:"",period:"",detail:""}];
  const updateBI=(itemId,field,value)=>{const c=budgetItems[itemId]||{basis:"",amount:""};u("budgetItems",{...budgetItems,[itemId]:{...c,[field]:value}});};
  const updateSch=(i,k,v)=>{const n=[...schedules];n[i]={...n[i],[k]:v};u("schedule",n);};
  const bizRegFiles=d.bizRegFiles||[];
  const handleFileUpload=(e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{u("bizRegFiles",[...bizRegFiles,{name:file.name,size:file.size,data:ev.target.result,uploadedAt:now()}]);};reader.readAsDataURL(file);};

  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700 font-semibold">📈 수익 모델, 마케팅 전략, 일정, 자금 계획을 수립합니다.</p>
      <div className="flex flex-wrap gap-2 mt-2"><span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">{stage}단계 {stg.name}</span><span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">최대 {fmt(maxBudget)}원{isFusion?" (융합 2배)":""}</span></div></div>
    <h3 className="font-bold text-gray-800 mb-3 text-lg">4-1. 수익 모델 및 마케팅 전략</h3>
    <Field label="예상 수익 모델" required><Input value={d.model} onChange={v=>u("model",v)} placeholder="예: 기본 무료 + 프리미엄 구독(월 2,900원)"/></Field>
    <PromptBox title="AI 프롬프트 - 비즈니스 모델" prompt={generatePrompt("business_model",data)}/>
    <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.modelResult} onChange={v=>u("modelResult",v)} placeholder="비즈니스 모델, 마케팅 전략..." rows={8}/></Field>
    <div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-3 text-lg">4-2. 사업 지속 계획</h3>
      <Field label="활동 종료 후 지속 계획" required><Textarea value={d.sustainability} onChange={v=>u("sustainability",v)} placeholder="사업자 등록, 경진대회 출전 등..." rows={4}/></Field></div>
    <div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-3 text-lg">4-3. 사업추진 일정</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-700 text-white"><th className="px-3 py-2 text-left w-8">#</th><th className="px-3 py-2 text-left">추진 내용</th><th className="px-3 py-2 text-left" style={{width:'140px'}}>추진 기간</th><th className="px-3 py-2 text-left">세부 내용</th><th className="px-3 py-2 w-10"></th></tr></thead>
        <tbody>{schedules.map((s,i)=>(<tr key={i} className="border-b border-gray-200"><td className="px-3 py-1.5 text-gray-400">{i+1}</td><td className="px-1 py-1.5"><input value={s.content} onChange={e=>updateSch(i,"content",e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="시제품 설계"/></td><td className="px-1 py-1.5"><input value={s.period} onChange={e=>updateSch(i,"period",e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="2026.05~06"/></td><td className="px-1 py-1.5"><input value={s.detail} onChange={e=>updateSch(i,"detail",e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="세부내용"/></td><td className="px-1 py-1.5">{schedules.length>1&&<button onClick={()=>u("schedule",schedules.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-lg">×</button>}</td></tr>))}</tbody></table></div>
      <button onClick={()=>u("schedule",[...schedules,{content:"",period:"",detail:""}])} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">+ 일정 추가</button></div>
    <div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-1 text-lg">4-4. 활동 지원금 집행 계획</h3>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-3"><p className="text-sm text-amber-800 font-semibold mb-1">📌 {stage}단계 ({stg.name}) 지원 항목 안내</p><p className="text-xs text-amber-700 whitespace-pre-wrap">{stg.note}</p>{isFusion&&<p className="text-xs text-emerald-700 mt-1 font-bold">✦ 융합 창업동아리: 항목별 최대 2배 지원</p>}</div>
      <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-700 text-white"><th className="px-3 py-2 text-left" style={{width:'200px'}}>지원 항목</th><th className="px-3 py-2 text-left">산출근거</th><th className="px-3 py-2 text-right" style={{width:'130px'}}>금액(원)</th><th className="px-3 py-2 text-center" style={{width:'110px'}}>한도</th></tr></thead>
        <tbody>{stg.items.map(item=>{const b=budgetItems[item.id]||{};const amt=parseInt(b.amount)||0;const eMax=item.maxAmt?(isFusion?item.maxAmt*2:item.maxAmt):null;const over=eMax&&amt>eMax;return(<tr key={item.id} className="border-b border-gray-200"><td className="px-3 py-2"><div className="font-semibold text-gray-800 text-sm">{item.name}</div><div className="text-xs text-gray-400">{item.hint}</div></td><td className="px-1 py-2"><input value={b.basis||""} onChange={e=>updateBI(item.id,"basis",e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="예: 센서 3개×15,000원"/></td><td className="px-1 py-2"><input type="number" value={b.amount||""} onChange={e=>updateBI(item.id,"amount",e.target.value)} className={`w-full px-2 py-1.5 border rounded text-sm text-right ${over?"border-red-400 bg-red-50":"border-gray-200"}`} placeholder="0"/></td><td className="px-3 py-2 text-center text-xs text-gray-500">{eMax?`최대 ${fmt(eMax)}`:"예산 내"}</td></tr>);})}</tbody>
        <tfoot><tr className="bg-gray-50 font-bold"><td className="px-3 py-2 text-right" colSpan={2}>합계</td><td className={`px-3 py-2 text-right ${totalBudget>maxBudget?"text-red-600":"text-gray-800"}`}>{fmt(totalBudget)}원</td><td className="px-3 py-2 text-center text-xs">{fmt(maxBudget)}</td></tr></tfoot></table></div>
      {totalBudget>maxBudget&&<p className="text-red-500 text-xs mt-1 font-semibold">⚠ 최대 지원금({fmt(maxBudget)}원)을 초과!</p>}</div>
    {stage===3&&(<div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-1 text-lg">📎 사업자등록증 사본 제출</h3>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-3"><p className="text-sm text-red-700 font-semibold">⚠ 3단계(Star) 필수 제출</p><p className="text-xs text-red-600 mt-1">팀원 최소 50% 이상 사업자등록 창업자 필수</p></div>
      {bizRegFiles.map((f,i)=>(<div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 mb-2"><div className="flex items-center gap-2"><span className="text-lg">📄</span><div><p className="text-sm font-medium text-gray-700">{f.name}</p><p className="text-xs text-gray-400">{(f.size/1024).toFixed(1)}KB</p></div></div><button onClick={()=>u("bizRegFiles",bizRegFiles.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-sm">삭제</button></div>))}
      <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition mt-1"><span className="text-sm text-gray-600">📂 파일 첨부 (이미지/PDF)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden"/></label></div>)}
  </div>);
}

// Step 6: 팀 역량 및 학습 계획
function StepTeam({ data, update }) {
  const d=data.team||{};const leader=d.leader||{};const members=d.members||[{name:"",career:"",skills:"",education:""}];
  const u=(k,v)=>update("team",{...d,[k]:v});const uL=(k,v)=>u("leader",{...leader,[k]:v});
  const uM=(i,k,v)=>{const n=[...members];n[i]={...n[i],[k]:v};u("members",n);};
  return (<div>
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"><p className="text-sm text-blue-700 font-semibold">🤝 팀원 구성, 역량, 역할 분담 및 학습 계획을 기재합니다.</p></div>
    <h3 className="font-bold text-gray-800 mb-3 text-lg">5-1. 대표학생 역량</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6"><Field label="성명"><Input value={leader.name} onChange={v=>uL("name",v)} placeholder="홍길동"/></Field><Field label="관련 경력"><Input value={leader.career} onChange={v=>uL("career",v)} placeholder="SW 개발회사 현장실습"/></Field><Field label="자격증/보유기술"><Input value={leader.skills} onChange={v=>uL("skills",v)} placeholder="컴퓨터공학 전공, Python"/></Field><Field label="창업교육 이수"><Input value={leader.education} onChange={v=>uL("education",v)} placeholder="부천시 창업자과정 이수"/></Field></div>
    <div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-3 text-lg">5-2. 팀원 역량</h3>
      {members.map((m,i)=>(<div key={i} className="bg-gray-50 rounded-xl p-4 mb-3"><div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-gray-500">팀원 {i+1}</span>{members.length>1&&<button onClick={()=>u("members",members.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 text-sm">삭제</button>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2"><div><label className="text-xs text-gray-500">성명</label><input value={m.name} onChange={e=>uM(i,"name",e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm mt-0.5"/></div><div><label className="text-xs text-gray-500">관련 경력</label><input value={m.career} onChange={e=>uM(i,"career",e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm mt-0.5"/></div><div><label className="text-xs text-gray-500">자격증/보유기술</label><input value={m.skills} onChange={e=>uM(i,"skills",e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm mt-0.5"/></div><div><label className="text-xs text-gray-500">창업교육 이수</label><input value={m.education} onChange={e=>uM(i,"education",e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-sm mt-0.5"/></div></div></div>))}
      <button onClick={()=>u("members",[...members,{name:"",career:"",skills:"",education:""}])} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ 팀원 추가</button></div>
    <div className="border-t pt-6 mt-4"><h3 className="font-bold text-gray-800 mb-3 text-lg">5-3. 역할 분담 및 학습 계획</h3>
      <Field label="부족한 역량"><Input value={d.roles} onChange={v=>u("roles",v)} placeholder="예: UI 디자인, 백엔드 개발"/></Field>
      <PromptBox title="AI 프롬프트 - 역할 분담 및 학습 계획" prompt={generatePrompt("team_roles",data)}/>
      <Field label="▼ AI 결과를 붙여넣고 수정하세요" required><Textarea value={d.roleResult} onChange={v=>u("roleResult",v)} placeholder="역할 분담표, 역량 보완 학습 계획..." rows={8}/></Field></div>
  </div>);
}

/* ═══════════════════════════════════════
   Applicant View
   ═══════════════════════════════════════ */
function ApplicantView({ onBack }) {
  const [page,setPage]=useState("landing");const [appId,setAppId]=useState(null);const [data,setData]=useState(null);
  const [step,setStep]=useState(0);const [toast,setToast]=useState("");const [saving,setSaving]=useState(false);

  const loadApp=useCallback(async(id)=>{const d=await store.get(`app:${id}`);if(d){setData(d);setStep(d.currentStep||0);setAppId(id);setPage("form");}else setToast("해당 신청서를 찾을 수 없습니다.");},[]);
  const createApp=async()=>{const d=emptyApp();await store.set(`app:${d.id}`,d);const idx=(await store.get("apps-index"))||[];await store.set("apps-index",[...idx,{id:d.id,createdAt:d.createdAt}]);setData(d);setAppId(d.id);setStep(0);setPage("form");setToast("새 신청서가 생성되었습니다!");};
  const saveData=async(nd)=>{setSaving(true);const updated={...nd,updatedAt:now(),currentStep:step};setData(updated);await store.set(`app:${appId}`,updated);setSaving(false);};
  const updateSection=(section,value)=>saveData({...data,[section]:value});
  const goStep=async(s)=>{await saveData({...data,currentStep:s});setStep(s);window.scrollTo(0,0);};
  const submitApp=async()=>{if(!window.confirm("최종 제출하시겠습니까?"))return;const updated={...data,status:"submitted",submittedAt:now(),updatedAt:now()};await store.set(`app:${appId}`,updated);const idx=(await store.get("apps-index"))||[];await store.set("apps-index",idx.map(x=>x.id===appId?{...x,status:"submitted",clubName:data.info?.clubName}:x));setData(updated);setPage("submitted");};

  if(page==="landing") return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4"><div className="max-w-lg w-full"><button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← 메인으로</button><div className="text-center mb-8"><div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg"><span className="text-2xl">📝</span></div><h1 className="text-2xl font-extrabold text-gray-900">사업계획서 작성</h1></div><div className="bg-white rounded-2xl shadow-xl p-6 space-y-4"><button onClick={createApp} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition shadow-lg shadow-blue-200 active:scale-[0.98]">📝 새로운 사업계획서 작성</button><div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">또는</span></div></div><div><label className="block text-sm font-medium text-gray-600 mb-1.5">기존 신청서 이어서 작성</label><div className="flex gap-2"><input id="existId" placeholder="신청서 ID" className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"/><button onClick={()=>{const v=document.getElementById("existId").value;if(v)loadApp(v);}} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-semibold">불러오기</button></div></div></div></div>{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</div>);

  if(page==="submitted") return (<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4"><div className="max-w-md w-full text-center"><div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-full mb-6 shadow-lg"><span className="text-4xl text-white">✓</span></div><h1 className="text-2xl font-extrabold text-gray-900 mb-2">제출 완료!</h1><div className="bg-white rounded-2xl shadow-lg p-5 mb-6 text-left"><div className="flex justify-between text-sm py-2 border-b"><span className="text-gray-500">동아리명</span><span className="font-semibold">{data?.info?.clubName}</span></div><div className="flex justify-between text-sm py-2 border-b"><span className="text-gray-500">신청 ID</span><span className="font-mono text-blue-600 font-bold">{appId}</span></div><div className="flex justify-between text-sm py-2"><span className="text-gray-500">제출 시간</span><span className="font-semibold">{new Date(data?.submittedAt).toLocaleString("ko-KR")}</span></div></div><button onClick={()=>openPdf(data)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm mb-3">🖨️ PDF로 다운로드</button><p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">⚠ 신청 ID를 반드시 메모해주세요.</p></div></div>);

  const StepComponent=[StepInfo,StepProblem,StepCustomer,StepSolution,StepBusiness,StepTeam][step];
  const isLast=step===STEPS.length-1;

  return (<div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm"><div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">🚀</span><span className="font-bold text-gray-800 text-sm hidden sm:inline">2026 YUHAN 창업동아리</span></div><div className="flex items-center gap-3"><button onClick={()=>openPdf(data)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium">🖨️ PDF</button><span className={`text-xs px-2 py-0.5 rounded-full ${saving?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{saving?"저장 중...":"✓ 자동저장"}</span><span className="text-xs text-gray-400 font-mono hidden sm:inline">ID: {appId}</span></div></div></div>
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex overflow-x-auto gap-1 mb-6 pb-2">{STEPS.map((s,i)=>(<button key={s.id} onClick={()=>goStep(i)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${i===step?"bg-blue-600 text-white shadow-md":i<step?"bg-blue-100 text-blue-700 hover:bg-blue-200":"bg-gray-100 text-gray-400 hover:bg-gray-200"}`}><span>{s.icon}</span><span className="hidden sm:inline">{s.title}</span><span className="sm:hidden">{i+1}</span></button>))}</div>
      <ProgressBar current={step} total={STEPS.length}/>
      <div className="mb-6"><h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2"><span className="text-2xl">{STEPS[step].icon}</span>{STEPS[step].title}</h2><p className="text-sm text-gray-500 mt-1">{STEPS[step].desc}</p></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7 mb-6">{data&&<StepComponent data={data} update={updateSection}/>}</div>
      <div className="flex justify-between items-center mb-12">
        <button onClick={()=>goStep(Math.max(0,step-1))} disabled={step===0} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${step===0?"opacity-30 cursor-not-allowed bg-gray-100":"bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm"}`}>← 이전</button>
        {isLast?<button onClick={submitApp} disabled={data?.status==="submitted"} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-200 disabled:opacity-50">{data?.status==="submitted"?"제출 완료":"🎉 최종 제출"}</button>:<button onClick={()=>goStep(Math.min(STEPS.length-1,step+1))} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-200">다음 →</button>}
      </div>
    </div>{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</div>);
}

/* ═══════════════════════════════════════
   Admin Dashboard
   ═══════════════════════════════════════ */
function AdminView({ onBack }) {
  const [apps,setApps]=useState([]);const [loading,setLoading]=useState(true);const [selected,setSelected]=useState(null);const [filter,setFilter]=useState("all");const [toast,setToast]=useState("");

  const load=useCallback(async()=>{setLoading(true);const idx=(await store.get("apps-index"))||[];const details=[];for(const item of idx){const d=await store.get(`app:${item.id}`);if(d)details.push(d);}details.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));setApps(details);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  const filtered=apps.filter(a=>filter==="all"||a.status===filter);
  const counts={all:apps.length,submitted:apps.filter(a=>a.status==="submitted").length,draft:apps.filter(a=>a.status==="draft").length};

  // 전체 데이터 JSON 백업
  const exportAllData=async()=>{const data=await store.exportAll();const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`yuhan_startup_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);setToast("JSON 백업 파일이 다운로드됩니다.");};

  if(selected){const a=selected;const stg=STAGE_CONFIG[parseInt(a.info?.stage||"1")];const budgetItems=a.business?.budgetItems||{};const totalBudget=Object.values(budgetItems).reduce((s,b)=>s+(parseInt(b.amount)||0),0);
    return (<div className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4"><button onClick={()=>setSelected(null)} className="text-sm text-blue-600 font-medium">← 목록으로</button><button onClick={()=>openPdf(a)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">🖨️ PDF 출력</button></div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6"><div className="flex justify-between items-start mb-4"><div><h2 className="text-xl font-extrabold text-gray-900">{a.info?.clubName||"(미입력)"}</h2><p className="text-gray-500 text-sm">{a.info?.itemName} — {a.info?.itemDesc}</p></div><span className={`px-3 py-1 rounded-full text-xs font-bold ${a.status==="submitted"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{a.status==="submitted"?"접수완료":"작성중"}</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm"><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400 text-xs block">대표학생</span><span className="font-semibold">{a.info?.repName}</span></div><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400 text-xs block">지도교수</span><span className="font-semibold">{a.info?.profName}</span></div><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400 text-xs block">신청단계</span><span className="font-semibold">{a.info?.stage}단계 ({stg?.name})</span></div><div className="bg-gray-50 rounded-lg p-3"><span className="text-gray-400 text-xs block">신청예산</span><span className="font-semibold">{fmt(totalBudget)}원</span></div></div>
        {parseInt(a.info?.stage)===3&&<div className="mt-3 text-xs"><span className="font-bold">사업자등록증:</span> <span className={a.business?.bizRegFiles?.length?"text-emerald-600 font-bold":"text-red-500"}>{a.business?.bizRegFiles?.length?`${a.business.bizRegFiles.length}건`:"미첨부 ⚠"}</span></div>}</div>
      {[{title:"1. 창업 동기",content:[a.problem?.contextResult,a.problem?.marketContext]},{title:"2. 고객/시장",content:[a.customer?.painResult,a.customer?.marketResult]},{title:"3. 솔루션",content:[a.solution?.featureResult,a.solution?.devResult]},{title:"4. 비즈니스",content:[a.business?.modelResult,a.business?.sustainability]},{title:"5. 팀 역량",content:[a.team?.roleResult]}].map((sec,i)=>(<div key={i} className="bg-white rounded-2xl shadow-sm border p-6 mb-4"><h3 className="font-bold text-gray-800 mb-3">{sec.title}</h3>{sec.content.map((c,j)=>c?<p key={j} className="text-sm text-gray-600 whitespace-pre-wrap mb-3 leading-relaxed">{c}</p>:null)}{sec.content.every(c=>!c)&&<p className="text-sm text-gray-300 italic">미입력</p>}</div>))}
    </div></div>);}

  return (<div className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="max-w-5xl mx-auto">
    <div className="flex items-center justify-between mb-6"><div><button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← 메인으로</button><h1 className="text-2xl font-extrabold text-gray-900">📊 관리자 대시보드</h1></div><div className="flex gap-2"><button onClick={exportAllData} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">💾 전체 데이터 백업</button><button onClick={load} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">🔄 새로고침</button></div></div>
    <div className="grid grid-cols-3 gap-4 mb-6">{[{label:"전체",count:counts.all,bg:"bg-blue-50",tc:"text-blue-600"},{label:"접수완료",count:counts.submitted,bg:"bg-emerald-50",tc:"text-emerald-600"},{label:"작성중",count:counts.draft,bg:"bg-amber-50",tc:"text-amber-600"}].map(s=>(<div key={s.label} className={`${s.bg} rounded-xl border p-4 text-center`}><div className={`text-3xl font-extrabold ${s.tc}`}>{s.count}</div><div className="text-xs text-gray-500 mt-1">{s.label}</div></div>))}</div>
    <div className="flex gap-2 mb-4">{[{v:"all",l:"전체"},{v:"submitted",l:"접수완료"},{v:"draft",l:"작성중"}].map(f=>(<button key={f.v} onClick={()=>setFilter(f.v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter===f.v?"bg-blue-600 text-white":"bg-white border text-gray-600 hover:bg-gray-50"}`}>{f.l}</button>))}</div>
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">{loading?<div className="p-12 text-center text-gray-400">불러오는 중...</div>:filtered.length===0?<div className="p-12 text-center text-gray-400">신청서가 없습니다.</div>:(<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 text-gray-500 text-xs"><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">동아리명</th><th className="px-4 py-3 text-left">아이템명</th><th className="px-4 py-3 text-left">대표학생</th><th className="px-4 py-3 text-center">단계</th><th className="px-4 py-3 text-center">상태</th><th className="px-4 py-3 text-center">PDF</th><th className="px-4 py-3 text-center">상세</th></tr></thead>
      <tbody>{filtered.map((a,i)=>(<tr key={a.id} className="border-b border-gray-100 hover:bg-blue-50/30"><td className="px-4 py-3 text-gray-400">{i+1}</td><td className="px-4 py-3 font-semibold">{a.info?.clubName||"-"}</td><td className="px-4 py-3 text-gray-600">{a.info?.itemName||"-"}</td><td className="px-4 py-3 text-gray-600">{a.info?.repName||"-"}</td><td className="px-4 py-3 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{a.info?.stage}단계</span></td><td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.status==="submitted"?"bg-emerald-100 text-emerald-700":"bg-amber-100 text-amber-700"}`}>{a.status==="submitted"?"접수완료":"작성중"}</span></td><td className="px-4 py-3 text-center"><button onClick={()=>openPdf(a)} className="text-blue-600 text-xs font-bold">PDF</button></td><td className="px-4 py-3 text-center"><button onClick={()=>setSelected(a)} className="text-blue-600 text-xs font-bold">보기</button></td></tr>))}</tbody></table></div>)}</div>
  </div>{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</div>);
}

/* ═══════════════════════════════════════
   Evaluator View
   ═══════════════════════════════════════ */
function EvaluatorView({ onBack }) {
  const [apps,setApps]=useState([]);const [loading,setLoading]=useState(true);const [selected,setSelected]=useState(null);
  const [scores,setScores]=useState({});const [comments,setComments]=useState({});const [evalName,setEvalName]=useState("");
  const [toast,setToast]=useState("");const [savedEvals,setSavedEvals]=useState([]);

  const load=useCallback(async()=>{setLoading(true);const idx=(await store.get("apps-index"))||[];const details=[];for(const item of idx){const d=await store.get(`app:${item.id}`);if(d&&d.status==="submitted")details.push(d);}setApps(details);setSavedEvals((await store.get("evaluations-index"))||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const totalScore=Object.values(scores).reduce((s,v)=>s+(parseInt(v)||0),0);
  const isValid=evalName&&EVAL_CRITERIA.every(c=>scores[c.id]!==undefined&&scores[c.id]!=="");
  const getAppEvals=(appId)=>savedEvals.filter(e=>e.appId===appId);
  const saveEval=async()=>{if(!isValid)return;const evalData={evaluator:evalName,appId:selected.id,clubName:selected.info?.clubName,scores,comments,total:totalScore,createdAt:now()};await store.set(`eval:${selected.id}:${genId()}`,evalData);const idx=(await store.get("evaluations-index"))||[];await store.set("evaluations-index",[...idx,evalData]);setToast("평가 저장 완료!");setSelected(null);setScores({});setComments({});load();};

  if(selected){const a=selected;const contents={problem:[a.problem?.contextResult,a.problem?.marketContext],customer:[a.customer?.painResult,a.customer?.marketResult],solution:[a.solution?.featureResult,a.solution?.devResult],business:[a.business?.modelResult,a.business?.sustainability],team:[a.team?.roleResult]};
    return (<div className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="max-w-4xl mx-auto">
      <button onClick={()=>{setSelected(null);setScores({});setComments({});}} className="text-sm text-blue-600 font-medium mb-4">← 목록으로</button>
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6"><h2 className="text-xl font-extrabold text-gray-900 mb-1">{a.info?.clubName}</h2><p className="text-gray-500 text-sm mb-4">{a.info?.itemName}</p><Field label="평가위원 성명" required><Input value={evalName} onChange={setEvalName} placeholder="이름"/></Field></div>
      {EVAL_CRITERIA.map(c=>(<div key={c.id} className="bg-white rounded-2xl shadow-sm border p-6 mb-4"><div className="flex justify-between items-start mb-3"><div><h3 className="font-bold text-gray-800">{c.name}</h3><p className="text-xs text-gray-400">{c.max}점 / 최소 {c.min}점</p></div><div className="flex items-center gap-2"><input type="number" min={0} max={c.max} value={scores[c.id]||""} onChange={e=>setScores({...scores,[c.id]:e.target.value})} className={`w-20 px-3 py-2 border rounded-lg text-center font-bold text-lg ${(parseInt(scores[c.id])||0)<c.min&&scores[c.id]?"border-red-400 text-red-600":"border-gray-300"}`} placeholder="점수"/><span className="text-gray-400 text-sm">/{c.max}</span></div></div><div className="bg-gray-50 rounded-lg p-3 mb-3 max-h-40 overflow-y-auto">{(contents[c.id]||[]).map((t,i)=>t?<p key={i} className="text-xs text-gray-500 whitespace-pre-wrap mb-2">{t}</p>:null)}</div><div className="flex flex-wrap gap-1 mb-2">{c.subs.map(s=><span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{s}</span>)}</div><textarea value={comments[c.id]||""} onChange={e=>setComments({...comments,[c.id]:e.target.value})} placeholder="평가 코멘트 (선택)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" rows={2}/></div>))}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6"><div className="flex justify-between items-center"><h3 className="font-bold">총점</h3><span className={`text-3xl font-extrabold ${totalScore>=60?"text-blue-600":"text-red-500"}`}>{totalScore}<span className="text-lg text-gray-400">/100</span></span></div><button onClick={saveEval} disabled={!isValid} className={`mt-4 w-full py-3 rounded-xl font-bold text-sm transition ${isValid?"bg-blue-600 hover:bg-blue-700 text-white shadow-lg":"bg-gray-200 text-gray-400 cursor-not-allowed"}`}>평가 저장</button></div>
    </div>{toast&&<Toast message={toast} onClose={()=>setToast("")}/>}</div>);}

  return (<div className="min-h-screen bg-gray-50 p-4 sm:p-8"><div className="max-w-5xl mx-auto">
    <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← 메인으로</button><h1 className="text-2xl font-extrabold text-gray-900 mb-1">⭐ 평가위원</h1><p className="text-sm text-gray-500 mb-6">접수 완료된 사업계획서를 평가합니다.</p>
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">{loading?<div className="p-12 text-center text-gray-400">불러오는 중...</div>:apps.length===0?<div className="p-12 text-center text-gray-400">접수 완료 신청서 없음</div>:(<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 text-gray-500 text-xs"><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">동아리명</th><th className="px-4 py-3 text-left">아이템명</th><th className="px-4 py-3 text-center">단계</th><th className="px-4 py-3 text-center">평가현황</th><th className="px-4 py-3 text-center">평균</th><th className="px-4 py-3 text-center">평가</th></tr></thead>
      <tbody>{apps.map((a,i)=>{const evals=getAppEvals(a.id);const avg=evals.length?Math.round(evals.reduce((s,e)=>s+(e.total||0),0)/evals.length):"-";return(<tr key={a.id} className="border-b border-gray-100 hover:bg-blue-50/30"><td className="px-4 py-3 text-gray-400">{i+1}</td><td className="px-4 py-3 font-semibold">{a.info?.clubName||"-"}</td><td className="px-4 py-3 text-gray-600">{a.info?.itemName||"-"}</td><td className="px-4 py-3 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{a.info?.stage}단계</span></td><td className="px-4 py-3 text-center text-xs">{evals.length}건</td><td className="px-4 py-3 text-center font-bold">{avg!=="-"?`${avg}점`:"-"}</td><td className="px-4 py-3 text-center"><button onClick={()=>setSelected(a)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">평가하기</button></td></tr>);})}</tbody></table></div>)}</div>
  </div></div>);
}

/* ═══════════════════════════════════════
   Main App
   ═══════════════════════════════════════ */
export default function App() {
  const [role,setRole]=useState(null);
  if(role==="applicant") return <ApplicantView onBack={()=>setRole(null)}/>;
  if(role==="admin") return <AdminView onBack={()=>setRole(null)}/>;
  if(role==="evaluator") return <EvaluatorView onBack={()=>setRole(null)}/>;

  return (<div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"/><div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl"/></div>
    <div className="relative z-10 max-w-2xl w-full text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-6 border border-white/20"><span className="text-4xl">🚀</span></div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">2026 YUHAN 창업동아리</h1>
      <p className="text-blue-200 mb-2 text-lg">사업계획서 온라인 접수 시스템</p>
      <p className="text-blue-300/60 text-sm mb-10">유한대학교 지역공유 취·창업지원처 창업지원센터</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
        {[{role:"applicant",icon:"📝",title:"신청자",desc:"사업계획서 작성 및 접수",color:"from-blue-500 to-blue-600"},{role:"admin",icon:"📊",title:"관리자",desc:"접수 현황 조회 및 관리",color:"from-slate-600 to-slate-700"},{role:"evaluator",icon:"⭐",title:"평가위원",desc:"사업계획서 심사 및 평가",color:"from-emerald-500 to-emerald-600"}].map(r=>(<button key={r.role} onClick={()=>setRole(r.role)} className={`bg-gradient-to-br ${r.color} p-6 rounded-2xl text-white text-left hover:scale-[1.03] active:scale-[0.98] transition-all shadow-xl group`}><span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{r.icon}</span><span className="font-bold text-lg block">{r.title}</span><span className="text-white/70 text-xs block mt-1">{r.desc}</span></button>))}
      </div>
    </div>
  </div>);
}
