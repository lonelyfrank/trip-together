// Test browser con API simulate: nessuna scrittura sul database reale.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
const base=process.env.UI_BASE_URL || 'https://localhost:5173';
const roomId='11111111-1111-4111-8111-111111111111';
const memberId='22222222-2222-4222-8222-222222222222';
const errors=[];
async function context(fixture=false) {
  const ctx=await browser.newContext({ignoreHTTPSErrors:true, viewport:{width:390,height:844}});
  const state={failTable:null, failParticipants:false, requests:[], tables:{
    rooms:[{id:roomId,title:'Domenica al lago',invite_code:'LAGO42',crew_id:null,destination_label:'Lago di Garda',destination_lat:null,destination_lng:null,event_time:new Date(Date.now()+86400000).toISOString(),status:'open',created_by:'user',created_at:new Date().toISOString()}],
    members:[{id:memberId,room_id:roomId,display_name:'Franco',auth_user_id:'user',role:'creator',confirmed:false,confirmed_at:null},{id:'member-luca',room_id:roomId,display_name:'Luca',role:'guest',confirmed:true}],
    cars:[], car_passengers:[], car_expenses:[], general_expenses:[], general_expense_participants:[], radar_positions:[]
  }};
  if(fixture) await ctx.addInitScript(({roomId,memberId})=>{localStorage.setItem('tripTogether:rooms',JSON.stringify([{roomId,memberId,inviteCode:'LAGO42'}]));localStorage.setItem('tripTogether:myName','Franco')},{roomId,memberId});
  await ctx.route('**/*.supabase.co/**',route=>{
    const req=route.request(), url=new URL(req.url()), table=url.pathname.split('/').pop(), method=req.method();
    state.requests.push({table,method});
    if(table===state.failTable || table==='general_expense_participants' && method==='POST' && state.failParticipants) return route.fulfill({status:500,json:{message:'Simulated error',code:'TEST'}});
    if(!fixture) return route.fulfill({json:[]});
    if(method==='PATCH') {
      const values=req.postDataJSON();
      state.tables[table]=(state.tables[table]??[]).map(item=>({...item,...values}));
      return route.fulfill({json:req.headers().accept?.includes('object') ? state.tables[table][0] : state.tables[table]});
    }
    if(method==='POST') {const value=req.postDataJSON(); const rows=Array.isArray(value)?value:[value]; state.tables[table]=[...(state.tables[table]??[]),...rows];return route.fulfill({status:201,json:rows});}
    if(method==='DELETE') {state.tables[table]=[];return route.fulfill({status:204});}
    const rows=state.tables[table]??[];
    return route.fulfill({json:req.headers().accept?.includes('object') ? rows[0]??null : rows});
  });
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  return {ctx,page,state};
}
try {
  {
    const {ctx,page}=await context();
    await page.goto(base);
    const trigger=page.getByRole('button',{name:'Crea un evento',exact:true});
    await trigger.waitFor();
    await page.screenshot({path:'/tmp/trip-home-mobile.png',fullPage:true});
    await trigger.click();
    const dialog=page.getByRole('dialog'); await dialog.waitFor();
    assert(await page.getByLabel('Nome dell’evento').evaluate(el=>el===document.activeElement));
    for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert(await dialog.evaluate(el=>el.contains(document.activeElement)));}
    await page.getByLabel('Nome dell’evento').fill('Domenica al lago');await page.getByLabel('Il tuo nome').fill('Franco');
    await page.screenshot({path:'/tmp/trip-sheet-mobile.png',fullPage:true});
    await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);assert(await trigger.evaluate(el=>el===document.activeElement));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'/tmp/trip-home-desktop.png',fullPage:true});
    console.log('PASS onboarding mobile/desktop, focus iniziale e confinato, Escape, ripristino focus, nessun overflow');await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    await page.goto(`${base}/room/${roomId}`);
    await page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    await page.screenshot({path:'/tmp/trip-event-mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Conferma la tua presenza',exact:true}).click();
    await page.getByRole('heading',{name:'Troviamo il tuo passaggio'}).waitFor();
    await page.getByRole('button',{name:'Spese',exact:true}).click();
    assert(new URL(page.url()).searchParams.get('tab')==='spese');
    await page.reload();await page.getByRole('button',{name:'Nuova spesa',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Spese',exact:true}).getAttribute('aria-current'),'page');
    await page.getByRole('button',{name:'Nuova spesa',exact:true}).click();
    await page.getByLabel('Per cosa avete speso?').fill('Picnic');await page.getByLabel('Importo (€)').fill('12.50');
    state.failParticipants=true;
    await page.getByRole('button',{name:'Aggiungi spesa',exact:true}).click();
    await page.getByText('La spesa è stata creata, ma mancano le quote.',{exact:false}).waitFor();
    assert.equal(state.tables.general_expenses.length,1);
    state.failParticipants=false;
    await page.getByRole('button',{name:'Riprova a salvare le quote',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(state.tables.general_expenses.length,1);assert.equal(state.tables.general_expense_participants.length,2);
    state.failTable='general_expenses';
    await page.reload();await page.getByText('Non riusciamo a caricare questa sezione.').waitFor();assert.equal(await page.getByRole('button',{name:'Nuova spesa',exact:true}).count(),0);
    await page.getByRole('button',{name:'Evento',exact:true}).click();await page.getByText('Alcuni dati non sono disponibili. Posti e saldi devono essere verificati.').waitFor();assert.equal(await page.getByText('Opzioni dell’evento').count(),0);
    console.log('PASS conferma presenza, tab persistente al refresh, errore spese esplicito, chiusura bloccata con dati incompleti, retry quote senza duplicare la spesa');await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success){window.pendingGps=success}}})});
    await page.goto(`${base}/room/${roomId}?tab=radar`);await page.getByRole('button',{name:'Attiva radar',exact:true}).click();
    await page.getByRole('button',{name:'Evento',exact:true}).click();
    await page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    await page.evaluate(()=>window.pendingGps({coords:{latitude:45,longitude:9}}));
    await page.waitForTimeout(150);
    assert.equal(state.requests.filter(req=>req.table==='radar_positions'&&req.method==='POST').length,0);
    await page.getByText('Opzioni dell’evento').click();await page.getByRole('button',{name:'Archivia evento',exact:true}).click();await page.getByRole('button',{name:'Conferma archiviazione',exact:true}).click();
    await page.waitForURL(base+'/');assert.equal(state.tables.rooms[0].status,'closed');
    assert.deepEqual(state.requests.filter(req=>req.method==='DELETE').map(req=>req.table).filter(table=>table!=='radar_positions'),[]);
    await page.getByRole('button',{name:/Domenica al lago/}).click();await page.getByRole('heading',{name:'Il ricordo del vostro evento'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Sezioni dell’evento'}).count(),0);
    console.log('PASS callback GPS tardiva ignorata, archiviazione senza cancellazioni dello storico, riepilogo archivio in sola lettura');await ctx.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS nessun errore JavaScript');
} finally {await browser.close()}
