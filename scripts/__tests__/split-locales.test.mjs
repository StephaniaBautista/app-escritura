import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateLocales } from '../split-locales.mjs'

const script = fileURLToPath(new URL('../split-locales.mjs', import.meta.url))

async function fixture(t, es = { title: 'Título', nested: { count: '{{count}} elementos' } }, en = { title: 'Title', nested: { count: '{{count}} items' } }) {
  const directory = await mkdtemp(join(tmpdir(), 'archivum-locales-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await Promise.all(['es', 'en'].map((language) => mkdir(join(directory, language))))
  await Promise.all([
    writeFile(join(directory, 'manifest.json'), JSON.stringify({ version: '1', core: ['common'], namespaces: ['common'] })),
    writeFile(join(directory, 'es/common.json'), JSON.stringify(es)),
    writeFile(join(directory, 'en/common.json'), JSON.stringify(en)),
  ])
  return directory
}

async function snapshot(directory) {
  const result = {}
  async function visit(current, relative = '') {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      const name = join(relative, entry.name)
      if (entry.isDirectory()) await visit(path, name)
      else result[name] = { bytes: await readFile(path), mtimeMs: (await stat(path)).mtimeMs }
    }
  }
  await visit(directory)
  return result
}

describe('split-locales validation', () => {
  it('validates nested strings and interpolation variables without changing any bytes or timestamps', async (t) => {
    const directory = await fixture(t)
    const before = await snapshot(directory)
    const result = await validateLocales(directory)
    assert.deepEqual(result, { errors: [], namespaces: 1, keys: 2 })
    assert.deepEqual(await snapshot(directory), before)
  })

  it('reports a missing translation key', async (t) => {
    const directory = await fixture(t, { title: 'Título', missing: 'Falta' }, { title: 'Title' })
    const result = await validateLocales(directory)
    assert.ok(result.errors.some((error) => error.includes('common.missing: falta la clave en en')))
  })

  it('reports mismatched nested structure and invalid translation types', async (t) => {
    const directory = await fixture(t, { title: 'Título', invalid: 3 }, { title: { nested: 'Title' }, invalid: null })
    const result = await validateLocales(directory)
    assert.ok(result.errors.some((error) => error.includes('common.title: estructura diferente')))
    assert.ok(result.errors.some((error) => error.includes('es/common.json: invalid debe ser una traducción string')))
  })

  it('compares arrays structurally while counting their translated strings', async (t) => {
    const directory = await fixture(t, { items: ['Uno', 'Dos'] }, { items: ['One'] })
    const result = await validateLocales(directory)
    assert.equal(result.keys, 2)
    assert.ok(result.errors.some((error) => error.includes('common.items[1]: falta la clave en en')))
  })

  it('accepts interpolation order, whitespace and formatter changes but rejects missing variables', async (t) => {
    const directory = await fixture(t, { valid: '{{ name }}: {{count, number}}', wrong: '{{author}}' }, { valid: '{{count}}: {{- name}}', wrong: '{{writer}}' })
    const result = await validateLocales(directory)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('common.wrong: interpolaciones distintas'))
  })

  it('reports namespaces absent from either manifest or language folder', async (t) => {
    const directory = await fixture(t)
    await writeFile(join(directory, 'es/extra.json'), '{}')
    await rm(join(directory, 'en/common.json'))
    const result = await validateLocales(directory)
    assert.ok(result.errors.some((error) => error.includes('es/extra.json: el namespace no figura')))
    assert.ok(result.errors.some((error) => error.includes('en/common.json: falta el archivo')))
  })

  it('reports malformed JSON without rewriting it', async (t) => {
    const directory = await fixture(t)
    const path = join(directory, 'es/common.json')
    await writeFile(path, '{"broken":')
    const before = await snapshot(directory)
    assert.ok((await validateLocales(directory)).errors.some((error) => error.includes('es/common.json: JSON inválido')))
    assert.deepEqual(await snapshot(directory), before)
  })

  it('rejects UTF-8 BOM and malformed UTF-8 byte sequences', async (t) => {
    const directory = await fixture(t)
    await writeFile(join(directory, 'es/common.json'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{}')]))
    await writeFile(join(directory, 'en/common.json'), Buffer.from([0x7b, 0xff, 0x7d]))
    const result = await validateLocales(directory)
    assert.ok(result.errors.some((error) => error.includes('contiene BOM')))
    assert.ok(result.errors.some((error) => error.includes('UTF-8 no es válida')))
  })

  it('rejects invalid dictionary roots', async (t) => {
    const directory = await fixture(t, [], null)
    const result = await validateLocales(directory)
    assert.equal(result.errors.filter((error) => error.includes('el diccionario debe ser un objeto JSON')).length, 2)
  })

  it('validates manifest duplicates, core membership and safe namespace names', async (t) => {
    const directory = await fixture(t)
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ version: '1', core: ['missing'], namespaces: ['common', 'common', '../private'] }))
    const result = await validateLocales(directory)
    assert.ok(result.errors.some((error) => error.includes('namespace duplicado')))
    assert.ok(result.errors.some((error) => error.includes('nombre de namespace inválido')))
    assert.ok(result.errors.some((error) => error.includes('no está en namespaces')))
    assert.equal(result.namespaces, 1)
  })

  it('reports missing and malformed manifests', async (t) => {
    const directory = await fixture(t)
    await rm(join(directory, 'manifest.json'))
    assert.ok((await validateLocales(directory)).errors[0].includes('manifest.json: falta el archivo'))
    await writeFile(join(directory, 'manifest.json'), '[]')
    assert.ok((await validateLocales(directory)).errors.some((error) => error.includes('se requiere un objeto')))
  })

  it('returns useful CLI counts on success and exit 1 for validation errors', async (t) => {
    const directory = await fixture(t)
    const valid = spawnSync(process.execPath, [script, '--locales-dir', directory], { encoding: 'utf8' })
    assert.equal(valid.status, 0)
    assert.match(valid.stdout, /1 namespaces, 2 claves/)
    await writeFile(join(directory, 'en/common.json'), '{}')
    const invalid = spawnSync(process.execPath, [script, '--locales-dir', directory], { encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /falta la clave en en/)
  })

  it('documents the historical name and rejects unsupported mutation arguments', () => {
    const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' })
    assert.equal(help.status, 0)
    assert.match(help.stdout, /solo lee; no divide, regenera ni modifica/)
    const invalid = spawnSync(process.execPath, [script, '--write'], { encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /Argumentos inválidos/)
  })
})
