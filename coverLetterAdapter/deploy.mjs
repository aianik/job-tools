import { rmSync, mkdirSync, cpSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir   = resolve(__dirname, 'dist')
const repoRoot  = resolve(__dirname, '..')
const destDir   = resolve(repoRoot, 'docs', 'coverLetterAdapter')

rmSync(destDir, { recursive: true, force: true })
mkdirSync(destDir, { recursive: true })
cpSync(distDir, destDir, { recursive: true })

execSync('git add docs/', { cwd: repoRoot, stdio: 'inherit' })
execSync('git commit -m "Deploy: coverLetterAdapter"', { cwd: repoRoot, stdio: 'inherit' })
execSync('git push', { cwd: repoRoot, stdio: 'inherit' })
console.log('Deployed to docs/coverLetterAdapter on main.')
