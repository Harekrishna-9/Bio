const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const cfg=window.HK_SUPABASE||{};
const ready=cfg.url && cfg.anonKey && !cfg.anonKey.includes("PASTE_");
const sb=ready?supabase.createClient(cfg.url,cfg.anonKey):null;
// Public reader intentionally stays anonymous.
// This lets Admin load the same Highlights/Gallery rows that are visible on the public profile,
// while all Update/Delete actions still use the authenticated `sb` client.
const publicSb=ready?supabase.createClient(cfg.url,cfg.anonKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
}):null;
let settingsId=null, settingsData=null, highlights=[], storyToHighlight=null, previewObjectUrl=null;
let storyPlaylist=[],storyPreviewTimer=null;

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function setMsg(id,t,err=false){const e=$(id);if(!e)return;e.textContent=t||"";e.style.color=err?"#ff939a":""}
function safeName(name){return `${Date.now()}-${Math.random().toString(36).slice(2)}-${name.replace(/[^a-zA-Z0-9._-]/g,"_")}`}
function fmt(v){try{return new Date(v).toLocaleString()}catch{return v}}
function remaining(expires){const ms=new Date(expires)-Date.now();if(ms<=0)return"Expired";const h=Math.ceil(ms/3600000);return h<24?`${h}h left`:`${Math.ceil(h/24)}d left`}
function durationMs(){const p=$("#durationPreset").value;if(p==="24h")return 86400000;if(p==="3d")return 3*86400000;if(p==="5d")return 5*86400000;if(p==="7d")return 7*86400000;const n=Math.max(1,Number($("#customDuration").value)||1);return $("#customDurationUnit").value==="days"?n*86400000:n*3600000}
async function uploadFile(file,folder){if(!file)return null;const path=`${folder}/${safeName(file.name)}`;const {error}=await sb.storage.from(cfg.bucket).upload(path,file,{cacheControl:"3600"});if(error)throw error;return sb.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl}

async function checkSession(){if(!ready)return setMsg("#loginMsg","Supabase key missing.",true);const {data:{session}}=await sb.auth.getSession();if(session&&session.user?.email===cfg.adminEmail)showAdmin()}
$("#loginBtn").onclick=async()=>{const {data,error}=await sb.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});if(error)return setMsg("#loginMsg",error.message,true);if(data.user?.email!==cfg.adminEmail){await sb.auth.signOut();return setMsg("#loginMsg","Not allowed",true)}showAdmin()}
async function showAdmin(){$("#loginBox").classList.add("hide");$("#admin").classList.remove("hide");await refreshAll()}
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()}
$("#refreshBtn").onclick=async()=>refreshAll()
$$("[data-scroll]").forEach(b=>b.onclick=()=>$(b.dataset.scroll)?.scrollIntoView({behavior:"smooth"}));

async function refreshAll(){await Promise.all([loadProfileSettings(),loadMusic(),loadStoryMusicOptions(),loadStories(),loadHighlights(),loadGallery(),loadLinks(),loadMessages(),loadStats(),loadAnalyticsV5()])}

async function loadProfileSettings(){
  const {data,error}=await sb.from("profile_settings").select("*").order("id").limit(1).maybeSingle();
  if(error)return setMsg("#profileMsg",error.message,true);
  settingsData=data||{};settingsId=data?.id||null;
  $("#note").value=data?.note||"";
  $("#profileStatus").value=data?.profile_status||"Available";
  $("#announcementText").value=data?.announcement_text||"";
  $("#announcementEnabled").checked=!!data?.announcement_enabled;
  $("#displayName").value=data?.display_name||"Harekrishna Patel";
  $("#profession").value=data?.profession||"Web Creator • Tech Enthusiast • Inventory Professional";
  $("#locationText").value=data?.location_text||"India";
  $("#verifiedBadge").value=String(data?.verified!==false);
  $("#noteCount").textContent=`${$("#note").value.length}/100`;
}
async function saveProfilePayload(payload){
  payload.updated_at=new Date().toISOString();
  let r=settingsId?await sb.from("profile_settings").update(payload).eq("id",settingsId).select().single():await sb.from("profile_settings").insert(payload).select().single();
  if(r.error)throw r.error;settingsId=r.data.id;settingsData=r.data;
}
$("#note").oninput=()=>$("#noteCount").textContent=`${$("#note").value.length}/100`;
$("#saveProfileSettings").onclick=async()=>{
  try{
    let profile_photo_url=settingsData?.profile_photo_url||null;
    const photoFile=$("#profilePhotoFile")?.files?.[0];
    if(photoFile){
      setMsg("#profileMsg","Uploading profile photo...");
      profile_photo_url=await uploadFile(photoFile,"profile");
    }

    await saveProfilePayload({
      note:$("#note").value.trim(),
      profile_status:$("#profileStatus").value,
      announcement_text:$("#announcementText").value.trim()||null,
      announcement_enabled:$("#announcementEnabled").checked,
      music_title:settingsData?.music_title||"Favourite Music",
      music_url:settingsData?.music_url||null,
      display_name:$("#displayName").value.trim()||"Harekrishna Patel",
      profession:$("#profession").value.trim()||"Web Creator • Tech Enthusiast • Inventory Professional",
      location_text:$("#locationText").value.trim()||"India",
      profile_photo_url,
      verified:$("#verifiedBadge").value==="true"
    });

    if($("#profilePhotoFile")) $("#profilePhotoFile").value="";
    setMsg("#profileMsg","Profile settings saved ✅");
  }catch(e){
    setMsg("#profileMsg",e.message,true);
  }
};

async function loadMusic(){
  const {data,error}=await sb.from("music_playlist").select("*").order("sort_order").order("created_at");
  if(error){$("#musicList").innerHTML=`<div class="notice-box">${esc(error.message)} — Run upgrade-v3.sql first.</div>`;return}
  const rows=data||[];$("#musicCountLabel").textContent=`${rows.length} songs`;
  $("#musicList").innerHTML=rows.map(m=>`<div class="data-card"><div class="thumb">♫</div><div class="data-main"><b>${esc(m.title)}</b><small>${m.clip_seconds}s clip • ${m.enabled?"Enabled":"Disabled"}</small></div><div class="data-actions"><button class="mini-btn save" onclick="updateMusic('${m.id}',${m.clip_seconds},${m.enabled})">Update</button><button class="mini-btn delete" onclick="deleteMusic('${m.id}')">Delete</button></div></div>`).join("")||'<div class="notice-box">No playlist songs yet.</div>';
}
$("#addMusicBtn").onclick=async()=>{
  const f=$("#musicFile").files[0];if(!f)return setMsg("#musicMsg","Audio file choose karein.",true);
  try{setMsg("#musicMsg","Uploading music...");const url=await uploadFile(f,"music");const title=$("#musicTitle").value.trim()||f.name.replace(/\.[^.]+$/,"");const {error}=await sb.from("music_playlist").insert({title,media_url:url,clip_seconds:Number($("#musicClipSeconds").value)});if(error)throw error;$("#musicFile").value="";$("#musicTitle").value="";setMsg("#musicMsg","Music added ✅");loadMusic()}catch(e){setMsg("#musicMsg",e.message,true)}
};
window.updateMusic=async(id,clip,enabled)=>{const title=prompt("Song title update karein (blank = same):","");const sec=Number(prompt("Clip seconds 30 se 60:",String(clip)));if(!Number.isFinite(sec)||sec<30||sec>60)return alert("30-60 sec allowed");const payload={clip_seconds:sec,enabled};if(title)payload.title=title;const {error}=await sb.from("music_playlist").update(payload).eq("id",id);if(error)return alert(error.message);loadMusic()}
window.deleteMusic=async id=>{if(!confirm("Delete this song?"))return;const {error}=await sb.from("music_playlist").delete().eq("id",id);if(error)return alert(error.message);loadMusic()}



function buildFakeWaveform(){
  const box=$("#waveformBars"); if(!box)return;
  let s=17; const bars=[];
  for(let i=0;i<70;i++){s=(s*9301+49297)%233280;const h=8+Math.round((s/233280)*28);bars.push(`<i style="height:${h}px"></i>`)}
  box.innerHTML=bars.join("");
}
buildFakeWaveform();
$("#storyMusicSeek")?.addEventListener("input",()=>{
  const v=Number($("#storyMusicSeek").value)||0;
  $("#storyMusicStart").value=v; $("#storyMusicSeekLabel").textContent=v+"s";
});
$("#storyMusicStart")?.addEventListener("input",()=>{
  const v=Math.max(0,Math.min(60,Number($("#storyMusicStart").value)||0));
  $("#storyMusicSeek").value=v; $("#storyMusicSeekLabel").textContent=v+"s";
});

async function loadStoryMusicOptions(){
  const el=$("#storyMusic"); if(!el)return;
  const {data,error}=await sb.from("music_playlist").select("*").eq("enabled",true).order("sort_order").order("created_at");
  if(error){console.error(error);return}
  storyPlaylist=data||[];
  el.innerHTML='<option value="">No Music</option>'+storyPlaylist.map(s=>`<option value="${s.id}">${esc(s.title)} • ${s.clip_seconds}s</option>`).join("");
}
function getSelectedStorySong(){
  const id=$("#storyMusic")?.value;
  return id?storyPlaylist.find(s=>String(s.id)===String(id))||null:null;
}
$("#storyMusicVolume")?.addEventListener("input",()=>{
  $("#storyMusicVolumeLabel").textContent=Math.round(Number($("#storyMusicVolume").value)*100)+"%";
});
$("#previewStoryMusic")?.addEventListener("click",async()=>{
  const song=getSelectedStorySong();
  if(!song)return alert("Pehle music select karein.");
  const a=$("#storyMusicPreviewAudio");
  const video=$("#storyPreview")?.querySelector("video");
  const mode=$("#storyAudioMode")?.value||"music";
  clearTimeout(storyPreviewTimer); a.pause(); a.src=song.media_url;
  a.volume=Number($("#storyMusicVolume")?.value||0.8);
  a.onloadedmetadata=async()=>{
    let st=Math.max(0,Number($("#storyMusicStart")?.value)||0);
    if(a.duration && st>=a.duration)st=0;
    a.currentTime=st;
    if(video){
      video.muted=mode==="music";
      video.volume=mode==="mix"?0.35:1;
      try{video.currentTime=0;await video.play()}catch(e){}
    }
    try{
      if(mode!=="original")await a.play();
      storyPreviewTimer=setTimeout(()=>{a.pause();if(video)video.pause()},Math.min(Number(song.clip_seconds||30),60)*1000);
    }catch(e){alert("Preview start nahi hua.")}
  };
});

$("#storyStartMode").onchange=()=>$("#storyScheduleBox").classList.toggle("hide",$("#storyStartMode").value!=="schedule");
$("#durationPreset").onchange=()=>{const c=$("#durationPreset").value==="custom";$("#customDurationBox").classList.toggle("hide",!c);$("#customDurationUnitBox").classList.toggle("hide",!c)};
function storyStart(){if($("#storyStartMode").value==="now")return new Date();const v=$("#storyStartAt").value;if(!v)return null;return new Date(v)}
function updateStoryPreview(){if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}const type=$("#storyType").value,file=$("#storyFile").files[0],box=$("#storyPreview");if(type==="text"){box.innerHTML=`<div class="text-story-preview"><div><div class="emoji">${esc($("#storyEmoji").value||"✨")}</div><p>${esc($("#storyText").value||"Story preview")}</p></div></div>`;return}if(!file){box.innerHTML='<div class="preview-placeholder"><span>◉</span><b>Story Preview</b><small>Select image/video file</small></div>';return}previewObjectUrl=URL.createObjectURL(file);box.innerHTML=type==="video"?`<video src="${previewObjectUrl}" controls muted></video>`:`<img src="${previewObjectUrl}">`}
$("#storyType").onchange=updateStoryPreview;$("#storyFile").onchange=updateStoryPreview;$("#storyText").oninput=updateStoryPreview;$("#storyEmoji").oninput=updateStoryPreview;

async function loadStories(){
  const {data,error}=await sb.from("stories").select("*").order("created_at",{ascending:false});
  if(error){$("#storyList").innerHTML=`<div class="notice-box">${esc(error.message)}</div>`;return}
  const rows=data||[],now=Date.now(),current=rows.filter(s=>new Date(s.expires_at)>now),expired=rows.filter(s=>new Date(s.expires_at)<=now);
  $("#dashStories").textContent=current.filter(s=>new Date(s.starts_at||s.created_at)<=now).length;
  $("#storyCountLabel").textContent=`${current.length} stories`;
  $("#storyList").innerHTML=current.map(s=>storyCard(s,false)).join("")||'<div class="notice-box">No current stories.</div>';
  $("#archiveList").innerHTML=expired.map(s=>storyCard(s,true)).join("")||'<div class="notice-box">No expired stories yet.</div>';
}
function storyCard(s,archived){const start=new Date(s.starts_at||s.created_at),scheduled=start>Date.now(),thumb=s.type==="image"&&s.media_url?`<img src="${esc(s.media_url)}">`:s.type==="video"&&s.media_url?`<video src="${esc(s.media_url)}"></video>`:esc(s.emoji||"✨");return `<div class="data-card"><div class="thumb">${thumb}</div><div class="data-main"><b>${archived?"ARCHIVED":scheduled?"SCHEDULED":"ACTIVE"} • ${esc(s.type.toUpperCase())}</b><small>${scheduled?`Starts ${fmt(start)}`:archived?`Expired ${fmt(s.expires_at)}`:remaining(s.expires_at)}</small></div><div class="data-actions">${!archived?`<button class="mini-btn save" onclick="editStory(\'${s.id}\')">Edit</button><button class="mini-btn save" onclick="openStoryHighlight(\'${s.id}\')">★ Highlight</button>`:""}<button class="mini-btn delete" onclick="deleteStory(\'${s.id}\')">Delete</button></div></div>`}
async function publishStory(draftMode=false){
  try{const type=$("#storyType").value;let media_url=null;if(type!=="text"){const f=$("#storyFile").files[0];if(!f)return setMsg("#storyMsg","File choose karein.",true);media_url=await uploadFile(f,"stories")}if(type==="text"&&!$("#storyText").value.trim())return setMsg("#storyMsg","Text likhein.",true);const start=storyStart();if(!start||isNaN(start))return setMsg("#storyMsg","Valid schedule time choose karein.",true);const expires=new Date(start.getTime()+durationMs());
    const selectedMusic=getSelectedStorySong();
    const {error}=await sb.from("stories").insert({
      type,media_url,
      story_text:$("#storyText").value.trim()||null,
      emoji:$("#storyEmoji").value.trim()||"✨",
      starts_at:start.toISOString(),
      expires_at:expires.toISOString(),
      music_id:selectedMusic?selectedMusic.id:null,
      music_url:selectedMusic?selectedMusic.media_url:null,
      music_title:selectedMusic?selectedMusic.title:null,
      music_start:selectedMusic?Math.max(0,Number($("#storyMusicStart").value)||0):0,
      music_volume:selectedMusic?Number($("#storyMusicVolume").value||0.8):0.8,
      audio_mode:$("#storyAudioMode")?.value||"music",
      is_draft:draftMode
    });if(error)throw error;$("#storyFile").value="";$("#storyText").value="";updateStoryPreview();setMsg("#storyMsg",draftMode?"Draft saved ✅":($("#storyStartMode").value==="schedule"?"Story scheduled ✅":"Story published ✅"));loadStories()}catch(e){setMsg("#storyMsg",e.message,true)}
}
$("#addStory").onclick=()=>publishStory(false);
$("#saveStoryDraft").onclick=()=>publishStory(true);

window.editStory=async id=>{
  const {data,error}=await sb.from("stories").select("*").eq("id",id).single();
  if(error)return alert(error.message);
  $("#editStoryId").value=id;
  $("#editStoryText").value=data.story_text||"";
  $("#editStoryEmoji").value=data.emoji||"✨";
  $("#editStoryMusicStart").value=data.music_start||0;
  $("#editStoryMusicVolume").value=data.music_volume??0.8;
  $("#editStoryDraft").value=String(!!data.is_draft);
  const d=new Date(data.expires_at); const pad=n=>String(n).padStart(2,"0");
  $("#editStoryExpires").value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $("#editStoryMusic").innerHTML='<option value="">No Music</option>'+storyPlaylist.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("");
  $("#editStoryMusic").value=data.music_id||"";
  $("#storyEditModal").classList.add("open");
};
$("#closeStoryEdit").onclick=()=>$("#storyEditModal").classList.remove("open");
$("#saveStoryEdit").onclick=async()=>{
  const id=$("#editStoryId").value;
  const song=storyPlaylist.find(s=>String(s.id)===String($("#editStoryMusic").value))||null;
  const exp=new Date($("#editStoryExpires").value);
  if(!id||isNaN(exp))return alert("Valid expiry required");
  const {error}=await sb.from("stories").update({
    story_text:$("#editStoryText").value.trim()||null,
    emoji:$("#editStoryEmoji").value.trim()||"✨",
    expires_at:exp.toISOString(),
    music_id:song?song.id:null,
    music_url:song?song.media_url:null,
    music_title:song?song.title:null,
    music_start:Math.max(0,Number($("#editStoryMusicStart").value)||0),
    music_volume:Number($("#editStoryMusicVolume").value||0.8),
    is_draft:$("#editStoryDraft").value==="true",
    updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error)return alert(error.message);
  $("#storyEditModal").classList.remove("open"); await loadStories();
};

window.deleteStory=async id=>{if(!confirm("Delete story?"))return;const {error}=await sb.from("stories").delete().eq("id",id);if(error)return alert(error.message);loadStories()}

let activeHighlightId=null;

async function loadHighlights(){
  // Read highlight folders/items with the same anonymous access used by the public profile.
  // View analytics stay private and are read separately with the authenticated admin client.
  const {data,error}=await publicSb.from("highlights")
    .select("*,highlight_items(*)")
    .order("sort_order",{ascending:true})
    .order("created_at",{ascending:true});

  if(error){
    $("#highlightList").innerHTML=`<div class="notice-box">${esc(error.message)}</div>`;
    return;
  }

  const rows=data||[];

  // Private analytics query: only logged-in admin can read this table.
  const {data:viewRows,error:viewError}=await sb.from("highlight_views").select("highlight_id");
  const viewMap={};
  if(!viewError){
    (viewRows||[]).forEach(v=>{
      viewMap[v.highlight_id]=(viewMap[v.highlight_id]||0)+1;
    });
  }

  highlights=rows.map(h=>({
    ...h,
    _viewCount:viewMap[h.id]||0,
    highlight_items:(h.highlight_items||[]).sort(
      (a,b)=>(a.sort_order||0)-(b.sort_order||0)||
      new Date(a.created_at)-new Date(b.created_at)
    )
  }));
  $("#dashHighlights").textContent=highlights.length;
  $("#highlightCountLabel").textContent=`${highlights.length} ${highlights.length===1?"highlight":"highlights"}`;

  $("#highlightList").innerHTML=highlights.map(h=>{
    const cover=h.cover_url?`<img src="${esc(h.cover_url)}" alt="">`:`<div>${esc(h.emoji||"⭐")}</div>`;
    const views=h._viewCount||0;
    return `<article class="highlight-admin-card">
      <div class="highlight-admin-cover">${cover}</div>
      <h4>${esc(h.name)}</h4>
      <div class="hc-meta">${h.highlight_items.length} items • ${views} views</div>
      <div class="highlight-card-actions">
        <button class="mini-btn save" onclick="openHighlightManager('${h.id}')">📂 Open</button>
        <button class="mini-btn save" onclick="quickAddHighlightMedia('${h.id}')">＋ Add Media</button>
        <button class="mini-btn" onclick="updateHighlight('${h.id}','${esc(h.name).replace(/'/g,"&#39;")}','${esc(h.emoji||"⭐")}')">✎ Edit</button>
        <button class="mini-btn delete" onclick="deleteHighlight('${h.id}')">Delete</button>
      </div>
    </article>`;
  }).join("")||'<div class="notice-box">No highlights yet.</div>';

  const opts=highlights.map(h=>`<option value="${h.id}">${esc(h.name)}</option>`).join("");
  const storySel=$("#storyHighlightSelect"); if(storySel) storySel.innerHTML=opts;
}

$("#addHighlight").onclick=async()=>{
  try{
    const name=$("#hlName").value.trim(); if(!name)return alert("Highlight name required");
    let cover_url=null; const f=$("#hlCover").files[0];
    if(f) cover_url=await uploadFile(f,"highlights");
    const nextOrder=highlights.length?Math.max(...highlights.map(h=>h.sort_order||0))+10:10;
    const {error}=await sb.from("highlights").insert({name,emoji:$("#hlEmoji").value.trim()||"⭐",cover_url,sort_order:nextOrder});
    if(error)throw error;
    $("#hlName").value=""; $("#hlCover").value="";
    await loadHighlights();
  }catch(e){alert(e.message)}
};

window.updateHighlight=async(id,name,emoji)=>{
  const n=prompt("Highlight name:",name); if(n===null)return;
  const e=prompt("Emoji:",emoji); if(e===null)return;
  const {data,error}=await sb.rpc("admin_update_highlight",{p_id:id,p_name:n.trim()||name,p_emoji:e.trim()||emoji});
  if(error)return alert("Update failed: "+error.message);
  if(data!==true)return alert("Update nahi hua.");
  await loadHighlights();
};

window.deleteHighlight=async id=>{
  if(!confirm("Delete Highlight and all its photo/video items?"))return;
  const {data,error}=await sb.rpc("admin_delete_highlight",{p_id:id});
  if(error)return alert("Delete failed: "+error.message);
  if(data!==true)return alert("Delete nahi hua.");
  await loadHighlights();
};

window.quickAddHighlightMedia=id=>{
  activeHighlightId=id;
  $("#highlightManagerModal").classList.add("open");
  renderHighlightManager();
  setTimeout(()=>$("#hmFile").click(),80);
};

window.openHighlightManager=id=>{
  activeHighlightId=id;
  $("#highlightManagerModal").classList.add("open");
  renderHighlightManager();
};

function renderHighlightManager(){
  const h=highlights.find(x=>x.id===activeHighlightId); if(!h)return;
  $("#hmTitle").textContent=`${h.emoji||"⭐"} ${h.name}`;
  const views=h._viewCount||0;
  $("#hmMeta").textContent=`${h.highlight_items.length} items • ${views} views`;
  $("#hmItemCount").textContent=`${h.highlight_items.length} items`;

  $("#hmItemList").innerHTML=h.highlight_items.map((it,i)=>{
    let media="";
    if(it.type==="image"&&it.media_url)media=`<img src="${esc(it.media_url)}" alt="">`;
    else if(it.type==="video"&&it.media_url)media=`<video src="${esc(it.media_url)}" muted></video>`;
    else media=`<div class="hm-text-slide">${esc(it.item_text||"Text")}</div>`;
    return `<article class="hm-item">
      <div class="hm-item-media">${media}</div>
      <div class="hm-item-info"><b>${esc(it.type.toUpperCase())}</b><small>${esc(it.item_text||"No caption")}</small></div>
      <div class="hm-item-actions">
        <button onclick="moveHighlightItem('${it.id}',-1)" ${i===0?"disabled":""}>↑</button>
        <button onclick="moveHighlightItem('${it.id}',1)" ${i===h.highlight_items.length-1?"disabled":""}>↓</button>
        <button class="del" onclick="deleteHighlightItem('${it.id}')">×</button>
      </div>
    </article>`;
  }).join("")||'<div class="notice-box">No items yet. Add photo/video/text above.</div>';
}

$("#closeHighlightManager").onclick=()=>$("#highlightManagerModal").classList.remove("open");
$("#highlightManagerModal").addEventListener("click",e=>{if(e.target===$("#highlightManagerModal"))$("#highlightManagerModal").classList.remove("open")});

$("#hmAddItem").onclick=async()=>{
  const h=highlights.find(x=>x.id===activeHighlightId); if(!h)return;
  const type=$("#hmType").value; let media_url=null;
  try{
    if(type!=="text"){
      const file=$("#hmFile").files[0]; if(!file)return alert("Photo / video choose karein");
      media_url=await uploadFile(file,"highlight-items");
    }else if(!$("#hmText").value.trim()){
      return alert("Text slide ke liye text likhein");
    }
    const nextOrder=h.highlight_items.length?Math.max(...h.highlight_items.map(x=>x.sort_order||0))+10:10;
    const {error}=await sb.from("highlight_items").insert({
      highlight_id:h.id,type,media_url,item_text:$("#hmText").value.trim()||null,sort_order:nextOrder
    });
    if(error)throw error;
    $("#hmFile").value=""; $("#hmText").value="";
    await loadHighlights(); renderHighlightManager();
  }catch(e){alert(e.message)}
};

$("#hmSaveCover").onclick=async()=>{
  const h=highlights.find(x=>x.id===activeHighlightId); if(!h)return;
  const file=$("#hmCoverFile").files[0]; if(!file)return alert("New cover image choose karein");
  try{
    const cover_url=await uploadFile(file,"highlight-covers");
    const {error}=await sb.from("highlights").update({cover_url}).eq("id",h.id);
    if(error)throw error;
    $("#hmCoverFile").value="";
    await loadHighlights(); renderHighlightManager();
  }catch(e){alert(e.message)}
};

window.deleteHighlightItem=async id=>{
  if(!confirm("Delete this Highlight item?"))return;
  const {data,error}=await sb.rpc("admin_delete_highlight_item",{p_id:id});
  if(error)return alert(error.message);
  if(data!==true)return alert("Item delete nahi hua.");
  await loadHighlights(); renderHighlightManager();
};

window.moveHighlightItem=async(id,dir)=>{
  const h=highlights.find(x=>x.id===activeHighlightId); if(!h)return;
  const arr=[...h.highlight_items];
  const i=arr.findIndex(x=>x.id===id); const j=i+dir;
  if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  for(let k=0;k<arr.length;k++){
    const {error}=await sb.rpc("admin_set_highlight_item_order",{p_id:arr[k].id,p_sort:(k+1)*10});
    if(error)return alert(error.message);
  }
  await loadHighlights(); renderHighlightManager();
};

window.openStoryHighlight=async id=>{if(!highlights.length)return alert("Pehle Highlight create karein.");const {data,error}=await sb.from("stories").select("*").eq("id",id).single();if(error)return alert(error.message);storyToHighlight=data;$("#highlightPicker").classList.add("open")}
$("#closeHighlightPicker").onclick=()=>$("#highlightPicker").classList.remove("open");
$("#confirmStoryHighlight").onclick=async()=>{if(!storyToHighlight)return;const {error}=await sb.from("highlight_items").insert({highlight_id:$("#storyHighlightSelect").value,type:storyToHighlight.type,media_url:storyToHighlight.media_url,item_text:storyToHighlight.story_text});if(error)return alert(error.message);$("#highlightPicker").classList.remove("open");storyToHighlight=null;alert("Saved to Highlight ✅");loadHighlights()}

async function loadGallery(){const {data,error}=await publicSb.from("gallery").select("*").order("created_at",{ascending:false});if(error){$("#galleryList").innerHTML=`<div class="notice-box">${esc(error.message)}</div>`;return}$("#galleryList").innerHTML=(data||[]).map(g=>`<div class="gallery-tile"><img src="${esc(g.image_url)}"><button onclick="deleteGallery('${g.id}')">×</button><small>${esc((g.album_name||"Memories")+" • "+(g.caption||"No caption"))}</small><div class="tile-edit" onclick="updateGallery('${g.id}','${esc(g.album_name||"Memories").replace(/'/g,"&#39;")}','${esc(g.caption||"").replace(/'/g,"&#39;")}')">Edit</div></div>`).join("")||'<div class="notice-box">No gallery images.</div>'}
$("#addGallery").onclick=async()=>{try{const f=$("#galleryFile").files[0];if(!f)return alert("Image choose karein");const image_url=await uploadFile(f,"gallery");const {error}=await sb.from("gallery").insert({image_url,caption:$("#galleryCaption").value.trim()||null,album_name:$("#galleryAlbum").value.trim()||"Memories"});if(error)throw error;$("#galleryFile").value="";$("#galleryCaption").value="";loadGallery()}catch(e){alert(e.message)}}
window.updateGallery=async(id,album,caption)=>{
  const a=prompt("Album name:",album); if(a===null)return;
  const c=prompt("Caption:",caption); if(c===null)return;
  const {data,error}=await sb.rpc("admin_update_gallery",{
    p_id:id,
    p_album:a.trim()||"Memories",
    p_caption:c.trim()||null
  });
  if(error)return alert("Update failed: "+error.message);
  if(data!==true)return alert("Update nahi hua.");
  await loadGallery();
};

window.deleteGallery=async id=>{
  if(!confirm("Delete gallery item?"))return;
  const {data,error}=await sb.rpc("admin_delete_gallery",{p_id:id});
  if(error)return alert("Delete failed: "+error.message);
  if(data!==true)return alert("Delete nahi hua.");
  await loadGallery();
};

async function loadLinks(){const {data,error}=await sb.from("profile_links").select("*").order("link_type").order("sort_order");if(error){$("#linksList").innerHTML=`<div class="notice-box">${esc(error.message)} — Run upgrade-v3.sql first.</div>`;return}$("#linksList").innerHTML=(data||[]).map(x=>`<div class="data-card"><div class="thumb">${esc(x.icon||"↗")}</div><div class="data-main"><b>${esc(x.title)} • ${esc(x.link_type)}</b><small>${esc(x.subtitle||"")} • ${esc(x.url)}</small></div><div class="data-actions"><button class="mini-btn" onclick="moveLink(\'${x.id}\',-1)">↑</button><button class="mini-btn" onclick="moveLink(\'${x.id}\',1)">↓</button><button class="mini-btn save" onclick="updateLink(\'${x.id}\')">Update</button><button class="mini-btn delete" onclick="deleteLink(\'${x.id}\')">Delete</button></div></div>`).join("")||'<div class="notice-box">No links.</div>'}
$("#addLinkBtn").onclick=async()=>{const p={link_type:$("#linkType").value,title:$("#linkTitle").value.trim(),subtitle:$("#linkSubtitle").value.trim()||null,url:$("#linkUrl").value.trim(),icon:$("#linkIcon").value.trim()||"↗"};if(!p.title||!p.url)return alert("Title and URL required");const {error}=await sb.from("profile_links").insert(p);if(error)return alert(error.message);$("#linkTitle").value="";$("#linkSubtitle").value="";$("#linkUrl").value="";loadLinks()}
window.updateLink=async id=>{const {data,error}=await sb.from("profile_links").select("*").eq("id",id).single();if(error)return alert(error.message);const title=prompt("Title:",data.title);if(title===null)return;const subtitle=prompt("Subtitle:",data.subtitle||"");if(subtitle===null)return;const url=prompt("URL:",data.url);if(url===null)return;const {error:e}=await sb.from("profile_links").update({title:title.trim()||data.title,subtitle:subtitle.trim()||null,url:url.trim()||data.url}).eq("id",id);if(e)return alert(e.message);loadLinks()}

window.moveLink=async(id,dir)=>{
  const {data,error}=await sb.from("profile_links").select("*").order("sort_order").order("created_at");
  if(error)return alert(error.message);
  const arr=data||[],i=arr.findIndex(x=>x.id===id),j=i+dir;
  if(i<0||j<0||j>=arr.length)return;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  for(let k=0;k<arr.length;k++){
    const {error:e}=await sb.from("profile_links").update({sort_order:(k+1)*10}).eq("id",arr[k].id);
    if(e)return alert(e.message);
  }
  loadLinks();
};

window.deleteLink=async id=>{if(!confirm("Delete link?"))return;const {error}=await sb.from("profile_links").delete().eq("id",id);if(error)return alert(error.message);loadLinks()}

async function loadMessages(){const {data,error}=await sb.from("guest_messages").select("*").order("created_at",{ascending:false}).limit(100);if(error)return;const rows=data||[];$("#messageBadge").textContent=`${rows.length} MESSAGES`;$("#messageList").innerHTML=rows.map(m=>`<div class="data-card"><div class="thumb">✉</div><div class="data-main"><b>${esc(m.message)}</b><small>${fmt(m.created_at)}</small></div><div class="data-actions"><button class="mini-btn delete" onclick="deleteMessage('${m.id}')">Delete</button></div></div>`).join("")||'<div class="notice-box">No messages.</div>'}
window.deleteMessage=async id=>{if(!confirm("Delete message?"))return;await sb.from("guest_messages").delete().eq("id",id);loadMessages()}
async function loadStats(){const [v,l,c]=await Promise.all([sb.from("profile_views").select("*",{count:"exact",head:true}),sb.from("profile_likes").select("*",{count:"exact",head:true}),sb.from("link_clicks").select("link_name")]);$("#dashViews").textContent=v.count??0;$("#dashLikes").textContent=l.count??0;const map={};(c.data||[]).forEach(x=>map[x.link_name]=(map[x.link_name]||0)+1);$("#statsList").innerHTML=Object.entries(map).map(([k,n])=>`<div class="data-card"><div class="thumb">↗</div><div class="data-main"><b>${esc(k)}</b></div><div>${n}</div></div>`).join("")||'<div class="notice-box">No click data.</div>'}

checkSession();


async function loadAnalyticsV5(){
  const days=Number($("#analyticsRange")?.value||30);
  const since=new Date(Date.now()-days*86400000).toISOString();
  const [v,l,c,s]=await Promise.all([
    sb.from("profile_views").select("created_at").gte("created_at",since),
    sb.from("profile_likes").select("created_at").gte("created_at",since),
    sb.from("link_clicks").select("created_at").gte("created_at",since),
    sb.from("stories").select("created_at").gte("created_at",since)
  ]);
  const views=v.data||[],likes=l.data||[],clicks=c.data||[],storiesR=s.data||[];
  $("#aViews").textContent=views.length;$("#aLikes").textContent=likes.length;$("#aClicks").textContent=clicks.length;$("#aStories").textContent=storiesR.length;
  const buckets=Array.from({length:Math.min(days,30)},(_,i)=>({d:i,n:0,label:""}));
  const start=new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()-buckets.length+1);
  buckets.forEach((b,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);b.date=d.toISOString().slice(0,10);b.label=`${d.getDate()}/${d.getMonth()+1}`});
  views.forEach(r=>{const k=new Date(r.created_at).toISOString().slice(0,10),b=buckets.find(x=>x.date===k);if(b)b.n++});
  const max=Math.max(1,...buckets.map(x=>x.n));
  $("#analyticsBars").innerHTML=buckets.map(b=>`<div class="bar-col"><div class="bar" title="${b.n} views" style="height:${Math.max(2,(b.n/max)*135)}px"></div><small>${b.label}</small></div>`).join("");
}
$("#analyticsRange")?.addEventListener("change",loadAnalyticsV5);
