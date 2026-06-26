"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocale, setLocale, type AppLocale } from "@/lib/locale";
import {
  HOME_I18N,
  HOME_LOCALES,
  type HomeCopy,
} from "@/components/home/home-i18n";
import "./home.css";

function smoothJump(key: string) {
  if (typeof window === "undefined") {
    return;
  }
  if (key === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.getElementById(key);
  if (!el) {
    return;
  }
  const y = el.getBoundingClientRect().top + window.scrollY - 64;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
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

type NavProps = {
  t: HomeCopy;
  locale: AppLocale;
  onLocale: (code: AppLocale) => void;
  onPlan: () => void;
};

function Nav({ t, locale, onLocale, onPlan }: NavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentLabel = HOME_LOCALES.find((entry) => entry.code === locale)?.label ?? "English";

  const items = [
    { key: "experiences", label: t.nav.experiences },
    { key: "how", label: t.nav.how },
    { key: "plan", label: t.nav.plan, isPlan: true },
  ];

  return (
    <header className={`tm-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="tm-nav__inner">
        <button
          type="button"
          className="tm-nav__link"
          style={{ padding: 0, background: "transparent" }}
          onClick={() => smoothJump("top")}
          aria-label="Tailor Moments home"
        >
          <Wordmark variant="nav" />
        </button>

        <nav className={`tm-nav__links ${open ? "is-open" : ""}`} aria-label="Primary">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className="tm-nav__link"
              onClick={() => {
                setOpen(false);
                if (it.isPlan) {
                  onPlan();
                } else {
                  smoothJump(it.key);
                }
              }}
            >
              {it.label}
            </button>
          ))}
          <button
            type="button"
            className="tm-nav__link tm-nav__link--drawer-cta"
            onClick={() => {
              setOpen(false);
              onPlan();
            }}
          >
            {t.nav.plan}
          </button>
        </nav>

        <div className="tm-nav__actions">
          <div className="tm-lang">
            <button
              type="button"
              className="tm-lang__btn"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              onClick={() => setLangOpen((v) => !v)}
            >
              <span className="tm-lang__globe" aria-hidden="true">
                ◍
              </span>
              <span className="tm-lang__current">{currentLabel}</span>
              <span className="tm-lang__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            {langOpen ? (
              <ul className="tm-lang__menu" role="listbox">
                {HOME_LOCALES.map((entry) => (
                  <li key={entry.code} role="option" aria-selected={entry.code === locale}>
                    <button
                      type="button"
                      className={`tm-lang__opt ${entry.code === locale ? "is-active" : ""}`}
                      onClick={() => {
                        onLocale(entry.code);
                        setLangOpen(false);
                      }}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            className="tm-btn tm-btn--primary tm-btn--sm tm-nav__planday"
            onClick={onPlan}
          >
            {t.nav.plan}
          </button>
          <button
            type="button"
            className={`tm-nav__burger ${open ? "is-open" : ""}`}
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ t, onPlan }: { t: HomeCopy; onPlan: () => void }) {
  const h = t.hero;
  return (
    <section className="tm-hero tm-hero--b" id="top">
      <div className="tm-hero__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-vineyard.jpg" alt="" className="tm-hero__img" />
        <div className="tm-hero__scrim" />
        <div className="tm-hero__vignette" />
      </div>

      <div className="tm-hero__inner tm-hero__inner--b">
        <p className="tm-kicker tm-kicker--light tm-kicker--center">{h.eyebrow}</p>
        <h1 className="tm-hero__title tm-display">{h.title}</h1>
        {h.em ? <p className="tm-hero__em tm-foil">{h.em}</p> : null}
        <p className="tm-hero__sub">{h.sub}</p>
        <div className="tm-hero__actions">
          <button type="button" className="tm-btn tm-btn--primary" onClick={onPlan}>
            {h.cta}
          </button>
          <button
            type="button"
            className="tm-btn tm-btn--clear"
            onClick={() => smoothJump("how")}
          >
            {h.ghost} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className="tm-hero__scroll"
        aria-label="Scroll"
        onClick={() => smoothJump("how")}
      >
        <span className="tm-hero__scrollline" />
      </button>
    </section>
  );
}

function HowItWorks({ t, onPlan }: { t: HomeCopy; onPlan: () => void }) {
  return (
    <section className="tm-how tm-section" id="how">
      <div className="tm-wrap">
        <header className="tm-sec-head">
          <p className="tm-kicker">{t.how.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{t.how.title}</h2>
        </header>
        <ol className="tm-steps">
          {t.how.steps.map((s) => (
            <li className="tm-step" key={s.n}>
              <span className="tm-step__num tm-foil">{s.n}</span>
              <h3 className="tm-step__title">{s.title}</h3>
              <p className="tm-step__body">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="tm-how__cta">
          <button type="button" className="tm-btn tm-btn--primary" onClick={onPlan}>
            {t.cta.primary}
          </button>
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
          {t.diff.items.map((item) => (
            <div className="tm-diff__item" key={item.label}>
              <span className="tm-diff__icon" aria-hidden="true">
                {item.icon}
              </span>
              <h3 className="tm-diff__label">{item.label}</h3>
              <p className="tm-diff__body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Placeholder({ label, tint }: { label: string; tint: "a" | "b" | "c" }) {
  return (
    <div className={`tm-ph tm-ph--${tint}`} role="img" aria-label={label}>
      <div className="tm-ph__weave" aria-hidden="true" />
      <span className="tm-ph__tag">{label}</span>
    </div>
  );
}

function FeaturedExperiences({ t, onPlan }: { t: HomeCopy; onPlan: () => void }) {
  const tints: Array<"a" | "b" | "c"> = ["a", "b", "c"];
  const labels = [
    "CELLAR DOOR · GOLDEN HOUR",
    "TASTING ROOM · STILL LIFE",
    "PRIVATE CAR · VINEYARD ROAD",
  ];
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
          {t.exp.cards.map((card, i) => (
            <article className="tm-exp__card tm-exp__card--stagger" key={card.title}>
              <div className="tm-exp__media">
                <Placeholder label={labels[i]} tint={tints[i]} />
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
                  <button type="button" className="tm-exp__link" onClick={onPlan}>
                    {t.exp.cta} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ItineraryPreview({ t, onPlan }: { t: HomeCopy; onPlan: () => void }) {
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
            {p.stops.map((stop) => (
              <div className="tm-itin__stop" key={`${stop.time}-${stop.name}`}>
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
            <button type="button" className="tm-btn tm-btn--primary" onClick={onPlan}>
              {p.cta}
            </button>
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
          {tst.quotes.map((q, i) => (
            <figure className={`tm-testi__card tm-testi__card--${i}`} key={q.name}>
              <span className="tm-testi__mark tm-foil" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="tm-testi__quote tm-display">{q.quote}</blockquote>
              <figcaption className="tm-testi__cap">
                <span className="tm-testi__name">{q.name}</span>
                <span className="tm-testi__city">{q.city}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LocationContext({ t }: { t: HomeCopy }) {
  const loc = t.location;
  return (
    <section className="tm-loc">
      <div className="tm-wrap tm-loc__inner">
        <div className="tm-loc__copy">
          <p className="tm-kicker">{loc.eyebrow}</p>
          <h2 className="tm-sec-title tm-display">{loc.title}</h2>
          <p className="tm-loc__body">{loc.body}</p>
          <div className="tm-loc__stats">
            {loc.stats.map((s) => (
              <div className="tm-loc__stat" key={s.label}>
                <span className="tm-loc__num tm-foil">{s.num}</span>
                <span className="tm-loc__label">{s.label}</span>
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
            <path
              d="M110 195 Q103 218 96 243"
              stroke="var(--tm-accent)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="110" cy="195" r="5" fill="var(--tm-teal)" />
            <text x="120" y="199" fontSize="11" fill="var(--tm-muted)" fontFamily="Inter,sans-serif">
              Perth
            </text>
            <circle cx="96" cy="243" r="7" fill="var(--tm-accent)" />
            <circle cx="96" cy="243" r="12" fill="var(--tm-accent)" fillOpacity="0.18" />
            <text
              x="108"
              y="240"
              fontSize="10"
              fill="var(--tm-ink)"
              fontFamily="Inter,sans-serif"
              fontWeight="600"
            >
              Margaret River
            </text>
            <text
              x="66"
              y="225"
              fontSize="9"
              fill="var(--tm-muted)"
              fontFamily="Inter,sans-serif"
              transform="rotate(-14 66 225)"
            >
              270 km · 3 hrs
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}

function SoftCta({ t, onPlan }: { t: HomeCopy; onPlan: () => void }) {
  return (
    <section className="tm-cta tm-section">
      <div className="tm-cta__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-cta.jpg" alt="" className="tm-cta__img" />
        <div className="tm-cta__scrim" />
      </div>
      <div className="tm-wrap tm-cta__inner">
        <p className="tm-kicker tm-kicker--light tm-kicker--center">{t.cta.eyebrow}</p>
        <h2 className="tm-cta__title tm-display">{t.cta.title}</h2>
        <p className="tm-cta__sub">{t.cta.sub}</p>
        <div className="tm-cta__actions">
          <button type="button" className="tm-btn tm-btn--primary tm-btn--lg" onClick={onPlan}>
            {t.cta.primary}
          </button>
          <button type="button" className="tm-btn tm-btn--clear" onClick={onPlan}>
            {t.cta.secondary}
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer({
  t,
  onPlan,
  onNavigate,
}: {
  t: HomeCopy;
  onPlan: () => void;
  onNavigate: (path: string) => void;
}) {
  const L = t.foot.links;
  return (
    <footer className="tm-foot">
      <div className="tm-wrap tm-foot__inner">
        <div className="tm-foot__brand">
          <button
            type="button"
            className="tm-foot__brandlink"
            onClick={() => smoothJump("top")}
            aria-label="Back to top"
          >
            <Wordmark variant="foot" />
          </button>
          <p className="tm-foot__tag">{t.foot.tagline}</p>
          <div className="tm-foot__lang-note">{t.foot.supportedRegions}</div>
        </div>
        <nav className="tm-foot__cols" aria-label="Footer">
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colExplore}</p>
            <a role="button" tabIndex={0} onClick={onPlan} onKeyDown={(e) => e.key === "Enter" && onPlan()}>
              {L.experiences}
            </a>
            <a role="button" tabIndex={0} onClick={onPlan} onKeyDown={(e) => e.key === "Enter" && onPlan()}>
              {L.plan}
            </a>
          </div>
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colAbout}</p>
            <a
              role="button"
              tabIndex={0}
              onClick={() => smoothJump("trust")}
              onKeyDown={(e) => e.key === "Enter" && smoothJump("trust")}
            >
              {L.wineries}
            </a>
            <a href="mailto:hello@tailormoments.com.au">{L.contact}</a>
          </div>
          <div className="tm-foot__col">
            <p className="tm-foot__head">{t.foot.colPartners}</p>
            <a
              role="button"
              tabIndex={0}
              onClick={() => onNavigate("/partner/wineries")}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("/partner/wineries")}
            >
              {L.wineryPortal}
            </a>
            <a
              role="button"
              tabIndex={0}
              onClick={() => onNavigate("/partner/transport")}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("/partner/transport")}
            >
              {L.transportPortal}
            </a>
            <a
              role="button"
              tabIndex={0}
              className="tm-foot__signin"
              onClick={() => onNavigate("/partner/login")}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("/partner/login")}
            >
              {t.foot.partnerSignIn}
            </a>
          </div>
        </nav>
      </div>
      <div className="tm-wrap tm-foot__base">
        <p className="tm-foot__note">{t.foot.note}</p>
        <p className="tm-foot__rights">
          © {new Date().getFullYear()} Tailor Moments. {t.foot.rights}
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AppLocale>("en");

  useEffect(() => {
    setLocaleState(getLocale());
  }, []);

  const changeLocale = useCallback((code: AppLocale) => {
    setLocale(code);
    setLocaleState(code);
  }, []);

  const goExplore = useCallback(() => {
    router.push("/explore");
  }, [router]);

  const goTo = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const t = HOME_I18N[locale] ?? HOME_I18N.en;
  const script = locale === "zh-Hans" ? "cjk" : "latin";

  return (
    <div className="tm-root" data-lang={locale} data-script={script}>
      <Nav t={t} locale={locale} onLocale={changeLocale} onPlan={goExplore} />
      <main>
        <Hero t={t} onPlan={goExplore} />
        <HowItWorks t={t} onPlan={goExplore} />
        <Differentiators t={t} />
        <FeaturedExperiences t={t} onPlan={goExplore} />
        <ItineraryPreview t={t} onPlan={goExplore} />
        <Testimonials t={t} />
        <LocationContext t={t} />
        <SoftCta t={t} onPlan={goExplore} />
      </main>
      <Footer t={t} onPlan={goExplore} onNavigate={goTo} />
    </div>
  );
}
