import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))

export type ServerProcess = {
    baseUrl: string
    output(): string
    stop(signal?: NodeJS.Signals): Promise<number | null>
    child: ChildProcessWithoutNullStreams
}

export async function freePort() {
    return new Promise<number>((resolve, reject) => {
        const server = createServer()

        server.listen(0, '127.0.0.1', () => {
            const address = server.address()

            server.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('no port'))))
        })
    })
}

// Arranca `node src/server.ts` como proceso independiente (otra "réplica"), con el entorno de
// prueba ya cargado en process.env más los cambios indicados.
export async function startServerProcess(
    overrides: Record<string, string> = {},
    options: { nodeArgs?: string[] } = {},
): Promise<ServerProcess> {
    const port = await freePort()
    const child = spawn(process.execPath, [...(options.nodeArgs ?? []), 'src/server.ts'], {
        cwd: backendRoot,
        env: { ...process.env, LOG_LEVEL: 'debug', PORT: String(port), ...overrides },
    })
    let output = ''

    child.stdout.on('data', (chunk) => (output += chunk.toString()))
    child.stderr.on('data', (chunk) => (output += chunk.toString()))

    await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 20_000)
        const check = () => {
            if (output.includes('server_started')) {
                clearTimeout(timer)
                child.stdout.off('data', check)
                resolve()
            }
        }

        child.stdout.on('data', check)
        child.once('exit', (code) => {
            clearTimeout(timer)
            reject(new Error(`server exited with ${code}:\n${output}`))
        })
    })

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        child,
        output: () => output,
        stop: (signal = 'SIGTERM') =>
            new Promise((resolve) => {
                if (child.exitCode !== null) {
                    resolve(child.exitCode)
                    return
                }

                child.once('exit', (code) => resolve(code))
                child.kill(signal)
            }),
    }
}
