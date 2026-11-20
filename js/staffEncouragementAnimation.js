export function animateEncouragement(canvas,kind) {
  const context=canvas.getContext('2d');if(!context)return ()=>{};
  const positive=kind==='positive',accent=positive?'#66e4b5':'#88c8ff',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0,stopped=false;const started=performance.now();
  function circle(x,y,r,fill){context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fillStyle=fill;context.fill();}
  function rocket(t){
    const c=context;c.save();c.rotate(-.22+.018*Math.sin(t*2));const flame=1+.1*Math.sin(t*26);
    const glow=c.createRadialGradient(0,146,8,0,146,120);glow.addColorStop(0,'#ffb95870');glow.addColorStop(1,'#ffb95800');circle(0,152,120,glow);
    c.fillStyle='#ff8843';c.beginPath();c.moveTo(-24,88);c.bezierCurveTo(-40,141,-10,181*flame,0,205*flame);c.bezierCurveTo(22,176,41,135,24,88);c.closePath();c.fill();
    c.fillStyle='#ffe5a5';c.beginPath();c.moveTo(-12,91);c.quadraticCurveTo(-17,139,0,164*flame);c.quadraticCurveTo(18,130,12,91);c.fill();
    const fin=c.createLinearGradient(-92,0,54,100);fin.addColorStop(0,'#3998f4');fin.addColorStop(1,'#1557aa');c.fillStyle=fin;
    c.beginPath();c.moveTo(-43,-12);c.quadraticCurveTo(-93,22,-88,99);c.lineTo(-36,67);c.fill();
    c.beginPath();c.moveTo(43,-12);c.quadraticCurveTo(93,22,88,99);c.lineTo(36,67);c.fill();
    const body=c.createLinearGradient(-57,0,62,0);body.addColorStop(0,'#bfd7ed');body.addColorStop(.44,'#ffffff');body.addColorStop(1,'#b8cde1');c.fillStyle=body;
    c.beginPath();c.moveTo(0,-154);c.bezierCurveTo(-71,-93,-66,25,-35,89);c.quadraticCurveTo(0,101,35,89);c.bezierCurveTo(66,25,71,-93,0,-154);c.fill();
    c.beginPath();c.moveTo(0,-154);c.bezierCurveTo(-30,-128,-41,-99,-44,-82);c.quadraticCurveTo(0,-66,44,-82);c.bezierCurveTo(36,-113,20,-135,0,-154);c.fillStyle='#428fe3';c.fill();
    circle(0,-22,36,'#d0e1ef');circle(0,-22,29,'#0b3c6c');const glass=c.createLinearGradient(-24,-47,21,4);glass.addColorStop(0,'#78e1f1');glass.addColorStop(1,'#1b79bd');circle(0,-22,24,glass);circle(-8,-31,6,'#ffffff99');
    c.fillStyle='#205388';c.beginPath();c.roundRect(-24,82,48,13,4);c.fill();c.strokeStyle='#ffffff90';c.lineWidth=3;c.beginPath();c.moveTo(-27,-63);c.quadraticCurveTo(-37,-41,-34,-12);c.stroke();c.restore();
  }
  function draw(now){
    if(stopped)return;const t=reduced?2:Math.min((now-started)/1000,5),width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    const c=context;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);c.save();c.translate(width*.5,height*.44);const scale=Math.min(width/390,height/500);c.scale(scale,scale);
    c.strokeStyle='#d5eeff20';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,135+i*38,185+i*30,-.4,0,Math.PI*2);c.stroke();}
    c.save();c.translate(12*Math.sin(t*.6),-t*(positive?9:6));rocket(t);c.restore();
    for(let i=0;i<10;i++){const angle=i*2.399+t*.12,x=Math.cos(angle)*(170+i%3*18),y=Math.sin(angle)*205;c.globalAlpha=.3+i%3*.2;circle(x,y,i%2?2:3,accent);}c.globalAlpha=1;
    if(positive){const burst=Math.max(0,Math.min(1,(t-.6)/3.8));for(let i=0;i<40;i++){const angle=i*2.39996,dist=35+burst*(100+(i%8)*20);c.save();c.globalAlpha=Math.min(1,(1-burst)*2)*.7;c.translate(Math.cos(angle)*dist,Math.sin(angle)*dist+burst*burst*90);c.rotate(angle+t*1.4);c.fillStyle=['#79e9bc','#ffc777','#88c9ff','#f5f8ff'][i%4];c.fillRect(-2,-4,4,8);c.restore();}}
    c.restore();if(!reduced)frame=requestAnimationFrame(draw);
  }
  draw(started);return ()=>{stopped=true;cancelAnimationFrame(frame);};
}
