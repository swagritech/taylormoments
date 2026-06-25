"use client";

import { useEffect, useState } from "react";
import {
  getHomeCopy,
  HOME_LANG_NAMES,
  HOME_LANG_ORDER,
  type HomeCopy,
  type HomeLang,
} from "@/lib/home-i18n";

const LOCALE_KEY = "tm_locale";
const NAV_OFFSET = 72;

function goExplore(event: React.MouseEvent) {
  event.preventDefault();
  window.location.href = "/explore";
}

function smoothJump(id: string) {
  if (id === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
}

function Wordmark({ variant }: { variant: "nav" | "foot" }) {
  return (
    <span className={`tm-wordmark tm-wordmark--${variant}`}>
      <span className="tm-wordmark__name">Tailor Moments</span>
      <span className="tm-wordmark__rule" aria-hidden="true" />
      <span className="tm-wordmark__tag">Your Way</span>
    </span>
  );
}

function Placeholder({ label, tint }: { label: string; tint: string }) {
  return (
    <div className={`tm-ph tm-ph--${tint}`} role="img" aria-label={label}>
      <div className="tm-ph__weave" aria-hidden="true" />
      <span className="tm-ph__tag">{label}</span>
    </div>
  );
}

function Nav({
  t,
  lang,
  onLang,
}: {
  t: HomeCopy;
  lang: HomeLang;
  onLang: (code: HomeLang) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { key: "experiences", label: t.nav.experiences },
    { key: "how", label: t.nav.how },
    { key: "plan", label: t.nav.plan },
  ];

  return (
    <header className={`tm-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="tm-nav__inner">
        <a
          className="tm-nav__brand"
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            smoothJump("top");
          }}
        >
          <Wordmark variant="nav" />
        </a>

        <nav className={`tm-nav__links ${open ? "is-open" : ""}`} aria-label="Primary">
          {items.map((item) => (
            <a
              key={item.key}
              href={`#${item.key}`}
              className="tm-nav__link"
              onClick={(event) => {
                event.preventDefault();
                setOpen(false);
                smoothJump(item.key);
              }}
            >
              {item.label}
            </a>
          ))}
          <a href="/explore" className="tm-nav__link tm-nav__link--drawer-cta" onClick={(event) => { setOpen(false); goExplore(event); }}>
            {t.nav.plan}
          </a>
        </nav>

        <div className="tm-nav__actions">
          <div className={`tm-lang ${langOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="tm-lang__btn"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((value) => !value)}
            >
              <span className="tm-lang__globe" aria-hidden="true">◍</span>
              <span className="tm-lang__current">{HOME_LANG_NAMES[lang]}</span>
              <span className="tm-lang__caret" aria-hidden="true">▾</span>
            </button>
            {langOpen ? (
              <ul className="tm-lang__menu" role="listbox">
                {HOME_LANG_ORDER.map((code) => (
                  <li key={code} role="option" aria-selected={code === lang}>
                    <button
                      type="button"
                      className={`tm-lang__opt ${code === lang ? "is-active" : ""}`}
                      onClick={() => {
                        onLang(code);
                        setLangOpen(false);
                      }}
                    >
                      {HOME_LANG_NAMES[code]}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <a className="tm-btn tm-btn--primary tm-btn--sm tm-nav__planday" href="/explore" onClick={goExplore}>
            {t.nav.plan}
          </a>
          <button
            type="button"
            className={`tm-nav__burger ${open ? "is-open" : ""}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }: { t: HomeCopy }) {
  const h = t.hero;
  return (
    <section className="tm-hero tm-hero--b" id="top">
      <div className="tm-hero__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/backgrounds/hero-vineyard.jpg" alt="" className="tm-hero__img" />
        <div className="tm-hero__scrim" />
        <div className="tm-hero__vignette" />
      </div>

      <div className="tm-hero__inner tm-hero__inner--b">
        <p className="tm-kicker tm-kicker--light tm-kicker--center">{h.eyebrow}</p>
        <h1 className="tm-hero__title tm-display">{h.title}</h1>
        {h.em ? <p className="tm-hero__em tm-foil">{h.em}</p> : null}
        <p className="tm-hero__sub">{h.sub}</p>
        <div className="tm-hero__actions">
          <a className="tm-btn tm-btn--primary" href="/explore" onClick={goExplore}>
            {h.cta}
          </a>
          <a
            className="tm-btn tm-btn--clear"
            href="#how"
            onClick={(event) => {
              event.preventDefault();
              smoothJump("how");
            }}
          >
            {h.ghost} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <button type="button" className="tm-hero__scroll" aria-label="Scroll" onClick={() => smoothJump("how")}>
        <span className="tm-hero__scrollline" />
      </button>
    </section>
  );
}

function HowItWorks({ t }: { t: HomeCopy }) {
  return (
    <section className="tm-how tm-section" id="how">
      <div className="tm-wrap">
        <header className="tm-sec-head">
          <p className="tm-kicker">{t.how.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{t.how.title}</h2>
        </header>
        <ol className="tm-steps">
          {t.how.steps.map((step, index) => (
            <li className="tm-step" key={index}>
              <span className="tm-step__num tm-foil">{step.n}</span>
              <h3 className="tm-step__title">{step.title}</h3>
              <p className="tm-step__body">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="tm-how__cta">
          <a className="tm-btn tm-btn--primary" href="/explore" onClick={goExplore}>
            {t.cta.primary}
          </a>
          <p className="tm-how__note">{t.cta.sub}</p>
        </div>
      </div>
    </section>
  );
}

function Differentiators({ t }: { t: HomeCopy }) {
  return (
    <section className="tm-diff">
      <div className="tm-wrap">
        <header className="tm-sec-head tm-sec-head--center">
          <p className="tm-kicker">{t.diff.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{t.diff.title}</h2>
        </header>
        <div className="tm-diff__grid">
          {t.diff.items.map((item, index) => (
            <div className="tm-diff__item" key={index}>
              <span className="tm-diff__icon" aria-hidden="true">{item.icon}</span>
              <h3 className="tm-diff__label">{item.label}</h3>
              <p className="tm-diff__body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experiences({ t }: { t: HomeCopy }) {
  const tints = ["a", "b", "c"];
  const labels = ["CELLAR DOOR · GOLDEN HOUR", "TASTING ROOM · STILL LIFE", "PRIVATE CAR · VINEYARD ROAD"];
  return (
    <section className="tm-exp tm-section" id="experiences">
      <div className="tm-wrap">
        <header className="tm-sec-head tm-sec-head--row">
          <div>
            <p className="tm-kicker">{t.exp.eyebrow}</p>
            <h2 className="tm-sec-title tm-display">{t.exp.title}</h2>
          </div>
          <p className="tm-sec-lead">{t.exp.lead}</p>
        </header>
        <div className="tm-exp__grid tm-exp__grid--stagger">
          {t.exp.cards.map((card, index) => (
            <article className="tm-exp__card tm-exp__card--stagger" key={index}>
              <div className="tm-exp__media">
                <Placeholder label={labels[index]} tint={tints[index]} />
                <span className="tm-exp__kicker">{card.kicker}</span>
              </div>
              <div className="tm-exp__body">
                <h3 className="tm-exp__title tm-display">{card.title}</h3>
                <p className="tm-exp__copy">{card.body}</p>
                <div className="tm-exp__foot">
                  <span className="tm-exp__price">
                    <span className="tm-exp__from">{t.exp.from}</span> {card.price}
                    <span className="tm-exp__unit"> / {card.unit}</span>
                  </span>
                  <a className="tm-exp__link" href="/explore" onClick={goExplore}>
                    {t.exp.cta} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ItineraryPreview({ t }: { t: HomeCopy }) {
  const p = t.itinPreview;
  return (
    <section className="tm-itin tm-section" id="itinerary-preview">
      <div className="tm-wrap">
        <header className="tm-sec-head">
          <p className="tm-kicker">{p.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{p.title}</h2>
          <p className="tm-sec-lead">{p.lead}</p>
        </header>
        <div className="tm-itin__card">
          <div className="tm-itin__ai">
            <span className="tm-itin__ai-label">
              <span className="tm-itin__ai-dot" aria-hidden="true" />
              {p.aiLabel}
            </span>
            <p className="tm-itin__ai-text tm-display">{p.aiText}</p>
          </div>
          <div className="tm-itin__stops">
            {p.stops.map((stop, index) => (
              <div className="tm-itin__stop" key={index}>
                <span className="tm-itin__time">{stop.time}</span>
                <div className="tm-itin__stop-body">
                  <span className="tm-itin__stop-name">{stop.name}</span>
                  <span className="tm-itin__stop-desc">{stop.desc}</span>
                </div>
                <span className="tm-itin__stop-tag">{stop.type}</span>
              </div>
            ))}
          </div>
          <div className="tm-itin__foot">
            <p className="tm-itin__note">{p.note}</p>
            <a className="tm-btn tm-btn--primary" href="/explore" onClick={goExplore}>
              {p.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials({ t }: { t: HomeCopy }) {
  const tst = t.testimonials;
  return (
    <section className="tm-testi tm-section" id="trust">
      <div className="tm-wrap">
        <header className="tm-sec-head">
          <p className="tm-kicker">{tst.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{tst.title}</h2>
        </header>
        <div className="tm-testi__grid">
          {tst.quotes.map((quote, index) => (
            <figure className={`tm-testi__card tm-testi__card--${index}`} key={index}>
              <span className="tm-testi__mark tm-foil" aria-hidden="true">&ldquo;</span>
              <blockquote className="tm-testi__quote tm-display">{quote.quote}</blockquote>
              <figcaption className="tm-testi__cap">
                <span className="tm-testi__name">{quote.name}</span>
                <span className="tm-testi__city">{quote.city}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Location({ t }: { t: HomeCopy }) {
  const loc = t.location;
  return (
    <section className="tm-loc">
      <div className="tm-wrap tm-loc__inner">
        <div className="tm-loc__copy">
          <p className="tm-kicker">{loc.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{loc.title}</h2>
          <p className="tm-loc__body">{loc.body}</p>
          <div className="tm-loc__stats">
            {loc.stats.map((stat, index) => (
              <div className="tm-loc__stat" key={index}>
                <span className="tm-loc__num tm-foil">{stat.num}</span>
                <span className="tm-loc__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tm-loc__map" aria-hidden="true">
          <svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" className="tm-loc__svg">
            <path
              d="M50 28 L190 28 L205 72 L210 145 L202 222 L185 278 L150 298 L110 302 L72 292 L44 262 L34 192 L38 115 L42 72 Z"
              fill="none"
              stroke="var(--tm-line)"
              strokeWidth="1.5"
            />
            <path d="M110 195 Q103 218 96 243" stroke="var(--tm-accent)" strokeWidth="1.5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
            <circle cx="110" cy="195" r="5" fill="var(--tm-teal)" />
            <text x="120" y="199" fontSize="11" fill="var(--tm-muted)" fontFamily="Inter,sans-serif">Perth</text>
            <circle cx="96" cy="243" r="7" fill="var(--tm-accent)" />
            <circle cx="96" cy="243" r="12" fill="var(--tm-accent)" fillOpacity="0.18" />
            <text x="108" y="240" fontSize="10" fill="var(--tm-ink)" fontFamily="Inter,sans-serif" fontWeight="600">Margaret River</text>
            <text x="66" y="225" fontSize="9" fill="var(--tm-muted)" fontFamily="Inter,sans-serif" transform="rotate(-14 66 225)">270 km · 3 hrs</text>
          </svg>
        </div>
      </div>
    </section>
  );
}

function Cta({ t }: { t: HomeCopy }) {
  return (
    <section className="tm-cta tm-section" id="plan">
      <div className="tm-cta__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/backgrounds/hero-vineyard.png" alt="" className="tm-cta__img" />
        <div className="tm-cta__scrim" />
      </div>
      <div className="tm-wrap tm-cta__inner">
        <p className="tm-kicker tm-kicker--light tm-kicker--center">{t.cta.eyebrow}</p>
        <h2 className="tm-cta__title tm-display">{t.cta.title}</h2>
        <p className="tm-cta__sub">{t.cta.sub}</p>
        <div className="tm-cta__actions">
          <a className="tm-btn tm-btn--primary tm-btn--lg" href="/explore" onClick={goExplore}>
            {t.cta.primary}
          </a>
          <a className="tm-btn tm-btn--clear" href="/explore" onClick={goExplore}>
            {t.cta.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: HomeCopy }) {
  const L = t.foot.links;
  return (
    <footer className="tm-foot">
      <div className="tm-wrap tm-foot__inner">
        <div className="tm-foot__brand">
          <a
            href="/"
            aria-label="Back to top"
            onClick={(event) => {
              event.preventDefault();
              smoothJump("top");
            }}
          >
            <Wordmark variant="foot" />
          </a>
          <p className="tm-foot__tag">{t.foot.tagline}</p>
          <div className="tm-foot__lang-note">{t.foot.supportedRegions}</div>
        </div>
        <nav className="tm-foot__cols" aria-label="Footer">
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colExplore}</p>
            <a href="/explore" onClick={goExplore}>{L.experiences}</a>
            <a href="/explore" onClick={goExplore}>{L.plan}</a>
          </div>
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colAbout}</p>
            <a href="mailto:hello@tailormoments.com.au">{L.contact}</a>
            <a
              href="#trust"
              onClick={(event) => {
                event.preventDefault();
                smoothJump("trust");
              }}
            >
              {L.wineries}
            </a>
          </div>
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colPartners}</p>
            <a href="/partner/wineries">{L.wineryPortal}</a>
            <a href="/partner/transport">{L.transportPortal}</a>
            <a href="/partner/login" className="tm-foot__signin">{t.foot.partnerSignIn}</a>
          </div>
        </nav>
      </div>
      <div className="tm-wrap tm-foot__base">
        <p className="tm-foot__note">{t.foot.note}</p>
        <p className="tm-foot__rights">© {new Date().getFullYear()} Tailor Moments. {t.foot.rights}</p>
      </div>
    </footer>
  );
}

export function MarketingHome() {
  const [lang, setLang] = useState<HomeLang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY) as HomeLang | null;
    if (stored && HOME_LANG_ORDER.includes(stored)) {
      setLang(stored);
    }
  }, []);

  function handleLang(code: HomeLang) {
    setLang(code);
    window.localStorage.setItem(LOCALE_KEY, code);
  }

  const t = getHomeCopy(lang);
  const script = t.script ?? "latin";

  return (
    <div className="tm-root" data-lang={lang} data-script={script}>
      <Nav t={t} lang={lang} onLang={handleLang} />
      <Hero t={t} />
      <HowItWorks t={t} />
      <Differentiators t={t} />
      <Experiences t={t} />
      <ItineraryPreview t={t} />
      <Testimonials t={t} />
      <Location t={t} />
      <Cta t={t} />
      <Footer t={t} />
    </div>
  );
}
