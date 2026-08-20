const $=s=>document.querySelector(s);
const cfg=window.HK_SUPABASE||{};
const ready=cfg.url && cfg.anonKey && !cfg.anonKey.includes("PASTE_");
const sb=ready?supabase.createClient(cfg.url,cfg.anonKey):null;
let settingsId=null,highlights=[];

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function msg(id,t){$(id).textContent=t||""}
function safeName(name){return `${Date.now()}-${Math.random().toString(36).slice(2)}-${name.replace(/[^a-zA-Z0-9._-]/g,"_")}`}

async function uploadFile(file,folder){
  if(!file)return null;
  const path=`${folder}/${safeName(file.name)}`;
  const {error}=await sb.storage.from(cfg.bucket).upload(path,file,{cacheControl:"3600",upsert:false});
  if(error)throw error;
  return sb.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
}

async function checkSession(){
  if(!ready){
    $("#loginMsg").textContent="supabase-config.js me publishable/anon key paste karein.";
    return;
  }
  const {data:{session}}=await sb.auth.getSession();
  if(session && session.user?.email===cfg.adminEmail)showAdmin();
}

$("#loginBtn").onclick=async()=>{
  if(!ready)return msg("#loginMsg","Supabase key missing.");
  msg("#loginMsg","Logging in...");
  const email=$("#email").value.trim();
  const password=$("#password").value;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)return msg("#loginMsg",error.message);
  if(data.user?.email!==cfg.adminEmail){
    await sb.auth.signOut();
    return msg("#loginMsg","This account is not allowed.");
  }
  showAdmin();
};

async function showAdmin(){
  $("#loginBox").classList.add("hide");
  $("#admin").classList.remove("hide");
  await refreshAll();
}
$("#logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};

async function refreshAll(){
  await Promise.all([loadSettings(),loadStories(),loadHighlights(),loadGallery(),loadMessages(),loadStats()]);
}

async function loadSettings(){
  const {data}=await sb.from("profile_settings").select("*").order("id").limit(1).maybeSingle();
  if(data){
    settingsId=data.id; $("#note").value=data.note||""; $("#musicTitle").value=data.music_title||""; $("#musicUrl").value=data.music_url||"";
  }
}
$("#saveSettings").onclick=async()=>{
  const payload={note:$("#note").value.trim(),music_title:$("#musicTitle").value.trim(),music_url:$("#musicUrl").value.trim(),updated_at:new Date().toISOString()};
  let res=settingsId?await sb.from("profile_settings").update(payload).eq("id",settingsId):await sb.from("profile_settings").insert(payload).select().single();
  if(res.error)return alert(res.error.message);
  if(res.data?.id)settingsId=res.data.id;
  alert("Settings saved");
};

async function loadStories(){
  const {data}=await sb.from("stories").select("*").order("created_at",{ascending:false});
  $("#storyList").innerHTML=(data||[]).map(s=>`<div class="item"><div><b>${esc(s.type)}</b><br><small>${new Date(s.expires_at).toLocaleString()}</small></div><button class="danger" onclick="deleteStory('${s.id}')">Delete</button></div>`).join("")||'<div class="notice">No stories.</div>';
}
$("#addStory").onclick=async()=>{
  try{
    const type=$("#storyType").value;
    let media_url=null;
    if(type!=="text"){
      const file=$("#storyFile").files[0];
      if(!file)return alert("File choose karein");
      msg("#storyMsg","Uploading...");
      media_url=await uploadFile(file,"stories");
    }
    const {error}=await sb.from("stories").insert({
      type, media_url,
      story_text:$("#storyText").value.trim()||null,
      emoji:$("#storyEmoji").value.trim()||"✨",
      expires_at:new Date(Date.now()+86400000).toISOString()
    });
    if(error)throw error;
    $("#storyFile").value=""; $("#storyText").value=""; msg("#storyMsg","Story uploaded ✅"); loadStories();
  }catch(e){msg("#storyMsg",e.message)}
};
window.deleteStory=async id=>{if(confirm("Delete story?")){await sb.from("stories").delete().eq("id",id);loadStories()}};

async function loadHighlights(){
  const {data}=await sb.from("highlights").select("*").order("created_at",{ascending:true});
  highlights=data||[];
  $("#highlightList").innerHTML=highlights.map(h=>`<div class="item"><div><b>${esc(h.emoji||"⭐")} ${esc(h.name)}</b></div><button class="danger" onclick="deleteHighlight('${h.id}')">Delete</button></div>`).join("")||'<div class="notice">No highlights.</div>';
  $("#hlSelect").innerHTML=highlights.map(h=>`<option value="${h.id}">${esc(h.name)}</option>`).join("");
}
$("#addHighlight").onclick=async()=>{
  try{
    const name=$("#hlName").value.trim(); if(!name)return alert("Name required");
    let cover_url=null; const file=$("#hlCover").files[0];
    if(file)cover_url=await uploadFile(file,"highlights");
    const {error}=await sb.from("highlights").insert({name,emoji:$("#hlEmoji").value.trim()||"⭐",cover_url});
    if(error)throw error;
    $("#hlName").value="";$("#hlCover").value="";loadHighlights();
  }catch(e){alert(e.message)}
};
window.deleteHighlight=async id=>{if(confirm("Delete highlight and all items?")){await sb.from("highlights").delete().eq("id",id);loadHighlights()}};

$("#addHighlightItem").onclick=async()=>{
  try{
    const highlight_id=$("#hlSelect").value;if(!highlight_id)return alert("Highlight create karein");
    const type=$("#hlItemType").value;let media_url=null;
    if(type!=="text"){
      const file=$("#hlItemFile").files[0];if(!file)return alert("File choose karein");
      media_url=await uploadFile(file,"highlight-items");
    }
    const {error}=await sb.from("highlight_items").insert({
      highlight_id,type,media_url,item_text:$("#hlItemText").value.trim()||null
    });
    if(error)throw error;
    $("#hlItemText").value="";$("#hlItemFile").value="";alert("Added to highlight ✅");
  }catch(e){alert(e.message)}
};

async function loadGallery(){
  const {data}=await sb.from("gallery").select("*").order("created_at",{ascending:false});
  $("#galleryList").innerHTML=(data||[]).map(g=>`<div class="item"><img class="preview" src="${esc(g.image_url)}"><div style="flex:1"><small>${esc(g.caption||"")}</small></div><button class="danger" onclick="deleteGallery('${g.id}')">Delete</button></div>`).join("")||'<div class="notice">No gallery images.</div>';
}
$("#addGallery").onclick=async()=>{
  try{
    const file=$("#galleryFile").files[0];if(!file)return alert("Image choose karein");
    const image_url=await uploadFile(file,"gallery");
    const {error}=await sb.from("gallery").insert({image_url,caption:$("#galleryCaption").value.trim()||null});
    if(error)throw error;
    $("#galleryFile").value="";$("#galleryCaption").value="";loadGallery();
  }catch(e){alert(e.message)}
};
window.deleteGallery=async id=>{if(confirm("Delete gallery item?")){await sb.from("gallery").delete().eq("id",id);loadGallery()}};

async function loadMessages(){
  const {data}=await sb.from("guest_messages").select("*").order("created_at",{ascending:false}).limit(50);
  $("#messageList").innerHTML=(data||[]).map(m=>`<div class="item"><div><small>${new Date(m.created_at).toLocaleString()}</small><br>${esc(m.message)}</div><button class="danger" onclick="deleteMessage('${m.id}')">Delete</button></div>`).join("")||'<div class="notice">No messages.</div>';
}
window.deleteMessage=async id=>{if(confirm("Delete message?")){await sb.from("guest_messages").delete().eq("id",id);loadMessages()}};

async function loadStats(){
  const [v,l,c]=await Promise.all([
    sb.from("profile_views").select("*",{count:"exact",head:true}),
    sb.from("profile_likes").select("*",{count:"exact",head:true}),
    sb.from("link_clicks").select("link_name")
  ]);
  const map={};(c.data||[]).forEach(x=>map[x.link_name]=(map[x.link_name]||0)+1);
  $("#statsList").innerHTML=`<div class="item"><b>Profile Views</b><small>${v.count??0}</small></div><div class="item"><b>Likes</b><small>${l.count??0}</small></div>`+
    Object.entries(map).map(([k,n])=>`<div class="item"><b>${esc(k)}</b><small>${n} clicks</small></div>`).join("");
}
checkSession();
