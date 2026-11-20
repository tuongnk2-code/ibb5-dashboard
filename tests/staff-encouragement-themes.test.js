import test from 'node:test';
import assert from 'node:assert/strict';
import { nextEncouragementTheme, ENCOURAGEMENT_THEMES } from '../js/staffEncouragementThemes.js';

test('each positive cycle shows all six distinct backgrounds and symbols without adjacent repetition',()=>{
 let history={},previous;
 for(let cycle=0;cycle<15;cycle++){
  const ids=new Set(),backgrounds=new Set();
  for(let turn=0;turn<6;turn++){
   const result=nextEncouragementTheme('positive',history,()=>.41);
   assert.notEqual(result.id,previous);assert.ok(ENCOURAGEMENT_THEMES[result.id]);
   ids.add(result.id);backgrounds.add(result.theme.colors.join(','));previous=result.id;history=JSON.parse(JSON.stringify(result.history));
  }
  assert.equal(ids.size,6);assert.equal(backgrounds.size,6);
 }
});
test('negative and neutral messages use encouraging scenes and safely recover stored history',()=>{
 let history={last:'trophy',remaining:['trophy','unknown','flame','flame']};
 for(const kind of ['negative','neutral','unavailable','positive','negative']){
  const result=nextEncouragementTheme(kind,history,()=>0);
  assert.notEqual(result.id,history.last);if(kind!=='positive')assert.notEqual(result.id,'trophy');
  history=result.history;
 }
 for(const malformed of [null,false,'old',{}, {last:'rocket',remaining:'bad'}])assert.ok(nextEncouragementTheme('positive',malformed).id);
});
