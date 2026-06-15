// explore-i18n.ts — localized copy for the customer quiz flow (the 4-chapter
// wizard) and its concierge result. Ported from the design handoff
// (docs/design_handoff_customer_quiz_flow/prototype/data.js) and adapted to the
// app's real model: the design's single "tripLength" question is replaced by our
// live pace (relaxed/balanced/maximise) + trip-days model, so those keys are newly
// authored here. English is canonical; zh-Hans and vi spread over en and override,
// so any missing key falls back to English (mirrors home-i18n.ts).

import type { AppLocale } from "@/lib/locale";
import type { ExploreDayPace as DayPace } from "@/lib/explore-preferences";

export type StepId = "trip" | "palate" | "occasion" | "care";

type PaceCopy = Record<DayPace, { label: string; note: string }>;

export type ExploreCopy = {
  namePlaceholder: string;
  guestFallback: string;
  steps: Record<StepId, { kicker: string; label: string; title: string }>;
  fields: {
    name: string;
    date: string;
    group: string;
    groupUnit: string;
    pace: string;
    paceHint: string;
    days: string;
    daysHint: string;
    transport: string;
    pickup: string;
    pickupPlaceholder: string;
    wineStyles: string;
    wineStylesHint: string;
    experiences: string;
    experiencesHint: string;
    occasion: string;
    budget: string;
    budgetHint: string;
    dietary: string;
    dietaryHint: string;
    accessibility: string;
    accessibilityHint: string;
    accessibilityPlaceholder: string;
  };
  transport: { yes: string; no: string; hintYes: string; hintNo: string };
  ui: {
    continue: string;
    craft: string;
    back: string;
    reviewBook: string;
    adjust: string;
    startOver: string;
    takes: string;
    step: string;
    of: string;
    asideNote: string;
    noPreference: string;
    language: string;
    daysUnit: string;
    loading: string;
  };
  errors: {
    date: string;
    datePast: string;
    group: string;
    pickup: string;
    wine: string;
    noPlan: string;
  };
  rationale: {
    kicker: string;
    greeting: string;
    guest: string;
    groupOne: string;
    groupMany: string;
    paceNoun: Record<DayPace, string>;
    bodyTransport: string;
    bodySelf: string;
    chipsLabel: string;
    signoff: string;
  };
  result: {
    kicker: string;
    title: string;
    dayOnePreview: string;
    metaGuests: string;
    metaCellar: string;
    metaPace: string;
    metaTransport: string;
    private: string;
    selfDrive: string;
    morning: string;
    afternoon: string;
    evening: string;
    tasting: string;
    pp: string;
    depart: string;
    driveYes: string;
    driveNo: string;
    subtotal: string;
    forGuests: string;
    forGuest: string;
    note: string;
    stopNote: string;
    whyLabel: string;
    lunchLabel: string;
    lunchNote: string;
    weatherWear: string;
    weatherForecast: string;
    weatherTypical: string;
    rainChance: string;
    dayHeading: string;
  };
  summary: {
    pageTitle: string;
    pageIntro: string;
    noSummaryTitle: string;
    noSummaryDesc: string;
    backToExplore: string;
    itinTitle: string;
    previewMeta: string;
    departAt: string;
    timeTbd: string;
    tastingFeeTbd: string;
    whyDay: string;
    contactTitle: string;
    contactName: string;
    contactNamePh: string;
    contactEmail: string;
    contactEmailPh: string;
    subtotalLabel: string;
    pricedNote: string;
    transportNote: string;
    customise: string;
    bookTour: string;
    booking: string;
    bookingCreated: string;
    mapTitle: string;
    mapNote: string;
    mapMissing: string;
    needContact: string;
    bookingFailed: string;
  };
  pace: PaceCopy;
  wineStyles: Record<string, { label: string; desc: string }>;
  experiences: Record<string, { label: string; desc: string }>;
  occasions: Record<string, string>;
  budgets: Record<string, { label: string; desc: string }>;
  dietary: Record<string, string>;
  accessibility: Record<string, { label: string; desc: string }>;
};

const en: ExploreCopy = {
  namePlaceholder: "Sean",
  guestFallback: "your group",
  steps: {
    trip: { kicker: "Chapter One", label: "Your trip", title: "Let's set the scene for your day." },
    palate: { kicker: "Chapter Two", label: "Your palate", title: "What should be in your glass?" },
    occasion: { kicker: "Chapter Three", label: "The occasion", title: "What are we celebrating?" },
    care: { kicker: "Chapter Four", label: "Looking after you", title: "A few details so every stop fits." },
  },
  fields: {
    name: "Your name",
    date: "When are you visiting?",
    group: "How many in your group?",
    groupUnit: "guests, including you",
    pace: "What kind of day would you like?",
    paceHint: "This shapes how many cellar doors we weave in.",
    days: "How many days?",
    daysHint: "We'll shape a fresh route for each day.",
    transport: "Will you need transport?",
    pickup: "Pickup address",
    pickupPlaceholder: "Start typing your address",
    wineStyles: "What kind of wines interest you?",
    wineStylesHint: "Pick as many as you like — even “Surprise me” works beautifully.",
    experiences: "Any experiences you'd love?",
    experiencesHint: "Optional — we'll weave in what fits your day.",
    occasion: "What's the occasion?",
    budget: "Roughly, what's your budget per person?",
    budgetHint: "Tasting fees and experiences — transport is quoted separately.",
    dietary: "Any dietary requirements?",
    dietaryHint: "So every lunch and pairing is arranged around your group.",
    accessibility: "Any accessibility needs?",
    accessibilityHint: "We'll only suggest cellar doors that can host you comfortably.",
    accessibilityPlaceholder: "Anything else we should know? (optional)",
  },
  transport: {
    yes: "Yes, drive us",
    no: "No, self-drive",
    hintYes: "We'll match you with a luxury private vehicle for the day.",
    hintNo: "You're arranging your own way there — no problem.",
  },
  ui: {
    continue: "Continue",
    craft: "Craft my day",
    back: "Back",
    reviewBook: "Review & book",
    adjust: "Adjust preferences",
    startOver: "Start over",
    takes: "Takes about 90 seconds",
    step: "Step",
    of: "of",
    asideNote: "“The more you share, the more the day feels made for you — not booked from a list.”",
    noPreference: "No preference",
    language: "Language",
    daysUnit: "days",
    loading: "Composing your day…",
  },
  errors: {
    date: "Please choose your travel date to continue.",
    datePast: "That date has passed — pick an upcoming day.",
    group: "Your group needs at least one person.",
    pickup: "Add a pickup address so we can arrange transport.",
    wine: "Pick at least one wine style — even “Surprise me” works perfectly.",
    noPlan: "No preview schedule found in the next 14 days for this preference set.",
  },
  rationale: {
    kicker: "A note from your concierge",
    greeting: "Dear {name},",
    guest: "guest",
    groupOne: "you",
    groupMany: "your party of {n}",
    paceNoun: {
      relaxed: "a relaxed day",
      balanced: "an unhurried full day",
      maximise: "a full, vibrant day",
    },
    bodyTransport:
      "We've composed {pace} for {group} — {n} cellar doors woven into one seamless route, with a private chauffeur between each stop so the only thing you carry is the conversation.",
    bodySelf:
      "We've composed {pace} for {group} — {n} cellar doors woven into one easy, well-signed route you can drive at your own pace.",
    chipsLabel: "Composed around",
    signoff: "With care, the Tailor Moments concierge",
  },
  result: {
    kicker: "Tailored for you",
    title: "A day arranged for {name}",
    dayOnePreview: " · day one preview",
    metaGuests: "Guests",
    metaCellar: "Cellar doors",
    metaPace: "Pace",
    metaTransport: "Transport",
    private: "Private",
    selfDrive: "Self-drive",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    tasting: "Tasting",
    pp: "pp",
    depart: "depart",
    driveYes: "{n} min chauffeured drive to the next stop",
    driveNo: "{n} min leisurely drive to the next stop",
    subtotal: "Tasting subtotal",
    forGuests: "for {n} guests",
    forGuest: "for {n} guest",
    note: "A graceful finish to the day. Transport and special experiences are confirmed at booking.",
    stopNote: "A hosted cellar-door tasting arranged for your visit.",
    whyLabel: "Why we've chosen this for you",
    lunchLabel: "Lunch",
    lunchNote: "A relaxed lunch break woven into the day.",
    weatherWear: "What to wear",
    weatherForecast: "Forecast",
    weatherTypical: "Typical for this time of year",
    rainChance: "{n}% chance of rain",
    dayHeading: "Day {n}",
  },
  summary: {
    pageTitle: "Tour summary",
    pageIntro: "Review your itinerary and pricing before booking.",
    noSummaryTitle: "No tour summary yet",
    noSummaryDesc: "Craft an itinerary in Explore first.",
    backToExplore: "Back to Explore",
    itinTitle: "Itinerary and tasting fees",
    previewMeta: "{date} · {n} guests",
    departAt: "Depart {time}",
    timeTbd: "Time to be confirmed during scheduling.",
    tastingFeeTbd: "Tasting fee TBD",
    whyDay: "Why we've chosen this day",
    contactTitle: "Your details",
    contactName: "Name",
    contactNamePh: "Your name",
    contactEmail: "Email",
    contactEmailPh: "you@example.com",
    subtotalLabel: "Tasting subtotal",
    pricedNote: "{priced} priced stop(s), {missing} stop(s) without a published tasting price.",
    transportNote: "Transport fees and special winery experiences are confirmed at booking.",
    customise: "Customise itinerary",
    bookTour: "Book tour",
    booking: "Booking…",
    bookingCreated: "Booking created. Reference {ref}.",
    mapTitle: "Your winery map",
    mapNote: "The house pin marks your starting location; numbered pins follow the stop order.",
    mapMissing: "{n} stop(s) are missing coordinates and aren't shown on the map yet.",
    needContact: "Please add your name and email before booking.",
    bookingFailed: "Unable to create booking.",
  },
  pace: {
    relaxed: { label: "Relaxed", note: "A gentle pace · two cellar doors with room to breathe" },
    balanced: { label: "Full experience", note: "A comfortable full day · around three cellar doors" },
    maximise: { label: "Maximise", note: "See as much as we can fit · up to four cellar doors" },
  },
  wineStyles: {
    organic_biodynamic: { label: "Organic & biodynamic", desc: "Made with nature in mind" },
    well_known_names: { label: "Well-known names", desc: "Iconic Margaret River labels" },
    hidden_gems: { label: "Hidden gems", desc: "Boutique producers you won't find in shops" },
    family_estates: { label: "Family estates", desc: "Intimate, story-rich cellar doors" },
    award_winning: { label: "Award-winning", desc: "Internationally recognised excellence" },
    surprise_me: { label: "Surprise me", desc: "We'll curate what's exceptional right now" },
  },
  experiences: {
    winery_lunch: { label: "Winery lunch", desc: "A long table among the vines" },
    cheese_wine: { label: "Cheese & wine", desc: "Local boards, paired with care" },
    wine_chocolate: { label: "Wine & chocolate", desc: "A sweeter pairing flight" },
    cellar_tour: { label: "Cellar tour", desc: "Behind the scenes with the maker" },
    blending_experience: { label: "Blending experience", desc: "Craft your own bottle to take home" },
    private_tasting_room: { label: "Private tasting room", desc: "Just your group, hosted privately" },
    sunset_tasting: { label: "Sunset tasting", desc: "Golden hour over the vineyard" },
    vineyard_walk: { label: "Vineyard walk", desc: "Stretch your legs between pours" },
  },
  occasions: {
    great_day_out: "Just a great day out",
    celebration: "Celebration",
    birthday: "Birthday",
    anniversary: "Anniversary",
    honeymoon: "Honeymoon",
    corporate: "Corporate",
  },
  budgets: {
    "great-value": { label: "Great value", desc: "Under $100 per person" },
    premium: { label: "Premium", desc: "$100–$200 per person" },
    indulgent: { label: "Indulgent", desc: "$200+ per person" },
  },
  dietary: {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    gluten_free: "Gluten-free",
    halal: "Halal",
    nut_allergy: "Nut allergy",
    none: "None",
  },
  accessibility: {
    wheelchair_access: { label: "Wheelchair access", desc: "Step-free entry & tasting" },
    hearing_assistance: { label: "Hearing assistance", desc: "Hearing loops, quieter spaces" },
  },
};

const zhHans: ExploreCopy = {
  ...en,
  namePlaceholder: "Sean",
  guestFallback: "你们一行",
  steps: {
    trip: { kicker: "第一章", label: "你的行程", title: "让我们为你的一天铺陈序幕。" },
    palate: { kicker: "第二章", label: "你的口味", title: "杯中应盛何种佳酿？" },
    occasion: { kicker: "第三章", label: "此行缘由", title: "我们在庆祝什么？" },
    care: { kicker: "第四章", label: "悉心照料", title: "几个细节，让每一站都恰到好处。" },
  },
  fields: {
    name: "你的称呼",
    date: "你计划何时到访？",
    group: "一行几人？",
    groupUnit: "位，含你本人",
    pace: "你想要怎样的一天？",
    paceHint: "这决定我们为你串联多少家酒庄。",
    days: "想安排几天？",
    daysHint: "我们会为每一天编排全新的路线。",
    transport: "需要我们安排接送吗？",
    pickup: "接送地址",
    pickupPlaceholder: "开始输入你的地址",
    wineStyles: "你对哪类葡萄酒感兴趣？",
    wineStylesHint: "可多选——即使选「给我惊喜」也很合适。",
    experiences: "有想体验的项目吗？",
    experiencesHint: "可选——我们会把合适的安排进你的一天。",
    occasion: "此行的缘由是？",
    budget: "每人大致预算是多少？",
    budgetHint: "品鉴与体验费用——接送另行报价。",
    dietary: "有任何饮食需求吗？",
    dietaryHint: "以便每一顿午餐与搭配都为你的同行者安排。",
    accessibility: "有无障碍需求吗？",
    accessibilityHint: "我们只会推荐能让你舒心做客的酒庄。",
    accessibilityPlaceholder: "还有什么需要我们知道的吗？（选填）",
  },
  transport: {
    yes: "需要，请接送我们",
    no: "不用，我们自驾",
    hintYes: "我们将为你安排全日豪华专车。",
    hintNo: "你自行前往——没问题。",
  },
  ui: {
    ...en.ui,
    continue: "继续",
    craft: "为我定制这一天",
    back: "返回",
    reviewBook: "查看并预订",
    adjust: "调整偏好",
    startOver: "重新开始",
    takes: "约需 90 秒",
    step: "第",
    of: "步，共",
    asideNote: "「你分享得越多，这一天就越像为你而设——而非照单预订。」",
    noPreference: "无偏好",
    language: "语言",
    daysUnit: "天",
    loading: "正在为你编排这一天…",
  },
  errors: {
    date: "请选择你的出行日期以继续。",
    datePast: "该日期已过——请选择即将到来的一天。",
    group: "你的同行至少需一人。",
    pickup: "请填写接送地址，以便我们安排车辆。",
    wine: "请至少选择一种酒款风格——选「给我惊喜」也完全可以。",
    noPlan: "未来 14 天内未找到符合这些偏好的预览行程。",
  },
  rationale: {
    kicker: "来自礼宾的寄语",
    greeting: "{name}，您好：",
    guest: "贵宾",
    groupOne: "您",
    groupMany: "您一行 {n} 位",
    paceNoun: {
      relaxed: "悠闲的一天",
      balanced: "从容的一整日",
      maximise: "充实而精彩的一天",
    },
    bodyTransport:
      "我们为{group}编排了{pace}——将 {n} 家酒庄串成一条顺畅的路线，每段皆有专属司机接驳，您只需沉浸于杯中与谈笑之间。",
    bodySelf:
      "我们为{group}编排了{pace}——将 {n} 家酒庄串成一条轻松、标识清晰的路线，您可按自己的节奏从容驾行。",
    chipsLabel: "为你而选",
    signoff: "敬上，Tailor Moments 礼宾团队",
  },
  result: {
    ...en.result,
    kicker: "为你量身打造",
    title: "为{name}安排的一天",
    dayOnePreview: " · 第一天预览",
    metaGuests: "宾客",
    metaCellar: "酒庄",
    metaPace: "节奏",
    metaTransport: "交通",
    private: "专车",
    selfDrive: "自驾",
    morning: "上午",
    afternoon: "下午",
    evening: "傍晚",
    tasting: "品鉴",
    pp: "每位",
    depart: "离开",
    driveYes: "{n} 分钟专车车程至下一站",
    driveNo: "{n} 分钟悠然车程至下一站",
    subtotal: "品鉴小计",
    forGuests: "共 {n} 位宾客",
    forGuest: "共 {n} 位宾客",
    note: "为这一天画上优雅的句点。接送与特别体验将于预订时确认。",
    stopNote: "为你的到访安排的一场主理酒庄品鉴。",
    whyLabel: "我们为你选择这一天的理由",
    lunchLabel: "午餐",
    lunchNote: "一段从容的午餐时光，融入你的一天。",
    weatherWear: "着装建议",
    weatherForecast: "天气预报",
    weatherTypical: "该时节的典型天气",
    rainChance: "{n}% 降雨概率",
    dayHeading: "第 {n} 天",
  },
  summary: {
    pageTitle: "行程概览",
    pageIntro: "预订前请查看你的行程与价格。",
    noSummaryTitle: "尚无行程概览",
    noSummaryDesc: "请先在「探索」中定制一份行程。",
    backToExplore: "返回探索",
    itinTitle: "行程与品鉴费用",
    previewMeta: "{date} · {n} 位宾客",
    departAt: "{time} 离开",
    timeTbd: "时间将于排程时确认。",
    tastingFeeTbd: "品鉴费待定",
    whyDay: "我们为你选择这一天的理由",
    contactTitle: "你的信息",
    contactName: "称呼",
    contactNamePh: "你的称呼",
    contactEmail: "邮箱",
    contactEmailPh: "you@example.com",
    subtotalLabel: "品鉴小计",
    pricedNote: "{priced} 站已标价，{missing} 站尚无公开品鉴价。",
    transportNote: "接送费用与特别体验将于预订时确认。",
    customise: "调整行程",
    bookTour: "预订行程",
    booking: "预订中…",
    bookingCreated: "预订成功。编号 {ref}。",
    mapTitle: "你的酒庄地图",
    mapNote: "房屋图标标示你的出发点；编号图标按停靠顺序排列。",
    mapMissing: "{n} 站缺少坐标，暂未在地图上显示。",
    needContact: "预订前请填写你的称呼与邮箱。",
    bookingFailed: "无法创建预订。",
  },
  pace: {
    relaxed: { label: "悠闲", note: "从容的节奏 · 两家酒庄，留足余裕" },
    balanced: { label: "尽兴体验", note: "舒适的一整日 · 约三家酒庄" },
    maximise: { label: "尽情畅游", note: "在时间内尽可能多看 · 多至四家酒庄" },
  },
  wineStyles: {
    organic_biodynamic: { label: "有机与生物动力", desc: "以自然之道酿造" },
    well_known_names: { label: "知名酒庄", desc: "玛格丽特河的标志性名号" },
    hidden_gems: { label: "隐世佳酿", desc: "商店难觅的精品酒庄" },
    family_estates: { label: "家族酒庄", desc: "亲切而富有故事的酒窖" },
    award_winning: { label: "屡获殊荣", desc: "享誉国际的卓越品质" },
    surprise_me: { label: "给我惊喜", desc: "由我们甄选当下最出色的" },
  },
  experiences: {
    winery_lunch: { label: "酒庄午餐", desc: "葡萄藤间的长桌" },
    cheese_wine: { label: "芝士与葡萄酒", desc: "本地芝士拼盘，悉心搭配" },
    wine_chocolate: { label: "葡萄酒与巧克力", desc: "更甜美的搭配品鉴" },
    cellar_tour: { label: "酒窖参观", desc: "随酿酒师探访幕后" },
    blending_experience: { label: "调配体验", desc: "亲手调出一瓶带回家" },
    private_tasting_room: { label: "私人品鉴室", desc: "仅限你们，专属接待" },
    sunset_tasting: { label: "日落品鉴", desc: "葡萄园上的黄金时分" },
    vineyard_walk: { label: "葡萄园漫步", desc: "在品酒之间舒展身心" },
  },
  occasions: {
    great_day_out: "只是想好好玩一天",
    celebration: "庆祝",
    birthday: "生日",
    anniversary: "纪念日",
    honeymoon: "蜜月",
    corporate: "企业活动",
  },
  budgets: {
    "great-value": { label: "超值", desc: "每人 $100 以下" },
    premium: { label: "优选", desc: "每人 $100–$200" },
    indulgent: { label: "尽享", desc: "每人 $200 以上" },
  },
  dietary: {
    vegetarian: "素食",
    vegan: "纯素",
    gluten_free: "无麩质",
    halal: "清真",
    nut_allergy: "坚果过敏",
    none: "无",
  },
  accessibility: {
    wheelchair_access: { label: "轮椅通行", desc: "无台阶出入与品鉴" },
    hearing_assistance: { label: "听力辅助", desc: "助听回路、安静空间" },
  },
};

const vi: ExploreCopy = {
  ...en,
  namePlaceholder: "Sean",
  guestFallback: "nhóm của bạn",
  steps: {
    trip: { kicker: "Chương Một", label: "Chuyến đi", title: "Cùng dựng nên khung cảnh cho ngày của bạn." },
    palate: { kicker: "Chương Hai", label: "Khẩu vị", title: "Trong ly bạn nên có gì?" },
    occasion: { kicker: "Chương Ba", label: "Dịp đặc biệt", title: "Chúng ta đang ăn mừng điều gì?" },
    care: { kicker: "Chương Bốn", label: "Chăm sóc bạn", title: "Vài chi tiết để mỗi điểm dừng đều vừa ý." },
  },
  fields: {
    name: "Tên của bạn",
    date: "Bạn đến thăm khi nào?",
    group: "Nhóm của bạn có mấy người?",
    groupUnit: "khách, gồm cả bạn",
    pace: "Bạn muốn một ngày như thế nào?",
    paceHint: "Điều này quyết định chúng tôi lồng ghép bao nhiêu hầm rượu.",
    days: "Bạn muốn mấy ngày?",
    daysHint: "Chúng tôi sẽ dựng một lộ trình mới cho mỗi ngày.",
    transport: "Bạn có cần đưa đón không?",
    pickup: "Địa chỉ đón",
    pickupPlaceholder: "Bắt đầu nhập địa chỉ của bạn",
    wineStyles: "Bạn quan tâm đến loại rượu vang nào?",
    wineStylesHint: "Chọn bao nhiêu tùy thích — chọn “Gây bất ngờ cho tôi” cũng rất hợp.",
    experiences: "Có trải nghiệm nào bạn yêu thích?",
    experiencesHint: "Tùy chọn — chúng tôi sẽ lồng ghép điều phù hợp với ngày của bạn.",
    occasion: "Dịp này là gì?",
    budget: "Ngân sách mỗi người khoảng bao nhiêu?",
    budgetHint: "Phí nếm thử và trải nghiệm — đưa đón được báo giá riêng.",
    dietary: "Bạn có yêu cầu ăn uống nào không?",
    dietaryHint: "Để mỗi bữa trưa và phần kết hợp đều được sắp xếp quanh nhóm của bạn.",
    accessibility: "Có nhu cầu tiếp cận nào không?",
    accessibilityHint: "Chúng tôi chỉ gợi ý những hầm rượu có thể đón tiếp bạn thoải mái.",
    accessibilityPlaceholder: "Còn điều gì chúng tôi nên biết không? (tùy chọn)",
  },
  transport: {
    yes: "Có, hãy đưa đón chúng tôi",
    no: "Không, chúng tôi tự lái",
    hintYes: "Chúng tôi sẽ sắp xếp một chiếc xe riêng sang trọng cho cả ngày.",
    hintNo: "Bạn tự lo phương tiện đến đó — không vấn đề gì.",
  },
  ui: {
    ...en.ui,
    continue: "Tiếp tục",
    craft: "Kiến tạo ngày của tôi",
    back: "Quay lại",
    reviewBook: "Xem lại & đặt",
    adjust: "Điều chỉnh sở thích",
    startOver: "Bắt đầu lại",
    takes: "Mất khoảng 90 giây",
    step: "Bước",
    of: "trên",
    asideNote: "“Bạn chia sẻ càng nhiều, ngày ấy càng như được tạo riêng cho bạn — chứ không phải đặt theo danh sách.”",
    noPreference: "Không ưu tiên",
    language: "Ngôn ngữ",
    daysUnit: "ngày",
    loading: "Đang soạn ngày của bạn…",
  },
  errors: {
    date: "Vui lòng chọn ngày đi để tiếp tục.",
    datePast: "Ngày đó đã qua — hãy chọn một ngày sắp tới.",
    group: "Nhóm của bạn cần ít nhất một người.",
    pickup: "Thêm địa chỉ đón để chúng tôi sắp xếp xe.",
    wine: "Chọn ít nhất một phong cách rượu — chọn “Gây bất ngờ cho tôi” cũng được.",
    noPlan: "Không tìm thấy lịch xem trước trong 14 ngày tới cho các sở thích này.",
  },
  rationale: {
    kicker: "Đôi lời từ concierge của bạn",
    greeting: "{name} thân mến,",
    guest: "quý khách",
    groupOne: "bạn",
    groupMany: "nhóm {n} người của bạn",
    paceNoun: {
      relaxed: "một ngày thong thả",
      balanced: "một ngày trọn vẹn thư thái",
      maximise: "một ngày trọn vẹn sống động",
    },
    bodyTransport:
      "Chúng tôi đã sắp đặt {pace} cho {group} — {n} hầm rượu kết thành một lộ trình liền mạch, có tài xế riêng giữa mỗi điểm để bạn chỉ việc tận hưởng câu chuyện và ly rượu.",
    bodySelf:
      "Chúng tôi đã sắp đặt {pace} cho {group} — {n} hầm rượu kết thành một lộ trình dễ đi, biển chỉ dẫn rõ ràng để bạn tự lái theo nhịp của mình.",
    chipsLabel: "Tuyển chọn quanh sở thích của bạn",
    signoff: "Trân trọng, đội concierge Tailor Moments",
  },
  result: {
    ...en.result,
    kicker: "Dành riêng cho bạn",
    title: "Một ngày sắp đặt cho {name}",
    dayOnePreview: " · xem trước ngày một",
    metaGuests: "Khách",
    metaCellar: "Hầm rượu",
    metaPace: "Nhịp độ",
    metaTransport: "Di chuyển",
    private: "Xe riêng",
    selfDrive: "Tự lái",
    morning: "Buổi sáng",
    afternoon: "Buổi chiều",
    evening: "Buổi tối",
    tasting: "Nếm thử",
    pp: "mỗi người",
    depart: "rời đi",
    driveYes: "{n} phút di chuyển bằng xe riêng đến điểm tiếp theo",
    driveNo: "{n} phút lái xe thong thả đến điểm tiếp theo",
    subtotal: "Tạm tính nếm thử",
    forGuests: "cho {n} khách",
    forGuest: "cho {n} khách",
    note: "Một kết thúc duyên dáng cho ngày. Đưa đón và trải nghiệm đặc biệt được xác nhận khi đặt chỗ.",
    stopNote: "Một buổi nếm thử có người dẫn tại hầm rượu cho chuyến thăm của bạn.",
    whyLabel: "Lý do chúng tôi chọn ngày này cho bạn",
    lunchLabel: "Bữa trưa",
    lunchNote: "Một khoảng nghỉ trưa thư thái được lồng vào ngày.",
    weatherWear: "Nên mặc gì",
    weatherForecast: "Dự báo",
    weatherTypical: "Thường thấy vào thời điểm này",
    rainChance: "{n}% khả năng mưa",
    dayHeading: "Ngày {n}",
  },
  summary: {
    pageTitle: "Tổng quan hành trình",
    pageIntro: "Xem lại hành trình và giá trước khi đặt.",
    noSummaryTitle: "Chưa có tổng quan hành trình",
    noSummaryDesc: "Hãy kiến tạo một hành trình trong phần Khám phá trước.",
    backToExplore: "Quay lại Khám phá",
    itinTitle: "Hành trình và phí nếm thử",
    previewMeta: "{date} · {n} khách",
    departAt: "Rời đi {time}",
    timeTbd: "Thời gian sẽ được xác nhận khi sắp lịch.",
    tastingFeeTbd: "Phí nếm thử sẽ xác định sau",
    whyDay: "Lý do chúng tôi chọn ngày này cho bạn",
    contactTitle: "Thông tin của bạn",
    contactName: "Tên",
    contactNamePh: "Tên của bạn",
    contactEmail: "Email",
    contactEmailPh: "you@example.com",
    subtotalLabel: "Tạm tính nếm thử",
    pricedNote: "{priced} điểm có giá, {missing} điểm chưa công bố phí nếm thử.",
    transportNote: "Phí đưa đón và trải nghiệm đặc biệt được xác nhận khi đặt chỗ.",
    customise: "Điều chỉnh hành trình",
    bookTour: "Đặt hành trình",
    booking: "Đang đặt…",
    bookingCreated: "Đã tạo đặt chỗ. Mã {ref}.",
    mapTitle: "Bản đồ hầm rượu của bạn",
    mapNote: "Biểu tượng ngôi nhà đánh dấu điểm xuất phát; các số theo thứ tự điểm dừng.",
    mapMissing: "{n} điểm thiếu tọa độ và chưa hiển thị trên bản đồ.",
    needContact: "Vui lòng thêm tên và email trước khi đặt.",
    bookingFailed: "Không thể tạo đặt chỗ.",
  },
  pace: {
    relaxed: { label: "Thong thả", note: "Nhịp nhẹ nhàng · hai hầm rượu, rộng rãi thời gian" },
    balanced: { label: "Trọn vẹn", note: "Một ngày trọn vẹn thoải mái · khoảng ba hầm rượu" },
    maximise: { label: "Tối đa", note: "Xem nhiều nhất có thể · bốn hầm rượu" },
  },
  wineStyles: {
    organic_biodynamic: { label: "Hữu cơ & sinh học động lực", desc: "Làm ra với thiên nhiên trong tâm trí" },
    well_known_names: { label: "Tên tuổi nổi tiếng", desc: "Những nhãn Margaret River biểu tượng" },
    hidden_gems: { label: "Viên ngọc ẩn", desc: "Nhà sản xuất nhỏ không bán ngoài cửa hàng" },
    family_estates: { label: "Điền trang gia đình", desc: "Hầm rượu ấm cúng, giàu câu chuyện" },
    award_winning: { label: "Đoạt giải", desc: "Sự xuất sắc được công nhận quốc tế" },
    surprise_me: { label: "Gây bất ngờ cho tôi", desc: "Chúng tôi chọn điều xuất sắc nhất hiện nay" },
  },
  experiences: {
    winery_lunch: { label: "Bữa trưa tại nhà rượu", desc: "Bàn dài giữa vườn nho" },
    cheese_wine: { label: "Phô mai & rượu vang", desc: "Khay phô mai địa phương, kết hợp tinh tế" },
    wine_chocolate: { label: "Rượu vang & sô-cô-la", desc: "Một phần kết hợp ngọt ngào hơn" },
    cellar_tour: { label: "Tham quan hầm rượu", desc: "Hậu trường cùng người làm rượu" },
    blending_experience: { label: "Trải nghiệm pha trộn", desc: "Tự tạo chai rượu mang về" },
    private_tasting_room: { label: "Phòng nếm riêng", desc: "Chỉ nhóm bạn, phục vụ riêng" },
    sunset_tasting: { label: "Nếm thử hoàng hôn", desc: "Giờ vàng trên vườn nho" },
    vineyard_walk: { label: "Dạo vườn nho", desc: "Thư giãn đôi chân giữa các lần rót" },
  },
  occasions: {
    great_day_out: "Chỉ là một ngày tuyệt vời",
    celebration: "Ăn mừng",
    birthday: "Sinh nhật",
    anniversary: "Kỷ niệm",
    honeymoon: "Tuần trăng mật",
    corporate: "Doanh nghiệp",
  },
  budgets: {
    "great-value": { label: "Giá trị tốt", desc: "Dưới $100 mỗi người" },
    premium: { label: "Cao cấp", desc: "$100–$200 mỗi người" },
    indulgent: { label: "Thỏa thích", desc: "$200+ mỗi người" },
  },
  dietary: {
    vegetarian: "Chay",
    vegan: "Thuần chay",
    gluten_free: "Không gluten",
    halal: "Halal",
    nut_allergy: "Dị ứng hạt",
    none: "Không",
  },
  accessibility: {
    wheelchair_access: { label: "Lối cho xe lăn", desc: "Vào và nếm thử không bậc thang" },
    hearing_assistance: { label: "Hỗ trợ thính giác", desc: "Vòng trợ thính, không gian yên tĩnh" },
  },
};

export const EXPLORE_I18N: Record<AppLocale, ExploreCopy> = {
  en,
  "zh-Hans": zhHans,
  vi,
};

export const EXPLORE_LOCALES: { code: AppLocale; label: string; script: "latin" | "cjk" | "vi"; intl: string }[] = [
  { code: "en", label: "English", script: "latin", intl: "en-AU" },
  { code: "zh-Hans", label: "简体中文", script: "cjk", intl: "zh-Hans-CN" },
  { code: "vi", label: "Tiếng Việt", script: "vi", intl: "vi-VN" },
];

export function scriptForLocale(locale: AppLocale): "latin" | "cjk" | "vi" {
  return EXPLORE_LOCALES.find((l) => l.code === locale)?.script ?? "latin";
}

export function intlForLocale(locale: AppLocale): string {
  return EXPLORE_LOCALES.find((l) => l.code === locale)?.intl ?? "en-AU";
}

// {token} interpolation, limited to numbers + pre-localized nouns by callers.
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] != null ? String(values[key]) : match,
  );
}
