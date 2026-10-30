// Install the exact generated NSIS package on the disposable CI host, then boot it.
import {spawnSync} from 'node:child_process';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
if (process.platform !== 'win32') throw new Error('Windows installer verification needs Windows.');
const {version} = JSON.parse(await readFile('package.json','utf8'));
const root = await mkdtemp(path.join(os.tmpdir(),'trait-install-')), installed = path.join(root,'app');
const setup = path.resolve(`release/TraitStudio-${version}-Setup-x64.exe`);
const run = (file,args,env=process.env) => {const result=spawnSync(file,args,{env,encoding:'utf8',timeout:240000,windowsHide:true});if(result.status!==0)throw new Error(`${path.basename(file)}: ${result.error?.message||result.stderr||result.stdout||result.status}`);console.log(result.stdout);};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  run(setup,['/S',`/D=${installed}`]);
  const executable=path.join(installed,'Trait Studio.exe');
  for(const relative of ['Trait Studio.exe','resources/app.asar']) {
    const source=await readFile(path.join('release','win-unpacked',relative)),copy=await readFile(path.join(installed,relative));
    if(digest(source)!==digest(copy))throw new Error(`Installed ${relative} differs from the verified package.`);
  }
  run(process.execPath,['scripts/smoke-boot.mjs','--packaged'],{...process.env,STYK_PACKAGED_EXECUTABLE:executable});
  await writeFile('artifacts/trait-windows-install.json',JSON.stringify({version,installerSha256:digest(await readFile(setup)),installedPayloadMatches:true,bootAndRestartPassed:true},null,2));
} finally {
  spawnSync(path.join(installed,'Uninstall Trait Studio.exe'),['/S'],{timeout:60000,windowsHide:true});
  await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:500});
}
