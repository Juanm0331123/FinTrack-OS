import { ChevronDown } from 'lucide-react'

import { FAQ_ITEMS, LANDING_ANCHORS, SUPPORT_EMAIL } from './landing-content'
import { landingContainer } from './landing-styles'

const emailLinkClassName = 'lower-email-link focus-ring'

// Details nativo conserva teclado, foco y estado sin depender de JavaScript.
export function LandingFaq() {
    return (
        <section id={LANDING_ANCHORS.faq} aria-labelledby="faq-title" className="lower-landing lower-faq">
            <div className={`${landingContainer} lower-faq__layout`}>
                <div className="lower-faq__intro">
                    <h2 id="faq-title" className="lower-heading">
                        Antes de empezar.
                    </h2>
                    <div className="lower-faq__contact">
                        <p>¿Otra duda? Escribe a</p>
                        <a href={`mailto:${SUPPORT_EMAIL}`} className={emailLinkClassName}>
                            {SUPPORT_EMAIL}
                        </a>
                        <span className="sr-only">.</span>
                    </div>
                </div>
                <div className="lower-faq__items">
                    {FAQ_ITEMS.map((item, index) => (
                        <details key={item.question} open={index === 0} className="lower-faq__item">
                            <summary className="lower-faq__question focus-ring-inset">
                                <span>{item.question}</span>
                                <ChevronDown className="lower-faq__caret" aria-hidden="true" />
                            </summary>
                            <p className="lower-faq__answer">
                                {item.mentionsSupportEmail ? (
                                    <>
                                        Escribe a{' '}
                                        <a href={`mailto:${SUPPORT_EMAIL}`} className={emailLinkClassName}>
                                            {SUPPORT_EMAIL}
                                        </a>
                                        .{' '}
                                    </>
                                ) : null}
                                {item.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    )
}
