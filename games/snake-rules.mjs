export const gridSize=16;
export const directions={
  ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],
  w:[0,-1],d:[1,0],s:[0,1],a:[-1,0],W:[0,-1],D:[1,0],S:[0,1],A:[-1,0]
};

export function isReverse(current,next){
  return current[0]+next[0]===0&&current[1]+next[1]===0;
}

export function advanceSnake(snake,direction,food,size=gridSize){
  const x=snake[0]%size+direction[0];
  const y=Math.floor(snake[0]/size)+direction[1];
  if(x<0||x>=size||y<0||y>=size)return {snake,ate:false,dead:true,won:false};
  const head=y*size+x,ate=head===food;
  const body=snake.slice(0,ate?snake.length:-1);
  if(body.includes(head))return {snake,ate:false,dead:true,won:false};
  const moved=[head,...snake];
  if(!ate)moved.pop();
  return {snake:moved,ate,dead:false,won:moved.length===size*size};
}

export function nextFood(snake,random=Math.random,size=gridSize){
  if(snake.length>=size*size)return undefined;
  const occupied=new Set(snake);
  const open=[];
  for(let index=0;index<size*size;index++)if(!occupied.has(index))open.push(index);
  return open[Math.min(open.length-1,Math.floor(random()*open.length))];
}
