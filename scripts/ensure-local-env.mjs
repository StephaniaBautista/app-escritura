import { access, copyFile } from 'node:fs/promises'

const envPath = new URL('../backend/.env', import.meta.url)
const examplePath = new URL('../backend/.env.example', import.meta.url)

try {
  await access(envPath)
  console.log('backend/.env already exists')
} catch {
  await copyFile(examplePath, envPath)
  console.log('Created backend/.env from backend/.env.example')
}

