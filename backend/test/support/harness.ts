import './env.ts'
import { randomInt, randomUUID } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import bcrypt from 'bcryptjs'
import { TEST_ORIGIN, TEST_PASSWORD } from './env.ts'

// Arnés de integración: la aplicación real (Express + Prisma) escucha en un puerto efímero y
// habla con el PostgreSQL de prueba. Cada test crea sus propios usuarios y los borra al final.

const { app } = await import('../../src/app.ts')
const prismaModule = await import('../../src/config/prisma.ts')
const emailModule = await import('../../src/modules/auth/email.service.ts')

export const prisma = prismaModule.prisma
export const pool = prismaModule.pool
export { TEST_ORIGIN, TEST_PASSWORD }

export type ApiResponse<T = any> = {
    body: T
    headers: Headers
    status: number
    text: string
}

type RequestOptions = {
    body?: unknown
    contentType?: string
    headers?: Record<string, string>
    rawBody?: string
    token?: string
    withOrigin?: boolean
}

export class TestClient {
    readonly cookies = new Map<string, string>()
    readonly ip: string
    private readonly baseUrl: string

    constructor(baseUrl: string, ip = randomTestIp()) {
        this.baseUrl = baseUrl
        this.ip = ip
    }

    async request<T = any>(method: string, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const headers: Record<string, string> = {
            'X-Forwarded-For': this.ip,
            ...(options.withOrigin === false ? {} : { Origin: TEST_ORIGIN }),
            ...(this.cookies.size ? { Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ') } : {}),
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            ...options.headers,
        }
        let body: string | undefined

        if (options.rawBody !== undefined) {
            body = options.rawBody
            headers['Content-Type'] = options.contentType ?? 'application/json'
        } else if (options.body !== undefined) {
            body = JSON.stringify(options.body)
            headers['Content-Type'] = options.contentType ?? 'application/json'
        }

        const response = await fetch(`${this.baseUrl}${path}`, { body, headers, method, redirect: 'manual' })

        this.storeCookies(response.headers.getSetCookie())

        const text = await response.text()
        let parsed: unknown = null

        try {
            parsed = text ? JSON.parse(text) : null
        } catch {
            parsed = null
        }

        return { body: parsed as T, headers: response.headers, status: response.status, text }
    }

    get<T = any>(path: string, options?: RequestOptions) {
        return this.request<T>('GET', path, options)
    }

    post<T = any>(path: string, body?: unknown, options: RequestOptions = {}) {
        return this.request<T>('POST', path, { ...options, body })
    }

    patch<T = any>(path: string, body?: unknown, options: RequestOptions = {}) {
        return this.request<T>('PATCH', path, { ...options, body })
    }

    delete<T = any>(path: string, options?: RequestOptions) {
        return this.request<T>('DELETE', path, options)
    }

    private storeCookies(setCookies: string[]) {
        for (const header of setCookies) {
            const [pair, ...attributes] = header.split(';')
            const separator = pair.indexOf('=')
            const name = pair.slice(0, separator).trim()
            const value = pair.slice(separator + 1).trim()
            const expired = attributes.some((attribute) => {
                const [key, attributeValue] = attribute.trim().split('=')

                return (
                    (key.toLowerCase() === 'max-age' && Number(attributeValue) <= 0) ||
                    (key.toLowerCase() === 'expires' && new Date(attributeValue).getTime() <= Date.now())
                )
            })

            if (expired || !value) {
                this.cookies.delete(name)
            } else {
                this.cookies.set(name, value)
            }
        }
    }
}

export function randomTestIp() {
    return `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`
}

export type TestApi = {
    baseUrl: string
    client(ip?: string): TestClient
    close(): Promise<void>
}

export async function startApi(): Promise<TestApi> {
    const server: Server = await new Promise((resolve) => {
        const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

    return {
        baseUrl,
        client: (ip) => new TestClient(baseUrl, ip),
        close: () =>
            new Promise<void>((resolve) => {
                server.closeAllConnections()
                server.close(() => resolve())
            }),
    }
}

export async function stopDatabase() {
    await prismaModule.disconnectPrisma()
}

export type TestUser = {
    email: string
    id: string
    password: string
}

export function testEmail(label = 'qa') {
    return `${label}-${randomUUID().slice(0, 8)}@fintrack.test`
}

// Usuarios creados directamente en la base de prueba (hash bcrypt de coste bajo solo aquí).
export async function createUser(
    options: { email?: string; password?: string; role?: 'ADMIN' | 'USER'; status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION' } = {},
): Promise<TestUser> {
    const password = options.password ?? TEST_PASSWORD
    const email = options.email ?? testEmail()
    const user = await prisma.user.create({
        data: {
            email,
            firstName: 'Persona',
            lastName: 'Prueba',
            passwordHash: await bcrypt.hash(password, 4),
            role: options.role ?? 'USER',
            status: options.status ?? 'ACTIVE',
        },
        select: { id: true },
    })

    return { email, id: user.id, password }
}

export async function login(client: TestClient, user: TestUser) {
    const response = await client.post('/api/auth/login', { email: user.email, password: user.password })

    if (response.status !== 200) {
        throw new Error(`login failed for fixture: ${response.status} ${response.text}`)
    }

    return response.body.data.accessToken as string
}

export async function deleteUsers(...ids: string[]) {
    if (ids.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: ids } } })
    }
}

export async function deleteUsersByEmail(...emails: string[]) {
    if (emails.length > 0) {
        await prisma.user.deleteMany({ where: { email: { in: emails } } })
    }
}

export function outbox() {
    return emailModule.readTestOutbox()
}

export function lastCodeSentTo(email: string) {
    const message = outbox().filter((item) => item.to === email).at(-1)
    const code = message?.text.match(/\b(\d{6})\b/)?.[1]

    if (!code) {
        throw new Error(`no code was sent to ${email}`)
    }

    return code
}

export function cookieValue(client: TestClient, name = 'refresh_token') {
    return client.cookies.get(name)
}
