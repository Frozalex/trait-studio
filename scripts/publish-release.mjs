import {readFile, writeFile, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyReleaseAssets, fileHash} from './release-assets.mjs';
import {checkReleaseNotes} from './changelog.mjs';
await checkReleaseNotes();
const repo='Frozalex/trait-studio';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const directory=process.argv.find(arg=>arg.startsWith('--directory='))?.slice(12)||`release/${version}`;
const assets=await verifyReleaseAssets(directory,version),tag=`v${version}`;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.GITHUB_SHA)assert.equal(sha,process.env.GITHUB_SHA);
const gh=(args,input)=>execFileSync('gh',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],windowsHide:true});
const api=endpoint=>JSON.parse(gh(['api',`repos/${repo}/${endpoint}`]));
const checksums=path.join(directory,'SHA256SUMS.txt');
await writeFile(checksums,(await Promise.all(assets.map(async file=>`${await fileHash(file,'sha256','hex')}  ${path.basename(file)}`))).join('\n')+'\n');
const files=[...assets,checksums];
let release=api('releases?per_page=100').find(r=>r.tag_name===tag);
if(release)assert.equal(release.target_commitish,sha,'The existing release belongs to another commit.');
else release=JSON.parse(gh(['api','--method','POST',`repos/${repo}/releases`,'--input','-'],JSON.stringify({tag_name:tag,target_commitish:sha,name:`Trait Studio ${version}`,body:await readFile('release-notes.md','utf8'),draft:true,prerelease:false})));
if(release.draft){
  gh(['release','upload',tag,'--repo',repo,'--clobber',...files]);
  gh(['release','edit',tag,'--repo',repo,'--notes-file','release-notes.md']);
}
release=api(`releases/${release.id}`);
for(const file of files){
  const item=release.assets.find(a=>a.name===path.basename(file));
  assert.ok(item,`Missing ${path.basename(file)}`);assert.equal(item.state,'uploaded');
  assert.equal(item.size,(await stat(file)).size);assert.equal(item.digest,`sha256:${await fileHash(file,'sha256','hex')}`,`Checksum differs: ${item.name}`);
}
if(process.argv.includes('--publish')&&release.draft){
  release=JSON.parse(gh(['api','--method','PATCH',`repos/${repo}/releases/${release.id}`,'--input','-'],JSON.stringify({draft:false,make_latest:'true'})));
}
if(!release.draft)assert.equal(api(`commits/${tag}`).sha,sha,'Published tag differs from verified source.');
console.log(`${release.draft?'Draft verified':'Published and verified'}: ${release.html_url}`);
