const RULES={decks:6,dealerHitsSoft17:false,blackjackPayout:1.5,insurancePayout:2,startingBalance:1000,minBet:5,maxBet:500};
const suits=[['♠','black'],['♥','red'],['♦','red'],['♣','black']], ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const $=s=>document.querySelector(s); let shoe=[],balance=RULES.startingBalance,bet=0,hands=[],dealer=[],active=0,state='betting',insurance=0,soundOn=true;
const el={balance:$('#balance'),bet:$('#current-bet'),dealer:$('#dealer-cards'),dealerScore:$('#dealer-score'),hands:$('#hands'),message:$('#message'),betPanel:$('#betting-panel'),actions:$('#play-actions'),newRound:$('#new-round')};

function money(n){return `₪${Number(n).toLocaleString('he-IL',{maximumFractionDigits:2})}`}
function createShoe(){shoe=[];for(let d=0;d<RULES.decks;d++)for(const [suit,color] of suits)for(const rank of ranks)shoe.push({suit,color,rank});for(let i=shoe.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shoe[i],shoe[j]]=[shoe[j],shoe[i]]}}
function draw(){if(shoe.length<78)createShoe();return shoe.pop()}
function value(cards){let total=0,aces=0;cards.forEach(c=>{if(c.rank==='A'){aces++;total+=11}else total+=['J','Q','K'].includes(c.rank)?10:+c.rank});while(total>21&&aces){total-=10;aces--}return{total,soft:aces>0}}
function isBlackjack(hand){return hand.cards.length===2&&value(hand.cards).total===21&&!hand.split}
function beep(freq=420,duration=.06){if(!soundOn)return;const C=window.AudioContext||window.webkitAudioContext,ctx=beep.ctx||(beep.ctx=new C),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.035,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration)}
function cardHTML(c,hidden=false){if(hidden)return'<div class="card back" aria-label="קלף מוסתר"></div>';return`<div class="card ${c.color}"><span class="corner">${c.rank}<small>${c.suit}</small></span><span class="suit-center">${c.suit}</span></div>`}
function render(reveal=false){el.balance.textContent=money(balance);el.bet.textContent=money(hands.length?hands.reduce((s,h)=>s+h.bet,0):bet);el.dealer.innerHTML=dealer.map((c,i)=>cardHTML(c,!reveal&&state==='playing'&&i===1)).join('');const shown=state==='playing'&&!reveal?[dealer[0]]:dealer;el.dealerScore.textContent=shown.length?value(shown).total:'';el.hands.innerHTML=hands.map((h,i)=>`<div class="hand ${i===active&&state==='playing'?'active':''}"><div class="hand-title"><span>${hands.length>1?'יד '+(i+1):'השחקן'}</span><output class="score">${value(h.cards).total}</output></div><div class="cards">${h.cards.map(c=>cardHTML(c)).join('')}</div><div class="hand-result">${h.result||''}</div></div>`).join('');updateActions()}
function setMessage(text,result=false){el.message.textContent=text;el.message.classList.toggle('result',result)}
function updateActions(){if(state!=='playing'||!hands[active])return;const h=hands[active],two=h.cards.length===2;$('#double').disabled=!(two&&balance>=h.bet);$('#split').disabled=!(two&&hands.length===1&&h.cards[0].rank===h.cards[1].rank&&balance>=h.bet)}
function setView(mode){el.betPanel.classList.toggle('hidden',mode!=='betting');el.actions.classList.toggle('hidden',mode!=='playing');el.newRound.classList.toggle('hidden',mode!=='settled')}
function addBet(amount){if(state!=='betting')return;if(bet+amount>Math.min(balance,RULES.maxBet)){setMessage('לא ניתן להגדיל את ההימור');return}bet+=amount;beep(260);render()}
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>addBet(+c.dataset.value));
$('#clear-bet').onclick=()=>{bet=0;render();setMessage("בחרו ז'יטונים והניחו הימור")};
$('#deal').onclick=deal;
function deal(){if(bet<RULES.minBet){setMessage(`הימור מינימלי: ${money(RULES.minBet)}`);return}balance-=bet;hands=[{cards:[draw(),draw()],bet,result:'',split:false}];dealer=[draw(),draw()];active=0;state='playing';setView(state);setMessage('היד שלכם');beep(520);render();if(dealer[0].rank==='A'){openInsurance()}else checkNaturals()}
function openInsurance(){const dlg=$('#insurance-dialog');$('#take-insurance').disabled=balance<hands[0].bet/2;dlg.showModal()}
$('#take-insurance').onclick=()=>{insurance=hands[0].bet/2;balance-=insurance;$('#insurance-dialog').close();checkNaturals()};
$('#decline-insurance').onclick=()=>{$('#insurance-dialog').close();checkNaturals()};
function checkNaturals(){const dbj=isBlackjack({cards:dealer,split:false}),pbj=isBlackjack(hands[0]);if(dbj||pbj){if(dbj&&insurance){balance+=insurance*(RULES.insurancePayout+1)}if(dbj&&pbj){balance+=hands[0].bet;hands[0].result='תיקו'}else if(pbj){balance+=hands[0].bet*(RULES.blackjackPayout+1);hands[0].result='BLACKJACK!'}else hands[0].result='הדילר ניצח';settle('הסיבוב הסתיים')}else{if(insurance)setMessage('אין לדילר Blackjack — הביטוח הפסיד');render()}}
$('#hit').onclick=()=>{const h=hands[active];h.cards.push(draw());beep(500);render();const v=value(h.cards).total;if(v>=21){if(v>21)h.result='נשרפת';advanceHand()}else setMessage('קלף נוסף או עצירה?')};
$('#stand').onclick=()=>advanceHand();
$('#double').onclick=()=>{const h=hands[active];balance-=h.bet;h.bet*=2;h.cards.push(draw());beep(390);render();if(value(h.cards).total>21)h.result='נשרפת';advanceHand()};
$('#split').onclick=()=>{const h=hands[0],stake=h.bet;balance-=stake;const second=h.cards.pop();h.split=true;hands.push({cards:[second],bet:stake,result:'',split:true});h.cards.push(draw());hands[1].cards.push(draw());beep(620);render();if(h.cards[0].rank==='A'){hands.forEach(x=>x.result=value(x.cards).total===21?'21':'');dealerTurn()}else setMessage('משחקים כעת את היד הראשונה')};
function advanceHand(){if(active<hands.length-1){active++;setMessage(`משחקים כעת את יד ${active+1}`);render()}else dealerTurn()}
function dealerTurn(){state='dealer';setView('dealer');render(true);const live=hands.some(h=>value(h.cards).total<=21);if(live){const timer=setInterval(()=>{const v=value(dealer);if(v.total<17||(v.total===17&&v.soft&&RULES.dealerHitsSoft17)){dealer.push(draw());beep(440);render(true)}else{clearInterval(timer);resolveHands()}},520)}else resolveHands()}
function resolveHands(){const dv=value(dealer).total;hands.forEach(h=>{const pv=value(h.cards).total;if(pv>21)h.result='נשרפת';else if(dv>21||pv>dv){balance+=h.bet*2;h.result=dv>21?'הדילר נשרף — זכית':'זכית'}else if(pv===dv){balance+=h.bet;h.result='תיקו'}else h.result='הדילר ניצח'});settle(hands.some(h=>h.result.includes('זכית'))?'זכייה!':'הסיבוב הסתיים')}
function settle(msg){state='settled';insurance=0;setView(state);setMessage(msg,true);render(true);beep(720,.12)}
$('#new-round').onclick=()=>{bet=Math.min(hands[0]?.bet||RULES.minBet,balance,RULES.maxBet);hands=[];dealer=[];state='betting';setView(state);setMessage(balance>=RULES.minBet?'ההימור הקודם מוכן — אפשר לשנות או לחלק':"היתרה נגמרה — המשחק אופס");if(balance<RULES.minBet){balance=RULES.startingBalance;bet=0}render()};
$('#sound-toggle').onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♪':'×';e.currentTarget.setAttribute('aria-label',soundOn?'כיבוי צלילים':'הפעלת צלילים')};
$('#help-toggle').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
$('#enter-game').onclick=()=>{$('#welcome-dialog').close();beep(620,.1)};
createShoe();setView('betting');render();$('#welcome-dialog').showModal();

