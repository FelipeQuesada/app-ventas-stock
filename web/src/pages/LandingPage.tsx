import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Smartphone,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

const CONTACT_WHATSAPP = '5491157715316';

const PLANS = [
  {
    id: 'inicio',
    name: 'Inicio',
    monthly: 0,
    desc: 'Para kioscos y emprendedores que recién arrancan.',
    features: [
      { text: 'Hasta 300 productos', included: true },
      { text: 'Ventas y stock básico', included: true },
      { text: 'Caja con apertura y cierre', included: true },
      { text: 'Historial de 30 días', included: true },
      { text: '1 usuario administrador', included: true },
      { text: 'Avisos por Telegram', included: false },
      { text: 'Múltiples empleados', included: false },
      { text: 'Reportes PDF avanzados', included: false },
    ],
    cta: 'Empezar gratis',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 15000,
    desc: 'Para almacenes y tiendas con empleados y depósito.',
    features: [
      { text: 'Productos ilimitados', included: true },
      { text: 'Hasta 5 usuarios', included: true },
      { text: 'Roles y permisos', included: true },
      { text: 'Avisos por Telegram', included: true },
      { text: 'Depósito y central', included: true },
      { text: 'Borradores de venta', included: true },
      { text: 'Reportes PDF', included: true },
      { text: 'Historial ilimitado', included: true },
    ],
    cta: 'Probar Pro 14 días',
    popular: true,
  },
  {
    id: 'empresa',
    name: 'Empresa',
    monthly: 35000,
    desc: 'Para cadenas y comercios con varias sucursales.',
    features: [
      { text: 'Todo lo del plan Pro', included: true },
      { text: 'Usuarios ilimitados', included: true },
      { text: 'Múltiples sucursales', included: true },
      { text: 'Reportes avanzados y Excel', included: true },
      { text: 'Comparativa entre sucursales', included: true },
      { text: 'Soporte prioritario por WhatsApp', included: true },
      { text: 'Capacitación inicial', included: true },
      { text: 'Integración con API propia', included: true },
    ],
    cta: 'Hablar con ventas',
    popular: false,
  },
] as const;

function formatPrice(amount: number): string {
  if (amount === 0) return '$0';
  return amount.toLocaleString('es-AR');
}

function whatsappUrl(planName: string): string {
  const text = encodeURIComponent(
    `Hola, quiero info del plan ${planName} de Control+ (ventas y stock).`
  );
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${text}`;
}

function useReveal(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const nodes = document.querySelectorAll('.lp-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    nodes.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [enabled]);
}

function useHeroCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let points: { x: number; y: number; vx: number; vy: number }[] = [];
    const count = 70;
    const link = 140;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const t = performance.now() / 6000;
      const gx = width * (0.5 + 0.3 * Math.cos(t));
      const gy = height * (0.4 + 0.2 * Math.sin(t * 1.3));
      const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(width, height) * 0.55);
      gradient.addColorStop(0, 'rgba(124,92,255,.22)');
      gradient.addColorStop(0.5, 'rgba(79,140,255,.08)');
      gradient.addColorStop(1, 'rgba(11,15,26,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      if (!reduced) {
        points.forEach((point) => {
          point.x += point.vx;
          point.y += point.vy;
          if (point.x < 0 || point.x > width) point.vx *= -1;
          if (point.y < 0 || point.y > height) point.vy *= -1;
        });
      }

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.hypot(dx, dy);
          if (d < link) {
            ctx.strokeStyle = `rgba(143,180,255,${(1 - d / link) * 0.25})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = 'rgba(190,210,255,.6)';
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, enabled]);
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const showLanding = !loading && !user;

  useHeroCanvas(canvasRef, showLanding);
  useReveal(showLanding);

  useEffect(() => {
    if (!showLanding) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showLanding]);

  useEffect(() => {
    document.title = 'Control+ | Sistema de ventas, stock y caja para comercios';
    const desc =
      'Control+ es el sistema de ventas e inventario para kioscos, almacenes y tiendas. Registrá ventas, controlá stock y cerrá la caja sin planillas.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, []);

  const perLabel = useMemo(
    () => (yearly ? 'Facturado anualmente (20% off)' : 'Facturado mensualmente'),
    [yearly]
  );

  if (loading) return <div className="loading-screen">Cargando…</div>;
  if (user) return <Navigate to="/app" replace />;

  return (
    <div className="lp">
      <nav className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <a href="#inicio" className="lp-logo">
            Control<span>+</span>
          </a>
          <div className="lp-nav-links">
            <a href="#funciones">Funciones</a>
            <a href="#como">Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#faq">Preguntas</a>
          </div>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-nav-login">
              Iniciar sesión
            </Link>
            <Link to="/register" className="lp-btn lp-btn-primary lp-nav-cta">
              Registrarse
            </Link>
            <a href="#planes" className="lp-btn lp-btn-primary lp-nav-cta-desktop">
              Probar gratis
            </a>
          </div>
        </div>
      </nav>

      <header className="lp-hero" id="inicio">
        <canvas ref={canvasRef} className="lp-hero-canvas" aria-hidden="true" />
        <div className="lp-container lp-hero-grid">
          <div>
            <span className="lp-badge">
              <i /> Nuevo: notificaciones por Telegram en tiempo real
            </span>
            <h1>
              Vendé, controlá tu stock y <span className="grad">cerrá tu caja</span> sin planillas
            </h1>
            <p className="lp-hero-lead">
              Control+ es el sistema de ventas y gestión de inventario pensado para kioscos,
              almacenes, tiendas y negocios con varios empleados. Registrá cada venta en segundos,
              sabé qué te queda y controlá cada peso que entra y sale.
            </p>
            <div className="lp-hero-cta">
              <a href="#planes" className="lp-btn lp-btn-primary lp-btn-lg">
                Empezar gratis →
              </a>
              <a href="#funciones" className="lp-btn lp-btn-ghost lp-btn-lg">
                Ver funciones
              </a>
            </div>
            <div className="lp-hero-stats">
              <div>
                <strong>+40%</strong>
                <span>menos tiempo en cierres de caja</span>
              </div>
              <div>
                <strong>0</strong>
                <span>planillas de Excel necesarias</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>tu stock en tiempo real</span>
              </div>
            </div>
          </div>

          <div className="lp-phone-wrap" aria-hidden="true">
            <div className="lp-float-card lp-fc1">
              <b>$ 440.600</b>
              <span>Recaudación del mes</span>
            </div>
            <div className="lp-float-card lp-fc2">
              <b>268 productos</b>
              <span>con stock bajo</span>
            </div>
            <div className="lp-phone">
              <div className="lp-screen lp-screen-app">
                <div className="lp-app">
                  <div className="lp-app-card">
                    <span>RECAUDACIÓN DEL MES</span>
                    <strong>$ 440.600</strong>
                    <small>16 ventas este mes</small>
                  </div>
                  <div className="lp-app-card">
                    <span>TICKET PROMEDIO</span>
                    <strong>$ 27.538</strong>
                    <small>Promedio del mes actual</small>
                  </div>
                  <div className="lp-app-card">
                    <span>PRODUCTOS</span>
                    <strong>490</strong>
                    <small>268 con stock bajo</small>
                  </div>
                  <div className="lp-app-chart-card">
                    <b>Ventas últimos 30 días</b>
                    <small>Recaudación diaria</small>
                    <svg className="lp-app-chart" viewBox="0 0 280 120" preserveAspectRatio="none">
                      <g className="lp-app-grid">
                        <line x1="36" y1="12" x2="270" y2="12" />
                        <line x1="36" y1="40" x2="270" y2="40" />
                        <line x1="36" y1="68" x2="270" y2="68" />
                        <line x1="36" y1="96" x2="270" y2="96" />
                      </g>
                      <text x="4" y="16" className="lp-app-axis">
                        1.200.000
                      </text>
                      <text x="4" y="44" className="lp-app-axis">
                        900.000
                      </text>
                      <text x="4" y="72" className="lp-app-axis">
                        600.000
                      </text>
                      <text x="4" y="100" className="lp-app-axis">
                        300.000
                      </text>
                      <path
                        className="lp-app-line"
                        d="M40 88 C58 86, 70 84, 82 78 C96 70, 108 42, 122 38 C136 34, 148 58, 162 62 C176 66, 188 48, 202 28 C216 10, 228 18, 242 22 C252 24, 260 48, 268 72"
                      />
                    </svg>
                    <div className="lp-app-x">
                      <span>11/10</span>
                      <span>15/10</span>
                      <span>19/10</span>
                      <span>23/10</span>
                      <span>27/10</span>
                      <span>31/10</span>
                      <span>04/11</span>
                      <span>09/11</span>
                    </div>
                  </div>
                  <div className="lp-app-dock">
                    <span className="is-active">
                      <LayoutDashboard size={16} />
                      Inicio
                    </span>
                    <span>
                      <ShoppingCart size={16} />
                      Ventas
                    </span>
                    <span>
                      <Package size={16} />
                      Productos
                    </span>
                    <span>
                      <Wallet size={16} />
                      Caja
                    </span>
                    <span>
                      <MoreHorizontal size={16} />
                      Más
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="lp-section" id="funciones">
        <div className="lp-container">
          <div className="lp-center lp-reveal">
            <div className="lp-eyebrow">Para qué sirve</div>
            <h2 className="lp-section-title">Todo tu negocio, en una sola app</h2>
            <p className="lp-section-sub">
              Control+ conecta el mostrador, el depósito y la caja. Lo que vendés descuenta stock
              solo, y lo que cobrás queda registrado.
            </p>
          </div>

          <div className="lp-alt lp-reveal">
            <div className="lp-alt-text">
              <h3>Ventas rápidas desde el celular</h3>
              <p>
                Armá la venta, elegí el medio de pago y cerrala. Si el cliente todavía no pagó,
                guardala como <b>borrador</b> y retomala cuando pase por caja.
              </p>
              <ul className="lp-checks">
                <li>Búsqueda por nombre o código</li>
                <li>Borradores de venta para cobrar después</li>
                <li>Efectivo, débito, crédito y transferencia</li>
                <li>Historial con fecha local correcta</li>
              </ul>
            </div>
            <div className="lp-visual lp-visual-app">
              <div className="lp-sale-mock">
                <div className="lp-caja-head">
                  <b>Nueva venta</b>
                  <small>Productos seleccionados (2)</small>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-sale-line">
                    <div>
                      <strong>Bebida 500ml</strong>
                      <small>2 un. · $ 1.800 c/u</small>
                    </div>
                    <b>$ 3.600</b>
                  </div>
                  <div className="lp-caja-divider" />
                  <div className="lp-sale-line">
                    <div>
                      <strong>Snack pack</strong>
                      <small>1 un. · $ 1.200 c/u</small>
                    </div>
                    <b>$ 1.200</b>
                  </div>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-sale-line">
                    <div>
                      <strong>Borrador · Pedido 3</strong>
                      <small className="is-warn">Pendiente de cobro</small>
                    </div>
                    <span className="lp-stock-badge is-warn">Borrador</span>
                  </div>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-caja-row is-highlight">
                    <span>Total a cobrar</span>
                    <strong>$ 4.800</strong>
                  </div>
                </div>
                <div className="lp-caja-btn">Registrar venta</div>
              </div>
            </div>
          </div>

          <div className="lp-alt is-rev lp-reveal">
            <div className="lp-alt-text">
              <h3>Stock que se actualiza solo</h3>
              <p>
                Cada venta descuenta del inventario. Cuando un producto llega al mínimo, Control+ te
                avisa para que no te quedes sin mercadería.
              </p>
              <ul className="lp-checks">
                <li>Alertas de stock bajo</li>
                <li>Movimientos depósito ↔ central</li>
                <li>Ajustes con motivo registrado</li>
                <li>Stock disponible en tiempo real</li>
              </ul>
            </div>
            <div className="lp-visual lp-visual-app">
              <div className="lp-stock-mock">
                <div className="lp-caja-head">
                  <b>Stock</b>
                  <small>Disponible y alertas de mínimo</small>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-stock-row">
                    <div>
                      <strong>Producto A · 1kg</strong>
                      <small>Stock normal</small>
                    </div>
                    <span className="lp-stock-badge">18 u.</span>
                  </div>
                  <div className="lp-stock-meter">
                    <i style={{ width: '72%' }} />
                  </div>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-stock-row">
                    <div>
                      <strong>Producto B · 1.5L</strong>
                      <small className="is-warn">Stock bajo</small>
                    </div>
                    <span className="lp-stock-badge is-warn">2 u.</span>
                  </div>
                  <div className="lp-stock-meter">
                    <i className="is-warn" style={{ width: '14%' }} />
                  </div>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-stock-row">
                    <div>
                      <strong>Producto C · pack</strong>
                      <small>Stock normal</small>
                    </div>
                    <span className="lp-stock-badge is-ok">40 u.</span>
                  </div>
                  <div className="lp-stock-meter">
                    <i className="is-ok" style={{ width: '88%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-alt lp-reveal">
            <div className="lp-alt-text">
              <h3>Caja y retiros bajo control</h3>
              <p>
                Cerrá el día como en la app: caja cambio, ventas en efectivo, ganancia, lo que
                transferís a central y el cambio que queda para mañana.
              </p>
              <ul className="lp-checks">
                <li>Caja cambio del día anterior</li>
                <li>Ventas efectivo + caja total</li>
                <li>Transferencias a caja central</li>
                <li>Cambio listo para el día siguiente</li>
              </ul>
            </div>
            <div className="lp-visual lp-visual-caja">
              <div className="lp-caja-mock">
                <div className="lp-caja-head">
                  <b>Caja del día</b>
                  <small>Resumen en efectivo</small>
                </div>
                <div className="lp-caja-card">
                  <div className="lp-caja-row">
                    <span>Caja cambio</span>
                    <strong>$ 20.000</strong>
                  </div>
                  <div className="lp-caja-divider" />
                  <div className="lp-caja-row">
                    <span>Ventas efectivo</span>
                    <strong>$ 44.200</strong>
                  </div>
                  <div className="lp-caja-divider" />
                  <div className="lp-caja-row">
                    <span>Caja total</span>
                    <strong>$ 64.200</strong>
                  </div>
                  <div className="lp-caja-divider" />
                  <div className="lp-caja-row is-highlight">
                    <span>Ganancia</span>
                    <strong className="is-ok">$ 44.200</strong>
                  </div>
                  <div className="lp-caja-divider" />
                  <div className="lp-caja-row is-highlight">
                    <span>Cambio para mañana</span>
                    <strong>$ 24.200</strong>
                  </div>
                </div>
                <div className="lp-caja-btn">Guardar cierre de caja</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-center lp-reveal">
            <div className="lp-eyebrow">Mejores funcionalidades</div>
            <h2 className="lp-section-title">Pensado para el día a día del comercio</h2>
          </div>
          <div className="lp-grid">
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <BarChart3 size={22} />
              </div>
              <h5>Dashboard en tiempo real</h5>
              <p>Ventas del día, tickets, caja y stock bajo en una sola pantalla.</p>
            </article>
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <Users size={22} />
              </div>
              <h5>Roles de empleado y admin</h5>
              <p>Cada uno ve lo que necesita. El admin controla precios, stock y reportes.</p>
            </article>
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <Bell size={22} />
              </div>
              <h5>Avisos por Telegram</h5>
              <p>Notificaciones de ventas, cierres de caja y retiros importantes.</p>
            </article>
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <Warehouse size={22} />
              </div>
              <h5>Depósito y central</h5>
              <p>Varias ubicaciones y pases de mercadería entre depósito y punto de venta.</p>
            </article>
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <FileText size={22} />
              </div>
              <h5>Reportes en PDF</h5>
              <p>Exportá ventas, movimientos y cierres para tu contador o archivo.</p>
            </article>
            <article className="lp-feat lp-reveal">
              <div className="ic">
                <Smartphone size={22} />
              </div>
              <h5>Web y celular</h5>
              <p>Desde el navegador o la app móvil, con los mismos datos sincronizados.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="lp-section" id="como">
        <div className="lp-container">
          <div className="lp-center lp-reveal">
            <div className="lp-eyebrow">Cómo funciona</div>
            <h2 className="lp-section-title">Empezá en menos de 10 minutos</h2>
            <p className="lp-section-sub">Sin instalaciones complicadas ni capacitaciones largas.</p>
          </div>
          <div className="lp-steps">
            <div className="lp-step lp-reveal">
              <div className="n">PASO 01</div>
              <h4>Creá tu cuenta</h4>
              <p>Registrá tu negocio y cargá tus productos o importá tu listado.</p>
            </div>
            <div className="lp-step lp-reveal">
              <div className="n">PASO 02</div>
              <h4>Sumá a tu equipo</h4>
              <p>Invitá empleados y asignales rol. Cada uno entra con su acceso.</p>
            </div>
            <div className="lp-step lp-reveal">
              <div className="n">PASO 03</div>
              <h4>Vendé y controlá</h4>
              <p>Cobrá, descontá stock y cerrá caja. Todo queda registrado.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="planes">
        <div className="lp-container">
          <div className="lp-center lp-reveal">
            <div className="lp-eyebrow">Planes</div>
            <h2 className="lp-section-title">Elegí el plan que crece con tu negocio</h2>
            <p className="lp-section-sub">
              Empezá gratis y pasá a un plan pago cuando lo necesites. El cobro online lo
              conectamos después; por ahora te dejamos WhatsApp.
            </p>
            <div className="lp-billing" role="group" aria-label="Facturación">
              <button
                type="button"
                className={!yearly ? 'is-on' : undefined}
                onClick={() => setYearly(false)}
              >
                Mensual
              </button>
              <button
                type="button"
                className={yearly ? 'is-on' : undefined}
                onClick={() => setYearly(true)}
              >
                Anual <span className="lp-save">-20%</span>
              </button>
            </div>
          </div>

          <div className="lp-plans">
            {PLANS.map((plan) => {
              const amount =
                plan.monthly === 0
                  ? 0
                  : yearly
                    ? Math.round(plan.monthly * 0.8)
                    : plan.monthly;
              return (
                <article
                  key={plan.id}
                  className={`lp-plan lp-reveal ${plan.popular ? 'is-pop' : ''}`}
                >
                  {plan.popular ? <div className="lp-ribbon">Más elegido</div> : null}
                  <h4>{plan.name}</h4>
                  <p className="lp-plan-desc">{plan.desc}</p>
                  <p className="lp-price">
                    {plan.monthly === 0 ? (
                      '$0'
                    ) : (
                      <>
                        ${formatPrice(amount)}
                        <small>/mes</small>
                      </>
                    )}
                  </p>
                  <p className="lp-plan-per">
                    {plan.monthly === 0 ? 'Para siempre · 1 usuario' : perLabel}
                  </p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature.text} className={feature.included ? undefined : 'is-off'}>
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                  <a
                    className={`lp-btn lp-btn-block ${plan.popular ? 'lp-btn-primary' : 'lp-btn-ghost'}`}
                    href={whatsappUrl(plan.name)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {plan.cta}
                  </a>
                </article>
              );
            })}
          </div>
          <p className="lp-note">
            Precios en pesos argentinos (ARS). Los planes pagos estarán disponibles próximamente.
          </p>
        </div>
      </section>

      <section className="lp-section" id="faq" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-center lp-reveal">
            <div className="lp-eyebrow">Preguntas frecuentes</div>
            <h2 className="lp-section-title">¿Tenés dudas?</h2>
          </div>
          <div className="lp-faq lp-reveal">
            <details>
              <summary>¿Necesito instalar algo?</summary>
              <p>No. Control+ funciona desde el navegador y también tiene versión para celular.</p>
            </details>
            <details>
              <summary>¿Puedo usarlo con varios empleados?</summary>
              <p>Sí. En Pro y Empresa podés invitar empleados con permisos distintos.</p>
            </details>
            <details>
              <summary>¿Cómo me llegan los avisos?</summary>
              <p>
                Conectás un bot de Telegram a tu cuenta y recibís notificaciones de ventas, cierres
                y retiros.
              </p>
            </details>
            <details>
              <summary>¿Qué pasa si se corta internet?</summary>
              <p>Podés seguir cargando ventas y los datos se sincronizan cuando vuelva la conexión.</p>
            </details>
            <details>
              <summary>¿Mis datos están seguros?</summary>
              <p>
                Se guardan en Firebase con control de acceso por usuario. Solo vos y tu equipo
                autorizado ven la información.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-cta lp-reveal">
            <h2 className="lp-section-title" style={{ marginBottom: 14 }}>
              Empezá a controlar tu negocio hoy
            </h2>
            <p className="lp-section-sub" style={{ margin: '0 auto 32px' }}>
              Escribinos por el plan que te interesa y te dejamos listo el acceso.
            </p>
            <a
              className="lp-btn lp-btn-primary lp-btn-lg"
              href={whatsappUrl('Pro')}
              target="_blank"
              rel="noreferrer"
            >
              Hablar por WhatsApp →
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-foot">
          <div>
            <span className="lp-logo">
              Control<span>+</span>
            </span>
            <br />
            Ventas y stock para comercios.
          </div>
          <div className="lp-foot-meta">
            <Building2 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            © {new Date().getFullYear()} Control+ · Todos los derechos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
