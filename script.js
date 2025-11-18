/* script.js
   * مهم: بعد نشر السيرفر الخاص بك ضع رابط API هنا (انتهِ من نشر السيرفر أولاً)
   * مثال: const API_BASE = "https://your-news-proxy.onrender.com/api/";
*/
const API_BASE = "https://YOUR_SERVER_URL/api/"; // ← غيّره إلى رابط السيرفر المنشور لديك

/* ---------- إعداد واجهة وتفاعلات ---------- */
const splash = document.getElementById("splash");
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");
const themeToggle = document.getElementById("themeToggle");
const fontPlus = document.getElementById("fontPlus");
const fontMinus = document.getElementById("fontMinus");
const refreshBtn = document.getElementById("refreshBtn");

const politicsSection = document.getElementById("politics");
const youtubeSection = document.getElementById("youtube");
const favSection = document.getElementById("favorites");

const articlePage = document.getElementById("articlePage");
const articleContent = document.getElementById("articleContent");
document.getElementById("closeArticle").onclick = () => {
  articlePage.classList.add("hidden");
  articlePage.setAttribute("aria-hidden","true");
};

// تبويبات
tabs.forEach(btn => {
  btn.addEventListener("click", ()=> {
    tabs.forEach(t=>t.classList.remove("active"));
    contents.forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// وضع تلقائي
if(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches){
  document.body.classList.add("dark");
  themeToggle.textContent = "☀️";
}
themeToggle.onclick = ()=> {
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
};

// حجم الخط
let fontSize = 16;
fontPlus.onclick = ()=> { fontSize++; document.body.style.fontSize = fontSize + "px"; }
fontMinus.onclick = ()=> { fontSize = Math.max(12, fontSize - 1); document.body.style.fontSize = fontSize + "px"; }

// مخزن الأخبار الحالية (للاستدعاءات الداخلية)
let politicsItems = [];
let youtubeItems = [];

/* ---------- مفضلة ---------- */
let favorites = JSON.parse(localStorage.getItem("favNews") || "[]");
function saveFav(){ localStorage.setItem("favNews", JSON.stringify(favorites)); }
function isFav(link){ return favorites.findIndex(f=>f.link === link) !== -1; }
function toggleFavByLink(item){
  const idx = favorites.findIndex(f => f.link === item.link);
  if(idx >= 0) favorites.splice(idx,1);
  else favorites.push(item);
  saveFav();
  renderFavorites();
  // تحديث الأيقونات في البطاقات
  refreshDisplayedFavButtons();
}
window.toggleFavByLink = (item) => toggleFavByLink(item);

// render favorites tab
function renderFavorites(){
  favSection.innerHTML = "";
  if(!favorites.length){
    favSection.innerHTML = "<p>قائمة المفضلة فارغة.</p>";
    return;
  }
  favorites.forEach(it => {
    const el = createCardElement(it, true, "favorite");
    favSection.appendChild(el);
  });
}

/* ---------- إنشاء بطاقة ديناميكية (DOM API آمن) ---------- */
function createCardElement(item, isFav=false, source="politics"){
  const card = document.createElement("article");
  card.className = "card";

  if(item.img){
    const img = document.createElement("img");
    img.src = item.img;
    img.alt = item.title || "image";
    img.onerror = ()=> img.src = "https://via.placeholder.com/800x450?text=No+Image";
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "card-body";
  const h3 = document.createElement("h3");
  h3.textContent = item.title || "";
  const p = document.createElement("p");
  p.innerHTML = item.desc || "";
  body.appendChild(h3);
  body.appendChild(p);
  card.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "card-buttons";

  const readBtn = document.createElement("button");
  readBtn.className = "action-btn";
  readBtn.textContent = "قراءة الخبر";
  readBtn.onclick = ()=> openArticleInApp(item);

  const favBtn = document.createElement("button");
  favBtn.className = "favorite-btn";
  favBtn.title = "أضف للمفضلة";
  favBtn.innerText = isFav || isFav === undefined ? (isFav ? "🌟" : "⭐") : (isFav ? "🌟" : "⭐");

  // set active class if link in favorites
  if(isFav || isFav === true || isFav === false){
    if(isFav) favBtn.classList.add("active");
  } else {
    if(isFavByItem(item)) favBtn.classList.add("active");
  }

  favBtn.onclick = (e)=> {
    e.stopPropagation();
    toggleFavByLink(item);
    // toggle class/icon
    if(isFavByItem(item)){
      favBtn.classList.add("active");
      favBtn.innerText = "🌟";
    } else {
      favBtn.classList.remove("active");
      favBtn.innerText = "⭐";
    }
  };

  footer.appendChild(readBtn);
  footer.appendChild(favBtn);
  card.appendChild(footer);
  return card;
}

function isFavByItem(item){
  return favorites.findIndex(f=>f.link === item.link) !== -1;
}

function refreshDisplayedFavButtons(){
  // تحديث جميع أزرار المفضلة في DOM (بحث عام)
  document.querySelectorAll(".favorite-btn").forEach(btn=>{
    // نحاول العثور على الرابط المرتبط عن طريق البحث في العنصر الأب
    const card = btn.closest(".card");
    if(!card) return;
    const title = card.querySelector("h3")?.textContent || "";
    // match in favorites by title (best-effort)
    const found = favorites.find(f => f.title === title);
    if(found){
      btn.classList.add("active");
      btn.innerText = "🌟";
    } else {
      btn.classList.remove("active");
      btn.innerText = "⭐";
    }
  });
}

/* ---------- فتح الخبر داخل التطبيق (iframe أو فتح خارجي إذا منع) ---------- */
function openArticleInApp(item){
  articlePage.classList.remove("hidden");
  articlePage.setAttribute("aria-hidden","false");
  const link = item.link || (item.vid ? `https://www.youtube.com/watch?v=${item.vid}` : "#");
  // إذا كان فيديو يوتيوب نعرض المشغل
  if(link.includes("youtube.com/watch") || item.vid){
    const vid = item.vid || (link.split("v=")[1] || "");
    articleContent.innerHTML = `<h2>${escapeHtml(item.title || "")}</h2>
      <iframe class="youtube-player" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
    return;
  }
  // غير ذلك: حاول عرض المقال داخل iframe (قد تمنع بعض المواقع)
  articleContent.innerHTML = `<h2>${escapeHtml(item.title || "")}</h2>
    <div id="articleFrameWrap">
      <iframe id="articleFrame" class="youtube-player" src="${link}" frameborder="0"></iframe>
    </div>
    <p style="margin-top:10px">إذا لم يظهر المحتوى أعلاه، اضغط لفتحه في نافذة جديدة:</p>
    <a href="${link}" target="_blank" rel="noopener">فتح في تبويب جديد</a>`;
}

/* سلامة النص */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}

/* ---------- جلب من السيرفر ---------- */
async function getJSON(path){
  if(!API_BASE || API_BASE.includes("YOUR_SERVER_URL")){
    throw new Error("API_BASE غير مضبوط — ضع رابط السيرفر الخاص بك في script.js");
  }
  const url = API_BASE + path;
  const res = await fetch(url);
  if(!res.ok) throw new Error("fetch failed");
  return await res.json();
}

/* ---------- إشعارات بسيطة عن الأخبار الجديدة ---------- */
function notify(title, body){
  if("Notification" in window && Notification.permission === "granted"){
    new Notification(title, { body });
  }
}
async function ensureNotificationPermission(){
  if("Notification" in window && Notification.permission !== "granted"){
    try{ await Notification.requestPermission(); } catch(e){}
  }
}

/* ---------- تحميل وتقديم البيانات ---------- */
async function loadPolitics(){
  politicsSection.innerHTML = "<p>جاري جلب أخبار السياسة...</p>";
  try{
    const items = await getJSON("politics");
    politicsItems = items || [];
    politicsSection.innerHTML = "";
    politicsItems.forEach(it => politicsSection.appendChild(createCardElement(it, isFavByItem(it), "politics")));
    // إشعارات للأخبار الجديدة: نحفظ روابط حديثة في localStorage
    const seenKey = "seenPolitics";
    const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
    const newLinks = politicsItems.map(i=>i.link).filter(l => l && !seen.includes(l));
    if(newLinks.length){
      await ensureNotificationPermission();
      newLinks.slice(0,3).forEach(l => {
        const item = politicsItems.find(i=>i.link===l);
        if(item) notify("خبر جديد", item.title || "خبر جديد");
      });
      localStorage.setItem(seenKey, JSON.stringify(politicsItems.map(i=>i.link)));
    }
  } catch(e){
    console.error(e);
    politicsSection.innerHTML = "<p>تعذر جلب الأخبار. تأكد من تشغيل السيرفر وAPI_BASE صحيح.</p>";
  }
}

async function loadYoutube(){
  youtubeSection.innerHTML = "<p>جاري جلب فيديوهات اليوتيوب...</p>";
  try{
    const items = await getJSON("youtube");
    youtubeItems = items || [];
    youtubeSection.innerHTML = "";
    youtubeItems.forEach(it => {
      const el = createCardElement(it, isFavByItem(it), "youtube");
      // تعديل زر القراءة ليشغل الفيديو داخل التطبيق مباشرة
      // عند إنشاء البطاقة، زر القراءة يفتح openArticleInApp بطريقة صحيحة
      youtubeSection.appendChild(el);
    });

    // إشعارات فيديو جديد
    const seenKey = "seenYoutube";
    const seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
    const newLinks = youtubeItems.map(i=>i.link).filter(l => l && !seen.includes(l));
    if(newLinks.length){
      await ensureNotificationPermission();
      newLinks.slice(0,3).forEach(l=>{
        const it = youtubeItems.find(x=>x.link===l);
        if(it) notify("فيديو جديد على اليوتيوب", it.title || "فيديو جديد");
      });
      localStorage.setItem(seenKey, JSON.stringify(youtubeItems.map(i=>i.link)));
    }

  } catch(e){
    console.error(e);
    youtubeSection.innerHTML = "<p>تعذر جلب فيديوهات اليوتيوب. تأكد من ضبط مفتاح YouTube في السيرفر.</p>";
  }
}

/* ---------- تحميل كل شيء والتحكم بالسبلاش ---------- */
async function loadAll(){
  splash.style.display = "flex";
  try{
    await Promise.all([loadPolitics(), loadYoutube()]);
    renderFavorites();
    refreshDisplayedFavButtons();
  } catch(e){
    console.error(e);
  } finally {
    setTimeout(()=>{ splash.style.display = "none"; }, 700);
  }
}

/* زر التحديث */
refreshBtn.onclick = loadAll;

/* بدء التطبيق */
loadAll();

/* ---------- وظائف مساعدة (للتطوير) ---------- */
window.openArticleInApp = openArticleInApp;
window.playYT = function(id){
  articlePage.classList.remove("hidden");
  articlePage.setAttribute("aria-hidden","false");
  articleContent.innerHTML = `<h2>تشغيل الفيديو</h2>
    <iframe class="youtube-player" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
};
