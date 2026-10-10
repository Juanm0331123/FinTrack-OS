// bcrypt (backend) solo usa los primeros 72 bytes: las tildes ocupan 2 y los emojis 4.
export const PASSWORD_MAX_BYTES = 72

export const PASSWORD_TOO_LONG_MESSAGE =
    'La contraseña es demasiado larga: usa máximo 72 bytes (las tildes y los emojis ocupan más de uno).'

export function fitsPasswordBytes(value: string) {
    return new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES
}
