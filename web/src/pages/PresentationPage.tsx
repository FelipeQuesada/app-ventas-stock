import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, Building2, Download } from 'lucide-react';
import { LandingLogo } from '../components/landing/LandingLogo';
import '../styles/landing.css';

const SCREENS = [
  { id: 'inicio', src: '/presentacion/screens/inicio.png', label: 'Inicio' },
  { id: 'ventas', src: '/presentacion/screens/ventas.png', label: 'Ventas' },
  { id: 'productos', src: '/presentacion/screens/productos.png', label: 'Productos' },
  { id: 'caja', src: '/presentacion/screens/caja.png', label: 'Caja' },
] as const;

type Slide =
  | { kind: 'pdf'; n: number; src: string; label: string }
  | { kind: 'screens'; n: number; src: string; label: string };

const SLIDES: Slide[] = [
  { kind: 'pdf', n: 1, src: '/presentacion/slide-01.jpg', label: 'Portada' },
  { kind: 'pdf', n: 2, src: '/presentacion/slide-02.jpg', label: 'Marca' },
  { kind: 'pdf', n: 3, src: '/presentacion/slide-03.jpg', label: 'Identidad visual' },
  { kind: 'pdf', n: 4, src: '/presentacion/slide-04.jpg', label: 'Misión y visión' },
  { kind: 'pdf', n: 5, src: '/presentacion/slide-05.jpg', label: 'Problemática' },
  { kind: 'pdf', n: 6, src: '/presentacion/slide-06.jpg', label: 'El problema' },
  { kind: 'pdf', n: 7, src: '/presentacion/slide-07.jpg', label: 'Motivación' },
  { kind: 'pdf', n: 8, src: '/presentacion/slide-08.jpg', label: 'Solución' },
  { kind: 'pdf', n: 9, src: '/presentacion/slide-09.jpg', label: 'Principales soluciones' },
  { kind: 'pdf', n: 10, src: '/presentacion/slide-10.jpg', label: 'Funcionalidades' },
  { kind: 'pdf', n: 11, src: '/presentacion/slide-11.jpg', label: 'Mobile first' },
  {
    kind: 'screens',
    n: 12,
    src: '/presentacion/slide-screens.jpg',
    label: 'Pantallas principales',
  },
  { kind: 'pdf', n: 13, src: '/presentacion/slide-12.jpg', label: 'Datos y seguridad' },
  { kind: 'pdf', n: 14, src: '/presentacion/slide-13.jpg', label: 'Planes' },
  { kind: 'pdf', n: 15, src: '/presentacion/slide-14.jpg', label: 'Modelo de negocio' },
  { kind: 'pdf', n: 16, src: '/presentacion/slide-15.jpg', label: 'Empezá ya' },
  { kind: 'pdf', n: 17, src: '/presentacion/slide-16.jpg', label: 'Clientes' },
  { kind: 'pdf', n: 18, src: '/presentacion/slide-17.jpg', label: 'Gracias' },
];

const SLIDE_COUNT = SLIDES.length;
const PDF_HREF = '/presentacion/control-plus-tesis.pdf';
const MOBILE_SLIDE_INDEX = 10; // Mobile first

function PhoneMockup({
  src,
  label,
  className = '',
}: {
  src: string;
  label: string;
  className?: string;
}) {
  return (
    <figure className={`lp-phone-mock ${className}`.trim()}>
      <div className="lp-phone-mock-shell">
        <span className="lp-phone-mock-island" aria-hidden="true" />
        <img src={src} alt={`Pantalla ${label} de Control+`} loading="lazy" draggable={false} />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function PresentationPage() {
  const [index, setIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        go(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        go(SLIDE_COUNT - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setShowTop(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = thumbsRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLButtonElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  useEffect(() => {
    for (const offset of [-1, 1, 2]) {
      const n = index + offset;
      if (n < 0 || n >= SLIDE_COUNT) continue;
      const img = new Image();
      img.src = SLIDES[n].src;
    }
  }, [index]);

  const slide = SLIDES[index];
  const showMobileMock = index === MOBILE_SLIDE_INDEX;

  return (
    <div className="lp lp-pres">
      <nav className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo-link">
            <LandingLogo />
          </Link>
          <div className="lp-nav-links">
            <Link to="/">Inicio</Link>
            <Link to="/#funciones">Funciones</Link>
            <Link to="/#planes">Planes</Link>
            <span className="lp-nav-current" aria-current="page">
              Presentación
            </span>
          </div>
          <div className="lp-nav-actions">
            <a
              href={PDF_HREF}
              className="lp-nav-login"
              download="Control-Plus-Tesis-Felipe-Quesada.pdf"
            >
              Descargar PDF
            </a>
            <Link to="/register" className="lp-btn lp-btn-primary lp-nav-cta">
              Probar gratis
            </Link>
            <Link to="/register" className="lp-btn lp-btn-primary lp-nav-cta-desktop">
              Probar gratis
            </Link>
          </div>
        </div>
      </nav>

      <main className="lp-pres-deck">
        <div className="lp-container">
          <header className="lp-pres-deck-head">
            <div>
              <p className="lp-pres-kicker">Trabajo final · Tesis</p>
              <h1>Presentación Control+</h1>
              <p className="lp-pres-deck-sub">
                Diapositivas de Felipe Quesada · {slide.label}
              </p>
            </div>
            <a href={PDF_HREF} className="lp-btn lp-btn-ghost" download>
              <Download size={18} />
              PDF
            </a>
          </header>

          <div className="lp-pres-stage">
            <button
              type="button"
              className="lp-pres-navbtn"
              aria-label="Diapositiva anterior"
              onClick={() => go(index - 1)}
            >
              <ArrowLeft size={22} />
            </button>

            <figure className="lp-pres-frame">
              <img
                key={slide.src}
                src={`${slide.src}?v=5`}
                alt={`Diapositiva ${slide.n}: ${slide.label}`}
                width={1800}
                height={1012}
                decoding="async"
              />
              {showMobileMock ? (
                <div className="lp-pres-frame-phone">
                  <PhoneMockup src={SCREENS[0].src} label="Inicio" />
                </div>
              ) : null}
              <figcaption>
                {slide.n} / {SLIDE_COUNT} · {slide.label}
              </figcaption>
            </figure>

            <button
              type="button"
              className="lp-pres-navbtn"
              aria-label="Diapositiva siguiente"
              onClick={() => go(index + 1)}
            >
              <ArrowRight size={22} />
            </button>
          </div>

          <div className="lp-pres-controls">
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => go(index - 1)}>
              Anterior
            </button>
            <div className="lp-pres-dots" role="tablist" aria-label="Diapositivas">
              {SLIDES.map((s, i) => (
                <button
                  key={`${s.kind}-${s.n}`}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${s.n}. ${s.label}`}
                  className={i === index ? 'is-active' : undefined}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => go(index + 1)}>
              Siguiente
            </button>
          </div>

          <div className="lp-pres-thumbs" ref={thumbsRef} aria-label="Miniaturas">
            {SLIDES.map((s, i) => (
              <button
                key={`${s.kind}-${s.n}`}
                type="button"
                data-active={i === index ? 'true' : 'false'}
                className={i === index ? 'is-active' : undefined}
                onClick={() => go(i)}
              >
                <img src={s.src} alt="" loading="lazy" width={320} height={180} />
                <span>
                  {s.n}. {s.label}
                </span>
              </button>
            ))}
          </div>

          <p className="lp-pres-hint">Usá ← → o Espacio para cambiar de diapositiva.</p>
        </div>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-foot">
          <div>
            <LandingLogo />
            <br />
            Ventas y stock para comercios.
          </div>
          <div className="lp-foot-links">
            <Link to="/">Inicio</Link>
            <Link to="/presentacion">Presentación</Link>
            <a href={PDF_HREF} download>
              Descargar PDF
            </a>
            <Link to="/legal/contacto">Contacto</Link>
          </div>
          <div className="lp-foot-meta">
            <Building2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            © {new Date().getFullYear()} Control+ · Tesis Felipe Quesada
          </div>
        </div>
      </footer>

      <button
        type="button"
        className={`lp-back-top${showTop ? ' is-visible' : ''}`}
        aria-label="Volver arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}
