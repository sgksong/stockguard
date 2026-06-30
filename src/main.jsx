
import React,{useEffect,useMemo,useRef,useState}from"react";
import{createRoot}from"react-dom/client";
import"./style.css";

const KEY="stockguard_pwa_v11_fix";
const defaultData={
  loan:80730000,
  autoRefresh:false,
  collateralMode:false,
  trades:[],
  stocks:[
    {name:"SK하이닉스",code:"000660",qty:50,avg:1985200,price:2650000,changeRate:0,volume:0,last:"-",collateral:true,spark:[250,253,249,258,262,260,265],dividendYield:0.012},
    {name:"현대차",code:"005380",qty:47,avg:621596,price:495000,changeRate:0,volume:0,last:"-",collateral:true,spark:[506,502,501,499,498,497,495],dividendYield:0.045},
    {name:"삼성전자",code:"005930",qty:110,avg:198002,price:334000,changeRate:0,volume:0,last:"-",collateral:true,spark:[320,322,324,329,331,333,334],dividendYield:0.018},
    {name:"SKC",code:"011790",qty:76,avg:126539,price:103100,changeRate:0,volume:0,last:"-",collateral:true,spark:[100,101,99,102,103,104,103],dividendYield:0},
    {name:"TIGER 200",code:"102110",qty:200,avg:89700,price:138670,changeRate:0,volume:0,last:"-",collateral:true,spark:[136,137,136,138,137,138,139],dividendYield:0.022}
  ]
};
function loadData(){try{const s=localStorage.getItem(KEY);if(s)return {...defaultData,...JSON.parse(s)}}catch(e){}return defaultData}
const fmt=n=>`${Math.round(Number(n)||0).toLocaleString("ko-KR")}원`;
const num=n=>(Number(n)||0).toLocaleString("ko-KR");
const pct=n=>`${((Number(n)||0)*100).toFixed(1)}%`;
const now=()=>new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function App(){
  const[tab,setTab]=useState("home");
  const[data,setData]=useState(loadData);
  const[save,setSave]=useState("자동저장");
  const[status,setStatus]=useState("대기");
  const[activeIdx,setActiveIdx]=useState(null);
  const[detail,setDetail]=useState(null);
  const running=useRef(false);

  useEffect(()=>{if("serviceWorker"in navigator)navigator.serviceWorker.register("/service-worker.js").catch(()=>{})},[]);
  useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(data));setSave("저장됨");const t=setTimeout(()=>setSave("자동저장"),700);return()=>clearTimeout(t)},[data]);

  const totals=useMemo(()=>{
    let tv=0,tc=0,cv=0;
    data.stocks.forEach(s=>{tv+=s.qty*s.price;tc+=s.qty*s.avg;if(s.collateral)cv+=s.qty*s.price});
    const pf=tv-tc,rr=tc?pf/tc:0,ratio=data.loan?cv/data.loan:0,need=data.loan*1.4;
    return{tv,tc,cv,pf,rr,ratio,need,buf:cv-need};
  },[data]);

  const updateStock=(i,patch)=>setData(v=>{const stocks=[...v.stocks];stocks[i]={...stocks[i],...patch};return{...v,stocks}});
  const fetchCode=async(code)=>{const r=await fetch(`/api/price?code=${encodeURIComponent(code)}`);const j=await r.json();if(!r.ok||j.error)throw new Error(j.error||"조회 실패");return j.price};
  const refreshOne=async(i)=>{
    const s=data.stocks[i]; if(!s?.code)return;
    setActiveIdx(i); setStatus(`${s.name} 조회 중...`);
    const p=await fetchCode(s.code);
    setData(v=>{const stocks=[...v.stocks];const old=stocks[i];if(old){stocks[i]={...old,price:Number(p.price)||old.price,changeRate:Number(p.changeRate)||0,volume:Number(p.volume)||0,last:new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),spark:[...(old.spark||[]),Number(p.price)||old.price].slice(-20)}}return{...v,stocks}});
  };
  const refreshAll=async()=>{
    if(running.current)return; running.current=true;
    try{for(let i=0;i<data.stocks.length;i++){await refreshOne(i);await sleep(1100)}setStatus("전체 갱신 완료")}
    catch(e){setStatus("오류: "+e.message)}
    finally{running.current=false;setActiveIdx(null)}
  };
  useEffect(()=>{let stop=false;async function loop(){while(!stop&&data.autoRefresh){await refreshAll();await sleep(4000)}}loop();return()=>{stop=true}},[data.autoRefresh,data.stocks.length]);

  const applyTrade=(type,i,qty,price)=>{
    qty=Number(qty); price=Number(price);
    if(!qty||!price)return alert("수량과 단가를 입력하세요.");
    setData(v=>{
      const stocks=[...v.stocks]; const s={...stocks[i]};
      if(type==="buy"){const cost=s.qty*s.avg+qty*price;s.qty+=qty;s.avg=Math.round(cost/s.qty);s.price=price}
      else{if(qty>s.qty){alert("보유수량 초과");return v}s.qty-=qty;s.price=price}
      stocks[i]=s;
      return{...v,stocks,trades:[...(v.trades||[]),{date:now(),type,name:s.name,qty,price}]};
    });
    setTab("home");
  };

  const grade=totals.ratio<1.4?["위험","var(--red)"]:totals.ratio<1.6?["경계","var(--orange)"]:totals.ratio<1.8?["주의","var(--yellow)"]:["안전","var(--green)"];
  const tabs=data.collateralMode?["home","search","watch","trade","collateral","ai","settings"]:["home","search","watch","trade","ai","settings"];

  return <>
    <div className="wrap">
      <div className="top"><div><h1>StockGuard</h1><div className="small">v11 fix · 종목명검색/상세확장</div></div><div className="small">{save}</div></div>
      {tab==="home"&&<Home data={data} totals={totals} status={status} activeIdx={activeIdx} refreshAll={refreshAll} updateStock={updateStock} setData={setData} setDetail={setDetail}/>}
      {tab==="search"&&<Search fetchCode={fetchCode} data={data} setData={setData} setDetail={setDetail}/>}
      {tab==="watch"&&<Watch data={data}/>}
      {tab==="trade"&&<Trade stocks={data.stocks} trades={data.trades||[]} onApply={applyTrade}/>}
      {tab==="collateral"&&data.collateralMode&&<Collateral data={data} setData={setData} totals={totals} grade={grade}/>}
      {tab==="ai"&&<AI data={data} totals={totals} grade={grade}/>}
      {tab==="settings"&&<Settings data={data} setData={setData} updateStock={updateStock}/>}
      {detail&&<Detail stock={detail} close={()=>setDetail(null)} fetchCode={fetchCode}/>}
    </div>
    <nav className="tabs"><div className="tabs-inner" style={{gridTemplateColumns:`repeat(${tabs.length},1fr)`}}>{tabs.map(id=><div key={id} className={`tab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{{home:"홈",search:"조회",watch:"관심",trade:"매매",collateral:"담보",ai:"AI",settings:"설정"}[id]}</div>)}</div></nav>
  </>;
}

function Home({data,totals,status,activeIdx,refreshAll,updateStock,setData,setDetail}){
  return <>
    <div className="hero"><div className="hero-title">총 평가금액</div><div className="hero-money">{fmt(totals.tv)}</div><div className={`rate ${totals.pf>=0?"gain":"loss"}`}>{totals.pf>=0?"+":""}{fmt(totals.pf)} ({totals.rr>=0?"+":""}{pct(totals.rr)})</div><div className="grid"><div className="box"><div className="label">총 매입금액</div><div className="value">{fmt(totals.tc)}</div></div><div className="box"><div className="label">총 수익률</div><div className={`value ${totals.rr>=0?"gain":"loss"}`}>{totals.rr>=0?"+":""}{pct(totals.rr)}</div></div></div></div>
    <div className="card"><div className="toolbar"><button className="primary" onClick={refreshAll}>순차 새로고침</button><button className={data.autoRefresh?"redbtn":"greenbtn"} onClick={()=>setData(v=>({...v,autoRefresh:!v.autoRefresh}))}>{data.autoRefresh?"자동조회 중지":"자동조회 시작"}</button></div><div className="note">{status}</div></div>
    <div className="section-title">보유종목</div>
    {data.stocks.map((s,i)=><Stock key={i} s={s} i={i} total={totals.tv} active={activeIdx===i} showCollateral={data.collateralMode} open={()=>setDetail(s)}/>)}
  </>;
}

function Spark({arr=[]}){if(!arr.length)return null;const min=Math.min(...arr),max=Math.max(...arr),range=max-min||1;const pts=arr.map((v,i)=>`${(i/(arr.length-1||1))*100},${42-((v-min)/range)*36-3}`).join(" ");return <svg className="spark" viewBox="0 0 100 42" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.8" vectorEffect="non-scaling-stroke"/></svg>}
function Stock({s,total,showCollateral,open}){const v=s.qty*s.price,c=s.qty*s.avg,g=v-c,r=c?g/c:0,w=total?v/total:0;return <div className="stock" onClick={open}><div className="stock-head"><div><div className="name">{s.name}</div><div className="sub">{s.code} · {s.qty}주 · 평단 {fmt(s.avg)}</div>{showCollateral&&<span className="pill">{s.collateral?"담보 포함":"담보 제외"}</span>}</div><div><div className="price">{fmt(s.price)}</div><div className={`rate ${r>=0?"gain":"loss"}`}>{r>=0?"+":""}{pct(r)} / {Number(s.changeRate||0).toFixed(2)}%</div></div></div><Spark arr={s.spark}/><div className="stock-grid"><div className="mini"><span>평가금액</span><b>{fmt(v)}</b></div><div className="mini"><span>평가손익</span><b className={g>=0?"gain":"loss"}>{g>=0?"+":""}{fmt(g)}</b></div><div className="mini"><span>비중/거래량</span><b>{pct(w)} · {num(s.volume)}</b></div></div></div>}

function Search({fetchCode,data,setData,setDetail}){
  const[q,setQ]=useState(""); const[results,setResults]=useState([]); const[res,setRes]=useState(null); const[msg,setMsg]=useState("");
  const search=async()=>{if(!q.trim())return alert("종목명 또는 종목코드를 입력하세요.");setMsg("검색 중...");const r=await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);const j=await r.json();setResults(j.results||[]);setMsg((j.results||[]).length?`${j.results.length}건 검색됨`:"검색 결과 없음")};
  const lookup=async(item)=>{setMsg("상세 조회 중...");try{const p=await fetchCode(item.code);const full={...item,...p,qty:0,avg:0,collateral:false,spark:[p.price],dividendYield:item.dividendYield||0};setRes(full);setMsg("조회 완료")}catch(e){setMsg("조회 실패: "+e.message)}};
  const add=()=>{if(!res)return;setData(v=>v.stocks.find(s=>s.code===res.code)?v:{...v,stocks:[...v.stocks,{name:res.name||res.code,code:res.code,qty:0,avg:0,price:res.price,changeRate:res.changeRate,volume:res.volume,last:now(),collateral:false,spark:[res.price],dividendYield:res.dividendYield||0}]});alert("관심/보유종목에 추가했습니다.")};
  return <><div className="card"><div className="label">종목 조회</div><div className="edit-row"><input className="left" value={q} onChange={e=>setQ(e.target.value)} placeholder="예: 하이닉스, 삼성전자, 000660"/><button className="primary" onClick={search}>검색</button></div><div className="note">{msg||"종목명과 종목코드 모두 검색 가능합니다."}</div></div>
  {results.length>0&&<><div className="section-title">검색 결과</div>{results.map((x,i)=><div className="stock" key={i} onClick={()=>lookup(x)}><div className="stock-head"><div><div className="name">{x.name}</div><div className="sub">{x.code} · {x.market}</div></div><button>상세</button></div></div>)}</>}
  {res&&<div className="stock"><div className="stock-head"><div><div className="name">{res.name}</div><div className="sub">{res.code} · 거래량 {num(res.volume)}</div></div><div><div className="price">{fmt(res.price)}</div><div className={Number(res.changeRate)>=0?"gain":"loss"}>{Number(res.changeRate).toFixed(2)}%</div></div></div><div className="toolbar"><button className="primary" onClick={add}>관심/보유 추가</button><button onClick={()=>setDetail(res)}>상세 보기</button></div></div>}</>;
}

function Detail({stock,close,fetchCode}){
  const[info,setInfo]=useState(stock); const[order,setOrder]=useState(null); const[msg,setMsg]=useState("");
  const value=(stock.qty||0)*(info.price||stock.price||0), cost=(stock.qty||0)*(stock.avg||0), gain=value-cost, ret=cost?gain/cost:0, dividend=Math.round(value*(stock.dividendYield||0)), collateralCap=Math.round(value/1.4);
  useEffect(()=>{async function load(){setMsg("상세 조회 중...");try{const p=await fetchCode(stock.code);setInfo({...stock,...p});const r=await fetch(`/api/orderbook?code=${stock.code}`);const j=await r.json();setOrder(j.orderbook||null);setMsg("조회 완료")}catch(e){setMsg("일부 조회 실패: "+e.message)}}load()},[stock.code]);
  const news=[`${stock.name} 주요 이슈 확인 필요`,"실적·업황·수급 변화 점검","급등락 시 담보비율 영향 확인"];
  const ai=`${stock.name} 현재가 ${fmt(info.price)} 기준입니다.\n${stock.qty>0?`평단 대비 수익률은 ${ret>=0?"+":""}${pct(ret)}입니다.`:"현재 보유수량은 0주로 관심종목 상태입니다."}\n거래량과 당일등락률을 같이 보고, 변동성이 큰 날에는 비중과 담보 노출을 우선 확인하는 것이 좋습니다.`;
  return <div className="wrap" style={{position:"fixed",inset:0,zIndex:20,background:"var(--bg)",overflow:"auto"}}><div className="top"><div><h1>{info.name||stock.name}</h1><div className="small">{stock.code}</div></div><button onClick={close}>닫기</button></div>
    <div className="hero"><div className="hero-title">현재가</div><div className="hero-money">{fmt(info.price)}</div><div className={Number(info.changeRate)>=0?"gain":"loss"}>당일등락 {Number(info.changeRate||0).toFixed(2)}% · 거래량 {num(info.volume)}</div><Spark arr={stock.spark||[stock.price]}/></div>
    <div className="grid"><div className="box"><div className="label">평단</div><div className="value">{fmt(stock.avg||0)}</div></div><div className="box"><div className="label">수익률</div><div className={`value ${ret>=0?"gain":"loss"}`}>{ret>=0?"+":""}{pct(ret)}</div></div><div className="box"><div className="label">담보여부</div><div className="value">{stock.collateral?"포함/가능":"미포함"}</div></div><div className="box"><div className="label">담보가능금액 추정</div><div className="value">{fmt(collateralCap)}</div></div><div className="box"><div className="label">배당예상</div><div className="value">{fmt(dividend)}</div></div><div className="box"><div className="label">평가손익</div><div className={`value ${gain>=0?"gain":"loss"}`}>{gain>=0?"+":""}{fmt(gain)}</div></div></div>
    <div className="section-title">호가</div>{order?<OrderBook data={order}/>:<div className="card"><div className="note">{msg}</div></div>}
    <div className="section-title">차트</div><div className="card"><Spark arr={stock.spark||[stock.price]}/><div className="note">최근 앱 내 갱신값 기준 미니 차트입니다.</div></div>
    <div className="section-title">AI 의견</div><div className="card ai-card">{ai}</div>
    <div className="section-title">뉴스</div><div className="card">{news.map((n,i)=><div className="trade-item" key={i}>{n}</div>)}<div className="note">추후 뉴스 API 연결 시 실제 기사 요약으로 교체 예정.</div></div>
  </div>;
}

function OrderBook({data}){const asks=data.asks||[],bids=data.bids||[];const max=Math.max(...asks.map(x=>x.qty),...bids.map(x=>x.qty),1);return <div className="orderbook"><div>{asks.map((x,i)=><div className="ask" key={i}><b>{fmt(x.price)}</b><div className="sub">매도 {num(x.qty)}</div><div className="bar"><span style={{width:`${x.qty/max*100}%`}}/></div></div>)}</div><div>{bids.map((x,i)=><div className="bid" key={i}><b>{fmt(x.price)}</b><div className="sub">매수 {num(x.qty)}</div><div className="bar"><span style={{width:`${x.qty/max*100}%`}}/></div></div>)}</div></div>}
function Watch({data}){const items=data.stocks.filter(s=>s.qty===0);return <><div className="section-title">관심종목</div><div className="card"><div className="note">조회 탭에서 종목을 추가하면 수량 0인 종목은 관심종목처럼 관리됩니다.</div></div>{items.map((s,i)=><div className="stock" key={i}><div className="stock-head"><div><div className="name">{s.name}</div><div className="sub">{s.code}</div></div><div><div className="price">{fmt(s.price)}</div><div className={Number(s.changeRate)>=0?"gain":"loss"}>{Number(s.changeRate||0).toFixed(2)}%</div></div></div></div>)}</>}
function Collateral({data,setData,totals,grade}){const sim=p=>setData(v=>({...v,stocks:v.stocks.map(s=>({...s,price:Math.round(s.price*(1+p/100))}))}));return <><div className="hero"><div className="hero-title">담보유지비율</div><div className="hero-money">{pct(totals.ratio)}</div><div className="status" style={{background:grade[1]}}>{grade[0]}</div><div className="grid"><div className="box"><div className="label">담보평가액</div><div className="value">{fmt(totals.cv)}</div></div><div className="box"><div className="label">대출잔액</div><div className="value">{fmt(data.loan)}</div></div><div className="box"><div className="label">140% 필요금액</div><div className="value">{fmt(totals.need)}</div></div><div className="box"><div className="label">140%까지 여유</div><div className="value">{fmt(totals.buf)}</div></div></div></div><div className="card"><div className="btns"><button onClick={()=>sim(-5)}>전체 -5%</button><button onClick={()=>sim(-10)}>전체 -10%</button><button onClick={()=>sim(-20)}>전체 -20%</button></div><div className="btns"><button onClick={()=>setData(v=>({...v,loan:Math.max(0,v.loan-10000000)}))}>1천 상환</button><button onClick={()=>setData(v=>({...v,loan:v.loan+30000000}))}>3천 대출</button><button onClick={()=>setData(v=>({...v,loan:v.loan+50000000}))}>5천 대출</button></div></div></>}
function AI({data,totals,grade}){const text=`현재 담보 관련 정보는 설정 하단의 담보 버튼을 켠 경우에만 반영됩니다.\n\n총 평가금액: ${fmt(totals.tv)}\n총 손익: ${totals.pf>=0?"+":""}${fmt(totals.pf)}\n\n가장 큰 비중 종목은 ${[...data.stocks].sort((a,b)=>b.qty*b.price-a.qty*a.price)[0]?.name||"-"}입니다.\n집중도가 높은 종목의 급락은 전체 손익 변동에 가장 큰 영향을 줍니다.`;return <><div className="section-title">AI 브리핑</div><div className="card ai-card">{text}</div></>}
function Trade({stocks,trades,onApply}){const[type,setType]=useState("buy"),[idx,setIdx]=useState(0),[qty,setQty]=useState(""),[price,setPrice]=useState("");return <><div className="card"><div className="label">매수/매도 입력</div><div className="edit-row"><select value={type} onChange={e=>setType(e.target.value)}><option value="buy">매수</option><option value="sell">매도</option></select><select value={idx} onChange={e=>setIdx(Number(e.target.value))}>{stocks.map((s,i)=><option value={i} key={i}>{s.name}</option>)}</select></div><div className="edit-row"><input value={qty} onChange={e=>setQty(e.target.value)} type="number" placeholder="수량"/><input value={price} onChange={e=>setPrice(e.target.value)} type="number" placeholder="단가"/></div><div className="edit-row"><button className="primary" onClick={()=>{onApply(type,idx,qty,price);setQty("");setPrice("")}}>거래 반영</button><button onClick={()=>{setQty("");setPrice("")}}>초기화</button></div></div><div className="section-title">최근 거래내역</div><div className="card">{trades.length?trades.slice(-20).reverse().map((t,i)=><div className="trade-item" key={i}><b>{t.type==="buy"?"매수":"매도"} · {t.name}</b><br/>{t.date} · {t.qty}주 × {fmt(t.price)}</div>):<div className="note">거래내역 없음</div>}</div></>}
function Settings({data,setData,updateStock}){const[ns,setNs]=useState({name:"",code:"",qty:"",avg:"",price:""});const add=()=>{if(!ns.name)return alert("종목명 입력");setData(v=>({...v,stocks:[...v.stocks,{name:ns.name,code:ns.code,qty:Number(ns.qty)||0,avg:Number(ns.avg)||0,price:Number(ns.price)||0,changeRate:0,volume:0,last:"-",collateral:false,spark:[Number(ns.price)||0],dividendYield:0}]}));setNs({name:"",code:"",qty:"",avg:"",price:""})};return <><div className="card"><div className="label">종목 추가</div><div className="edit-row"><input className="left" value={ns.name} onChange={e=>setNs({...ns,name:e.target.value})} placeholder="종목명"/><input className="left" value={ns.code} onChange={e=>setNs({...ns,code:e.target.value})} placeholder="종목코드"/></div><div className="row3"><input value={ns.qty} onChange={e=>setNs({...ns,qty:e.target.value})} placeholder="수량"/><input value={ns.avg} onChange={e=>setNs({...ns,avg:e.target.value})} placeholder="평단"/><input value={ns.price} onChange={e=>setNs({...ns,price:e.target.value})} placeholder="현재가"/></div><button className="primary" style={{width:"100%",marginTop:10}} onClick={add}>종목 추가</button></div><div className="section-title">종목 데이터 수정</div>{data.stocks.map((s,i)=><div className="stock" key={i}><div className="stock-head"><div><div className="name">{s.name}</div><div className="sub">{s.code}</div></div><button className="redbtn" onClick={()=>confirm(`${s.name} 삭제?`)&&setData(v=>({...v,stocks:v.stocks.filter((_,x)=>x!==i)}))}>삭제</button></div><div className="edit-row"><input type="number" value={s.qty} onChange={e=>updateStock(i,{qty:Number(e.target.value)||0})}/><input type="number" value={s.avg} onChange={e=>updateStock(i,{avg:Number(e.target.value)||0})}/></div>{data.collateralMode&&<button style={{width:"100%",marginTop:8}} onClick={()=>updateStock(i,{collateral:!s.collateral})}>{s.collateral?"담보 포함":"담보 제외"}</button>}</div>)}<div className="card" style={{marginTop:18,textAlign:"center"}}><button className="tiny" onClick={()=>setData(v=>({...v,collateralMode:!v.collateralMode}))}>{data.collateralMode?"담보 숨기기":"담보"}</button></div></>}

createRoot(document.getElementById("root")).render(<App/>);
