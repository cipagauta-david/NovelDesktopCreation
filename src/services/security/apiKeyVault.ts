import type { Provider } from '../../types/workspace'

type VaultEnvelope = {
  iv: number[]
  cipherText: number[]
}

const VAULT_DB = 'novel-desktop-vault-db'
const VAULT_VERSION = 1
const VAULT_STORE = 'api-key-vault'
const KEY_RECORD_ID = 'device-aes-gcm-key'

let cachedCryptoKey: CryptoKey | null = null

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_DB, VAULT_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbPut<T>(id: string, value: T): Promise<void> {
  const db = await openVaultDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).put({ id, value })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
}

async function dbGet<T>(id: string): Promise<T | null> {
  const db = await openVaultDb()
  const result = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly')
    const request = tx.objectStore(VAULT_STORE).get(id)
    request.onsuccess = () => {
      const record = request.result as { id: string; value: T } | undefined
      resolve(record?.value ?? null)
    }
    request.onerror = () => reject(request.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
  return result
}

async function dbDelete(id: string): Promise<void> {
  const db = await openVaultDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  db.close()
}

function providerRecordId(provider: Provider): string {
  return `provider:${provider}`
}

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey
  }

  const existingJwk = await dbGet<JsonWebKey>(KEY_RECORD_ID)
  if (existingJwk) {
    cachedCryptoKey = await crypto.subtle.importKey(
      'jwk',
      existingJwk,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    )
    return cachedCryptoKey
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('jwk', key)
  await dbPut(KEY_RECORD_ID, exported)
  cachedCryptoKey = key
  return key
}

export async function saveProviderApiKey(provider: Provider, apiKey: string): Promise<void> {
  if (!apiKey.trim()) {
    await dbDelete(providerRecordId(provider))
    return
  }

  const key = await getOrCreateDeviceKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(apiKey.trim())
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)

  const envelope: VaultEnvelope = {
    iv: Array.from(iv),
    cipherText: Array.from(new Uint8Array(cipher)),
  }
  await dbPut(providerRecordId(provider), envelope)
}

export async function readProviderApiKey(provider: Provider): Promise<string | undefined> {
  const envelope = await dbGet<VaultEnvelope>(providerRecordId(provider))
  if (!envelope) {
    return undefined
  }

  const key = await getOrCreateDeviceKey()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(envelope.iv) },
    key,
    new Uint8Array(envelope.cipherText),
  )

  return new TextDecoder().decode(plain)
}

export async function deleteProviderApiKey(provider: Provider): Promise<void> {
  await dbDelete(providerRecordId(provider))
}
