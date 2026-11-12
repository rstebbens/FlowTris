const SPREADSHEET_ID = '1tGqSHPNsweecyHcr6HcUnpKF85p6P5GqxnQSWTDexZU';
const GAME_HEADERS = ['Game ID','Player ID','Started at (UTC)','Finished at (UTC)','Status','Initials','Score','Value released','Flow efficiency','Seed','Duration (s)','Client version'];
const TOP_HEADERS = ['Rank','Initials','Score','Flow efficiency','Date (UTC)','Game ID'];
const PLAYER_HEADERS = ['Player ID','Initials (latest)','Games started','Games finished','Personal best','Last played (UTC)'];

function tab_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Missing tab: ' + name);
  return sheet;
}
function output_(value, callback) {
  const body = JSON.stringify(value);
  if (callback) {
    // Only JavaScript identifiers accepted; never interpolate arbitrary code.
    if (!/^[A-Za-z_$][\w$]{0,99}$/.test(callback)) {
      return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Invalid callback'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
function getRecords_() {
  const sheet = tab_('Games');
  return sheet.getLastRow() < 2 ? [] :
    sheet.getRange(2,1,sheet.getLastRow()-1,12).getValues()
      .filter(r => String(r[0]).trim());
}
function isFinished_(r) { return r[4] === 'completed' || r[4] === 'gameover'; }
function statistics_(records) {
  const complete = records.filter(r => isFinished_(r) && Number.isFinite(Number(r[6])));
  complete.sort((a,b) => Number(b[6])-Number(a[6]) || String(a[3]).localeCompare(String(b[3])));
  const top10 = complete.slice(0,10).map((r,i) => ({
    rank:i+1, initials:String(r[5]||'AAA'), score:Number(r[6]),
    efficiency:Number(r[8])||0,
    date:r[3] instanceof Date ? r[3].toISOString() : String(r[3]||''),
    gameId:String(r[0])
  }));
  const players = new Map();
  records.forEach(r=>{
    const id=String(r[1]||'');
    if (!id) return;
    if (!players.has(id)) players.set(id,{
      playerId:id,initials:'AAA',plays:0,finished:0,highScore:0,lastPlayed:''
    });
    const p=players.get(id);
    p.plays++;
    if (r[5]) p.initials=String(r[5]);
    if (isFinished_(r)) {
      p.finished++;
      p.highScore=Math.max(p.highScore,Number(r[6])||0);
    }
    const date=r[3] instanceof Date?r[3]:r[2];
    const stamp=date instanceof Date?date.toISOString():String(date||'');
    if (stamp>p.lastPlayed) p.lastPlayed=stamp;
  });
  return {ok:true,top10,players:[...players.values()],totalPlays:records.length};
}

function doGet(e) {
  const callback = e && e.parameter
    ? e.parameter.callback
    : '';

  try {
    const data = statistics_(getRecords_());

    if (callback) {
      if (!/^[A-Za-z_$][\w$]{0,99}$/.test(callback)) {
        throw new Error('Invalid callback');
      }

      return ContentService
        .createTextOutput(
          callback + '(' + JSON.stringify(data) + ');'
        )
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(
        JSON.stringify({ ok: false, error: String(err) })
      )
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function refreshSummaryTabs_() {
  const stats=statistics_(getRecords_());
  const top=tab_('Top 10'), players=tab_('Players');
  const topRows=stats.top10.map(x=>[x.rank,x.initials,x.score,x.efficiency,x.date,x.gameId]);
  const playerRows=stats.players.sort((a,b)=>b.highScore-a.highScore)
    .map(x=>[x.playerId,x.initials,x.plays,x.finished,x.highScore,x.lastPlayed]);
  [[top,TOP_HEADERS,topRows],[players,PLAYER_HEADERS,playerRows]].forEach(([sh,headers,rows])=>{
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    const old=Math.max(0,sh.getLastRow()-1);
    if(old)sh.getRange(2,1,old,headers.length).clearContent();
    if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows);
  });
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  refreshSummaryTabs_();
  try {
    if(!e||!e.postData||!e.postData.contents)throw Error('Missing POST body');
    const data=JSON.parse(e.postData.contents);
    const action=String(data.action||'');
    const gameId=String(data.gameId||'').slice(0,100);
    const playerId=String(data.playerId||'').slice(0,100);
    if(!gameId||!playerId)return output_({ok:false,error:'Missing IDs'});
    lock.waitLock(20000);
    const sh=tab_('Games');
    const records=getRecords_();
    const index=records.findIndex(r=>String(r[0])===gameId);
    if(action==='start'){
      if(index!==-1)return output_({ok:true,duplicate:true});
      sh.appendRow([gameId,playerId,new Date(),'','started','','','','',
        Number(data.seed)||0,'',String(data.version||'').slice(0,30)]);
      refreshSummaryTabs_();
      return output_({ok:true});
    }
    if(action==='finish'){
      if(index<0)return output_({ok:false,error:'Game not found'});
      const old=records[index];
      if(String(old[1])!==playerId)return output_({ok:false,error:'Player mismatch'});
      if(old[4]!=='started')return output_({ok:false,error:'Already finished'});
      const score=Number(data.score),value=Number(data.value);
      const efficiency=Number(data.efficiency),duration=Number(data.duration);
      if(![score,value,efficiency,duration].every(Number.isFinite)||
          score<0||value<0||efficiency<0||efficiency>1||duration<0||duration>301||
          score>value+1) return output_({ok:false,error:'Invalid result'});
      let initials=String(data.initials||'AAA').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3).padEnd(3,'A');
      const banned=new Set(['SEX','FUK','FUC','FCK','FUX','CUM','COK','COC','DIK','DIC','ASS','TIT','PIS','CNT','NIG','KKK','WTF']);
      if(banned.has(initials))initials='XXX';
      sh.getRange(index+2,4,1,9).setValues([[
        new Date(),data.status==='gameover'?'gameover':'completed',initials,
        Math.round(score),Math.round(value),efficiency,old[9],duration,old[11]
      ]]);
      refreshSummaryTabs_();
      return output_({ok:true});
    }
    return output_({ok:false,error:'Unknown action'});
  }catch(err){return output_({ok:false,error:String(err)});}
  finally{if(lock.hasLock())lock.releaseLock();}

}
// Run this once to rebuild the two summary tabs from existing Games records.
function refreshSummaryTabs(){refreshSummaryTabs_();}
