// Localized copy for the marketing homepage. Source strings from the design
// handoff (design_handoff_tailormoments_web/scripts/tm-i18n.jsx). English is the
// complete base; other languages override the fields they translate and fall
// back to English for everything else (e.g. differentiators, itinerary preview).

export const TM_PARTNERS = ["Vasse Felix", "Cullen Wines", "Fraser Gallop", "Woodlands"] as const;

export type HeroCopy = {
  eyebrow: string;
  title: string;
  em: string;
  sub: string;
  cta: string;
  ghost: string;
};

export type HomeCopy = {
  langName: string;
  script?: "latin" | "cjk" | "thai";
  nav: { experiences: string; how: string; wineries: string; plan: string };
  hero: HeroCopy;
  how: { eyebrow: string; title: string; steps: Array<{ n: string; title: string; body: string }> };
  diff: { eyebrow: string; title: string; items: Array<{ icon: string; label: string; body: string }> };
  exp: {
    eyebrow: string;
    title: string;
    lead: string;
    from: string;
    cta: string;
    cards: Array<{ kicker: string; title: string; body: string; price: string; unit: string }>;
  };
  itinPreview: {
    eyebrow: string;
    title: string;
    lead: string;
    aiLabel: string;
    aiText: string;
    stops: Array<{ time: string; name: string; desc: string; type: string }>;
    note: string;
    cta: string;
  };
  testimonials: {
    eyebrow: string;
    title: string;
    partnersLabel: string;
    quotes: Array<{ quote: string; name: string; city: string }>;
  };
  location: { eyebrow: string; title: string; body: string; stats: Array<{ num: string; label: string }> };
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

const EN: HomeCopy = {
  langName: "English",
  script: "latin",
  nav: { experiences: "Experiences", how: "How it works", wineries: "Wineries", plan: "Plan a day" },
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
    links: { experiences: "Experiences", wineries: "Our wineries", plan: "Plan a day", contact: "Contact us", wineryPortal: "Winery portal", transportPortal: "Transport portal" },
    rights: "All rights reserved.",
    note: "Tailor Moments acknowledges the Wadandi people, traditional custodians of this Country.",
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// Partial overrides. Sections not translated (diff, itinPreview, location,
// testimonials body) fall back to English via deep-merge.
const PARTIALS: Record<string, DeepPartial<HomeCopy>> = {
  vi: {
    langName: "Tiếng Việt",
    nav: { experiences: "Trải nghiệm", how: "Cách hoạt động", wineries: "Nhà máy rượu", plan: "Lên kế hoạch" },
    hero: {
      eyebrow: "Margaret River · Tây Úc",
      title: "Nơi buổi chiều chậm lại thành sắc màu của rượu vang",
      em: "rong ruổi thung lũng theo cách của bạn",
      sub: "Một hành trình tuyển chọn qua những hầm rượu danh tiếng nhất của Margaret River — được lên kế hoạch trọn vẹn, đưa đón riêng tư, và thiết kế hoàn toàn cho riêng bạn.",
      cta: "Bắt đầu hành trình",
      ghost: "Xem trải nghiệm",
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
      secondary: "Xem một ngày mẫu",
    },
    foot: {
      tagline: "Những hành trình nhà máy rượu tuyển chọn tại Margaret River, Tây Úc.",
      colExplore: "Khám phá",
      colAbout: "Giới thiệu",
      colPartners: "Đối tác",
      note: "Tailor Moments tri ân người Wadandi, những người gìn giữ truyền thống của vùng đất này.",
      rights: "Bảo lưu mọi quyền.",
    },
  },
  "zh-Hans": {
    langName: "简体中文",
    script: "cjk",
    nav: { experiences: "臻选体验", how: "预订流程", wineries: "酒庄", plan: "定制行程" },
    hero: {
      eyebrow: "玛格丽特河 · 西澳大利亚",
      title: "午后时光，沉淀为美酒的色泽",
      em: "以你的方式漫游山谷",
      sub: "一场穿行于玛格丽特河经典酒庄的私享之旅——全程为你周密规划，专属司机相伴，一切只为你而定制。",
      cta: "开启旅程",
      ghost: "浏览体验",
    },
    how: {
      eyebrow: "预订流程",
      title: "三步，成就一日悠然",
      steps: [
        { n: "i", title: "告诉我们你的偏好", body: "与谁同行、喜欢怎样的节奏、钟爱哪种酒款。无需繁琐表单，只需简短交流。" },
        { n: "ii", title: "我们为你编排当日", body: "礼宾团队将酒庄、品鉴与悠长午宴，编织为一份无缝衔接的行程。" },
        { n: "iii", title: "抵达，尽享悠然", body: "专属司机为你接送。一切皆已预订、计时与确认，你只需享受。" },
      ],
    },
    exp: {
      eyebrow: "臻选体验",
      title: "走进山谷的三种方式",
      lead: "精挑细选，而非令人眼花的繁多。每一项皆由礼宾全程为你安排。",
      from: "起价",
      cta: "了解详情",
      cards: [
        { kicker: "酒庄探访", title: "酒庄巡礼", body: "于黄金时分，循序探访三家创始酒庄，品鉴席位提前为你预留。", price: "A$390", unit: "每位" },
        { kicker: "尊享邀约", title: "私人品鉴", body: "由主人引领的单一园佳酿品鉴，佐以本地食材，于专属厅室静享。", price: "A$520", unit: "每位" },
        { kicker: "豪华接送", title: "专车接送", body: "私人座驾门到门接送——从珀斯、巴瑟尔顿或你的别墅直达葡萄园，再安然返程。", price: "A$680", unit: "每日" },
      ],
    },
    cta: {
      eyebrow: "无需注册，毫无压力",
      title: "开始规划你的专属体验",
      sub: "告诉我们你的日期，我们便着手编排你的玛格丽特河之日。仅需约两分钟。",
      primary: "开始规划",
      secondary: "查看示例行程",
    },
    foot: {
      tagline: "西澳玛格丽特河的臻选酒庄之旅。",
      colExplore: "探索",
      colAbout: "关于",
      colPartners: "合作伙伴",
      note: "Tailor Moments 谨向本地传统守护者 Wadandi 族致意。",
      rights: "版权所有。",
    },
  },
  ko: {
    langName: "한국어",
    script: "cjk",
    nav: { experiences: "익스피리언스", how: "이용 방법", wineries: "와이너리", plan: "여정 설계" },
    hero: {
      eyebrow: "마가렛 리버 · 서호주",
      title: "오후가 와인의 빛깔로 천천히 물드는 곳",
      em: "당신만의 방식으로 계곡을 누비다",
      sub: "마가렛 리버의 가장 이야기가 깃든 셀러도어를 잇는 큐레이션 여정 — 처음부터 끝까지 설계하고, 전용 기사가 동행하며, 오직 당신을 위해 맞춤됩니다.",
      cta: "여정 시작하기",
      ghost: "익스피리언스 보기",
    },
    how: {
      eyebrow: "이용 방법",
      title: "완벽한 하루를 위한 세 단계",
      steps: [
        { n: "i", title: "취향을 들려주세요", body: "동행, 선호하는 페이스, 좋아하는 와인을 알려주세요. 번거로운 양식 없이, 짧은 대화면 충분합니다." },
        { n: "ii", title: "하루를 설계합니다", body: "컨시어지가 셀러도어와 시음, 여유로운 점심을 하나의 매끄러운 일정으로 엮습니다." },
        { n: "iii", title: "도착해 쉬기만 하세요", body: "전용 기사가 모시러 옵니다. 모든 것은 예약·시간·확정 완료. 당신은 즐기기만 하면 됩니다." },
      ],
    },
    exp: {
      eyebrow: "주요 익스피리언스",
      title: "계곡으로 향하는 세 가지 길",
      lead: "압도하는 다수가 아닌, 엄선된 소수. 각 여정은 컨시어지가 처음부터 끝까지 준비합니다.",
      from: "시작가",
      cta: "살펴보기",
      cards: [
        { kicker: "와이너리 방문", title: "셀러도어 서킷", body: "황금빛 시간, 세 곳의 창립 에스테이트를 차례로 안내하며 시음 좌석을 미리 예약해 둡니다.", price: "A$390", unit: "1인" },
        { kicker: "초대 전용", title: "프라이빗 테이스팅", body: "호스트가 이끄는 싱글 빈야드 와인 플라이트를 지역 식재료와 페어링해 전용 룸에서 즐깁니다.", price: "A$520", unit: "1인" },
        { kicker: "럭셔리 이동", title: "쇼퍼 드리븐 트랜스퍼", body: "퍼스, 버셀턴 또는 빌라에서 포도밭까지 도어 투 도어 전용 차량으로 모십니다.", price: "A$680", unit: "1일" },
      ],
    },
    cta: {
      eyebrow: "가입 없이, 부담 없이",
      title: "당신의 여정을 설계해 보세요",
      sub: "날짜만 알려주시면 마가렛 리버의 하루를 구성하기 시작합니다. 약 2분이면 충분합니다.",
      primary: "설계 시작하기",
      secondary: "샘플 일정 보기",
    },
    foot: {
      tagline: "서호주 마가렛 리버의 큐레이션 와이너리 여정.",
      colExplore: "탐색",
      colAbout: "소개",
      colPartners: "파트너",
      note: "Tailor Moments는 이 땅의 전통 수호자인 와단디(Wadandi) 부족에게 경의를 표합니다.",
    },
  },
  ja: {
    langName: "日本語",
    script: "cjk",
    nav: { experiences: "体験", how: "ご利用の流れ", wineries: "ワイナリー", plan: "一日を計画" },
    hero: {
      eyebrow: "マーガレット・リバー · 西オーストラリア",
      title: "午後が、ワインの色へと静かに溶けてゆく",
      em: "あなたの流儀で谷をめぐる",
      sub: "マーガレット・リバーの由緒あるセラードアをめぐる、キュレーションの逸旅。隅々まで計画し、専属ドライバーが寄り添い、すべてはあなたのために誂えられます。",
      cta: "旅を始める",
      ghost: "体験を見る",
    },
    how: {
      eyebrow: "ご利用の流れ",
      title: "心地よい一日への三つの歩み",
      steps: [
        { n: "i", title: "お好みをお聞かせください", body: "ご一緒する方、好まれるペース、愛されるワインを。煩雑な記入は不要、短い対話だけで十分です。" },
        { n: "ii", title: "一日を編みます", body: "コンシェルジュがセラードア、試飲、ゆったりとした昼食を、ひと続きの旅程へと織り上げます。" },
        { n: "iii", title: "到着し、寛ぐだけ", body: "専属ドライバーがお迎えに。予約も時間も確認も済んでいます。あなたはただ味わうだけ。" },
      ],
    },
    exp: {
      eyebrow: "注目の体験",
      title: "谷へといざなう三つの道",
      lead: "圧倒する数ではなく、選び抜かれた少数を。いずれもコンシェルジュが一貫してご用意します。",
      from: "料金",
      cta: "詳しく見る",
      cards: [
        { kicker: "ワイナリー訪問", title: "セラードア・サーキット", body: "黄金の時間に三つの創設ワイナリーを順にご案内。試飲席はご到着前にご予約済みです。", price: "A$390", unit: "お一人様" },
        { kicker: "ご招待制", title: "プライベート・テイスティング", body: "ホストが導く単一畑ワインのフライトを、地元の食材と合わせ、専用の一室で。", price: "A$520", unit: "お一人様" },
        { kicker: "ラグジュアリー送迎", title: "ショーファー送迎", body: "パース、バッセルトン、あるいは別荘からブドウ畑まで、専用車でドア・トゥ・ドア。", price: "A$680", unit: "一日" },
      ],
    },
    cta: {
      eyebrow: "登録不要、気負いなく",
      title: "あなたの体験を計画しましょう",
      sub: "日程をお知らせいただければ、マーガレット・リバーの一日を編み始めます。所要およそ二分。",
      primary: "計画を始める",
      secondary: "サンプルの一日を見る",
    },
    foot: {
      tagline: "西オーストラリア、マーガレット・リバーのキュレーション・ワイナリー紀行。",
      colExplore: "めぐる",
      colAbout: "私たちについて",
      colPartners: "パートナー",
      note: "Tailor Moments は、この地の伝統的守り手であるワダンディの人々に敬意を表します。",
    },
  },
  id: {
    langName: "Bahasa Indonesia",
    nav: { experiences: "Pengalaman", how: "Cara kerja", wineries: "Kilang Anggur", plan: "Rencanakan hari" },
    hero: {
      eyebrow: "Margaret River · Australia Barat",
      title: "Saat sore melambat menjadi warna anggur",
      em: "menyusuri lembah dengan cara Anda",
      sub: "Pelarian kurasi menembusi cellar door paling legendaris di Margaret River — direncanakan menyeluruh, diantar dengan nyaman, dan dirancang sepenuhnya untuk Anda.",
      cta: "Mulai perjalanan",
      ghost: "Lihat pengalaman",
    },
    how: {
      eyebrow: "Cara kerja",
      title: "Tiga langkah menuju hari tanpa repot",
      steps: [
        { n: "i", title: "Ceritakan selera Anda", body: "Siapa yang ikut, ritme yang Anda sukai, dan anggur yang Anda gemari. Tanpa formulir panjang — cukup percakapan singkat." },
        { n: "ii", title: "Kami susun harinya", body: "Concierge kami merangkai cellar door, pencicipan, dan santap siang panjang menjadi satu itinerari yang mulus." },
        { n: "iii", title: "Tiba, lalu bersantai", body: "Sopir pribadi menjemput Anda. Semua sudah dipesan, dijadwalkan, dan dikonfirmasi. Anda tinggal menikmati." },
      ],
    },
    exp: {
      eyebrow: "Pengalaman pilihan",
      title: "Tiga jalan menuju lembah",
      lead: "Sedikit yang terkurasi, bukan banyak yang membingungkan. Semua disiapkan menyeluruh oleh concierge Anda.",
      from: "Mulai",
      cta: "Jelajahi",
      cards: [
        { kicker: "Kunjungan kilang", title: "Sirkuit Cellar Door", body: "Rangkaian terpandu ke tiga estate pendiri saat cahaya keemasan, dengan pencicipan yang sudah dipesan lebih dulu.", price: "A$390", unit: "per tamu" },
        { kicker: "Dengan undangan", title: "Pencicipan Privat", body: "Flight anggur single-vineyard yang dipandu tuan rumah, dipadukan produk lokal di ruang khusus untuk Anda.", price: "A$520", unit: "per tamu" },
        { kicker: "Transportasi mewah", title: "Antar-Jemput Sopir", body: "Pintu ke pintu dengan kendaraan pribadi — dari Perth, Busselton, atau vila Anda menuju kebun anggur dan kembali.", price: "A$680", unit: "per hari" },
      ],
    },
    cta: {
      eyebrow: "Tanpa akun, tanpa tekanan",
      title: "Mulai rencanakan pengalaman Anda",
      sub: "Beri tahu tanggal Anda dan kami mulai menyusun hari Margaret River Anda. Hanya sekitar dua menit.",
      primary: "Mulai merencanakan",
      secondary: "Lihat contoh hari",
    },
    foot: {
      tagline: "Perjalanan kilang anggur terkurasi di Margaret River, Australia Barat.",
      colExplore: "Jelajah",
      colAbout: "Tentang",
      colPartners: "Mitra",
      note: "Tailor Moments menghormati suku Wadandi, penjaga tradisional tanah ini.",
      rights: "Hak cipta dilindungi.",
    },
  },
  tl: {
    langName: "Filipino",
    nav: { experiences: "Mga Karanasan", how: "Paano ito gumagana", wineries: "Mga Winery", plan: "Magplano ng araw" },
    hero: {
      eyebrow: "Margaret River · Western Australia",
      title: "Kung saan dahan-dahang nagiging kulay ng alak ang hapon",
      em: "libutin ang lambak sa paraan mong gusto",
      sub: "Isang piling paglalakbay sa pinakatanyag na cellar door ng Margaret River — buong pinlano, kumportableng inihatid, at ganap na inangkop para sa iyo.",
      cta: "Simulan ang paglalakbay",
      ghost: "Tingnan ang mga karanasan",
    },
    how: {
      eyebrow: "Paano ito gumagana",
      title: "Tatlong hakbang sa isang panatag na araw",
      steps: [
        { n: "i", title: "Sabihin ang panlasa mo", body: "Sino ang kasama, anong bilis ang gusto mo, at anong alak ang paborito. Walang mahabang form — isang maikling usapan lang." },
        { n: "ii", title: "Bubuuin namin ang araw", body: "Inaayos ng aming concierge ang mga cellar door, pagtikim, at mahabang tanghalian sa iisang maayos na itinerary." },
        { n: "iii", title: "Dumating, at magpahinga", body: "Susunduin ka ng pribadong tsuper. Lahat ay naka-book, naka-iskedyul, at kumpirmado. Ikaw ay magpapasarap na lang." },
      ],
    },
    exp: {
      eyebrow: "Mga piling karanasan",
      title: "Tatlong daan papunta sa lambak",
      lead: "Iilang piling, hindi nakakalula na marami. Bawat isa ay inihahanda nang buo ng iyong concierge.",
      from: "Mula sa",
      cta: "Tuklasin",
      cards: [
        { kicker: "Pagbisita sa winery", title: "Ang Cellar Door Circuit", body: "Isang gabay na ikot sa tatlong nagtatag na estate sa golden hour, may pagtikim na nakareserba bago ka dumating.", price: "A$390", unit: "bawat bisita" },
        { kicker: "May paanyaya", title: "Ang Pribadong Pagtikim", body: "Nakaupong flight ng single-vineyard na alak na pinangungunahan ng host, kapareha ng lokal na produkto sa isang silid na para sa iyo.", price: "A$520", unit: "bawat bisita" },
        { kicker: "Luxury na transportasyon", title: "Ang Chauffeured Transfer", body: "Pinto-sa-pinto sa pribadong sasakyan — mula Perth, Busselton, o iyong villa papunta sa ubasan at pabalik.", price: "A$680", unit: "bawat araw" },
      ],
    },
    cta: {
      eyebrow: "Walang account, walang presyon",
      title: "Simulang planuhin ang iyong karanasan",
      sub: "Sabihin ang iyong mga petsa at sisimulan naming buuin ang iyong araw sa Margaret River. Mga dalawang minuto lang.",
      primary: "Simulang magplano",
      secondary: "Tingnan ang halimbawang araw",
    },
    foot: {
      tagline: "Mga piling paglalakbay sa winery sa Margaret River, Western Australia.",
      colExplore: "Tuklasin",
      colAbout: "Tungkol",
      colPartners: "Mga Kasosyo",
      note: "Kinikilala ng Tailor Moments ang mga Wadandi, tradisyunal na tagapag-ingat ng lupaing ito.",
      rights: "Nakalaan ang lahat ng karapatan.",
    },
  },
  th: {
    langName: "ไทย",
    script: "thai",
    nav: { experiences: "ประสบการณ์", how: "ขั้นตอนการจอง", wineries: "ไวเนอรี", plan: "วางแผนทริป" },
    hero: {
      eyebrow: "มาร์กาเร็ตริเวอร์ · ออสเตรเลียตะวันตก",
      title: "ยามบ่ายที่ค่อย ๆ ละลายเป็นสีของไวน์",
      em: "ท่องหุบเขาในแบบของคุณ",
      sub: "การหลีกหนีที่คัดสรรผ่านห้องชิมไวน์อันเลื่องชื่อที่สุดของมาร์กาเร็ตริเวอร์ — วางแผนครบถ้วน มีคนขับส่วนตัว และออกแบบเพื่อคุณโดยเฉพาะ",
      cta: "เริ่มการเดินทาง",
      ghost: "ดูประสบการณ์",
    },
    how: {
      eyebrow: "ขั้นตอนการจอง",
      title: "สามขั้นตอนสู่วันอันแสนสบาย",
      steps: [
        { n: "i", title: "บอกรสนิยมของคุณ", body: "ใครร่วมเดินทาง จังหวะที่คุณชอบ และไวน์ที่คุณหลงรัก ไม่มีแบบฟอร์มยืดยาว เพียงพูดคุยสั้น ๆ" },
        { n: "ii", title: "เราจัดวันให้คุณ", body: "คอนเซียร์จของเราคัดสรรห้องชิมไวน์ การชิม และมื้อกลางวันแสนสบาย ให้เป็นทริปเดียวที่ราบรื่น" },
        { n: "iii", title: "มาถึง แล้วพักผ่อน", body: "คนขับส่วนตัวมารับคุณ ทุกอย่างจองไว้ กำหนดเวลา และยืนยันเรียบร้อย คุณเพียงแค่ดื่มด่ำ" },
      ],
    },
    exp: {
      eyebrow: "ประสบการณ์แนะนำ",
      title: "สามเส้นทางสู่หุบเขา",
      lead: "เลือกสรรเพียงไม่กี่อย่าง ไม่ใช่มากมายจนสับสน ทุกอย่างจัดเตรียมครบโดยคอนเซียร์จของคุณ",
      from: "เริ่มต้น",
      cta: "สำรวจ",
      cards: [
        { kicker: "เยือนไวเนอรี", title: "เส้นทางห้องชิมไวน์", body: "เส้นทางนำชมสามเอสเตทผู้ก่อตั้งในชั่วโมงทอง พร้อมการชิมที่จองไว้ล่วงหน้าก่อนคุณมาถึง", price: "A$390", unit: "ต่อท่าน" },
        { kicker: "เฉพาะผู้ได้รับเชิญ", title: "การชิมแบบส่วนตัว", body: "ชุดไวน์จากไร่เดี่ยวที่นำชิมโดยเจ้าบ้าน จับคู่กับวัตถุดิบท้องถิ่นในห้องที่สงวนไว้เพื่อคุณ", price: "A$520", unit: "ต่อท่าน" },
        { kicker: "การเดินทางหรู", title: "บริการรถพร้อมคนขับ", body: "รับส่งถึงประตูด้วยรถส่วนตัว — จากเพิร์ท บัสเซลตัน หรือวิลลาของคุณสู่ไร่องุ่นและกลับ", price: "A$680", unit: "ต่อวัน" },
      ],
    },
    cta: {
      eyebrow: "ไม่ต้องสมัคร ไม่กดดัน",
      title: "เริ่มวางแผนประสบการณ์ของคุณ",
      sub: "บอกวันเดินทางของคุณ แล้วเราจะเริ่มจัดวันมาร์กาเร็ตริเวอร์ให้คุณ ใช้เวลาราวสองนาที",
      primary: "เริ่มวางแผน",
      secondary: "ดูตัวอย่างหนึ่งวัน",
    },
    foot: {
      tagline: "ทริปไวเนอรีคัดสรรในมาร์กาเร็ตริเวอร์ ออสเตรเลียตะวันตก",
      colExplore: "สำรวจ",
      colAbout: "เกี่ยวกับ",
      colPartners: "พันธมิตร",
      note: "Tailor Moments ขอน้อมคารวะชาว Wadandi ผู้พิทักษ์ดั้งเดิมของผืนแผ่นดินนี้",
      rights: "สงวนลิขสิทธิ์",
    },
  },
};

export const HOME_LANG_ORDER = ["en", "zh-Hans", "vi", "ko", "ja", "id", "tl", "th"] as const;
export type HomeLang = (typeof HOME_LANG_ORDER)[number];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) {
    return base;
  }
  const result: Record<string, unknown> = Array.isArray(base) ? [...(base as unknown[])] as never : { ...(base as object) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined) {
      continue;
    }
    const baseValue = (base as Record<string, unknown>)[key];
    result[key] = isObject(value) && isObject(baseValue) ? deepMerge(baseValue, value as never) : value;
  }
  return result as T;
}

export const HOME_LANG_NAMES: Record<HomeLang, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  vi: "Tiếng Việt",
  ko: "한국어",
  ja: "日本語",
  id: "Bahasa Indonesia",
  tl: "Filipino",
  th: "ไทย",
};

export function getHomeCopy(lang: HomeLang): HomeCopy {
  if (lang === "en") {
    return EN;
  }
  return deepMerge(EN, PARTIALS[lang]);
}
