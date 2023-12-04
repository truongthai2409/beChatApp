import { createHash } from 'node:crypto'

export function sha256(content: string): string {
  return createHash('sha3-256').update(content).digest('hex')
}

export function hashPassword(password: string): string {
  return sha256(password)
}
