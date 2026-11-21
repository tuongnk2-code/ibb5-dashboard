export const ENCOURAGEMENT_THEMES = {
  rocket:{accent:'#88c8ff',colors:['#07213f','#15375c','#28487a'],glow:'#35588766'},
  sunrise:{accent:'#ffdc96',colors:['#291a3b','#683651','#9b4d43'],glow:'#ffbe6733'},
  flame:{accent:'#ffc499',colors:['#21143d','#49316f','#6f3560'],glow:'#ffab7d22'},
  trophy:{accent:'#ffe494',colors:['#082f38','#0e5754','#1f6854'],glow:'#ffdb7022'},
  target:{accent:'#9ff4df',colors:['#09283e','#145c72','#237b84'],glow:'#57e8cb22'},
  mountain:{accent:'#ded8ff',colors:['#142546','#364c7a','#59638b'],glow:'#b6a0ff22'},
};

export const ENCOURAGEMENT_BACKGROUNDS={
  'mountain-dawn':{author:'Johannes Plenio',url:'https://www.pexels.com/photo/aerial-view-of-mountain-during-dawn-1133504/'},
  'mountain-lake':{author:'James Wheeler',url:'https://www.pexels.com/photo/landscape-photography-of-mountain-1574184/'},
  'winding-road':{author:'Wendy Wei',url:'https://www.pexels.com/photo/road-on-mountain-2994427/'},
  'ocean-sunrise':{author:'IAN',url:'https://www.pexels.com/photo/amazing-seascape-with-sun-rising-over-ocean-19012197/'},
  'sunlit-forest':{author:'Jacob Colvin',url:'https://www.pexels.com/photo/scenic-photo-of-forest-with-sunlight-1757363/'},
  'road-forward':{author:'Sergey Lexin',url:'https://www.pexels.com/photo/landscape-photography-of-road-between-mountain-and-trees-3173202/'},
};
export function nextEncouragementBackground(history={},random=Math.random){
  const pool=Object.keys(ENCOURAGEMENT_BACKGROUNDS);
  let remaining=Array.isArray(history?.remaining)?[...new Set(history.remaining.filter(id=>pool.includes(id)))]:[];
  if(!remaining.length)remaining=[...pool];let candidates=remaining.filter(id=>id!==history?.last);
  if(!candidates.length){remaining=[...pool];candidates=remaining.filter(id=>id!==history?.last);}
  const id=candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)))];
  return {id,src:'/encouragement/'+id+'.webp',...ENCOURAGEMENT_BACKGROUNDS[id],history:{last:id,remaining:remaining.filter(value=>value!==id)}};
}

// A shuffled bag avoids the previous illustration and uses each eligible theme before cycling.
export function nextEncouragementTheme(kind,history={},random=Math.random) {
  const pool=Object.keys(ENCOURAGEMENT_THEMES).filter(id=>id!=='trophy'||kind==='positive');
  let remaining=Array.isArray(history?.remaining)?[...new Set(history.remaining.filter(id=>pool.includes(id)))]:[];
  if(!remaining.length)remaining=[...pool];
  let candidates=remaining.filter(id=>id!==history?.last);
  if(!candidates.length){remaining=[...pool];candidates=remaining.filter(id=>id!==history?.last);}
  const index=Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length))),id=candidates[index];
  return {id,theme:ENCOURAGEMENT_THEMES[id],history:{last:id,remaining:remaining.filter(value=>value!==id)}};
}
