// Test browser con API simulate: nessuna scrittura sul database reale.
import assert from 'node:assert/strict';
import { chromium } from './browser.mjs';
const browser = await chromium.launch({headless:true, executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
const base=process.env.UI_BASE_URL || 'https://localhost:5173';
const roomId='11111111-1111-4111-8111-111111111111';
const memberId='22222222-2222-4222-8222-222222222222';
const errors=[];
async function context(fixture=false) {
  const ctx=await browser.newContext({ignoreHTTPSErrors:true, serviceWorkers:'block', timezoneId:'Europe/Rome', viewport:{width:390,height:844}});
  const state={enabled:fixture,failTable:null, failParticipants:false, requests:[], tables:{
    rooms:[{id:roomId,title:'Domenica al lago',invite_code:'LAGO42',crew_id:null,destination_label:'Lago di Garda',destination_lat:null,destination_lng:null,event_time:new Date(Date.now()+86400000).toISOString(),status:'open',created_by:'user',created_at:new Date().toISOString()}],
    members:[{id:memberId,room_id:roomId,display_name:'Franco',auth_user_id:'user',role:'creator',confirmed:false,confirmed_at:null},{id:'member-luca',room_id:roomId,display_name:'Luca',role:'guest',confirmed:true}],
    cars:[], car_passengers:[], car_expenses:[], general_expenses:[], general_expense_participants:[], radar_positions:[]
  }};
  if(fixture) await ctx.addInitScript(({roomId,memberId})=>{localStorage.setItem('tripTogether:rooms',JSON.stringify([{roomId,memberId,inviteCode:'LAGO42'}]));localStorage.setItem('tripTogether:myName','Franco')},{roomId,memberId});
  await ctx.route('**/*.supabase.co/**',route=>{
    const req=route.request(), url=new URL(req.url()), table=url.pathname.split('/').pop(), method=req.method();
    state.requests.push({table,method,order:url.searchParams.get('order'),onConflict:url.searchParams.get('on_conflict'),select:url.searchParams.get('select')});
    if(table===state.failTable) return route.fulfill({status:500,json:{message:'Simulated error',code:'TEST'}});
    if(url.pathname.includes('/auth/')) return route.fulfill({json:{access_token:'mock-token',refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user:{id:'user',aud:'authenticated',role:'authenticated'}}});
    if(url.pathname.includes('/rpc/')) {
      const args=req.postDataJSON();
      if(table==='resolve_invite') return route.fulfill({json:args.p_code==='LAGO42'?{kind:'room',id:roomId}:{kind:'none',id:null}});
      if(table==='create_room_and_join') {
        state.enabled=true;state.tables.rooms[0].title=args.p_title;state.tables.members[0].display_name=args.p_display_name;
        return route.fulfill({json:{id:roomId,member_id:memberId,invite_code:'LAGO42'}});
      }
      if(table==='join_room') {state.enabled=true;return route.fulfill({json:memberId});}
      if(table==='claim_member') {state.enabled=true;return route.fulfill({json:'Franco'});}
      if(table==='list_crew_events') return route.fulfill({json:[]});
    }
    if(!state.enabled) return route.fulfill({json:[]});
    if(method==='PATCH') {
      const values=req.postDataJSON();
      state.tables[table]=(state.tables[table]??[]).map(item=>({...item,...values}));
      return route.fulfill({json:req.headers().accept?.includes('object') ? state.tables[table][0] : state.tables[table]});
    }
    if(method==='POST') {
      const value=req.postDataJSON(), rows=(Array.isArray(value)?value:[value]).map(row=>({id:crypto.randomUUID(),created_at:new Date().toISOString(),...row}));
      const existing=state.tables[table]??[], conflict=url.searchParams.get('on_conflict')?.split(',');
      for(const row of rows) {
        const index=conflict ? existing.findIndex(old=>conflict.every(key=>old[key]===row[key])) : -1;
        if(index<0) existing.push(row); else existing[index]={...existing[index],...row,id:existing[index].id};
      }
      state.tables[table]=existing;
      // Il DB ha scritto, ma la risposta non arriva: il retry deve essere idempotente.
      if(table==='general_expense_participants' && state.failParticipants) return route.fulfill({status:500,json:{message:'Risposta persa dopo il commit',code:'TEST'}});
      return route.fulfill({status:201,json:rows});
    }
    if(method==='DELETE') {state.tables[table]=[];return route.fulfill({status:204});}
    const rows=state.tables[table]??[];
    return route.fulfill({json:req.headers().accept?.includes('object') ? rows[0]??null : rows});
  });
  await ctx.route('https://www.google.com/maps/**',route=>route.fulfill({contentType:'text/html',body:''}));
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
    await page.getByRole('link',{name:'Gruppo',exact:true}).click();
    assert.equal(new URL(page.url()).pathname,`/room/${roomId}/gruppo`);
    await page.reload();await page.getByRole('button',{name:'Nuova spesa',exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Gruppo',exact:true}).getAttribute('aria-current'),'page');
    await page.getByRole('button',{name:'Nuova spesa',exact:true}).click();
    await page.getByLabel('Per cosa avete speso?').fill('Picnic');await page.getByLabel('Importo (€)').fill('12.50');
    state.failParticipants=true;
    await page.getByRole('button',{name:'Aggiungi spesa',exact:true}).click();
    await page.getByText('La spesa è stata creata, ma mancano le quote.',{exact:false}).waitFor();
    assert.equal(state.tables.general_expenses.length,1);
    assert.equal(state.tables.general_expense_participants.length,2);
    state.failParticipants=false;
    await page.getByRole('button',{name:'Riprova a salvare le quote',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(state.tables.general_expenses.length,1);assert.equal(state.tables.general_expense_participants.length,2);
    state.failTable='general_expenses';
    await page.reload();await page.getByText('Non riusciamo a caricare questa sezione').first().waitFor();assert.equal(await page.getByRole('button',{name:'Nuova spesa',exact:true}).count(),0);
    assert.equal(await page.getByText('Impostazioni evento').count(),0);
    await page.getByRole('link',{name:'Adesso',exact:true}).click();await page.getByText('Alcuni dati non sono disponibili',{exact:true}).waitFor();
    console.log('PASS conferma presenza, sezione persistente al refresh, errore spese esplicito, chiusura bloccata con dati incompleti, retry quote senza duplicare la spesa');await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success){window.pendingGps=success}}})});
    await page.goto(`${base}/room/${roomId}/gruppo`);await page.getByRole('button',{name:'Attiva radar',exact:true}).click();
    await page.getByRole('link',{name:'Adesso',exact:true}).click();
    await page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    await page.evaluate(()=>window.pendingGps({coords:{latitude:45,longitude:9}}));
    await page.waitForTimeout(150);
    assert.equal(state.requests.filter(req=>req.table==='radar_positions'&&req.method==='POST').length,0);
    await page.getByRole('link',{name:'Gruppo',exact:true}).click();await page.getByRole('button',{name:'Archivia evento',exact:true}).click();await page.getByRole('button',{name:'Conferma archiviazione',exact:true}).click();
    await page.waitForURL(base+'/');assert.equal(state.tables.rooms[0].status,'closed');
    assert.deepEqual(state.requests.filter(req=>req.method==='DELETE').map(req=>req.table).filter(table=>table!=='radar_positions'),[]);
    await page.getByRole('button',{name:/Domenica al lago/}).click();await page.getByRole('heading',{name:'Il ricordo del vostro evento'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Navigazione principale'}).count(),0);
    console.log('PASS callback GPS tardiva ignorata, archiviazione senza cancellazioni dello storico, riepilogo archivio in sola lettura');await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    await page.goto(`${base}/room/${roomId}`);
    await page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    await page.getByRole('link',{name:'Viaggio',exact:true}).click();
    for(const [local,iso] of [['2027-01-15T10:30','2027-01-15T09:30:00.000Z'],['2027-07-15T10:30','2027-07-15T08:30:00.000Z']]) {
      await page.getByRole('button',{name:/\d{2}:\d{2} modifica/}).click();
      await page.locator('input[type="datetime-local"]').fill(local);
      await page.getByRole('button',{name:'Salva data',exact:true}).click();
      await page.locator('input[type="datetime-local"]').waitFor({state:'detached'});
      assert.equal(state.tables.rooms[0].event_time,iso);
      await page.reload(); await page.getByRole('button',{name:/\d{2}:\d{2} modifica/}).click();
      assert.equal(await page.locator('input[type="datetime-local"]').inputValue(),local);
      await page.getByRole('button',{name:'Salva data',exact:true}).click();
      await page.locator('input[type="datetime-local"]').waitFor({state:'detached'});
      assert.equal(state.tables.rooms[0].event_time,iso);
    }
    await page.getByRole('link',{name:'Gruppo',exact:true}).click();
    await page.getByRole('button',{name:'Aggiungi nota',exact:true}).click();
    await page.getByPlaceholder('Scrivi una nota...').fill('Non perdere questa nota');
    state.failTable='board_notes';
    await page.getByRole('button',{name:'Aggiungi',exact:true}).click();
    await page.getByText('Nota non salvata.',{exact:true}).waitFor();
    assert.equal(await page.getByPlaceholder('Scrivi una nota...').inputValue(),'Non perdere questa nota');
    await page.getByRole('button',{name:'Annulla',exact:true}).click();
    await page.getByRole('button',{name:'Aggiungi link',exact:true}).click();
    await page.getByPlaceholder('Etichetta (es. Biglietti concerto)').fill('Biglietti');
    await page.getByPlaceholder('URL',{exact:true}).fill('https://example.com');
    state.failTable='board_links';
    await page.getByRole('button',{name:'Aggiungi',exact:true}).click();
    await page.getByText('Link non salvato.',{exact:true}).waitFor();
    assert.equal(await page.getByPlaceholder('URL',{exact:true}).inputValue(),'https://example.com');
    state.failTable=null;
    state.tables.cars=[{id:'car-test',room_id:roomId,driver_member_id:memberId,seats_total:4,travel_status:'in_viaggio',created_at:new Date().toISOString()}];
    await page.goto(`${base}/room/${roomId}/viaggio`);
    await page.getByRole('button',{name:'Proponi sosta',exact:true}).first().click();
    await page.getByRole('button',{name:'Benzina',exact:true}).click();
    await page.getByPlaceholder('Nota breve (opzionale)').fill('Sosta da conservare');
    state.failTable='stop_proposals';
    await page.getByRole('button',{name:'Proponi (scade tra 15 min)',exact:true}).click();
    await page.getByText('Proposta non inviata.',{exact:true}).waitFor();
    assert.equal(await page.getByPlaceholder('Nota breve (opzionale)').inputValue(),'Sosta da conservare');
    await page.keyboard.press('Escape'); state.failTable='delay_reports';
    await page.getByRole('button',{name:'Segnala ritardo',exact:true}).click();
    await page.getByRole('button',{name:'Traffico',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'+',exact:true}).click();
    await page.getByRole('button',{name:'Segnala',exact:true}).click();
    await page.getByText('Ritardo non segnalato.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog').getByText('~5 min',{exact:true}).count(),1);
    assert.equal(await page.getByRole('button',{name:'Segnala',exact:true}).isEnabled(),true);
    console.log('PASS data inverno/estate senza slittamento al secondo salvataggio; note, link, soste e ritardi conservati su errore');
    await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    let weatherRequests=0;
    await ctx.route('https://api.open-meteo.com/**',route=>{weatherRequests++;return route.fulfill({json:{current:{temperature_2m:20,weather_code:0}}})});
    state.tables.rooms[0].destination_lat=45;state.tables.rooms[0].destination_lng=9;
    await page.goto(`${base}/room/${roomId}`);await page.getByText('Sereno',{exact:true}).waitFor();
    assert.equal(weatherRequests,1);
    for(let i=0;i<3;i++) {
      await page.getByRole('link',{name:'Gruppo',exact:true}).click();
      await page.getByRole('link',{name:'Adesso',exact:true}).click();
      await page.getByText('Sereno',{exact:true}).waitFor();
    }
    assert.equal(weatherRequests,1);
    state.requests.length=0;
    await page.goto(base);await page.getByRole('button',{name:/Domenica al lago/}).waitFor();
    assert.equal(state.requests.filter(req=>['car_expenses','general_expenses','radar_positions'].includes(req.table)&&!['id','member_id'].includes(req.select)).length,0);
    console.log('PASS meteo riutilizzato dopo tre cambi tab; Home senza query spese/radar inutilizzate');
    await ctx.close();
  }
  {
    const {ctx,page,state}=await context(true);
    await page.goto(`${base}/room/${roomId}`);await page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'))});
    await page.getByRole('button',{name:'Conferma la tua presenza',exact:true}).click();
    await page.getByRole('heading',{name:'Troviamo il tuo passaggio'}).waitFor();
    await page.getByText('Salveremo la modifica al ritorno online',{exact:true}).waitFor();
    assert.equal(state.tables.members[0].confirmed,false);
    await page.getByRole('link',{name:'Gruppo',exact:true}).click();
    await page.getByRole('button',{name:'Aggiungi nota',exact:true}).click();
    await page.getByPlaceholder('Scrivi una nota...').fill('Nota offline');
    await page.getByRole('button',{name:'Aggiungi',exact:true}).click();
    await page.getByPlaceholder('Scrivi una nota...').waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt:offline-queue')).length),2);
    await page.evaluate(()=>{
      const queue=JSON.parse(localStorage.getItem('tt:offline-queue'));
      queue.unshift({id:'poison',name:'op-rimossa',args:[],label:'vecchia modifica',attempts:0});
      localStorage.setItem('tt:offline-queue',JSON.stringify(queue));
      Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});window.dispatchEvent(new Event('online'));
    });
    await page.getByText('Una modifica non salvata è stata persa. Ricontrolla i dati dell’evento.',{exact:true}).waitFor();
    await page.getByText('Nota offline',{exact:true}).waitFor();
    assert.equal(state.tables.members[0].confirmed,true);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tt:offline-queue')).length),0);
    console.log('PASS conferma presenza e nota offline con feedback; operazione irrecuperabile scartata con avviso e coda sbloccata');
    await ctx.close();
  }
  {
    const {ctx,page,state}=await context();
    await page.goto(base);await page.getByRole('button',{name:'Crea un evento',exact:true}).click();
    await page.getByLabel('Nome dell’evento').fill('Evento via RPC');await page.getByLabel('Il tuo nome').fill('Franco');
    await page.getByRole('dialog').getByRole('button',{name:'Crea evento',exact:true}).click();
    await page.getByRole('heading',{name:'Evento via RPC',exact:true}).waitFor();
    assert(state.requests.some(req=>req.table==='create_room_and_join'));
    assert.equal(state.requests.filter(req=>['rooms','members'].includes(req.table)&&req.method==='POST').length,0);
    await ctx.close();
    const joined=await context(true);
    await joined.page.goto(`${base}/join/LAGO42`);await joined.page.getByLabel('Il tuo nome').fill('Franco');
    joined.state.failTable='join_room';
    await joined.page.getByRole('button',{name:'Entra nella stanza',exact:true}).click();
    await joined.page.getByText('Non riusciamo a completare l’ingresso. Controlla l’invito e riprova.',{exact:true}).waitFor();
    assert.equal(await joined.page.getByText('Simulated error',{exact:true}).count(),0);
    joined.state.failTable=null;await joined.page.getByRole('button',{name:'Entra nella stanza',exact:true}).click();
    await joined.page.getByRole('heading',{name:'Domenica al lago',exact:true}).waitFor();
    assert(joined.state.requests.some(req=>req.table==='resolve_invite'));
    const token=Buffer.from(JSON.stringify({roomId,memberId,inviteCode:'LAGO42'})).toString('base64url');
    await joined.page.goto(`${base}/resume/${token}`);await joined.page.getByRole('heading',{name:'Ci sei anche tu?'}).waitFor();
    assert(joined.state.requests.some(req=>req.table==='claim_member'));
    console.log('PASS creazione, invito e recupero via RPC; errore di ingresso leggibile senza dettaglio SQL');
    await joined.ctx.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS nessun errore JavaScript');
} finally {await browser.close()}
