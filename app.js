const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const cfg=window.HK_SUPABASE||{};
const ready=cfg.url && cfg.anonKey && !cfg.anonKey.includes("PASTE_");
const sb=ready ? supabase.createClient(cfg.url,cfg.anonKey) : null;
let stories=[], highlights=[];

function toast(t){
  const e=$("#toast"); e.textContent=t; e.classList.add("show");
  clearTimeout(window.__tt); window.__tt=setTimeout(()=>e.classList.remove("show"),1800);
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function uid(){
  let id=localStorage.getItem("hk_visitor_id");
  if(!id){id=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random());localStorage.setItem("hk_visitor_id",id)}
  return id;
}

async function loadAll(){
  if(!ready){
    toast("Supabase key add karna baki hai");
    $("#noteText").textContent="Building something new 🚀";
    $("#viewCount").textContent="0"; $("#likeCount").textContent="0";
    $("#storyRing").classList.add("no-story");
    return;
  }

  await Promise.all([loadSettings(), loadStories(), loadHighlights(), loadGallery(), loadCounts(), loadProfileLinks(), loadPlaylist()]);
  await registerView();
}

async function loadSettings(){
  const {data,error}=await sb.from("profile_settings").select("*").order("id",{ascending:true}).limit(1).maybeSingle();
  if(!error && data){
    $("#noteText").textContent=data.note||"Building something new 🚀";
    if($("#publicDisplayName"))$("#publicDisplayName").textContent=data.display_name||"Harekrishna Patel";
    if($("#publicProfession"))$("#publicProfession").textContent=data.profession||"Web Creator • Tech Enthusiast • Inventory Professional";
    if($("#publicVerified"))$("#publicVerified").style.display=data.verified===false?"none":"inline";
    const loc=document.querySelector(".meta-row span:first-child"); if(loc)loc.textContent="📍 "+(data.location_text||"India");
    const profileImg=document.querySelector(".avatar img"); if(profileImg&&data.profile_photo_url)profileImg.src=data.profile_photo_url;
    const statusEl=document.querySelector(".meta-row span:last-child");
    if(statusEl) statusEl.textContent="● "+(data.profile_status||"Available");
    const ab=$("#announcementBar");
    if(ab){
      const show=!!data.announcement_enabled && !!data.announcement_text;
      ab.style.display=show?"flex":"none";
      $("#announcementText").textContent=data.announcement_text||"";
    }
    $("#musicTitle").textContent=data.music_title||"Favourite Music";
    if(data.music_url){
      $("#audio").src=data.music_url;
      $("#musicState").textContent="Tap play to listen";
    }else{
      $("#musicState").textContent="No music added";
    }
  }
}

async function loadStories(){
  const {data,error}=await sb.from("stories").select("*").eq("is_draft",false).lte("starts_at",new Date().toISOString()).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:true});
  stories=error?[]:(data||[]);
  $("#storyRing").classList.toggle("no-story",stories.length===0);
  $("#storyBadge").textContent=stories.length?"▶":"+";
}

async function loadHighlights(){
  const {data,error}=await sb.from("highlights").select("*,highlight_items(*)").order("created_at",{ascending:true});
  highlights=error?[]:(data||[]).map(h=>({
    ...h,
    highlight_items:(h.highlight_items||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||new Date(a.created_at)-new Date(b.created_at))
  }));
  const wrap=$("#highlightStrip");
  wrap.innerHTML="";
  if(!highlights.length){$("#highlightsSection").style.display="none";return}
  $("#highlightsSection").style.display="";
  highlights.forEach((h,i)=>{
    const el=document.createElement("div"); el.className="highlight";
    const cover=h.cover_url
      ? `<img src="${esc(h.cover_url)}" alt="">`
      : `<div>${esc(h.emoji||"⭐")}</div>`;
    el.innerHTML=`<div class="highlight-cover">${cover}</div><b>${esc(h.name)}</b>`;
    el.onclick=()=>openHighlight(i);
    wrap.appendChild(el);
  });
}

async function loadGallery(){
  const {data,error}=await sb.from("gallery").select("*").order("created_at",{ascending:false}).limit(12);
  const g=$("#gallery"); g.innerHTML="";
  const items=error?[]:(data||[]);
  if(!items.length){$("#gallerySection").style.display="none";return}
  $("#gallerySection").style.display="";
  items.forEach(it=>{
    const d=document.createElement("div"); d.className="gallery-item";
    d.innerHTML=`<img src="${esc(it.image_url)}" alt="${esc(it.caption||"Gallery")}">`;
    g.appendChild(d);
  });
}

async function loadCounts(){
  const [v,l]=await Promise.all([
    sb.from("profile_views").select("*",{count:"exact",head:true}),
    sb.from("profile_likes").select("*",{count:"exact",head:true})
  ]);
  $("#viewCount").textContent=v.count??0;
  $("#likeCount").textContent=l.count??0;
}

async function registerView(){
  const k="hk_viewed_"+new Date().toISOString().slice(0,10);
  if(sessionStorage.getItem(k)) return;
  const {error}=await sb.from("profile_views").insert({visitor_id:uid()});
  if(!error){sessionStorage.setItem(k,"1");loadCounts()}
}

$("#likeBtn").onclick=async()=>{
  if(!ready)return toast("Supabase key add karein");
  if(localStorage.getItem("hk_liked_profile"))return toast("Aap already like kar chuke hain");
  const {error}=await sb.from("profile_likes").insert({visitor_id:uid()});
  if(error)return toast("Like save nahi hua");
  localStorage.setItem("hk_liked_profile","1");
  toast("Thanks ❤️"); loadCounts();
};

$("#saveMessageBtn").onclick=async()=>{
  const message=$("#guestMessage").value.trim();
  if(!message)return toast("Message likhiye");
  if(!ready)return toast("Supabase key add karein");
  const {error}=await sb.from("guest_messages").insert({message});
  if(error)return toast("Message send nahi hua");
  $("#guestMessage").value=""; toast("Message sent ✨");
};

$$("[data-track]").forEach(a=>a.addEventListener("click",async()=>{
  if(!ready)return;
  await sb.from("link_clicks").insert({link_name:a.dataset.track||"Link"});
}));


async function shareProfile(){
  const p={title:"Harekrishna Patel",text:"Check out my profile and projects.",url:location.href};
  try{
    if(navigator.share) await navigator.share(p);
    else{await navigator.clipboard.writeText(location.href);toast("Profile link copied!")}
  }catch(e){}
}
$("#shareBtn").onclick=shareProfile;
$("#shareTopBtn").onclick=shareProfile;
$("#copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast("Link copied!")}catch(e){toast("Copy unavailable")}};

$("#themeBtn").onclick=()=>{
  document.body.classList.toggle("light");
  localStorage.setItem("hk_theme",document.body.classList.contains("light")?"light":"dark");
  $("#themeBtn").textContent=document.body.classList.contains("light")?"☀":"☾";
};
if(localStorage.getItem("hk_theme")==="light"){document.body.classList.add("light");$("#themeBtn").textContent="☀"}

let storyIndex=0,storyTimer;
let storyMusicAudio=null,storyMusicTimer=null;

function stopStoryMusic(){
  clearTimeout(storyMusicTimer);
  if(storyMusicAudio){try{storyMusicAudio.pause()}catch(e){} storyMusicAudio.src="";storyMusicAudio=null}
  document.querySelector(".story-music-badge")?.remove();
}
function playStoryMusic(s){
  stopStoryMusic();
  if(!s?.music_url)return;
  const mode=s.audio_mode||"music";
  const video=$("#storyMedia")?.querySelector("video");
  if(video){video.muted=mode==="music";video.volume=mode==="mix"?0.35:1}
  const badge=document.createElement("div");
  badge.className="story-music-badge";badge.textContent="♪ "+(s.music_title||"Music");
  $("#storyModal").appendChild(badge);
  if(mode==="original")return;
  storyMusicAudio=new Audio(s.music_url);
  storyMusicAudio.volume=Number(s.music_volume??0.8);
  storyMusicAudio.addEventListener("loadedmetadata",async()=>{
    let st=Math.max(0,Number(s.music_start||0));
    if(storyMusicAudio.duration&&st>=storyMusicAudio.duration)st=0;
    storyMusicAudio.currentTime=st;
    try{await storyMusicAudio.play();storyMusicTimer=setTimeout(stopStoryMusic,60000)}catch(e){console.log(e)}
  },{once:true});
}

function openStory(i=0){
  if(!stories.length)return toast("No active story");
  storyIndex=Math.max(0,Math.min(i,stories.length-1));
  $("#storyModal").classList.add("open"); showStory();
}
function showStory(){
  clearTimeout(storyTimer);
  const s=stories[storyIndex]; if(!s)return closeStory();
  $("#storyBars").innerHTML=stories.map((_,i)=>`<span><i style="width:${i<storyIndex?"100%":"0"}"></i></span>`).join("");
  const bar=$$("#storyBars i")[storyIndex];
  setTimeout(()=>bar.style.transition="width 5s linear",20); setTimeout(()=>bar.style.width="100%",40);
  const msLeft=new Date(s.expires_at)-Date.now();
  const hLeft=Math.max(0,Math.ceil(msLeft/3600000));
  $("#storyTime").textContent=hLeft<24?`${hLeft}h left`:`${Math.ceil(hLeft/24)}d left`;
  const m=$("#storyMedia"); m.innerHTML="";
  if(s.type==="image" && s.media_url){
    m.innerHTML=`<img src="${esc(s.media_url)}" alt="Story">`;
  }else if(s.type==="video" && s.media_url){
    m.innerHTML=`<video src="${esc(s.media_url)}" autoplay controls playsinline></video>`;
  }else{
    m.innerHTML=`<div class="story-placeholder"><div class="big">${esc(s.emoji||"✨")}</div><p>${esc(s.story_text||"Story")}</p></div>`;
  }
  playStoryMusic(s);
  storyTimer=setTimeout(()=>{if(storyIndex<stories.length-1){storyIndex++;showStory()}else closeStory()},5000);
}
function closeStory(){clearTimeout(storyTimer);stopStoryMusic();$("#storyModal").classList.remove("open")}
$("#storyProfile").onclick=()=>openStory(0);
$("#closeStory").onclick=closeStory;
$("#prevStory").onclick=()=>{if(storyIndex>0){stopStoryMusic();storyIndex--;showStory()}};
$("#nextStory").onclick=()=>{if(storyIndex<stories.length-1){stopStoryMusic();storyIndex++;showStory()}else closeStory()};
$("#storyModal").addEventListener("click",e=>{if(e.target===$("#storyModal"))closeStory()});

let highlightIndex=0,highlightItemIndex=0,highlightTimer=null;

async function openHighlight(i){
  const h=highlights[i]; if(!h)return;
  highlightIndex=i; highlightItemIndex=0;
  if(ready){
    sb.from("highlight_views").insert({highlight_id:h.id,visitor_id:uid()}).then(()=>{});
  }
  $("#highlightModal").classList.add("open");
  renderHighlightStory();
}

function renderHighlightStory(){
  clearTimeout(highlightTimer);
  const h=highlights[highlightIndex]; if(!h)return;
  const items=(h.highlight_items||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||new Date(a.created_at)-new Date(b.created_at));
  if(!items.length){
    $("#highlightContent").innerHTML=`<div class="highlight-story-head"><b>${esc(h.emoji||"⭐")} ${esc(h.name)}</b></div><div class="highlight-empty">No items yet.</div>`;
    return;
  }
  highlightItemIndex=Math.max(0,Math.min(highlightItemIndex,items.length-1));
  const it=items[highlightItemIndex];
  const bars=items.map((_,x)=>`<span><i style="width:${x<highlightItemIndex?"100%":"0"}"></i></span>`).join("");
  let media="";
  if(it.type==="image"&&it.media_url)media=`<img src="${esc(it.media_url)}" alt="">`;
  else if(it.type==="video"&&it.media_url)media=`<video id="highlightVideo" src="${esc(it.media_url)}" autoplay playsinline controls></video>`;
  else media=`<div class="highlight-story-text">${esc(it.item_text||"")}</div>`;

  $("#highlightContent").innerHTML=`
    <div class="highlight-progress">${bars}</div>
    <div class="highlight-story-head"><b>${esc(h.emoji||"⭐")} ${esc(h.name)}</b><small>${highlightItemIndex+1}/${items.length}</small></div>
    <div class="highlight-story-media">${media}</div>
    ${it.item_text&&it.type!=="text"?`<div class="highlight-caption">${esc(it.item_text)}</div>`:""}
    <button class="highlight-arrow hprev" onclick="highlightPrev()">‹</button>
    <button class="highlight-arrow hnext" onclick="highlightNext()">›</button>`;

  const currentBar=$$(".highlight-progress i")[highlightItemIndex];
  if(currentBar){
    setTimeout(()=>currentBar.style.transition="width 5s linear",20);
    setTimeout(()=>currentBar.style.width="100%",40);
  }
  if(it.type!=="video"){
    highlightTimer=setTimeout(()=>highlightNext(),5000);
  }else{
    const v=$("#highlightVideo");
    if(v) v.onended=()=>highlightNext();
  }
}

window.highlightPrev=()=>{if(highlightItemIndex>0){highlightItemIndex--;renderHighlightStory()}};
window.highlightNext=()=>{
  const h=highlights[highlightIndex],items=h?.highlight_items||[];
  if(highlightItemIndex<items.length-1){highlightItemIndex++;renderHighlightStory()}
  else{$("#highlightModal").classList.remove("open");clearTimeout(highlightTimer)}
};

$("#closeHighlight").onclick=()=>$("#highlightModal").classList.remove("open");
$("#highlightModal").addEventListener("click",e=>{if(e.target===$("#highlightModal"))$("#highlightModal").classList.remove("open")});


let playlist=[],playlistIndex=0,clipTimer=null;

async function loadProfileLinks(){
  if(!ready)return;
  const {data,error}=await sb.from("profile_links").select("*").eq("enabled",true).order("sort_order");
  if(error)return;
  const rows=data||[];
  const projects=rows.filter(x=>x.link_type==="project");
  const socials=rows.filter(x=>x.link_type==="social");
  const pg=$("#projectGrid"),sg=$("#socialGrid");
  if(pg) pg.innerHTML=projects.map(x=>`<a class="project-card" data-track="${esc(x.title)}" href="${esc(x.url)}" target="_blank" rel="noopener"><div class="project-icon">${esc(x.icon||"↗")}</div><div><b>${esc(x.title)}</b><small>${esc(x.subtitle||"")}</small></div><span>↗</span></a>`).join("");
  if(sg) sg.innerHTML=socials.map(x=>`<a data-track="${esc(x.title)}" href="${esc(x.url)}" ${x.url.startsWith("mailto:")?"":'target="_blank" rel="noopener"'}><span>${esc(x.icon||"↗")}</span><b>${esc(x.title)}</b><small>${esc(x.subtitle||"")}</small></a>`).join("");
  $$("[data-track]").forEach(a=>{a.onclick=async()=>{if(ready)await sb.from("link_clicks").insert({link_name:a.dataset.track||"Link"})}});
}

async function loadPlaylist(){
  if(!ready)return;
  const {data,error}=await sb.from("music_playlist").select("*").eq("enabled",true).order("sort_order").order("created_at");
  if(error)return;
  playlist=data||[];
  playlistIndex=0;
  renderPlaylistSong();
}
function renderPlaylistSong(){
  clearTimeout(clipTimer);
  const a=$("#audio");
  if(!playlist.length){
    $("#musicTitle").textContent="Favourite Music";$("#musicState").textContent="No music added";a.removeAttribute("src");return;
  }
  const s=playlist[playlistIndex];
  $("#musicTitle").textContent=s.title;
  $("#musicState").textContent=`${playlistIndex+1}/${playlist.length} • ${s.clip_seconds}s clip`;
  a.src=s.media_url;
  $("#musicBtn").textContent="▶";
}
function playCurrent(){
  const a=$("#audio");if(!playlist.length)return toast("No music added");
  clearTimeout(clipTimer);a.currentTime=0;
  a.play().then(()=>{
    $("#musicBtn").textContent="❚❚";
    $("#musicState").textContent=`Playing • ${playlist[playlistIndex].clip_seconds}s`;
    clipTimer=setTimeout(()=>{a.pause();$("#musicBtn").textContent="▶";$("#musicState").textContent="Clip finished"},playlist[playlistIndex].clip_seconds*1000);
  }).catch(()=>toast("Audio play nahi hua"));
}
const oldMusicBtn=$("#musicBtn");
if(oldMusicBtn) oldMusicBtn.onclick=()=>{const a=$("#audio");if(a.paused)playCurrent();else{a.pause();clearTimeout(clipTimer);oldMusicBtn.textContent="▶";$("#musicState").textContent="Paused"}};
const prev=$("#musicPrevBtn"); if(prev) prev.onclick=()=>{if(!playlist.length)return;playlistIndex=(playlistIndex-1+playlist.length)%playlist.length;renderPlaylistSong();playCurrent()};
const next=$("#musicNextBtn"); if(next) next.onclick=()=>{if(!playlist.length)return;playlistIndex=(playlistIndex+1)%playlist.length;renderPlaylistSong();playCurrent()};

$("#year").textContent=new Date().getFullYear();
loadAll();
