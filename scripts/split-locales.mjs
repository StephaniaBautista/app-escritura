import { readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultLocalesDir = fileURLToPath(new URL('../locales/', import.meta.url))
const languages = ['es', 'en']

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function readJson(path, errors) {
  let bytes
  try {
    bytes = await readFile(path)
  } catch (error) {
    errors.push(`${path}: ${error.code === 'ENOENT' ? 'falta el archivo' : 'no se puede leer el archivo'}.`)
    return undefined
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    errors.push(`${path}: contiene BOM; se requiere UTF-8 sin BOM.`)
    return undefined
  }
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    errors.push(`${path}: la codificación UTF-8 no es válida.`)
    return undefined
  }
  try {
    return JSON.parse(text)
  } catch {
    errors.push(`${path}: JSON inválido.`)
    return undefined
  }
}

function manifestNamespaces(manifest, errors) {
  if (!object(manifest)) {
    errors.push('manifest.json: se requiere un objeto con version, core y namespaces.')
    return []
  }
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    errors.push('manifest.json: version debe ser una cadena no vacía.')
  }
  for (const field of ['core', 'namespaces']) {
    const values = manifest[field]
    if (!Array.isArray(values)) {
      errors.push(`manifest.json: ${field} debe ser una lista de namespaces.`)
      continue
    }
    if (field === 'namespaces' && values.length === 0) errors.push('manifest.json: namespaces no puede estar vacío.')
    const seen = new Set()
    for (const namespace of values) {
      if (typeof namespace !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(namespace)) {
        errors.push(`manifest.json: nombre de namespace inválido en ${field}: ${JSON.stringify(namespace)}.`)
        continue
      }
      if (seen.has(namespace)) errors.push(`manifest.json: namespace duplicado en ${field}: ${namespace}.`)
      seen.add(namespace)
    }
  }
  const namespaces = Array.isArray(manifest.namespaces)
    ? [...new Set(manifest.namespaces.filter((name) => typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_-]*$/.test(name)))]
    : []
  for (const namespace of Array.isArray(manifest.core) ? manifest.core : []) {
    if (!namespaces.includes(namespace)) errors.push(`manifest.json: el namespace core ${JSON.stringify(namespace)} no está en namespaces.`)
  }
  return namespaces
}

function displayPath(segments) {
  return segments.map((segment, index) => {
    if (typeof segment === 'number') return `[${segment}]`
    if (/^[A-Za-z0-9_-]+$/.test(segment)) return `${index ? '.' : ''}${segment}`
    return `[${JSON.stringify(segment)}]`
  }).join('')
}

function dictionaryNodes(dictionary, file, errors) {
  const nodes = new Map()
  if (!object(dictionary)) {
    errors.push(`${file}: el diccionario debe ser un objeto JSON.`)
    return nodes
  }
  function visit(value, path) {
    if (path.length > 64) {
      errors.push(`${file}: estructura demasiado profunda en ${displayPath(path)}.`)
      return
    }
    const kind = typeof value === 'string' ? 'string' : Array.isArray(value) ? 'array' : object(value) ? 'object' : 'invalid'
    nodes.set(JSON.stringify(path), { kind, value, path })
    if (kind === 'invalid') {
      errors.push(`${file}: ${displayPath(path)} debe ser una traducción string, un objeto o una lista.`)
    } else if (kind === 'array') {
      value.forEach((item, index) => visit(item, [...path, index]))
    } else if (kind === 'object') {
      for (const [key, item] of Object.entries(value)) visit(item, [...path, key])
    }
  }
  visit(dictionary, [])
  return nodes
}

function interpolationVariables(value) {
  return [...new Set([...value.matchAll(/\{\{\s*-?\s*([^{}]+?)\s*\}\}/g)]
    .map((match) => match[1].split(',')[0].trim()))].sort()
}

function compareDictionaries(namespace, es, en, errors) {
  for (const key of new Set([...es.keys(), ...en.keys()])) {
    const spanish = es.get(key)
    const english = en.get(key)
    const label = displayPath([namespace, ...(spanish ?? english).path])
    if (!spanish || !english) {
      errors.push(`${label}: falta la clave en ${spanish ? 'en' : 'es'}.`)
      continue
    }
    if (spanish.kind !== english.kind) {
      errors.push(`${label}: estructura diferente (es=${spanish.kind}, en=${english.kind}).`)
      continue
    }
    if (spanish.kind === 'string') {
      const esVariables = interpolationVariables(spanish.value)
      const enVariables = interpolationVariables(english.value)
      if (JSON.stringify(esVariables) !== JSON.stringify(enVariables)) {
        errors.push(`${label}: interpolaciones distintas (es=${JSON.stringify(esVariables)}, en=${JSON.stringify(enVariables)}).`)
      }
    }
  }
}

export async function validateLocales(localesDir = defaultLocalesDir) {
  const root = resolve(localesDir)
  const errors = []
  const manifest = await readJson(join(root, 'manifest.json'), errors)
  if (manifest === undefined) return { errors, namespaces: 0, keys: 0 }
  const namespaces = manifestNamespaces(manifest, errors)
  for (const language of languages) {
    const directory = join(root, language)
    try {
      const files = await readdir(directory, { withFileTypes: true })
      for (const file of files) {
        if (file.name.endsWith('.json') && !namespaces.includes(file.name.slice(0, -5))) {
          errors.push(`${language}/${file.name}: el namespace no figura en manifest.json.`)
        }
      }
    } catch {
      errors.push(`${directory}: falta el directorio de traducciones o no se puede leer.`)
    }
  }
  let keys = 0
  for (const namespace of namespaces) {
    const dictionaries = []
    for (const language of languages) {
      const file = `${language}/${namespace}.json`
      const dictionary = await readJson(join(root, file), errors)
      dictionaries.push(dictionary === undefined ? null : dictionaryNodes(dictionary, file, errors))
    }
    const [es, en] = dictionaries
    if (es) keys += [...es.values()].filter((node) => node.kind === 'string').length
    if (es && en) compareDictionaries(namespace, es, en, errors)
  }
  return { errors, namespaces: namespaces.length, keys }
}

async function main(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log('Uso: node scripts/split-locales.mjs [--locales-dir RUTA]\nValida los diccionarios existentes por namespace, manifest.json y la paridad es/en.\nEl nombre split-locales es histórico: este comando solo lee; no divide, regenera ni modifica archivos.')
    return
  }
  if (args.length && !(args.length === 2 && args[0] === '--locales-dir' && args[1].trim())) {
    console.error('Argumentos inválidos. Usa --help para consultar el validador de diccionarios.')
    process.exitCode = 1
    return
  }
  const result = await validateLocales(args[1] ?? defaultLocalesDir)
  if (result.errors.length) {
    console.error(`Validación de locales fallida (${result.errors.length} errores):\n${result.errors.map((error) => `- ${error}`).join('\n')}`)
    process.exitCode = 1
    return
  }
  console.log(`Locales válidos: ${result.namespaces} namespaces, ${result.keys} claves de traducción con paridad es/en. No se modificó ningún archivo.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => {
    console.error('No se pudo completar la validación de locales.')
    process.exitCode = 1
  })
}
