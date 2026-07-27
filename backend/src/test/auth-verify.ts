/**
 * Script de verificacion de Auth
 * 
 * Ejecutar con: npx tsx src/test/auth-verify.ts
 * 
 * Prueba los endpoints de autenticacion del backend
 */

const BASE_URL = 'http://localhost:3001'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`  ✅ ${name}`)
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message })
    console.log(`  ❌ ${name}: ${error.message}`)
  }
}

async function runTests() {
  console.log('\n🔍 Verificando Auth endpoints...\n')

  // Test 1: Health check
  await test('Health check responde', async () => {
    const res = await fetch(`${BASE_URL}/health`)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const data = await res.json()
    if (data.status !== 'ok') throw new Error('Status no es ok')
  })

  // Test 2: Register
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'Test12345678'

  await test('Registro de usuario', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || `Status ${res.status}`)
    }
    const data = await res.json()
    if (!data.token) throw new Error('No se recibio token')
  })

  // Test 3: Login
  let authToken = ''
  await test('Login de usuario', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || `Status ${res.status}`)
    }
    const data = await res.json()
    if (!data.token) throw new Error('No se recibio token')
    authToken = data.token
  })

  // Test 4: Session
  await test('Obtener sesion activa', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || `Status ${res.status}`)
    }
    const data = await res.json()
    if (!data.user) throw new Error('No se recibio usuario')
    if (data.user.email !== testEmail) throw new Error('Email no coincide')
  })

  // Test 5: Forgot password (no deberia fallar aunque no haya email configurado)
  await test('Forgot password responde', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    // Siempre deberia responder 200 (para no revelar si el email existe)
    if (!res.ok) throw new Error(`Status ${res.status}`)
  })

  // Test 6: Logout
  await test('Logout de usuario', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error?.message || `Status ${res.status}`)
    }
  })

  // Test 7: Session despues de logout deberia fallar
  await test('Sesion invalida despues de logout', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })
    if (res.ok) throw new Error('La sesion deberia ser invalida')
  })

  // Test 8: Login con credenciales incorrectas
  await test('Login con credenciales incorrectas falla', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongpassword',
      }),
    })
    if (res.ok) throw new Error('Login deberia haber fallado')
  })

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
  } else {
    console.log('✅ Todos los tests pasaron!\n')
  }

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(console.error)
