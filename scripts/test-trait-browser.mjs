// Runs server and browser in the same network namespace; owns both lifetimes.
import {spawn} from 'node:child_process';
const port=Number(process.env.STYK_TEST_PORT||47837),url=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/serve.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
let diagnostic='';server.stderr.on('data',data=>{diagnostic=(diagnostic+data).slice(-4000);});
try{
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw new Error(`Server stopped: ${diagnostic}`);
    try{ready=(await fetch(url)).ok;}catch{}if(ready)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready)throw new Error(`Server did not start: ${diagnostic}`);
  const test=spawn(process.execPath,['tests/trait-studio.browser.mjs'],{stdio:'inherit',env:{...process.env,STYK_URL:url}});
  process.exitCode=await new Promise((resolve,reject)=>{test.on('error',reject);test.on('exit',code=>resolve(code??1));});
}finally{server.kill();}
