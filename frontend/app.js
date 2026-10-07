const $=s=>document.querySelector(s), input=$('#fileInput'), collection=$('#documents'), toast=$('#toast');
let docs=[],toastTimer;
function notify(text,duration=2800){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),duration)}
const themeStorageKey='documind-theme';
const themeChoices=['light','dark','system'];
const themeMedia=window.matchMedia('(prefers-color-scheme: dark)');
const languageKey='documind-language', foregroundKey='documind-foreground';
const projectsKey='documind-projects', activeProjectKey='documind-active-project';
const personalChatsId='personal-chats';
const translations={
  en:{workspace:'Personal workspace',workspaceLabel:'Workspace',freePlan:'Free plan',settings:'Settings',profile:'Profile',personalization:'Personalization',newConversation:'New conversation',privateWorkspace:'Private workspace',language:'Interface language',languageHint:'Choose the language used throughout DocuMind.',theme:'Appearance',themeHint:'Choose how the workspace background and surfaces behave.',foreground:'Foreground color',foregroundHint:'Customize the primary text and control color.',light:'Light',dark:'Dark',system:'System',activity:'Your activity',activityHint:'Days you opened DocuMind this year.',noActivity:'No activity recorded yet.',resetColor:'Reset color',save:'Done',documents:'documents',evidence:'evidence items'},
  de:{workspace:'Persönlicher Arbeitsbereich',workspaceLabel:'Arbeitsbereich',freePlan:'Kostenloser Tarif',settings:'Einstellungen',profile:'Profil',personalization:'Personalisierung',newConversation:'Neue Unterhaltung',privateWorkspace:'Privater Arbeitsbereich',language:'Sprache der Oberfläche',languageHint:'Wählen Sie die Sprache für DocuMind.',theme:'Darstellung',themeHint:'Legen Sie Hintergrund und Oberflächen des Arbeitsbereichs fest.',foreground:'Textfarbe',foregroundHint:'Passen Sie die primäre Text- und Steuerungsfarbe an.',light:'Hell',dark:'Dunkel',system:'System',activity:'Ihre Aktivität',activityHint:'Tage, an denen Sie DocuMind dieses Jahr geöffnet haben.',noActivity:'Noch keine Aktivität aufgezeichnet.',resetColor:'Farbe zurücksetzen',save:'Fertig',documents:'Dokumente',evidence:'Belege'},
  es:{workspace:'Espacio personal',workspaceLabel:'Espacio de trabajo',freePlan:'Plan gratuito',settings:'Configuración',profile:'Perfil',personalization:'Personalización',newConversation:'Nueva conversación',privateWorkspace:'Espacio privado',language:'Idioma de la interfaz',languageHint:'Elige el idioma de DocuMind.',theme:'Apariencia',themeHint:'Elige el fondo y las superficies del espacio de trabajo.',foreground:'Color de texto',foregroundHint:'Personaliza el color principal del texto y los controles.',light:'Claro',dark:'Oscuro',system:'Sistema',activity:'Tu actividad',activityHint:'Días que abriste DocuMind este año.',noActivity:'Todavía no hay actividad registrada.',resetColor:'Restablecer color',save:'Listo',documents:'documentos',evidence:'elementos de evidencia'},
  fr:{workspace:'Espace personnel',workspaceLabel:'Espace de travail',freePlan:'Offre gratuite',settings:'Paramètres',profile:'Profil',personalization:'Personnalisation',newConversation:'Nouvelle conversation',privateWorkspace:'Espace privé',language:'Langue de l’interface',languageHint:'Choisissez la langue de DocuMind.',theme:'Apparence',themeHint:'Choisissez le fond et les surfaces de l’espace de travail.',foreground:'Couleur du texte',foregroundHint:'Personnalisez la couleur principale du texte et des contrôles.',light:'Clair',dark:'Sombre',system:'Système',activity:'Votre activité',activityHint:'Jours où vous avez ouvert DocuMind cette année.',noActivity:'Aucune activité enregistrée.',resetColor:'Réinitialiser la couleur',save:'Terminé',documents:'documents',evidence:'éléments de preuve'}
};
let language=localStorage.getItem(languageKey)||'en';
let projects=JSON.parse(localStorage.getItem(projectsKey)||'null')||[{id:'personal',name:'Personal project',conversations:[{id:'conversation-1',title:'New conversation'}]}];
if(!projects.some(project=>project.id===personalChatsId))projects.push({id:personalChatsId,name:'History',conversations:[]});
projects.forEach(project=>{project.conversations=project.conversations||[];project.conversations.forEach(conversation=>{conversation.messages=conversation.messages||[]})});
let activeProjectId=localStorage.getItem(activeProjectKey)||projects[0].id;
let currentConversationId=projects.find(project=>project.id===activeProjectId)?.conversations[0]?.id||null;
let menuTargetProjectId=null, menuTargetConversationId=null, menuSourceProjectId=null;
function saveProjects(){localStorage.setItem(projectsKey,JSON.stringify(projects));localStorage.setItem(activeProjectKey,activeProjectId)}
function activeProject(){return projects.find(project=>project.id===activeProjectId)||null}
function activeConversation(){const project=activeProject();return project?.conversations.find(conversation=>conversation.id===currentConversationId)||project?.conversations[0]||null}
function renderProjects(){
  $('#projects').innerHTML=projects.filter(project=>project.id!==personalChatsId).map(project=>`<div class="project-group ${project.id===activeProjectId?'active':''}" data-project-id="${project.id}"><div class="project-line"><button class="project-row" type="button"><span class="project-mark">◇</span><span class="project-name">${esc(project.name)}</span><span class="project-count">${project.conversations.length}</span></button><button class="item-menu-button" type="button" aria-label="Project options" data-project-menu="${project.id}">···</button><div class="item-menu hidden" data-project-options="${project.id}"><button type="button" data-project-action="rename">Rename</button><button type="button" data-project-action="delete">Delete</button></div></div>${project.id===activeProjectId?`<div class="project-conversations">${project.conversations.map(conversation=>conversationMarkup(conversation,project.id)).join('')}</div>`:''}</div>`).join('');
  const personalChats=projects.find(project=>project.id===personalChatsId);
  $('#workspaceConversations').innerHTML=(personalChats?.conversations||[]).map(conversation=>conversationMarkup(conversation,personalChatsId,true)).join('');
  document.querySelectorAll('[data-project-id]').forEach(row=>row.querySelector('.project-row').onclick=()=>{activeProjectId=row.dataset.projectId;const project=activeProject();currentConversationId=project?.conversations[0]?.id||null;saveProjects();renderProjects();renderConversationTitle();renderConversationHistory()});
  document.querySelectorAll('[data-conversation-id]').forEach(row=>row.onclick=()=>{currentConversationId=row.dataset.conversationId;activeProjectId=row.dataset.conversationProject;saveProjects();renderProjects();renderConversationTitle();renderConversationHistory()});
  document.querySelectorAll('[data-project-menu]').forEach(button=>button.onclick=e=>{e.stopPropagation();toggleItemMenu('project',button.dataset.projectMenu)});
  document.querySelectorAll('[data-conversation-menu]').forEach(button=>button.onclick=e=>{e.stopPropagation();toggleItemMenu('conversation',button.dataset.conversationMenu)});
  document.querySelectorAll('[data-project-action]').forEach(button=>button.onclick=e=>{e.stopPropagation();const id=button.closest('[data-project-options]').dataset.projectOptions;menuTargetProjectId=id;const action=button.dataset.projectAction;closeItemMenus();if(action==='rename')openPanel('renameProject');if(action==='delete')deleteProject(id)});
  document.querySelectorAll('[data-conversation-action]').forEach(button=>button.onclick=e=>{e.stopPropagation();const menu=button.closest('[data-conversation-options]');menuTargetConversationId=menu.dataset.sourceConversation;menuSourceProjectId=menu.dataset.sourceProject;const action=button.dataset.conversationAction;closeItemMenus();if(action==='rename')openPanel('renameConversation');if(action==='unassign')moveConversationToPersonalChats(menuSourceProjectId,menuTargetConversationId);if(action==='move'){const projectCount=projects.filter(project=>project.id!==personalChatsId).length;if(projectCount<(menuSourceProjectId===personalChatsId?1:2)){notify('Create another project before moving a conversation');return}openPanel('moveConversation')}if(action==='delete')deleteConversation(menuSourceProjectId,menuTargetConversationId)});
}
function conversationMarkup(conversation,projectId,workspace=false){const key=workspace?`workspace-${conversation.id}`:conversation.id;const isPersonal=projectId===personalChatsId;return `<div class="conversation-line ${workspace?'workspace-conversation':''}"><button class="conversation-row ${conversation.id===currentConversationId?'active':''}" type="button" data-conversation-id="${conversation.id}" data-conversation-project="${projectId}">${esc(conversation.title)}</button><button class="item-menu-button" type="button" aria-label="Conversation options" data-conversation-menu="${key}" data-source-conversation="${conversation.id}" data-source-project="${projectId}">···</button><div class="item-menu item-menu-conversation hidden" data-conversation-options="${key}" data-source-conversation="${conversation.id}" data-source-project="${projectId}"><button type="button" data-conversation-action="rename">Rename</button>${isPersonal?'<button type="button" data-conversation-action="move">Add to project</button>':'<button type="button" data-conversation-action="unassign">Move to History</button><button type="button" data-conversation-action="move">Add to project</button>'}<button type="button" data-conversation-action="delete">Delete</button></div></div>`}
function closeItemMenus(){document.querySelectorAll('.item-menu').forEach(menu=>menu.classList.add('hidden'))}
function toggleItemMenu(type,id){closeItemMenus();const menu=$(type==='project'?`[data-project-options="${id}"]`:`[data-conversation-options="${id}"]`);menu.classList.remove('hidden')}
function renderConversationTitle(){const conversation=activeConversation();$('#conversationTitle').textContent=conversation?.title||'New conversation';$('#conversationTitle').removeAttribute('data-i18n');$('#renameConversation').classList.toggle('hidden',!conversation)}
function renderConversationHistory(){const conversation=activeConversation(),messages=conversation?.messages||[],target=$('#messages');target.innerHTML=messages.map(message=>message.role==='assistant'?renderAnswer({answer:message.content}):`<div class="user-message">${esc(message.content)}</div>`).join('');$('#chatArea').classList.toggle('hidden',messages.length===0);$('#welcome').classList.toggle('hidden',messages.length>0);$('#question').value='';$('#question').style.height='auto';if(messages.length)target.scrollIntoView({block:'end'})}
function renameConversation(){
  openPanel('renameConversation');
}
function createProject(){
  openPanel('createProject');
}
function deleteConversation(projectId,conversationId){
  const project=projects.find(item=>item.id===projectId);if(!project)return;
  project.conversations=project.conversations.filter(item=>item.id!==conversationId);
  if(currentConversationId===conversationId){currentConversationId=project.conversations[0]?.id||null;activeProjectId=projectId}
  saveProjects();renderProjects();renderConversationTitle();renderConversationHistory();
}
function moveConversationToPersonalChats(projectId,conversationId){
  const source=projects.find(project=>project.id===projectId),destination=projects.find(project=>project.id===personalChatsId),conversation=source?.conversations.find(item=>item.id===conversationId);
  if(!source||!destination||!conversation)return;
  source.conversations=source.conversations.filter(item=>item.id!==conversationId);destination.conversations.unshift(conversation);
  if(currentConversationId===conversationId&&activeProjectId===projectId)activeProjectId=personalChatsId;
  saveProjects();renderProjects();renderConversationTitle();renderConversationHistory();
}
function deleteProject(projectId){
  if(!projects.find(item=>item.id===projectId))return;
  menuTargetProjectId=projectId;openPanel('confirmDeleteProject');
}
function confirmDeleteProject(projectId){
  const project=projects.find(item=>item.id===projectId);if(!project)return;
  projects=projects.filter(item=>item.id!==projectId);
  if(activeProjectId===projectId){activeProjectId=projects[0]?.id||null;currentConversationId=projects[0]?.conversations[0]?.id||null}
  saveProjects();renderProjects();renderConversationTitle();renderConversationHistory();
}
function t(key){return (translations[language]||translations.en)[key]||translations.en[key]||key}
function applyTranslations(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n));
}
function recordVisit(){
  const key=new Date().getFullYear(), today=new Date().toISOString().slice(0,10);
  const activity=JSON.parse(localStorage.getItem('documind-activity')||'{}');
  activity[key]=activity[key]||{};
  activity[key][today]=(activity[key][today]||0)+1;
  localStorage.setItem('documind-activity',JSON.stringify(activity));
}
function setForeground(color){
  const valid=/^#[0-9a-f]{6}$/i.test(color)?color:null;
  if(!valid){localStorage.removeItem(foregroundKey);document.documentElement.style.removeProperty('--foreground');document.documentElement.style.removeProperty('--accent-foreground');return}
  localStorage.setItem(foregroundKey,valid);
  document.documentElement.style.setProperty('--foreground',valid);
  const rgb=valid.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16));
  const luminance=(0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2])/255;
  document.documentElement.style.setProperty('--accent-foreground',luminance>0.55?'#000000':'#ffffff');
}
function renderActivity(){
  const year=new Date().getFullYear(), activity=JSON.parse(localStorage.getItem('documind-activity')||'{}')[year]||{};
  const start=new Date(year,0,1), days=Array.from({length:365+(new Date(year,11,31).getDay()===2?1:0)},(_,i)=>new Date(year,0,i+1));
  return `<div class="activity-grid" aria-label="${year} activity">${days.map(day=>{const date=day.toISOString().slice(0,10), count=activity[date]||0;return `<span class="activity-cell level-${Math.min(count,4)}" title="${count} visit${count===1?'':'s'} on ${date}"></span>`}).join('')}</div>`;
}
function openPanel(panel){
  const content=$('#panelContent'), title=$('#panelTitle');
  const templates={
    settings:`<div class="setting-group"><label for="languageSelect">${t('language')}</label><p>${t('languageHint')}</p><select id="languageSelect"><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option><option value="fr">Français</option></select></div>`,
    profile:`<div class="setting-group"><label>${t('activity')}</label><p>${t('activityHint')}</p>${renderActivity()}<div class="activity-legend"><span>Less</span><i></i><i></i><i></i><i></i><span>More</span></div></div>`,
    personalization:`<div class="setting-group"><label>${t('theme')}</label><p>${t('themeHint')}</p><div class="theme-control panel-theme" role="group" aria-label="${t('theme')}">${themeChoices.map(choice=>`<button class="theme-option" type="button" data-theme-choice="${choice}">${t(choice)}</button>`).join('')}</div></div><div class="setting-group"><label for="foregroundColor">${t('foreground')}</label><p>${t('foregroundHint')}</p><div class="color-row"><input id="foregroundColor" type="color" value="${localStorage.getItem(foregroundKey)||'#111111'}"><button class="text-button" id="resetForeground">${t('resetColor')}</button></div></div>`,
    renameConversation:`<div class="setting-group"><label for="conversationName">Conversation name</label><p>Give this conversation a clear name so you can find it in the project.</p><input class="panel-input" id="conversationName" value="${esc(activeConversation()?.title||'New conversation')}" maxlength="80"><button class="panel-primary" id="saveConversationName">Save name</button></div>`,
    createProject:`<div class="setting-group"><label for="projectName">Project name</label><p>Group related conversations together under a shared project.</p><input class="panel-input" id="projectName" placeholder="e.g. Q4 Research" maxlength="60"><button class="panel-primary" id="saveProjectName">Create project</button></div>`,
    renameProject:`<div class="setting-group"><label for="projectName">Project name</label><p>Give this project a clear name.</p><input class="panel-input" id="projectName" value="${esc(projects.find(item=>item.id===menuTargetProjectId)?.name||'')}" maxlength="60"><button class="panel-primary" id="saveProjectName">Save name</button></div>`,
    moveConversation:`<div class="setting-group"><label for="projectSelect">Add conversation to project</label><p>Add a copy to another project while keeping this conversation here.</p><select id="projectSelect">${projects.filter(project=>project.id!==personalChatsId&&project.id!==menuSourceProjectId).map(project=>`<option value="${project.id}">${esc(project.name)}</option>`).join('')}</select><button class="panel-primary" id="moveConversationButton">Add to project</button></div>`,
    confirmDeleteProject:`<div class="setting-group"><label>Delete project?</label><p>This will permanently remove “${esc(projects.find(item=>item.id===menuTargetProjectId)?.name||'')}” and its conversation list from this browser.</p><button class="panel-danger" id="confirmDeleteProjectButton">Delete project</button></div>`
  };
  title.textContent=panel==='renameConversation'?'Rename conversation':panel==='createProject'?'Create project':panel==='renameProject'?'Rename project':panel==='moveConversation'?'Add conversation to project':panel==='confirmDeleteProject'?'Delete project':t(panel); content.innerHTML=templates[panel]||templates.settings;
  if(panel==='settings'){$('#languageSelect').value=language;$('#languageSelect').onchange=e=>{language=e.target.value;localStorage.setItem(languageKey,language);applyTranslations();openPanel('settings')}}
  if(panel==='personalization'){$('#foregroundColor').oninput=e=>setForeground(e.target.value);$('#resetForeground').onclick=()=>{setForeground(null);$('#foregroundColor').value='#111111'}}
  if(panel==='renameConversation'){$('#saveConversationName').onclick=()=>{const name=$('#conversationName').value.trim();if(!name){notify('Conversation name cannot be empty');return}activeConversation().title=name;saveProjects();renderProjects();renderConversationTitle();$('#panelBackdrop').classList.add('hidden')};$('#conversationName').focus()}
  if(panel==='createProject'){$('#saveProjectName').onclick=()=>{const name=$('#projectName').value.trim();if(!name){notify('Project name cannot be empty');return}const project={id:`project-${Date.now()}`,name,conversations:[{id:`conversation-${Date.now()}`,title:'New conversation',messages:[]}]};projects.push(project);activeProjectId=project.id;currentConversationId=project.conversations[0].id;saveProjects();renderProjects();renderConversationTitle();renderConversationHistory();$('#panelBackdrop').classList.add('hidden')};$('#projectName').focus()}
  if(panel==='renameProject'){$('#saveProjectName').onclick=()=>{const name=$('#projectName').value.trim();if(!name){notify('Project name cannot be empty');return}projects.find(item=>item.id===menuTargetProjectId).name=name;saveProjects();renderProjects();$('#panelBackdrop').classList.add('hidden')};$('#projectName').focus()}
  if(panel==='moveConversation'){$('#moveConversationButton').onclick=()=>{const destination=projects.find(item=>item.id===$('#projectSelect').value),source=projects.find(item=>item.id===menuSourceProjectId),conversation=source?.conversations.find(item=>item.id===menuTargetConversationId);if(!destination||!conversation)return;destination.conversations.push({...conversation,id:`${conversation.id}-${destination.id}`});saveProjects();renderProjects();renderConversationTitle();$('#panelBackdrop').classList.add('hidden')}}
  if(panel==='confirmDeleteProject'){$('#confirmDeleteProjectButton').onclick=()=>{confirmDeleteProject(menuTargetProjectId);$('#panelBackdrop').classList.add('hidden')}}
  $('#panelBackdrop').classList.remove('hidden'); $('#workspaceMenu').classList.add('hidden'); $('#workspaceMenuButton').setAttribute('aria-expanded','false');
}
applyTranslations();
recordVisit();
if(localStorage.getItem(foregroundKey))setForeground(localStorage.getItem(foregroundKey));
saveProjects();
renderProjects();
renderConversationTitle();
renderConversationHistory();
function applyTheme(theme){
  const selected=themeChoices.includes(theme)?theme:'light';
  document.documentElement.dataset.theme=selected;
  document.querySelectorAll('[data-theme-choice]').forEach(button=>{
    const active=button.dataset.themeChoice===selected;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  document.querySelector('meta[name="theme-color"]').setAttribute('content',selected==='dark'||(selected==='system'&&themeMedia.matches)?'#000000':'#ffffff');
}
function setTheme(theme){localStorage.setItem(themeStorageKey,theme);applyTheme(theme)}
const savedTheme=localStorage.getItem(themeStorageKey);
applyTheme(themeChoices.includes(savedTheme)?savedTheme:'light');
document.addEventListener('click',event=>{const choice=event.target.closest('[data-theme-choice]');if(choice)setTheme(choice.dataset.themeChoice)});
themeMedia.addEventListener?.('change',()=>{if(document.documentElement.dataset.theme==='system')applyTheme('system')});
function icon(ext){return (ext||'FILE').toUpperCase().slice(0,4)}
async function refresh(){try{docs=await (await fetch('/api/documents')).json();renderDocs()}catch{}}
function renderDocs(){collection.innerHTML=docs.length?docs.map(d=>`<div class="doc-row" role="button" tabindex="0" data-document-id="${esc(d.document_id)}" aria-label="Preview ${esc(d.document_name)}"><span class="doc-icon">${icon(d.file_type)}</span><span class="doc-meta"><div class="doc-name" title="${esc(d.document_name)}">${esc(d.document_name)}</div><div class="doc-state"><i class="ready-dot"></i>${d.status==='ready'?`${d.evidence_count} evidence items`:esc(d.status)}</div></span><button class="doc-delete" type="button" data-document-id="${esc(d.document_id)}" aria-label="Delete ${esc(d.document_name)}" title="Delete document"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`).join(''):'<div class="empty-collection">Your documents will appear here after upload.</div>';$('#sourceCount').textContent=docs.length?`${docs.length} document${docs.length===1?'':'s'} in this workspace`:'Upload documents to start asking'}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function openDocumentPreview(document){
  const backdrop=$('#previewBackdrop'),body=$('#previewBody'),title=$('#previewTitle'),download=$('#previewDownload'),url=`/api/documents/${encodeURIComponent(document.document_id)}/file`;
  title.textContent=document.document_name;download.href=url;body.innerHTML='<div class="preview-loading">Loading document preview…</div>';backdrop.classList.remove('hidden');
  try{
    const response=await fetch(`/api/documents/${encodeURIComponent(document.document_id)}/preview`),preview=await response.json();
    if(!response.ok)throw new Error(preview.detail||'Could not load document preview.');
    const type=(preview.file_type||'').toLowerCase();
    if(type==='pdf')body.innerHTML=`<iframe class="preview-frame" title="${esc(document.document_name)}" src="${url}"></iframe>`;
    else if(['png','jpg','jpeg','webp','tif','tiff','bmp'].includes(type))body.innerHTML=`<div class="image-preview"><img src="${url}" alt="${esc(document.document_name)}"></div>`;
    else if(preview.content?.length)body.innerHTML=`<div class="text-preview">${preview.content.map(item=>`<article><small>${esc(item.source_reference||formatLocation(item.location))}</small><p>${esc(item.content)}</p></article>`).join('')}</div>`;
    else body.innerHTML='<div class="preview-empty">No extracted text is available for this document.</div>';
  }catch(error){body.innerHTML=`<div class="preview-empty">${esc(error.message||'Could not load document preview.')}</div>`}
}
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
input.onchange=()=>{upload(input.files);input.value=''};
$('#attachFile').onclick=()=>input.click();
$('#question').addEventListener('paste',event=>{
  const imageItem=[...(event.clipboardData?.items||[])].find(item=>item.type.startsWith('image/'));
  if(!imageItem)return;
  const image=imageItem.getAsFile();if(!image)return;
  event.preventDefault();
  const extension=(image.type.split('/')[1]||'png').replace('jpeg','jpg');
  const pastedImage=new File([image],`pasted-image-${Date.now()}.${extension}`,{type:image.type});
  upload([pastedImage]);
});
collection.addEventListener('click',async e=>{
  const button=e.target.closest('.doc-delete');
  if(!button){const row=e.target.closest('.doc-row');if(row){const document=docs.find(item=>item.document_id===row.dataset.documentId);if(document)openDocumentPreview(document)}return}
  const document=docs.find(item=>item.document_id===button.dataset.documentId);if(!document)return;
  button.disabled=true;
  try{const response=await fetch(`/api/documents/${encodeURIComponent(document.document_id)}`,{method:'DELETE'});const result=await response.json();if(!response.ok)throw new Error(result.detail||`Delete failed (HTTP ${response.status}).`);await refresh();notify(`Deleted ${document.document_name}`)}
  catch(error){button.disabled=false;notify(error.message||'Could not delete this document.')}
});
collection.addEventListener('keydown',e=>{const row=e.target.closest('.doc-row');if(!row||e.target.closest('.doc-delete')||!['Enter',' '].includes(e.key))return;e.preventDefault();const document=docs.find(item=>item.document_id===row.dataset.documentId);if(document)openDocumentPreview(document)});
$('#previewClose').onclick=()=>$('#previewBackdrop').classList.add('hidden');
$('#previewBackdrop').addEventListener('click',e=>{if(e.target.id==='previewBackdrop')e.currentTarget.classList.add('hidden')});
document.querySelectorAll('.suggestion').forEach(b=>b.onclick=()=>{$('#question').value=b.dataset.question;$('#question').focus()});
$('#workspaceMenuButton').onclick=()=>{const menu=$('#workspaceMenu'),open=menu.classList.toggle('hidden')===false;$('#workspaceMenuButton').setAttribute('aria-expanded',String(open))};
document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>openPanel(button.dataset.panel));
$('#panelClose').onclick=()=>$('#panelBackdrop').classList.add('hidden');
$('#panelBackdrop').onclick=e=>{if(e.target.id==='panelBackdrop')e.currentTarget.classList.add('hidden')};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#panelBackdrop').classList.add('hidden');$('#previewBackdrop').classList.add('hidden');$('#workspaceMenu').classList.add('hidden')}});
function startNewConversation(){$('#messages').innerHTML='';$('#chatArea').classList.add('hidden');$('#welcome').classList.remove('hidden');$('.breadcrumbs b').textContent='New conversation';$('#question').value='';$('#question').style.height='auto';$('#question').focus()}
$('#newChat').onclick=()=>{const project=projects.find(item=>item.id===personalChatsId),conversation={id:`conversation-${Date.now()}`,title:'New conversation',messages:[]};project.conversations.unshift(conversation);activeProjectId=personalChatsId;currentConversationId=conversation.id;saveProjects();renderProjects();renderConversationTitle();startNewConversation()};
$('#renameConversation').onclick=renameConversation;
$('#addProject').onclick=createProject;
const newChatShortcut=navigator.platform.toUpperCase().includes('MAC')?'⌘ K':'Ctrl + K';
$('#newChat').title=`New conversation (${newChatShortcut})`;
$('#newChat').setAttribute('aria-keyshortcuts',navigator.platform.toUpperCase().includes('MAC')?'Meta+K':'Control+K');
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#newChat').click()}});
$('#question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}});$('#question').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,130)+'px'});$('#send').onclick=ask;
let searchTimer;$('#collectionSearch').addEventListener('input',e=>{clearTimeout(searchTimer);const q=e.target.value.trim(), box=$('#searchResults');if(!q){box.classList.add('hidden');box.innerHTML='';return}searchTimer=setTimeout(async()=>{try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,limit:6})});const data=await r.json();box.innerHTML=data.results.length?data.results.map(x=>`<div class="search-result"><b>${esc(x.document_name)} <small>${esc(x.source_reference||formatLocation(x.location))}</small></b>${esc(x.content.slice(0,150))}</div>`).join(''):'<div class="search-result">No matching evidence found.</div>';box.classList.remove('hidden')}catch{box.innerHTML='<div class="search-result">Search is unavailable.</div>';box.classList.remove('hidden')}},180)});
async function ask(){
  const box=$('#question'),q=box.value.trim();if(!q)return;if(!docs.length){notify('Upload at least one document first');return}
  const conversation=activeConversation();if(!conversation){notify('Start a conversation first');return}
  const wasEmpty=!conversation.messages.length;conversation.messages.push({role:'user',content:q});
  if(wasEmpty&&conversation.title==='New conversation')conversation.title=q.length>42?`${q.slice(0,39)}…`:q;
  saveProjects();renderProjects();renderConversationTitle();box.value='';box.style.height='auto';$('#welcome').classList.add('hidden');$('#chatArea').classList.remove('hidden');
  const messages=$('#messages'),pendingId=`pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  messages.insertAdjacentHTML('beforeend',`<div class="user-message">${esc(q)}</div><div class="assistant-message loading" id="${pendingId}">Reading your documents and preparing a detailed answer…</div>`);messages.scrollIntoView({block:'end',behavior:'smooth'});
  try{
    const history=conversation.messages.slice(0,-1).slice(-8).map(message=>({role:message.role,content:message.content}));
    const res=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q,history})}),answer=await res.json();
    if(!res.ok)throw new Error(answer.detail||`Request failed (HTTP ${res.status}).`);
    conversation.messages.push({role:'assistant',content:answer.answer||''});saveProjects();
    const pending=document.getElementById(pendingId);if(pending)pending.outerHTML=renderAnswer(answer);else if(activeConversation()?.id===conversation.id)messages.insertAdjacentHTML('beforeend',renderAnswer(answer));
    if(activeConversation()?.id===conversation.id)messages.scrollIntoView({block:'end',behavior:'smooth'});
  }catch(error){
    const message=error.message||'Could not reach the document service. Please try again.';conversation.messages.push({role:'assistant',content:message});saveProjects();
    const pending=document.getElementById(pendingId);if(pending)pending.textContent=message;else if(activeConversation()?.id===conversation.id)messages.insertAdjacentHTML('beforeend',renderAnswer({answer:message}));
  }
}
function renderAnswer(a){const paragraphs=String(a.answer||'').split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');return `<div class="assistant-message"><div class="assistant-label"><span>✳</span> DOCUMIND <button class="copy-answer" type="button" title="Copy answer" aria-label="Copy answer">Copy</button></div><div class="answer-text">${paragraphs}</div></div>`}
$('#messages').addEventListener('click',async event=>{
  const button=event.target.closest('.copy-answer');if(!button)return;
  const answer=button.closest('.assistant-message').querySelector('.answer-text').innerText;
  try{await navigator.clipboard.writeText(answer);notify('Answer copied to clipboard');button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1500)}
  catch{notify('Could not copy answer. Check clipboard permissions.')}
});
function formatLocation(loc){return Object.entries(loc||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')}
refresh();
