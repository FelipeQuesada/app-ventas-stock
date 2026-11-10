import { Link, Navigate, useParams } from 'react-router-dom';
import { LandingLogo } from '../components/landing/LandingLogo';
import '../styles/landing.css';

const CONTACT_WHATSAPP = '5491157715316';
const CONTACT_EMAIL = 'hola@controlmas.com.ar';

type LegalSlug = 'contacto' | 'terminos' | 'privacidad' | 'cookies';

const TITLES: Record<LegalSlug, string> = {
  contacto: 'Contacto',
  terminos: 'Términos y condiciones',
  privacidad: 'Privacidad de los datos',
  cookies: 'Política de cookies',
};

function isLegalSlug(value: string | undefined): value is LegalSlug {
  return value === 'contacto' || value === 'terminos' || value === 'privacidad' || value === 'cookies';
}

export function LegalPage() {
  const { slug } = useParams();
  if (!isLegalSlug(slug)) return <Navigate to="/" replace />;

  return (
    <div className="lp lp-legal">
      <nav className="lp-nav is-scrolled">
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-logo-link">
            <LandingLogo />
          </Link>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-nav-login">
              Iniciar sesión
            </Link>
            <Link to="/register" className="lp-btn lp-btn-primary lp-nav-cta">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      <main className="lp-container lp-legal-main">
        <p className="lp-legal-back">
          <Link to="/">← Volver a Control+</Link>
        </p>
        <h1>{TITLES[slug]}</h1>
        <p className="lp-legal-updated">Última actualización: 9 de noviembre de 2026</p>

        {slug === 'contacto' ? <ContactContent /> : null}
        {slug === 'terminos' ? <TermsContent /> : null}
        {slug === 'privacidad' ? <PrivacyContent /> : null}
        {slug === 'cookies' ? <CookiesContent /> : null}
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-foot">
          <div>
            <LandingLogo />
            <br />
            Ventas y stock para comercios.
          </div>
          <div className="lp-foot-links">
            <Link to="/legal/contacto">Contacto</Link>
            <Link to="/legal/terminos">Términos</Link>
            <Link to="/legal/privacidad">Privacidad</Link>
            <Link to="/legal/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactContent() {
  return (
    <div className="lp-legal-body">
      <p>
        Si necesitás soporte, una demo o hablar de planes pagos, escribinos. Respondemos en horario
        hábil de Argentina.
      </p>
      <ul>
        <li>
          WhatsApp:{' '}
          <a href={`https://wa.me/${CONTACT_WHATSAPP}`} target="_blank" rel="noreferrer">
            +54 9 11 5771-5316
          </a>
        </li>
        <li>
          Email:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li>Sitio: https://controlmas.com.ar</li>
      </ul>
      <p>
        Para reclamos sobre datos personales, usá el mismo email con el asunto “Privacidad /
        ARCO”.
      </p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="lp-legal-body">
      <h2>1. Aceptación</h2>
      <p>
        Al crear una cuenta o usar Control+ aceptás estos términos. Si no estás de acuerdo, no uses
        el servicio.
      </p>
      <h2>2. El servicio</h2>
      <p>
        Control+ es un software de gestión de ventas, stock, caja y usuarios por marca (negocio).
        Algunas funciones dependen del plan contratado.
      </p>
      <h2>3. Cuenta y responsabilidad</h2>
      <p>
        Sos responsable de la confidencialidad de tus accesos y de la información que cargues
        (productos, ventas, clientes, etc.). Debés usar el servicio conforme a la ley argentina.
      </p>
      <h2>4. Planes y pagos</h2>
      <p>
        El plan gratuito puede tener límites. Los planes pagos se coordinan por los canales de
        contacto publicados. Los precios se expresan en pesos argentinos salvo indicación contraria.
      </p>
      <h2>5. Disponibilidad</h2>
      <p>
        Buscamos alta disponibilidad, pero el servicio puede interrumpirse por mantenimiento,
        fuerza mayor o fallas de terceros (hosting, internet, Firebase, etc.).
      </p>
      <h2>6. Propiedad intelectual</h2>
      <p>
        La marca Control+, el diseño y el código son de sus titulares. No podés copiarlos ni
        redistribuirlos sin autorización.
      </p>
      <h2>7. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, Control+ no responde por lucro cesante ni daños
        indirectos derivados del uso o la imposibilidad de uso del servicio.
      </p>
      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Para disputas, serán
        competentes los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, sin perjuicio
        de derechos del consumidor.
      </p>
      <h2>9. Contacto</h2>
      <p>
        Consultas: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="lp-legal-body">
      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento de los datos de la plataforma Control+ puede contactarse en{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, email, rol y marca.</li>
        <li>Datos operativos que cargás: productos, ventas, caja, clientes y documentos asociados.</li>
        <li>Datos técnicos: IP, dispositivo, logs de seguridad y uso del servicio.</li>
      </ul>
      <h2>3. Finalidades</h2>
      <p>
        Prestamos el servicio, autenticamos usuarios, damos soporte, mejoramos la plataforma y
        cumplimos obligaciones legales.
      </p>
      <h2>4. Base legal</h2>
      <p>
        Tratamos datos por ejecución del contrato de servicio, interés legítimo de seguridad y, cuando
        corresponda, consentimiento (por ejemplo, comunicaciones comerciales).
      </p>
      <h2>5. Encargados y proveedores</h2>
      <p>
        Usamos proveedores de infraestructura y autenticación (por ejemplo Firebase / Google Cloud)
        bajo contratos de tratamiento de datos. No vendemos tus datos personales.
      </p>
      <h2>6. Conservación</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa y el tiempo adicional exigido por ley o
        para defender derechos.
      </p>
      <h2>7. Derechos</h2>
      <p>
        Podés solicitar acceso, rectificación, actualización o baja de tus datos personales
        escribiendo a {CONTACT_EMAIL}, sujeto a verificaciones de identidad y excepciones legales.
      </p>
      <h2>8. Seguridad</h2>
      <p>
        Aplicamos controles de acceso por usuario/marca, cifrado en tránsito (HTTPS) y prácticas
        razonables de seguridad. Ningún sistema es 100% infalible.
      </p>
      <h2>9. Menores</h2>
      <p>El servicio está orientado a comercios y no está dirigido a menores de 18 años.</p>
      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política. La fecha de actualización figura al inicio de esta página.
      </p>
    </div>
  );
}

function CookiesContent() {
  return (
    <div className="lp-legal-body">
      <h2>1. Qué son</h2>
      <p>
        Usamos cookies y tecnologías similares para que el sitio funcione, mantener la sesión y
        entender el uso básico del producto.
      </p>
      <h2>2. Tipos</h2>
      <ul>
        <li>
          <b>Necesarias:</b> autenticación, seguridad y preferencias esenciales.
        </li>
        <li>
          <b>Analíticas (si se habilitan):</b> medición agregada de visitas y rendimiento.
        </li>
      </ul>
      <h2>3. Gestión</h2>
      <p>
        Podés borrar o bloquear cookies desde tu navegador. Si bloqueás las necesarias, algunas
        funciones (como iniciar sesión) pueden dejar de andar.
      </p>
      <h2>4. Más info</h2>
      <p>
        Sobre datos personales, leé la{' '}
        <Link to="/legal/privacidad">Política de privacidad</Link>.
      </p>
    </div>
  );
}
