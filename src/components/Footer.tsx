// src/components/Footer.tsx

export default function Footer() {
  return (
    <footer className="header-gradient mt-12 py-6 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-start gap-3">

        {/* Redes sociales / Contacto */}
        <div className="flex items-center gap-4">

          {/* WhatsApp */}
          <a
            href="https://wa.me/573017307974"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/40 text-white rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            title="Contáctanos por WhatsApp"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.845L.057 23.43a.75.75 0 0 0 .906.975l5.808-1.52A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.705 9.705 0 0 1-4.953-1.355l-.355-.21-3.683.964.981-3.584-.23-.368A9.705 9.705 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            <span>¿Te Ayudamos?</span>
          </a>

          {/* Facebook */}
          <a
            href="https://www.facebook.com/share/17t7NbSkQs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/40 text-white rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            title="Síguenos en Facebook"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </a>

        </div>

        {/* Copyright */}
        <p className="text-white/80 text-sm">
          © {new Date().getFullYear()} EsteticaProHub. Todos los derechos reservados.
        </p>

      </div>
    </footer>
  );
}