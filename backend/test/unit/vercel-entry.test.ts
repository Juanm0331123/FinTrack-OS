import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const backendRoot = fileURLToPath(new URL('../../', import.meta.url))

function assertSafeEntryImport(directory: string, extension: 'js' | 'ts') {
    const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
        import assert from 'node:assert/strict'
        import { Server } from 'node:http'
        const signals = ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection']
        const before = signals.map((signal) => process.listenerCount(signal))
        Server.prototype.listen = () => { throw new Error('The Vercel entry opened a listening port') }
        const { default: handler } = await import('./api/index.${extension}')
        const { app } = await import('./src/app.${extension}')
        const { disconnectPrisma, pool } = await import('./src/config/prisma.${extension}')
        assert.equal(handler, app)
        assert.equal(typeof handler, 'function')
        assert.deepEqual(signals.map((signal) => process.listenerCount(signal)), before)
        assert.equal(pool.totalCount, 0)
        assert.ok(pool.listenerCount('release') > 0, 'Fluid compute must manage idle pg connections after release')
        await disconnectPrisma()
        console.log('VERCEL_ENTRY_OK')
    `], {
        cwd: directory,
        encoding: 'utf8',
        env: {
            PATH: process.env.PATH,
            SYSTEMROOT: process.env.SYSTEMROOT,
            DATABASE_URL: 'postgresql://qa:qa@127.0.0.1:1/fintrack_vercel_test',
            EDGE_PROXY_SECRET: 'vercel-entry-test-edge-secret-32-characters',
            EMAIL_PROVIDER: 'outbox',
            JWT_ACCESS_SECRET: 'vercel-entry-test-access-secret-32-characters',
            JWT_REFRESH_SECRET: 'vercel-entry-test-refresh-secret-32-characters',
            NODE_ENV: 'test',
            VERCEL: '1',
        },
        timeout: 30_000,
    })

    assert.equal(child.status, 0, child.stderr)
    assert.match(child.stdout, /VERCEL_ENTRY_OK/)
}

test('Vercel imports the real application without opening a port or installing process shutdown handlers', () => {
    assertSafeEntryImport(backendRoot, 'ts')
})

test('the TypeScript compiler rewrites explicit ESM .ts imports and Node imports the emitted application safely', () => {
    const configPath = fileURLToPath(new URL('../../tsconfig.json', import.meta.url))
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)

    assert.equal(error, undefined)

    const configuration = ts.parseJsonConfigFileContent(config, ts.sys, backendRoot)
    const entryPath = fileURLToPath(new URL('../../api/index.ts', import.meta.url))
    const temporaryRoot = resolve(backendRoot, '.local')

    mkdirSync(temporaryRoot, { recursive: true })

    const outputDirectory = mkdtempSync(join(temporaryRoot, 'vercel-entry-'))

    try {
        const program = ts.createProgram([entryPath], {
            ...configuration.options,
            noEmit: false,
            outDir: outputDirectory,
            rootDir: backendRoot,
        })

        program.emit(undefined, (fileName, contents) => {
            const outputPath = resolve(fileName)
            const relativeOutput = relative(outputDirectory, outputPath)

            assert.ok(relativeOutput && !relativeOutput.startsWith('..') && !isAbsolute(relativeOutput))
            mkdirSync(dirname(outputPath), { recursive: true })
            writeFileSync(outputPath, contents, 'utf8')
        })

        writeFileSync(join(outputDirectory, 'package.json'), JSON.stringify({ type: 'module' }), 'utf8')

        const entryOutput = readFileSync(join(outputDirectory, 'api/index.js'), 'utf8')

        assert.match(entryOutput, /from ['"]\.\.\/src\/app\.js['"]/)
        assert.doesNotMatch(entryOutput, /from ['"]\.\.\/src\/app\.ts['"]/)
        assertSafeEntryImport(outputDirectory, 'js')
    } finally {
        const relativeDirectory = relative(temporaryRoot, resolve(outputDirectory))

        assert.ok(relativeDirectory.startsWith('vercel-entry-') && !relativeDirectory.includes('..') && !isAbsolute(relativeDirectory))
        rmSync(outputDirectory, { force: true, recursive: true })
    }
})

test('Vercel uses one explicitly routed API entry instead of detecting app.ts or server.ts', () => {
    const configuration = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

    assert.equal(configuration.framework, null)
    assert.deepEqual(configuration.regions, ['iad1'])
    assert.equal(configuration.fluid, true)
    assert.equal(configuration.git.deploymentEnabled, false)
    // Con buildCommand propio, Vercel exige un directorio de salida aunque la API no sirva estáticos.
    assert.equal(configuration.outputDirectory, 'public')
    assert.match(configuration.buildCommand, /mkdir -p public$/)
    assert.deepEqual(Object.keys(configuration.functions), ['api/index.ts'])
    assert.equal(configuration.functions['api/index.ts'].maxDuration, 35)
    assert.deepEqual(configuration.rewrites, [{ source: '/(.*)', destination: '/api/index' }])
})
