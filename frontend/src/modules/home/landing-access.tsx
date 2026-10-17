import { ArrowUpRight } from 'lucide-react'

import { HomeAuthLink } from './home-auth-actions'
import { LANDING_ANCHORS } from './landing-content'
import { landingContainer } from './landing-styles'

// La condición de acceso actual se presenta como una decisión clara, sin tarjetas de planes ficticios.
export function LandingAccess() {
    return (
        <section id={LANDING_ANCHORS.access} aria-labelledby="access-title" className="lower-landing lower-access">
            <div className={landingContainer}>
                <div className="lower-access__frame">
                    <div className="lower-access__statement">
                        <p className="lower-access__label">Acceso actual.</p>
                        <h2 id="access-title" className="lower-heading">
                            Gratis <span>por ahora.</span>
                        </h2>
                    </div>
                    <div className="lower-access__body">
                        <p>
                            Actualmente, el uso de FinTrack OS es gratuito. Queremos ofrecer planes de pago en el futuro,
                            pero todavía no hay precios, planes ni una fecha definidos.
                        </p>
                        <HomeAuthLink destination="register" className="lower-primary-action focus-ring">
                            Crear mi cuenta <ArrowUpRight className="size-[18px]" aria-hidden="true" />
                        </HomeAuthLink>
                    </div>
                </div>
            </div>
        </section>
    )
}
