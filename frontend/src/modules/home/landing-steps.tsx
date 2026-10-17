import { ArrowRight, CalendarDays, ListChecks, UserRoundCheck } from 'lucide-react'

import { HomeAuthLink } from './home-auth-actions'
import { HOW_IT_WORKS_STEPS, LANDING_ANCHORS } from './landing-content'
import { landingContainer } from './landing-styles'
import './lower-landing.css'

const stepIcons = [UserRoundCheck, CalendarDays, ListChecks] as const

// La secuencia tiene una línea compartida: cuenta, preparación y seguimiento del mes.
// Los motivos son decorativos; no representan formularios ni controles disponibles en la landing.
export function LandingSteps() {
    return (
        <section id={LANDING_ANCHORS.howItWorks} aria-labelledby="steps-title" className="lower-landing lower-steps">
            <div className={landingContainer}>
                <div className="lower-section-heading">
                    <h2 id="steps-title" className="lower-heading">
                        Empieza con tu próximo mes.
                    </h2>
                    <HomeAuthLink destination="register" className="lower-text-action focus-ring">
                        Crear mi cuenta <ArrowRight className="size-[18px]" aria-hidden="true" />
                    </HomeAuthLink>
                </div>
                <ol className="lower-step-list">
                    {HOW_IT_WORKS_STEPS.map((step, index) => {
                        const Icon = stepIcons[index] ?? ListChecks

                        return (
                            <li key={step.title} className="lower-step">
                                <div className="lower-step__sequence" aria-hidden="true">
                                    <span className="lower-step__number">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="lower-step__connector" />
                                </div>
                                <div className={`lower-step__preview lower-step__preview--${index + 1}`} aria-hidden="true">
                                    <div className="lower-step__paper">
                                        <Icon className="lower-step__icon" strokeWidth={1.5} />
                                        <div className="lower-step__records">
                                            <span /><span /><span />
                                        </div>
                                    </div>
                                    <span className="lower-step__baseline" />
                                </div>
                                <h3 className="lower-step__title">
                                    <span className="sr-only">Paso {index + 1}: </span>
                                    {step.title}
                                </h3>
                                <p className="lower-step__body">{step.body}</p>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}
