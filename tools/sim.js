const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(require('path').join(__dirname,'..','catan-third-hand.html'),'utf8');
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(String(e.message||e).slice(0,200)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
const w=dom.window; const run=s=>w.eval(s);
const realST=w.setTimeout.bind(w); w.setTimeout=(f,ms,...a)=>realST(f,0,...a);
w.addEventListener('error',e=>errors.push('window.error: '+e.message));
const sleep=()=>new Promise(r=>realST(r,0));
const rnd=()=>Math.random();
const N=+process.argv[2]||20, POLICY=process.argv[3]||'greedy';

async function playGame(gi){
  run('startConfig()'); run('startFromConfig()');
  run('chooseStarter("random")');
  let last='',stuck=0,steps=0;
  while(steps++<20000){
    await sleep();
    const st=run('game.phase');
    if(st==='over') break;
    const sig=run('JSON.stringify([game.phase,game.turn,game.setup&&game.setup.step,game.setup&&game.setup.phase,game.pending&&game.pending.step,game.pendingRoll,ui.busy,game.log.length,game.players.map(p=>p.cardCount)])');
    if(sig===last){ stuck++; } else { stuck=0; last=sig; }
    if(stuck>60){ return {stuck:true,dump:run('JSON.stringify({phase:game.phase,turn:game.turn,cur:game.currentIdx,pend:game.pending,roll:game.pendingRoll,busy:ui.busy,setup:game.setup,logTail:game.log.slice(-4).map(x=>x.text)})')}; }
    if(run('ui.busy')) continue;
    if(run('!!ui.mono')){ run('applyMonopoly()'); continue; }
    if(st==='setup'){
      if(run('game.setup.pickStarter')) continue;
      const pid=run('game.setup.order[game.setup.step]');
      if(run(`playerById("${pid}").isClaude`)){ if(stuck>5) run('claudeSetupPlace()'); continue; }
      if(run('game.setup.phase')==='settlement'){ const opts=run(`legalSettlementVertices("${pid}",{setup:true})`); const k=opts[Math.floor(rnd()*opts.length)]; run(`placeSetupSettlement("${pid}",${JSON.stringify(k)})`); }
      else { const opts=run(`legalRoadEdges("${pid}",{setup:true,fromVertex:game.setup.lastSettlement})`); run(`placeSetupRoad("${pid}",${JSON.stringify(opts[0])})`); }
      continue;
    }
    if(run('game.pickPlayFirst')){ run('choosePlayFirst("random")'); continue; }
    // pending stuff (any turn)
    const pd=run('game.pending&&game.pending.type');
    if(pd==='claudeOffers'){
      if(rnd()<0.5){ const h='p'+(1+Math.floor(rnd()*2)); run(`acceptClaudeOffer(0,"${h}")`); }
      else run('game.pending.offers.splice(0,1); if(!game.pending.offers.length){ game.pending=null; afterClaudeOffers(); } else commit();');
      continue;
    }
    if(pd==='robber'){
      const step=run('game.pending.step'), mover=run('game.pending.mover'), moverClaude=run(`playerById("${mover}").isClaude`);
      if(step==='discard'){ const ids=run('game.pending.discards.filter(d=>!d.done).map(d=>d.pid)'); for(const id of ids){ run(`(()=>{const x=game.pending.discards.find(d=>d.pid==="${id}"); x.done=true; playerById("${id}").cardCount=Math.max(0,playerById("${id}").cardCount-x.n);})()`); } run('maybeRobberAdvance()'); continue; }
      if(moverClaude) { if(step==='stealReveal' && run('game.pending.claudeRobbedHuman')){ const r=['wood','brick','sheep','wheat','ore'][Math.floor(rnd()*5)]; run(`(()=>{const cl=game.players.find(p=>p.isClaude); cl.hand["${r}"]++; cl.cardCount++; const v=playerById(game.pending.victim); v.cardCount=Math.max(0,v.cardCount-1); finishRobber();})()`); } continue; }
      if(step==='move'){ const cur=run('game.board.robberHex'); let id; do{ id=1+Math.floor(rnd()*19);}while(id===cur); run(`moveRobber(${id})`); continue; }
      if(step==='steal'){ const c=run('game.pending.stealCandidates'); run(`doSteal(${JSON.stringify(c[0]||'none')})`); continue; }
      if(step==='stealReveal'){ run('finishRobber()'); continue; }
    }
    if(pd) continue;
    // ordinary turn
    if(run('cur().isClaude')){ if(stuck>5) run('runClaudeTurn()'); continue; }
    if(run('game.pendingRoll')==null){ const n=1+Math.floor(rnd()*6)+1+Math.floor(rnd()*6); run(`resolveRoll(${n},false)`); continue; }
    // human builds (count-only affordability = generous to humans)
    const pid=run('cur().id'); let built=false;
    if(POLICY!=='passive'){
      for(let i=0;i<6;i++){
        if(run('game.phase')!=='play') break;
        if(run(`canAffordCount(cur(),COST.city)&&cur().settlements.length&&cur().cities.length<4`)){ const k=run('cur().settlements[0]'); run(`placeCity("${pid}",${JSON.stringify(k)})`); built=true; continue; }
        if(run(`canAffordCount(cur(),COST.settlement)&&cur().settlements.length<5`)){ const o=run(`legalSettlementVertices("${pid}")`); if(o.length){ o.sort((a,b)=>run(`vertexPips(${JSON.stringify(b)})-vertexPips(${JSON.stringify(a)})`)); run(`placeSettlement("${pid}",${JSON.stringify(o[0])})`); built=true; continue; } }
        if(run(`canAffordCount(cur(),COST.road)&&cur().roads.length<15`)&&rnd()<0.6){ const o=run(`legalRoadEdges("${pid}")`); if(o.length){ run(`placeRoad("${pid}",${JSON.stringify(o[Math.floor(rnd()*o.length)])},false)`); built=true; continue; } }
        break;
      }
    }
    if(run('game.phase')==='play') run('endTurn()');
  }
  const over=run('game.phase')==='over';
  return over? {winner:run('playerById(game.winner).name'),isClaude:run('playerById(game.winner).isClaude'),turns:run('game.turn'),vp:run('game.players.map(p=>trueVP(p))'),cl:run('(()=>{const c=game.players.find(p=>p.isClaude);return {s:c.settlements.length,c:c.cities.length,r:c.roads.length,dev:c.devCards.length,neg:RES.some(r=>c.hand[r]<0)}})()')} : {timeout:true,turn:run('game.turn')};
}
(async()=>{
  await sleep(); await sleep();
  let wins=0,done=0,stuck=0,neg=0,to=0,turns=0; const vps=[]; const stuckDumps=[];
  for(let g=0;g<N;g++){
    const r=await playGame(g);
    if(r.stuck){ stuck++; stuckDumps.push(r.dump); continue; }
    if(r.timeout){ to++; continue; }
    done++; turns+=r.turns; if(r.isClaude) wins++; if(r.cl.neg) neg++; vps.push(r.vp.join('/'));
  }
  console.log(`games ${N}: finished ${done}, stuck ${stuck}, timeout ${to} | bot wins ${wins}/${done} | avg turns ${done?Math.round(turns/done):0} | negative hands ${neg}`);
  console.log('final VP (p1/p2/bot):',vps.slice(0,8).join('  '));
  if(stuckDumps.length) console.log('STUCK dump:',stuckDumps[0]);
  console.log('errors:',errors.length, errors.slice(0,3));
  process.exit(0);
})();
