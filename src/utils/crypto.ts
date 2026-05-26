// Secure Portability & Encrypted Backups Engine using the Web Crypto API (AES-GCM 256-bit)

interface EncryptedPayload {
  v: number;            // format version
  ciphertext: string;   // base64 encoded encrypted string
  salt: string;         // base64 PBKDF2 salt
  iv: string;           // base64 initialization vector
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive cryptographic key from password + salt via PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import raw password bytes as a key material
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an AES-GCM 256-bit key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt any JSON object using a user-provided password
 */
export async function encryptData(data: any, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const dataBytes = encoder.encode(jsonString);

  // Generate cryptographic random salt (16 bytes) and IV (12 bytes for AES-GCM)
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive key
  const aesKey = await deriveKey(password, salt);

  // Encrypt raw payload
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    aesKey,
    dataBytes
  );

  // Construct package
  const payload: EncryptedPayload = {
    v: 1,
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer)
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Decrypts a backup payload string using the password. Returns parsed JSON object.
 */
export async function decryptData(encryptedString: string, password: string): Promise<any> {
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedString);

    if (payload.v !== 1 || !payload.ciphertext || !payload.salt || !payload.iv) {
      throw new Error('Invalid or unsupported backup format.');
    }

    const saltBytes = new Uint8Array(base64ToArrayBuffer(payload.salt));
    const ivBytes = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const ciphertextBytes = base64ToArrayBuffer(payload.ciphertext);

    // Derive key
    const aesKey = await deriveKey(password, saltBytes);

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      aesKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Core decryption error:', error);
    throw new Error('Decryption failed. Please verify password and file integrity.');
  }
}
