const $=s=>document.querySelector(s), input=$('#fileInput'), collection=$('#documents'), toast=$('#toast');
let docs=[],toastTimer;
function notify(text,duration=2800){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),duration)}
function icon(ext){return (ext||'FILE').toUpperCase().slice(0,4)}
async function refresh(){try{docs=await (await fetch('/api/documents')).json();renderDocs()}catch{}}
function renderDocs(){collection.innerHTML=docs.length?docs.map(d=>`<div class="doc-row"><span class="doc-icon">${icon(d.file_type)}</span><span class="doc-meta"><div class="doc-name" title="${esc(d.document_name)}">${esc(d.document_name)}</div><div class="doc-state"><i class="ready-dot"></i>${d.status==='ready'?`${d.evidence_count} evidence items`:esc(d.status)}</div></span></div>`).join(''):'<div class="empty-collection">Your documents will appear here after upload.</div>';$('#sourceCount').textContent=docs.length?`${docs.length} document${docs.length===1?'':'s'} in this workspace`:'Upload documents to start asking'}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function upload(files){
  if(!files?.length)return;
  const data=new FormData();[...files].forEach(f=>data.append('files',f));
  notify(`Uploading ${files.length} file${files.length===1?'':'s'}…`);
  try{
    const result=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload');
      xhr.upload.onprogress=e=>{if(e.lengthComputable)notify(`Uploading… ${Math.round(e.loaded/e.total*100)}%`)};
      xhr.upload.onload=()=>notify('Upload complete. Extracting text and indexing…',120000);
      xhr.onload=()=>{let body;try{body=JSON.parse(xhr.responseText)}catch{reject(new Error(`Server returned HTTP ${xhr.status}. Check the terminal running DocuMind for details.`));return}if(xhr.status<200||xhr.status>=300){reject(new Error(body.detail||`Upload failed (HTTP ${xhr.status}).`));return}resolve(body)};
      xhr.onerror=()=>reject(new Error('Could not reach the document service during upload.'));
      xhr.send(data);
    });
    await refresh();
    const errors=result.results.filter(x=>x.status==='error');
    if(errors.length){console.error('DocuMind upload errors:',errors);const detail=errors.map(x=>`${x.document_name}: ${x.error}`).join(' · ');notify(detail.length>150?`${errors.length} file(s) failed. Open browser console for details.`:detail)}
    else notify(`${result.results.length} file${result.results.length===1?'':'s'} processed and indexed`)
  }catch(error){console.error('DocuMind upload failed:',error);notify(error.message||'Upload failed. Check the server terminal and try again.')}
}
$('#uploadCard').onclick=()=>input.click();$('#sideAdd').onclick=()=>input.click();input.onchange=()=>{upload(input.files);input.value=''};
$('#attachFile').onclick=()=>input.click();
$('#uploadCard').ondragover=e=>{e.preventDefault();e.currentTarget.classList.add('dragover')};$('#uploadCard').ondragleave=e=>e.currentTarget.classList.remove('dragover');$('#uploadCard').ondrop=e=>{e.preventDefault();e.currentTarget.classList.remove('dragover');upload(e.dataTransfer.files)};
document.querySelectorAll('.suggestion').forEach(b=>b.onclick=()=>{$('#question').value=b.dataset.question;$('#question').focus()});
$('#newChat').onclick=()=>{$('#messages').innerHTML='';$('#chatArea').classList.add('hidden');$('#welcome').classList.remove('hidden');$('.breadcrumbs b').textContent='New conversation';$('#question').value=''};
$('#question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});$('#question').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,130)+'px'});$('#send').onclick=ask;
let searchTimer;$('#collectionSearch').addEventListener('input',e=>{clearTimeout(searchTimer);const q=e.target.value.trim(), box=$('#searchResults');if(!q){box.classList.add('hidden');box.innerHTML='';return}searchTimer=setTimeout(async()=>{try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,limit:6})});const data=await r.json();box.innerHTML=data.results.length?data.results.map(x=>`<div class="search-result"><b>${esc(x.document_name)} <small>${esc(x.source_reference||formatLocation(x.location))}</small></b>${esc(x.content.slice(0,150))}</div>`).join(''):'<div class="search-result">No matching evidence found.</div>';box.classList.remove('hidden')}catch{box.innerHTML='<div class="search-result">Search is unavailable.</div>';box.classList.remove('hidden')}},180)});
async function ask(){const box=$('#question'),q=box.value.trim();if(!q)return;if(!docs.length){notify('Upload at least one document first');return}box.value='';box.style.height='auto';$('#welcome').classList.add('hidden');$('#chatArea').classList.remove('hidden');$('.breadcrumbs b').textContent='Conversation';const messages=$('#messages');messages.insertAdjacentHTML('beforeend',`<div class="user-message">${esc(q)}</div><div class="assistant-message loading" id="pending">Reading your documents and preparing a detailed answer…</div>`);messages.scrollIntoView({block:'end',behavior:'smooth'});try{const res=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});const answer=await res.json();if(!res.ok)throw new Error(answer.detail||`Request failed (HTTP ${res.status}).`);$('#pending').outerHTML=renderAnswer(answer);messages.scrollIntoView({block:'end',behavior:'smooth'})}catch(error){$('#pending').textContent=error.message||'Could not reach the document service. Please try again.'}}
function renderAnswer(a){const paragraphs=String(a.answer||'').split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');return `<div class="assistant-message"><div class="assistant-label"><span>✳</span> DOCUMIND</div><div class="answer-text">${paragraphs}</div></div>`}
function formatLocation(loc){return Object.entries(loc||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')}
refresh();
