const STORAGE_KEY = "bnow.project-board.tasks";
const IMPORT_META_KEY = "bnow.project-board.googleSheetImport.2026h2";
const SEED_URL = "data/google-sheet-tasks.json";
const RECOMMENDATION_PROFILE_KEY = "bnow.project-board.recommendationProfile.v2";
const RECOMMENDATION_API_URL = "https://bnow-assistant-sandy.vercel.app/api/government-notices";
const SUPABASE_URL = "https://lwwfzwdjaedrfckyduno.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LGd8ijujuQtCRYQtlrgnqw_EWqvRW50";
const CLOUD_SYNC_PROJECT_TITLE = "__BNOW_GOVERNMENT_BOARD_SYNC__";
const CLOUD_SYNC_SCHEMA = "government-tasks-v1";

let recommendedNotices = [];

const defaultProfile = {
  keywords: "스마트축산, 정밀축산, 축산 ICT, 애그테크, 동물 헬스케어, 애니멀 헬스, 가축 생체정보, 농축산 AI, 축산 IoT, 축산 빅데이터, 디지털 축산, 스마트팜, 동물복지, 생체데이터, 바이오데이터, 바이오센서, 체내 삽입형 센서, IoT 센서, LoRa, 저전력 통신, 게이트웨이, 임베디드, 펌웨어, 시계열 AI, 이상징후 탐지, 예측 AI, 엣지 AI, 클라우드 SaaS, 멀티모달 AI, CCTV AI, 열화상 분석, 기후테크, 저탄소 축산, 축산 탄소감축, 축산 메탄저감, 기술사업화, 제품고도화, 스케일업, 실증, 테스트베드, 시제품, 양산, 해외인증, 수출, 글로벌 PoC, ODA, 베트남, 일본, 동남아시아, 공공조달, 오픈이노베이션",
  regions: "전국, 서울, 경기, 인천, 대전, 강원, 충북, 충남, 경북, 경남, 전북, 전남, 제주, 베트남, 일본, 동남아시아",
  targets: "법인, 스타트업, 중소기업, 창업기업, 벤처기업, 일반기업, 3년 이내, 5년 이내, 7년 이내",
  companySummary: "주식회사 비노우(BNOW)는 Biodata NOW를 의미하며, 동물의 체내 생체데이터를 실시간으로 수집·분석하여 건강과 생산성을 예측하는 AI 기업입니다. 2024년 3월 25일 설립되었고, 소 대상 LiveCow를 시작으로 LivePig, LiveDog 등 Live X Project로 축종을 확장하려는 동물 헬스케어 AI/스마트축산 데이터 기업입니다.",
  products: "LiveCow, LivePig, LiveDog, Live X Project, 소 체내 삽입형 바이오센서, 심부체온, 활동량, LoRa 게이트웨이, 클라우드 AI, 발정 예측, 질병 조기예측, 분만 예측, 농장 모니터링, 개체별 생체데이터 분석, AI 알림 구독, 축산 데이터 플랫폼, CCTV·열화상·활동량·체온 멀티모달 분석",
  foundedYear: "2024",
  employeeCount: "",
  revenueRange: "2025년 매출 약 2억원, 2026년 목표 약 10억원, 제품 상용화 및 국내 매출 발생, 해외 실증·시장 확장 단계",
  certifications: "특허, 상표권, 기업부설연구소, 연구개발전담부서, 벤처기업확인서, 이노비즈, 메인비즈, 직접생산확인, ISO, 시험성적서, 베트남 MIC, 중국 SRRC 등은 확인 필요",
  previousProjects: "KOICA CTS Seed 1 베트남 실증, ICT 스마트팜 국가표준화 관련 사업, 강원도 바이오헬스케어 브릿지 ABC 기업 지원, 신한 Social Open Innovation 베트남 돼지 실증, H-온드림 스타트업 그라운드 13기, 국내외 액셀러레이팅·투자상담·전시·해외진출 프로그램",
  preferredPrograms: "스마트축산·정밀축산·농축산 ICT 기술개발, 동물 헬스케어 AI 기술개발, 체내 바이오센서·IoT 디바이스·임베디드 펌웨어 고도화, AI 시계열 분석, 이상징후 탐지, 축산 데이터 표준화, 국내 농장 실증, 테스트베드, 공공조달, 제품 양산, 원가절감, 신뢰성 검증, 기후테크, 탄소중립, 축산 메탄저감, AI·빅데이터·클라우드·SaaS 사업화, 바이오헬스, 동물용 의료기기, 해외 PoC, 현지화, 수출, 글로벌 액셀러레이팅, 해외규격 인증, KOICA, ODA, 오픈이노베이션, 투자유치, 스케일업, 정책금융",
  avoidKeywords: "예비창업자만, 사업자등록 전, 개인사업자만, 법인 불가, 작물, 원예, 수산 전용, 사람 대상 의약품, 임상, 의료기기만, 식품 제조, 외식업, 단순 교육, 단순 행사, 과도한 자부담, 본사 이전, 공장 이전, 특정 협회 회원만, 대기업만, 중견기업만, 채용, 예술, 관광"
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadRecommendationProfile() {
  try {
    return { ...defaultProfile, ...JSON.parse(localStorage.getItem(RECOMMENDATION_PROFILE_KEY) || "{}") };
  } catch {
    return defaultProfile;
  }
}

function saveRecommendationProfile(profile) {
  localStorage.setItem(RECOMMENDATION_PROFILE_KEY, JSON.stringify(profile));
}

function setProfileForm(profile) {
  $("recommendationKeywords").value = profile.keywords || "";
  $("recommendationRegions").value = profile.regions || "";
  $("recommendationTargets").value = profile.targets || "";
  $("recommendationCompanySummary").value = profile.companySummary || "";
  $("recommendationProducts").value = profile.products || "";
  $("recommendationFoundedYear").value = profile.foundedYear || "";
  $("recommendationEmployeeCount").value = profile.employeeCount || "";
  $("recommendationRevenueRange").value = profile.revenueRange || "";
  $("recommendationCertifications").value = profile.certifications || "";
  $("recommendationPreviousProjects").value = profile.previousProjects || "";
  $("recommendationPreferredPrograms").value = profile.preferredPrograms || "";
  $("recommendationAvoidKeywords").value = profile.avoidKeywords || "";
}

function readRecommendationProfile() {
  return {
    keywords: $("recommendationKeywords").value,
    regions: $("recommendationRegions").value,
    targets: $("recommendationTargets").value,
    companySummary: $("recommendationCompanySummary").value,
    products: $("recommendationProducts").value,
    foundedYear: $("recommendationFoundedYear").value,
    employeeCount: $("recommendationEmployeeCount").value,
    revenueRange: $("recommendationRevenueRange").value,
    certifications: $("recommendationCertifications").value,
    previousProjects: $("recommendationPreviousProjects").value,
    preferredPrograms: $("recommendationPreferredPrograms").value,
    avoidKeywords: $("recommendationAvoidKeywords").value
  };
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(cleanTask);
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  if (!localStorage.getItem(IMPORT_META_KEY)) {
    localStorage.setItem(IMPORT_META_KEY, JSON.stringify({ importedAt: new Date().toISOString(), sourceUrl: "recommendations", rowCount: tasks.length }));
  }
}

async function ensureImportMeta() {
  if (localStorage.getItem(IMPORT_META_KEY)) return;
  try {
    const response = await fetch(SEED_URL, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    localStorage.setItem(IMPORT_META_KEY, JSON.stringify({
      version: payload.version,
      importedAt: payload.importedAt || new Date().toISOString(),
      sourceUrl: payload.sourceUrl,
      sheetName: payload.sheetName,
      gid: payload.gid,
      rowCount: payload.rowCount
    }));
  } catch {
    localStorage.setItem(IMPORT_META_KEY, JSON.stringify({ importedAt: new Date().toISOString(), sourceUrl: "recommendations", rowCount: loadTasks().length }));
  }
}

function readImportMeta() {
  try {
    const saved = localStorage.getItem(IMPORT_META_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function parseCloudPayload(content) {
  try {
    const parsed = JSON.parse(content || "");
    if (Array.isArray(parsed)) return { tasks: parsed };
    if (parsed && Array.isArray(parsed.tasks)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function getCloudSavedAt(record) {
  const parsed = parseCloudPayload(record?.content);
  const savedAt = Date.parse(parsed?.savedAt || "");
  return Number.isFinite(savedAt) ? savedAt : 0;
}

function pickLatestCloudRecord(records) {
  return [...records].sort((a, b) => getCloudSavedAt(b) - getCloudSavedAt(a))[0] || null;
}

function ownCloudSyncTitle(userEmail) {
  return `${CLOUD_SYNC_PROJECT_TITLE}:${String(userEmail || "").toLowerCase()}`;
}

function mergeTasks(primaryTasks, secondaryTasks) {
  const merged = [];
  const seen = new Set();
  for (const task of [...primaryTasks, ...secondaryTasks].map(cleanTask)) {
    const key = task.noticeUrl ? `url:${task.noticeUrl}` : `id:${task.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(task);
  }
  return merged;
}

function stringifyCloudPayload(contentTasks) {
  return JSON.stringify({
    schema: CLOUD_SYNC_SCHEMA,
    savedAt: new Date().toISOString(),
    baselineVersion: readImportMeta()?.version || "",
    tasks: contentTasks.map(cleanTask)
  });
}

async function pushTasksToCloud(nextTasks) {
  if (!window.supabase?.createClient) return false;
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const sessionResponse = await db.auth.getSession();
  const userEmail = sessionResponse.data?.session?.user?.email?.toLowerCase();
  if (!userEmail) return false;

  const recordsResponse = await db
    .from("projects")
    .select("*")
    .like("title", `${CLOUD_SYNC_PROJECT_TITLE}%`);
  if (recordsResponse.error) throw recordsResponse.error;

  const records = recordsResponse.data || [];
  const latestRecord = pickLatestCloudRecord(records);
  const remoteTasks = parseCloudPayload(latestRecord?.content)?.tasks || [];
  const mergedTasks = mergeTasks(nextTasks, remoteTasks);
  const content = stringifyCloudPayload(mergedTasks);
  const ownRecord = records.find((record) => record.title === ownCloudSyncTitle(userEmail));

  if (ownRecord) {
    const updateResponse = await db
      .from("projects")
      .update({ content })
      .eq("id", ownRecord.id)
      .select("*")
      .single();
    if (updateResponse.error) throw updateResponse.error;
  } else {
    const insertResponse = await db
      .from("projects")
      .insert({
        title: ownCloudSyncTitle(userEmail),
        assignee_email: userEmail,
        created_by_email: userEmail,
        due_date: new Date().toISOString().slice(0, 10),
        status: "진행 중",
        content
      });
    if (insertResponse.error) throw insertResponse.error;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTasks));
  return true;
}

function normalizeDate(value) {
  if (!value) return "";
  const source = String(value).trim().replace(/\s+/g, "");
  const full = source.match(/^(20\d{2})[-./년](\d{1,2})[-./월](\d{1,2})/);
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  return source;
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const amount = Number(String(value).replaceAll(",", "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function makeId(seed = "task") {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}-${seed}`;
}

function cleanTask(task) {
  return {
    id: task.id || makeId(task.name || "task"),
    name: String(task.name || "이름 없는 과제").trim(),
    organizer: String(task.organizer || "").trim(),
    startDate: normalizeDate(task.startDate),
    dueDate: normalizeDate(task.dueDate),
    submittedDate: normalizeDate(task.submittedDate),
    announcementDate: normalizeDate(task.announcementDate),
    resultStatus: String(task.resultStatus || "검토중").trim(),
    originalResult: String(task.originalResult || "").trim(),
    selectedStatus: String(task.selectedStatus || "").trim(),
    grantAmount: normalizeAmount(task.grantAmount),
    noticeUrl: String(task.noticeUrl || "").trim(),
    notes: String(task.notes || "").trim(),
    description: String(task.description || "").trim(),
    source: task.source || "recommendation",
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function createTaskFromNotice(notice) {
  return cleanTask({
    id: makeId(notice.title),
    name: notice.title,
    organizer: notice.organizer || notice.source,
    startDate: notice.startDate,
    dueDate: notice.dueDate,
    resultStatus: "검토중",
    noticeUrl: notice.noticeUrl,
    description: [
      `추천점수 ${notice.score}`,
      notice.source,
      notice.reasons?.join(" / "),
      notice.summary
    ].filter(Boolean).join(" | "),
    notes: "",
    managerNote: "",
    source: "recommendation"
  });
}

async function fetchRecommendations() {
  const button = $("fetchRecommendationsButton");
  const meta = $("recommendationMeta");
  const list = $("recommendationList");
  const profile = { ...readRecommendationProfile(), limit: 30 };
  saveRecommendationProfile(profile);

  button.disabled = true;
  button.textContent = "추천 중";
  meta.textContent = "공고 사이트를 확인하고 있습니다.";
  list.innerHTML = "";

  try {
    const response = await fetch(RECOMMENDATION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "추천 공고를 가져오지 못했습니다.");
    recommendedNotices = payload.notices || [];
    renderRecommendations(payload);
  } catch (error) {
    meta.textContent = error.message;
    list.innerHTML = `<div class="recommendation-empty">${escapeHtml(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = "새로 추천받기";
  }
}

function renderRecommendations(payload) {
  const tasks = loadTasks();
  const sources = (payload.sources || [])
    .map((source) => source.skipped ? `${source.source}: 건너뜀(${source.reason})` : `${source.source}: ${source.count}건`)
    .join(" / ");
  $("recommendationMeta").textContent = `${recommendedNotices.length}개 추천. ${sources}`;

  if (!recommendedNotices.length) {
    $("recommendationList").innerHTML = `<div class="recommendation-empty">추천할 공고가 없습니다. 검색조건을 넓혀 다시 추천받아 주세요.</div>`;
    return;
  }

  $("recommendationList").innerHTML = recommendedNotices.map((notice) => {
    const exists = tasks.some((task) => task.noticeUrl && task.noticeUrl === notice.noticeUrl);
    return `
      <article class="recommendation-card">
        <div class="recommendation-score">${notice.score}<span>점</span></div>
        <div class="recommendation-body">
          <div class="recommendation-topline">
            <span>${escapeHtml(notice.source)}</span>
            <span>${escapeHtml([notice.region, notice.category, notice.support].filter(Boolean).join(" / "))}</span>
          </div>
          <h3>${escapeHtml(notice.title)}</h3>
          <p>${escapeHtml(notice.summary || notice.organizer || "").slice(0, 220)}</p>
          <div class="recommendation-reasons">${(notice.reasons || []).map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>
        </div>
        <div class="recommendation-actions">
          <a href="${escapeHtml(notice.noticeUrl)}" target="_blank" rel="noreferrer">공고 열기</a>
          <button class="ghost-button" type="button" data-action="approve-notice" data-id="${escapeHtml(notice.id)}" ${exists ? "disabled" : ""}>${exists ? "추가됨" : "정부과제 리스트에 추가"}</button>
        </div>
      </article>`;
  }).join("");
}

async function approveRecommendation(id) {
  const notice = recommendedNotices.find((item) => item.id === id);
  if (!notice) return;
  const tasks = loadTasks();
  if (tasks.some((task) => task.noticeUrl && task.noticeUrl === notice.noticeUrl)) return;
  const nextTasks = [createTaskFromNotice(notice), ...tasks];
  await ensureImportMeta();
  saveTasks(nextTasks);
  try {
    await pushTasksToCloud(nextTasks);
  } catch (error) {
    console.error(error);
    $("recommendationMeta").textContent = "로컬에는 추가했지만 클라우드 동기화에 실패했습니다. 정부과제 리스트를 열어 동기화 상태를 확인해 주세요.";
    return;
  }
  renderRecommendations({ sources: [], notices: recommendedNotices });
  $("recommendationMeta").textContent = "정부과제 리스트에 추가했습니다. 정부과제 리스트 메뉴에서 확인할 수 있습니다.";
}

document.addEventListener("DOMContentLoaded", () => {
  setProfileForm(loadRecommendationProfile());
  $("fetchRecommendationsButton").addEventListener("click", fetchRecommendations);
  $("saveRecommendationProfileButton").addEventListener("click", () => {
    saveRecommendationProfile(readRecommendationProfile());
    $("recommendationMeta").textContent = "회사정보를 저장했습니다. 새로 추천받기를 누르면 반영됩니다.";
  });
  $("recommendationList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='approve-notice']");
    if (!button) return;
    approveRecommendation(button.dataset.id);
  });
});
