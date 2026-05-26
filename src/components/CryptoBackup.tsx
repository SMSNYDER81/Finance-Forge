import React, { useState, useRef } from 'react';
import { StateSchema } from '../types';
import { encryptData, decryptData } from '../utils/crypto';
import { 
  Download, 
  Upload, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  AlertCircle,
  CheckCircle,
  FileKey2
} from 'lucide-react';

interface CryptoBackupProps {
  appState: StateSchema;
  onRestoreState: (state: StateSchema) => void;
}

export default function CryptoBackup({
  appState,
  onRestoreState
}: CryptoBackupProps) {
  // Export states
  const [exportPassword, setExportPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Import states
  const [importPassword, setImportPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [importText, setImportText] = useState<string | null>(null);
  const [importMeta, setImportMeta] = useState<{ filename: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassword.trim()) {
      alert('Please enter a secure password to generate your symmetric ledger key.');
      return;
    }

    setIsExporting(true);
    try {
      // Export current full state schema
      const encryptedJson = await encryptData(appState, exportPassword);
      
      const blob = new Blob([encryptedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financeforge_encrypted_ledger_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackupTime(new Date().toLocaleTimeString());
      setExportPassword('');
    } catch (err: any) {
      alert(`Crypto compilation failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    processImportFile(file);
  };

  const processImportFile = (file: File) => {
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImportText(event.target.result as string);
          setImportMeta({ filename: file.name });
          setDropError(null);
        }
      };
      reader.readAsText(file);
    } else {
      setDropError('Invalid format. Backups must be standard JSON payloads exported by FinanceForge.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const handleDecryptImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText || !importPassword.trim()) return;

    setIsImporting(true);
    setDropError(null);
    try {
      const restoredState = await decryptData(importText, importPassword);
      
      // Perform simple validation scheme check to confirm fields
      if (!restoredState.user_profile || !restoredState.balance_sheet) {
        throw new Error('Parsed payload is missing necessary Schema keys.');
      }

      onRestoreState(restoredState);
      
      // Reset layout states on success
      setImportText(null);
      setImportMeta(null);
      setImportPassword('');
      alert('Symmetric key derivation successful. Your ledger state has been recovered.');
    } catch (err: any) {
      setDropError(err.message || 'Key derivation failed. Invalid password credentials.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8" id="portability-vault-panel">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Symmetric Cryptographic Exporter */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b pb-3.5">
              <div className="flex items-center gap-1.5 text-neutral-800">
                <Lock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">PBKDF2 Exporter Vault</h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-light">
                Securely locks your local balances and allocations using 256-bit AES-GCM. 
              </p>
            </div>

            <form onSubmit={handleExportBackup} className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest block">User-defined Encryption Password</span>
                <input
                  type="password"
                  placeholder="Type a secure password key..."
                  value={exportPassword}
                  onChange={e => setExportPassword(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-xl text-sm px-3.5 py-2.5 font-mono focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border text-[10px] text-neutral-400 font-light leading-relaxed">
                <span className="font-semibold text-neutral-600 block mb-0.5">Symmetric Derivation Flow:</span>
                FinanceForge runs PBKDF2 with 100,000 salt iterations inside your browser thread to transform your password into a 256-bit hash key. No secrets are exposed.
              </div>

              <button
                type="submit"
                disabled={isExporting}
                className="w-full py-2.5 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-850 cursor-pointer transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Interpreting keys...' : 'Download Encrypted Backup'}</span>
              </button>
            </form>
          </div>

          {lastBackupTime && (
            <div className="mt-4 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center justify-center gap-1 font-mono">
              <CheckCircle className="w-4 h-4" />
              <span>Symmetric backup file compiled at {lastBackupTime}</span>
            </div>
          )}
        </div>

        {/* Cryptographic Drag Import Parser */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b pb-3.5">
              <div className="flex items-center gap-1.5 text-neutral-800">
                <Unlock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Ledger Portability Decrypter</h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-light">
                Recover configurations by dragging in backups and executing decryption keycards.
              </p>
            </div>

            {/* Dropper */}
            {!importMeta ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-200 rounded-2xl h-28 flex flex-col items-center justify-center bg-neutral-50/50 hover:border-neutral-300 cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json"
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                <span className="text-xs text-neutral-600 font-medium">Drag backup file (.json) here or browse</span>
              </div>
            ) : (
              <form onSubmit={handleDecryptImport} className="space-y-4">
                <div className="p-3.5 bg-neutral-50 border rounded-2xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <FileKey2 className="w-4.5 h-4.5 text-emerald-600" />
                    <span className="text-neutral-800 truncate max-w-xs">{importMeta.filename}</span>
                  </div>
                  <button
                    onClick={() => { setImportText(null); setImportMeta(null); }}
                    className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest block">Decrypt Ledger Password</span>
                  <input
                    type="password"
                    placeholder="Enter decryption secret key..."
                    value={importPassword}
                    onChange={e => setImportPassword(e.target.value)}
                    className="w-full bg-neutral-50 border rounded-xl text-sm px-3.5 py-2.5 font-mono focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isImporting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Execute Decipher Recovery</span>
                </button>
              </form>
            )}

            {dropError && (
              <div className="p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0" />
                <span>{dropError}</span>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
