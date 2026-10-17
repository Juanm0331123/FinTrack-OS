import { LandingAccess } from './landing-access'
import { LANDING_ANCHORS } from './landing-content'
import { LandingFaq } from './landing-faq'
import { LandingFinalCta, LandingFooter } from './landing-footer'
import { LandingHeader } from './landing-header'
import { LandingHero } from './landing-hero'
import { LandingProduct } from './landing-product'
import { LandingSteps } from './landing-steps'
import { LandingStructuredData } from './landing-structured-data'
import { StoryMotion } from './story-motion'
import './landing-cinema.css'

// Public content is server rendered. Native scroll motion progressively enhances the product story.
export function HomePage() {
    return (
        <div className="ft-landing relative min-h-dvh overflow-x-clip bg-access-hover text-foreground">
            <a
                href={`#${LANDING_ANCHORS.main}`}
                className="sr-only rounded-lg bg-card text-sm font-medium text-foreground shadow-[0_16px_32px_-16px_rgba(15,23,42,0.35)] focus-ring focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:px-4"
            >
                Ir al contenido
            </a>
            <div className="absolute inset-x-0 top-0 z-30">
                <LandingHeader />
            </div>
            <main id={LANDING_ANCHORS.main} tabIndex={-1} className="relative z-10 outline-none">
                <div data-cinema-story>
                    <LandingHero />
                    <LandingProduct />
                    <StoryMotion />
                </div>
                <LandingSteps />
                <LandingAccess />
                <LandingFaq />
                <LandingFinalCta />
            </main>
            <LandingFooter />
            <LandingStructuredData />
        </div>
    )
}
