import { readFile } from 'node:fs/promises'
import { disconnectPrisma, prisma } from '../src/config/prisma.ts'
import {
    applyWorkbookImport,
    parseWorkbookFile,
    planWorkbookImport,
    WorkbookImportError,
} from '../src/modules/finance/workbook-import.ts'

// Importa un libro JSON a la cuenta de un usuario. Por defecto solo valida y muestra el plan;
// escribe únicamente con --apply. Muestra el host de destino para confirmar que no es la base
// equivocada antes de escribir.
const usage = 'Uso: pnpm db:import-workbook <archivo.json> <email> [--replace] [--apply]'

function databaseHost() {
    try {
        return new URL(process.env.DATABASE_URL ?? '').host
    } catch {
        return 'desconocido'
    }
}

async function main() {
    const [filePath, email] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
    const replace = process.argv.includes('--replace')
    const apply = process.argv.includes('--apply')

    if (!filePath || !email) {
        throw new Error(usage)
    }

    const workbook = parseWorkbookFile(JSON.parse(await readFile(filePath, 'utf8')))
    const user = await prisma.user.findFirst({
        select: { email: true, id: true },
        where: { deletedAt: null, email: email.trim().toLowerCase() },
    })

    if (!user) {
        throw new Error(`No existe un usuario activo con el correo ${email}.`)
    }

    const plan = await planWorkbookImport(prisma, user.id, workbook, { replace })

    console.log(`Destino: ${databaseHost()} · usuario ${user.email}`)
    console.log(
        `Plan: crear ${plan.sheetsToCreate.length} meses, reemplazar ${plan.sheetsToReplace.length}` +
            `${plan.sheetsToReplace.length ? ` (${plan.sheetsToReplace.join(', ')})` : ''}, ${plan.entries} filas, ` +
            `${plan.debtsToCreate} deudas nuevas, ${plan.debtsToUpdate} actualizadas, ${plan.accountsToCreate} cuentas nuevas.`,
    )

    if (!apply) {
        console.log('Simulación: no se escribió nada. Repite con --apply para importar.')
        return
    }

    // La escritura revalida todo dentro de su transacción: si algo cambió desde el plan, falla.
    const summary = await applyWorkbookImport(user.id, workbook, { replace })

    console.log(`Importado: ${summary.sheets} meses, ${summary.entries} filas, ${summary.debts} deudas y ${summary.accounts} cuentas.`)
}

main()
    .catch((error: unknown) => {
        console.error(error instanceof WorkbookImportError || error instanceof Error ? error.message : error)
        process.exitCode = 1
    })
    .finally(() => disconnectPrisma())
