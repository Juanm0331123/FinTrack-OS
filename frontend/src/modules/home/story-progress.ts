/** Document positions, in pixels, of the story chapter centers. No clock or scroll history is used. */
export function resolveStoryProgress(centers: readonly number[], viewportCenter: number): number {
    const first = centers[0]
    const last = centers[centers.length - 1]

    if (centers.length < 2 || !Number.isFinite(viewportCenter) || !Number.isFinite(first) || !Number.isFinite(last) || last <= first) {
        return 0
    }

    return Math.max(0, Math.min(1, (viewportCenter - first) / (last - first)))
}

export type StoryFrame = {
    /** Current chapter; ties at the midpoint belong to the entering chapter. */
    index: number
    weights: [number, number, number, number]
}

/** Crossfades span 10% of the journey around each midpoint, leaving a full reading plateau. */
export function resolveStoryFrame(progress: number): StoryFrame {
    const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0
    const weights: StoryFrame['weights'] = [0, 0, 0, 0]

    for (let index = 0; index < 3; index += 1) {
        const midpoint = (index + 0.5) / 3

        if (value < midpoint - 0.05) {
            weights[index] = 1
            return { index, weights }
        }

        if (value <= midpoint + 0.05) {
            const fraction = Math.max(0, Math.min(1, 0.5 + (value - midpoint) / 0.1))
            const eased = fraction * fraction * (3 - 2 * fraction)
            weights[index] = 1 - eased
            weights[index + 1] = eased
            return { index: value >= midpoint ? index + 1 : index, weights }
        }
    }

    weights[3] = 1
    return { index: 3, weights }
}
