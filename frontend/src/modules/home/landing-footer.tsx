import { ArrowUpRight } from 'lucide-react'

import { APP_ROUTES } from '@/shared/config/routes'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { HomeAuthLink } from './home-auth-actions'
import { FOOTER_PRODUCT_LINKS, LANDING_ANCHORS, SUPPORT_EMAIL } from './landing-content'
import { landingContainer } from './landing-styles'

// Cierre editorial con una acción principal y continuidad hacia la navegación del footer.
export function LandingFinalCta() {
    return (
        <section id={LANDING_ANCHORS.finalCta} aria-labelledby="final-title" className="lower-landing lower-final">
            <div className={landingContainer}>
                <div className="lower-final__layout">
                    <div className="lower-final__copy">
                        <h2 id="final-title" className="lower-heading">
                            Haz espacio para un mes más claro.
                        </h2>
                        <p>
                            Reúne tus ingresos, gastos y deudas. Empieza con tu hoja del mes y revisa tus números desde ahí.
                        </p>
                    </div>
                    <div className="lower-final__actions">
                        <HomeAuthLink destination="register" className="lower-primary-action focus-ring">
                            Crear mi cuenta <ArrowUpRight className="size-[18px]" aria-hidden="true" />
                        </HomeAuthLink>
                        <HomeAuthLink destination="login" className="lower-text-action focus-ring">
                            Iniciar sesión
                        </HomeAuthLink>
                        <p>Gratis por ahora.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

// Los borradores legales no se publican ni se enlazan hasta su aprobación e implementación.
export function LandingFooter() {
    return (
        <footer className="lower-footer">
            <div className={landingContainer}>
                <div className="lower-footer__grid">
                    <div className="lower-footer__brand">
                        <BrandLogo variant="full" size="sm" href={`${APP_ROUTES.home}#${LANDING_ANCHORS.hero}`} className="-ml-1.5 self-start" />
                        <p>Tus finanzas personales, organizadas mes a mes.</p>
                    </div>
                    <nav aria-labelledby="footer-product" className="lower-footer__column">
                        <p id="footer-product" className="lower-footer__title">Producto</p>
                        {FOOTER_PRODUCT_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className="lower-footer__link focus-ring">
                                {link.label}
                            </a>
                        ))}
                    </nav>
                    <nav aria-labelledby="footer-account" className="lower-footer__column">
                        <p id="footer-account" className="lower-footer__title">Cuenta</p>
                        <HomeAuthLink destination="register" className="lower-footer__link focus-ring">
                            Crear mi cuenta
                        </HomeAuthLink>
                        <HomeAuthLink destination="login" className="lower-footer__link focus-ring">
                            Iniciar sesión
                        </HomeAuthLink>
                    </nav>
                    <nav aria-labelledby="footer-help" className="lower-footer__column lower-footer__help">
                        <p id="footer-help" className="lower-footer__title">Ayuda</p>
                        <a href={`#${LANDING_ANCHORS.faq}`} className="lower-footer__link focus-ring">
                            Preguntas frecuentes
                        </a>
                        <p className="lower-footer__support-label">Datos y soporte:</p>
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="lower-email-link focus-ring">
                            {SUPPORT_EMAIL}
                        </a>
                    </nav>
                </div>
                <div className="lower-footer__end">
                    <p>© {new Date().getFullYear()} FinTrack OS.</p>
                </div>
            </div>
        </footer>
    )
}
