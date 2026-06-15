// home-i18n.ts — localized copy for the Tailor Moments marketing homepage.
// Only the three locales the live app supports are wired: en / zh-Hans / vi.
// English is canonical; zh-Hans and vi are ported from the design handoff
// (tm-i18n.jsx). zh-Hans/vi fall back to English for any missing keys.

import type { AppLocale } from "@/lib/locale";

export type HomeStep = { n: string; title: string; body: string };
export type HomeExpCard = {
  kicker: string;
  title: string;
  body: string;
  price: string;
  unit: string;
};
export type HomeDiffItem = { icon: string; label: string; body: string };
export type HomeItinStop = { time: string; name: string; desc: string; type: string };
export type HomeQuote = { quote: string; name: string; city: string };
export type HomeStat = { num: string; label: string };

export type HomeCopy = {
  langName: string;
  nav: { experiences: string; how: string; plan: string };
  hero: { eyebrow: string; title: string; em: string; sub: string; cta: string; ghost: string };
  how: { eyebrow: string; title: string; steps: HomeStep[] };
  diff: { eyebrow: string; title: string; items: HomeDiffItem[] };
  exp: {
    eyebrow: string;
    title: string;
    lead: string;
    from: string;
    cta: string;
    cards: HomeExpCard[];
  };
  itinPreview: {
    eyebrow: string;
    title: string;
    lead: string;
    aiLabel: string;
    aiText: string;
    stops: HomeItinStop[];
    note: string;
    cta: string;
  };
  testimonials: { eyebrow: string; title: string; partnersLabel: string; quotes: HomeQuote[] };
  location: { eyebrow: string; title: string; body: string; stats: HomeStat[] };
  cta: { eyebrow: string; title: string; sub: string; primary: string; secondary: string };
  foot: {
    tagline: string;
    colExplore: string;
    colAbout: string;
    colPartners: string;
    partnerSignIn: string;
    supportedRegions: string;
    links: {
      experiences: string;
      wineries: string;
      plan: string;
      contact: string;
      wineryPortal: string;
      transportPortal: string;
    };
    rights: string;
    note: string;
  };
};

export const TM_PARTNERS = ["Vasse Felix", "Cullen Wines", "Fraser Gallop", "Woodlands"];

const en: HomeCopy = {
  langName: "English",
  nav: { experiences: "Experiences", how: "How it works", plan: "Plan a day" },
  hero: {
    eyebrow: "Curated by Tailor Moments",
    title: "Some places you visit. Others you remember.",
    em: "",
    sub: "Private tastings, golden-hour vineyards and seamless transfers across Margaret River — arranged so you do nothing but arrive.",
    cta: "Start planning",
    ghost: "How it works",
  },
  how: {
    eyebrow: "How it works",
    title: "Three steps to an effortless day",
    steps: [
      { n: "i", title: "Tell us your taste", body: "Share who's travelling, the pace you enjoy and the wines you love. No endless forms — just a short conversation." },
      { n: "ii", title: "We compose the day", body: "Our concierge curates cellar doors, tastings and a long lunch into a single, seamless itinerary." },
      { n: "iii", title: "Arrive, and unwind", body: "A private chauffeur collects you. Everything is booked, timed and confirmed. You simply enjoy." },
    ],
  },
  diff: {
    eyebrow: "Why Tailor Moments",
    title: "No planning. No guesswork. Just a perfect day.",
    items: [
      { icon: "◎", label: "No account required", body: "Your dates and preferences are all we need. No login, no deposit until your booking is confirmed by the winery." },
      { icon: "◍", label: "Private transport included", body: "Door to door in a private vehicle — from Perth, Busselton or your villa to the vines and home again." },
      { icon: "✦", label: "All reservations pre-confirmed", body: "Every cellar door, tasting seat and long lunch is booked before your arrival day. You simply arrive." },
      { icon: "◈", label: "Matched to your group's taste", body: "The AI engine builds your day around who's travelling — wine style, occasion, pace and dietary needs." },
    ],
  },
  exp: {
    eyebrow: "Featured experiences",
    title: "Three ways into the valley",
    lead: "A curated few, not an overwhelming many. Each is arranged end to end by your concierge.",
    from: "From",
    cta: "Explore",
    cards: [
      { kicker: "Winery visits", title: "The Cellar Door Circuit", body: "A guided arc through three founding estates at golden hour, with tastings reserved ahead of your arrival.", price: "A$390", unit: "per guest" },
      { kicker: "By invitation", title: "The Private Tasting", body: "A seated, host-led flight of single-vineyard wines, paired with local produce in a room kept just for you.", price: "A$520", unit: "per guest" },
      { kicker: "Luxury transport", title: "The Chauffeured Transfer", body: "Door to door in a private vehicle — from Perth, Busselton or your villa to the vines and home again.", price: "A$680", unit: "per day" },
    ],
  },
  itinPreview: {
    eyebrow: "What to expect",
    title: "A day designed around you",
    lead: "Every itinerary is unique. Here is what one looks like — and why it was chosen.",
    aiLabel: "Why we chose this for you",
    aiText: "You mentioned travelling with family and a preference for lighter whites at a relaxed pace. We picked three cellar doors known for their warmth and paced the day so you are never rushed — with a long lunch at the estate built in.",
    stops: [
      { time: "10:00", name: "Vasse Felix", desc: "Opening tasting — reserve whites and estate Chardonnay", type: "Cellar door" },
      { time: "12:30", name: "Tom Cullity Restaurant", desc: "Long lunch in the winery restaurant — seasonal tasting menu", type: "Lunch" },
      { time: "14:30", name: "Cullen Wines", desc: "Biodynamic estate — intimate seated tasting", type: "Cellar door" },
      { time: "16:30", name: "Return transfer", desc: "Private vehicle direct to your accommodation", type: "Transport" },
    ],
    note: "Sample itinerary only. Yours will be built from your own preferences.",
    cta: "Design my day",
  },
  testimonials: {
    eyebrow: "Guest stories",
    title: "Words from the valley",
    partnersLabel: "In partnership with the region's founding estates",
    quotes: [
      { quote: "We saw more of Margaret River in a single day than in three previous visits — and never once looked at a map.", name: "Mei L.", city: "Singapore" },
      { quote: "The timing was perfect. We arrived at each winery just as our private tasting began. It felt genuinely exclusive, not like a tour at all.", name: "David & Sarah K.", city: "Kuala Lumpur" },
      { quote: "An effortless day. Our concierge knew exactly which wines to pour for us. We have already recommended Tailor Moments to six friends.", name: "Chen Wei", city: "Shanghai" },
    ],
  },
  location: {
    eyebrow: "Getting there",
    title: "Three hours south of Perth. A world away.",
    body: "Margaret River sits at the tip of the Leeuwin-Naturaliste Ridge — ancient karri forests, wild surf coast and one of Australia's most acclaimed wine regions, all within a day's reach of Perth or Busselton airport.",
    stats: [
      { num: "270 km", label: "south of Perth" },
      { num: "3 hrs", label: "by road" },
      { num: "10 min", label: "from the Indian Ocean" },
      { num: "200+", label: "cellar doors in the region" },
    ],
  },
  cta: {
    eyebrow: "No accounts, no pressure",
    title: "Start planning your experience",
    sub: "Tell us your dates and we'll begin composing your Margaret River day. It takes about two minutes.",
    primary: "Start planning",
    secondary: "See a sample day",
  },
  foot: {
    tagline: "Curated winery journeys in Margaret River, Western Australia.",
    colExplore: "Explore",
    colAbout: "About",
    colPartners: "Partners",
    partnerSignIn: "Partner sign in →",
    supportedRegions: "English · 简体中文 · Tiếng Việt",
    links: {
      experiences: "Experiences",
      wineries: "Our wineries",
      plan: "Plan a day",
      contact: "Contact us",
      wineryPortal: "Winery portal",
      transportPortal: "Transport portal",
    },
    rights: "All rights reserved.",
    note: "Tailor Moments acknowledges the Wadandi people, traditional custodians of this Country.",
  },
};

const zhHans: HomeCopy = {
  ...en,
  langName: "简体中文",
  nav: { experiences: "臻选体验", how: "预订流程", plan: "定制行程" },
  hero: {
    eyebrow: "由 Tailor Moments 甄选",
    title: "有些地方，您只是路过；有些地方，让您久久难忘。",
    em: "",
    sub: "私享品鉴、黄金时分的葡萄园，加上一路无缝接送，遍及 Margaret River——一切都为您安排妥当，您只管尽情享受。",
    cta: "开始规划",
    ghost: "预订流程",
  },
  how: {
    eyebrow: "预订流程",
    title: "三步，成就悠然一日",
    steps: [
      { n: "i", title: "告诉我们您的喜好", body: "与谁同行、喜欢怎样的节奏、钟爱哪一类酒。不必填繁琐表单，简单聊几句就好。" },
      { n: "ii", title: "我们为您编排这一天", body: "礼宾团队将酒庄、品鉴与一顿从容的午宴，串成一份顺畅衔接的行程。" },
      { n: "iii", title: "抵达，尽情放松", body: "专属司机接您出行，行程已全部预订、安排好时间并确认妥当，您只需好好享受。" },
    ],
  },
  diff: {
    eyebrow: "为何选择 Tailor Moments",
    title: "无需操心，无需猜测，只有圆满的一天。",
    items: [
      { icon: "◎", label: "无需注册账户", body: "我们只需要您的日期和喜好。无需登录，在酒庄确认预订之前也无需任何押金。" },
      { icon: "◍", label: "含私人接送", body: "私人座驾门到门接送——从珀斯、巴瑟尔顿或您下榻的别墅，直达葡萄园，再安然送您回程。" },
      { icon: "✦", label: "所有预约提前确认", body: "每一家酒庄、每一个品鉴席位、每一顿午宴，都在您出发当天之前订妥。您只管到场。" },
      { icon: "◈", label: "贴合您一行的口味", body: "AI 引擎依据同行宾客量身编排——酒款偏好、出行缘由、节奏快慢与饮食需求，皆悉心考量。" },
    ],
  },
  exp: {
    ...en.exp,
    eyebrow: "臻选体验",
    title: "走进山谷的三种方式",
    lead: "宁缺毋滥，只取精选，而非令人眼花的繁多。每一项都由礼宾全程为您打点。",
    from: "起价",
    cta: "了解详情",
    cards: [
      { kicker: "酒庄探访", title: "酒庄巡礼", body: "在黄金时分依次探访三家创始酒庄，品鉴席位已提前为您预留。", price: "A$390", unit: "每位" },
      { kicker: "尊享邀约", title: "私人品鉴", body: "由主人亲自引领，品味单一园佳酿，佐以本地时令食材，于专属厅室静静享用。", price: "A$520", unit: "每位" },
      { kicker: "豪华接送", title: "专车接送", body: "私人座驾门到门接送——从珀斯、巴瑟尔顿或您下榻的别墅直达葡萄园，再安然返程。", price: "A$680", unit: "每日" },
    ],
  },
  itinPreview: {
    ...en.itinPreview,
    eyebrow: "行程预览",
    title: "一整天，都为您而设",
    lead: "每一份行程都独一无二。这是其中一例——以及我们如此安排的缘由。",
    aiLabel: "我们为您如此安排的理由",
    aiText: "您提到这趟与家人同行，偏爱清爽的白葡萄酒，也喜欢从容的节奏。于是我们挑了三家以待客温暖见长的酒庄，把这一天的节奏放得舒缓，让您始终不必赶路——其间还在酒庄安排了一顿悠长的午宴。",
    stops: [
      { time: "10:00", name: "Vasse Felix", desc: "开场品鉴——珍藏白葡萄酒与庄园 Chardonnay", type: "酒庄" },
      { time: "12:30", name: "Tom Cullity Restaurant", desc: "在酒庄餐厅享用午宴——时令品鉴菜单", type: "午餐" },
      { time: "14:30", name: "Cullen Wines", desc: "生物动力庄园——私密的坐席品鉴", type: "酒庄" },
      { time: "16:30", name: "返程接送", desc: "私人座驾直送您下榻之处", type: "接送" },
    ],
    note: "此为示例行程，您的专属行程将依您的喜好量身编排。",
    cta: "定制我的一天",
  },
  testimonials: {
    ...en.testimonials,
    eyebrow: "宾客故事",
    title: "来自山谷的心声",
    partnersLabel: "携手本地创始酒庄共同呈献",
    quotes: [
      { quote: "短短一天里，我们看到的 Margaret River 比过去三次来访加起来还多——而且全程不用看一眼地图。", name: "Mei L.", city: "新加坡" },
      { quote: "时间衔接得恰到好处。每到一家酒庄，我们的私人品鉴正好开始。那种感觉是真正的专属，完全不像在跟团。", name: "David & Sarah K.", city: "吉隆坡" },
      { quote: "轻松惬意的一天。礼宾对我们的口味了如指掌，知道该为我们斟上哪几款酒。我们已经把 Tailor Moments 推荐给了六位朋友。", name: "Chen Wei", city: "上海" },
    ],
  },
  location: {
    ...en.location,
    eyebrow: "如何抵达",
    title: "珀斯以南三小时，却宛如另一个世界。",
    body: "Margaret River 坐落于 Leeuwin-Naturaliste 山脊的尽头——古老的卡里森林、狂野的冲浪海岸，以及全澳最负盛名的葡萄酒产区之一，从珀斯或巴瑟尔顿机场出发，一日之内即可抵达。",
    stats: [
      { num: "270 公里", label: "位于珀斯以南" },
      { num: "3 小时", label: "车程" },
      { num: "10 分钟", label: "即达印度洋" },
      { num: "200+", label: "产区内的酒庄" },
    ],
  },
  cta: {
    eyebrow: "无需注册，毫无压力",
    title: "开始规划您的专属体验",
    sub: "告诉我们您的日期，我们便着手为您编排这趟 Margaret River 之旅。大约只需两分钟。",
    primary: "开始规划",
    secondary: "查看行程示例",
  },
  foot: {
    ...en.foot,
    tagline: "西澳玛格丽特河的臻选酒庄之旅。",
    colExplore: "探索",
    colAbout: "关于",
    colPartners: "合作伙伴",
    partnerSignIn: "合作伙伴登录 →",
    supportedRegions: "English · 简体中文 · Tiếng Việt",
    links: {
      experiences: "臻选体验",
      wineries: "酒庄",
      plan: "定制行程",
      contact: "联系我们",
      wineryPortal: "酒庄门户",
      transportPortal: "接送门户",
    },
    rights: "版权所有。",
    note: "Tailor Moments 谨向本地传统守护者 Wadandi 族致意。",
  },
};

const vi: HomeCopy = {
  ...en,
  langName: "Tiếng Việt",
  nav: { experiences: "Trải nghiệm", how: "Cách hoạt động", plan: "Lên kế hoạch" },
  hero: {
    eyebrow: "Tuyển chọn bởi Tailor Moments",
    title: "Có những nơi bạn ghé qua. Có những nơi bạn khắc ghi.",
    em: "",
    sub: "Buổi nếm thử riêng tư, vườn nho giờ hoàng hôn và đưa đón liền mạch khắp Margaret River — sắp xếp trọn vẹn để bạn chỉ việc đến.",
    cta: "Bắt đầu lên kế hoạch",
    ghost: "Cách hoạt động",
  },
  how: {
    eyebrow: "Cách hoạt động",
    title: "Ba bước cho một ngày thảnh thơi",
    steps: [
      { n: "i", title: "Cho chúng tôi biết sở thích", body: "Ai cùng đi, nhịp độ bạn thích và loại rượu bạn yêu. Không biểu mẫu dài dòng — chỉ một cuộc trò chuyện ngắn." },
      { n: "ii", title: "Chúng tôi sắp xếp cả ngày", body: "Đội ngũ concierge kết nối các hầm rượu, buổi nếm thử và bữa trưa thong thả thành một hành trình liền mạch." },
      { n: "iii", title: "Đến nơi và thư giãn", body: "Tài xế riêng đón bạn. Mọi thứ đã được đặt, định giờ và xác nhận. Bạn chỉ việc tận hưởng." },
    ],
  },
  exp: {
    ...en.exp,
    eyebrow: "Trải nghiệm nổi bật",
    title: "Ba lối vào thung lũng",
    lead: "Một vài lựa chọn tinh tuyển, không phải vô vàn gây rối. Mỗi trải nghiệm được concierge chuẩn bị trọn vẹn.",
    from: "Từ",
    cta: "Khám phá",
    cards: [
      { kicker: "Thăm nhà máy rượu", title: "Hành trình hầm rượu", body: "Một vòng có hướng dẫn qua ba điền trang sáng lập vào giờ hoàng hôn, với các buổi nếm thử được đặt trước khi bạn đến.", price: "A$390", unit: "mỗi khách" },
      { kicker: "Theo lời mời", title: "Buổi nếm thử riêng tư", body: "Một loạt rượu từ vườn nho đơn lẻ do chủ nhà dẫn dắt, kết hợp sản vật địa phương trong căn phòng dành riêng cho bạn.", price: "A$520", unit: "mỗi khách" },
      { kicker: "Di chuyển sang trọng", title: "Đưa đón bằng xe riêng", body: "Tận cửa bằng xe riêng — từ Perth, Busselton hoặc biệt thự của bạn đến vườn nho và trở về.", price: "A$680", unit: "mỗi ngày" },
    ],
  },
  cta: {
    eyebrow: "Không cần tài khoản, không áp lực",
    title: "Bắt đầu lên kế hoạch cho trải nghiệm của bạn",
    sub: "Cho chúng tôi biết ngày của bạn và chúng tôi sẽ bắt đầu kiến tạo ngày Margaret River của bạn. Chỉ mất khoảng hai phút.",
    primary: "Bắt đầu lên kế hoạch",
    secondary: "Xem hành trình mẫu",
  },
  foot: {
    ...en.foot,
    tagline: "Những hành trình nhà máy rượu tuyển chọn tại Margaret River, Tây Úc.",
    colExplore: "Khám phá",
    colAbout: "Giới thiệu",
    colPartners: "Đối tác",
    partnerSignIn: "Đối tác đăng nhập →",
    supportedRegions: "English · 简体中文 · Tiếng Việt",
    links: {
      experiences: "Trải nghiệm",
      wineries: "Nhà máy rượu của chúng tôi",
      plan: "Lên kế hoạch",
      contact: "Liên hệ",
      wineryPortal: "Cổng nhà máy rượu",
      transportPortal: "Cổng vận chuyển",
    },
    rights: "Bảo lưu mọi quyền.",
    note: "Tailor Moments tri ân người Wadandi, những người gìn giữ truyền thống của vùng đất này.",
  },
};

export const HOME_I18N: Record<AppLocale, HomeCopy> = {
  en,
  "zh-Hans": zhHans,
  vi,
};

export const HOME_LOCALES: { code: AppLocale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "vi", label: "Tiếng Việt" },
];
