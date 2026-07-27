/**
 * Script de verificacion del Frontend
 * 
 * Ejecutar con: npx tsx src/test/frontend-verify.ts
 * 
 * Verifica que los archivos importantes existen y tienen el contenido correcto
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FRONTEND_DIR = join(__dirname, '..', '..', '..', 'frontend', 'src')

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`  ✅ ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message })
    console.log(`  ❌ ${name}: ${error.message}`)
  }
}

function fileContains(filePath: string, searchStr: string) {
  const fullPath = join(FRONTEND_DIR, filePath)
  if (!existsSync(fullPath)) throw new Error(`Archivo no encontrado: ${filePath}`)
  const content = readFileSync(fullPath, 'utf-8')
  if (!content.includes(searchStr)) throw new Error(`No se encontro "${searchStr}" en ${filePath}`)
}

function fileExists(filePath: string) {
  const fullPath = join(FRONTEND_DIR, filePath)
  if (!existsSync(fullPath)) throw new Error(`Archivo no encontrado: ${filePath}`)
}

console.log('\n🔍 Verificando Frontend...\n')

// Test 1: Archivos de idioma
test('Archivo es.json existe', () => fileExists('i18n/locales/es.json'))
test('Archivo en.json existe', () => fileExists('i18n/locales/en.json'))

// Test 2: Traducciones de auth en español
test('es.json tiene auth.login', () => fileContains('i18n/locales/es.json', '"auth"'))
test('es.json tiene Iniciar sesión', () => fileContains('i18n/locales/es.json', 'Iniciar sesión'))
test('es.json tiene Contraseña', () => fileContains('i18n/locales/es.json', 'Contraseña'))
test('es.json tiene Olvidaste tu contraseña', () => fileContains('i18n/locales/es.json', '¿Olvidaste tu contraseña?'))

// Test 3: Traducciones de auth en ingles
test('en.json tiene auth.login', () => fileContains('i18n/locales/en.json', '"auth"'))
test('en.json tiene Log in', () => fileContains('i18n/locales/en.json', 'Log in'))
test('en.json tiene Password', () => fileContains('i18n/locales/en.json', 'Password'))
test('en.json tiene Forgot your password', () => fileContains('i18n/locales/en.json', 'Forgot your password?'))

// Test 4: Paginas de auth existen
test('Login.tsx existe', () => fileExists('pages/Login.tsx'))
test('Register.tsx existe', () => fileExists('pages/Register.tsx'))
test('ForgotPassword.tsx existe', () => fileExists('pages/ForgotPassword.tsx'))
test('ResetPassword.tsx existe', () => fileExists('pages/ResetPassword.tsx'))

// Test 5: Paginas usan useTranslation
test('Login.tsx usa useTranslation', () => fileContains('pages/Login.tsx', "useTranslation"))
test('Register.tsx usa useTranslation', () => fileContains('pages/Register.tsx', "useTranslation"))
test('ForgotPassword.tsx usa useTranslation', () => fileContains('pages/ForgotPassword.tsx', "useTranslation"))
test('ResetPassword.tsx usa useTranslation', () => fileContains('pages/ResetPassword.tsx', "useTranslation"))

// Test 6: Rutas configuradas en App.tsx
test('App.tsx tiene ruta /forgot-password', () => fileContains('App.tsx', '/forgot-password'))
test('App.tsx tiene ruta /reset-password', () => fileContains('App.tsx', '/reset-password'))

// Test 7: LanguageSwitcher existe
test('LanguageSwitcher.tsx existe', () => fileExists('components/landing/LanguageSwitcher.tsx'))

// Test 8: Cursor pointer en globals.css
test('globals.css tiene cursor pointer', () => fileContains('styles/globals.css', 'cursor: pointer'))

// Test 9: Estilos de notebook
test('globals.css tiene notebook-paper', () => fileContains('styles/globals.css', '.notebook-paper'))
test('globals.css tiene notebook-lines', () => fileContains('styles/globals.css', '.notebook-lines'))
test('globals.css tiene postit', () => fileContains('styles/globals.css', '.postit'))

// Test 10: i18n configurado
test('main.tsx importa i18n', () => fileContains('main.tsx', "import './i18n'"))
test('i18n/index.ts existe', () => fileExists('i18n/index.ts'))

// Resumen
console.log('\n' + '='.repeat(50))
const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length
console.log(`\n📊 Resultados: ${passed} pasaron, ${failed} fallaron de ${results.length} tests\n`)

if (failed > 0) {
  console.log('❌ Tests fallidos:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`   - ${r.name}: ${r.error}`)
  })
  console.log('')
}

process.exit(failed > 0 ? 1 : 0)
