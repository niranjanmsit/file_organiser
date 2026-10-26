import { useState, useEffect } from 'react';
import './App.css';

interface DriveInfo {
  name: string;
  path: string;
}

interface FolderInfo {
  name: string;
  path: string;
  total_files: number;
  total_folders: number;
  total_size_bytes: number;
  sample_files: string[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function App() {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if running in Tauri desktop environment
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  useEffect(() => {
    loadDrives();
  }, []);

  async function loadDrives() {
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const systemDrives = await invoke<DriveInfo[]>('get_system_drives');
        setDrives(systemDrives);
      } else {
        // Mock drives for browser preview/testing
        setDrives([
          { name: 'Drive (C:)', path: 'C:\\' },
          { name: 'Drive (D:)', path: 'D:\\' },
        ]);
      }
    } catch (err: any) {
      console.error('Failed to load drives:', err);
    }
  }

  async function inspectPath(path: string) {
    setLoading(true);
    setError(null);
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke<FolderInfo>('inspect_folder', { path });
        setSelectedFolder(info);
      } else {
        // Mock data when tested directly in browser
        setSelectedFolder({
          name: path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || path,
          path: path,
          total_files: 42,
          total_folders: 6,
          total_size_bytes: 145000000,
          sample_files: ['document.pdf', 'photo_01.jpg', 'archive.zip', 'notes.txt'],
        });
      }
    } catch (err: any) {
      setError(err?.toString() || 'Failed to inspect folder');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenFolderPicker() {
    try {
      if (isTauri) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Folder to Organise',
        });
        if (selected && typeof selected === 'string') {
          await inspectPath(selected);
        }
      } else {
        // Browser fallback prompt for quick testing
        const customPath = window.prompt('Enter folder path for browser mock:', 'D:\\Downloads');
        if (customPath) {
          await inspectPath(customPath);
        }
      }
    } catch (err: any) {
      setError(err?.toString() || 'Failed to open folder picker');
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
          </div>
          <div>
            <h1 className="title">File Organiser</h1>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fast Cross-Platform Desktop Organizer</p>
          </div>
        </div>
        <span className="badge">Tauri v2 + React</span>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {/* Drive Quick Selection */}
      <section className="card">
        <h2 className="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="8" x="2" y="14" rx="2" />
            <path d="M6 18h.01" />
            <path d="M10 18h.01" />
          </svg>
          Quick Select Available Drive
        </h2>
        <div className="drives-grid">
          {drives.map((drive) => (
            <button
              key={drive.path}
              className={`drive-btn ${selectedFolder?.path === drive.path ? 'active' : ''}`}
              onClick={() => inspectPath(drive.path)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="8" x="2" y="14" rx="2" />
                <path d="M6 18h.01" />
                <path d="M10 18h.01" />
              </svg>
              <span>{drive.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Folder Picker Box */}
      <section className="card">
        <div className="picker-box" onClick={handleOpenFolderPicker}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            <line x1="12" y1="10" x2="12" y2="16"/>
            <line x1="9" y1="13" x2="15" y2="13"/>
          </svg>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9' }}>
              Choose a Folder from your Desktop or Drives
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              Click to browse your file system or pick any directory to scan
            </p>
          </div>
          <button className="primary-btn" type="button" onClick={(e) => { e.stopPropagation(); handleOpenFolderPicker(); }}>
            Browse Folder
          </button>
        </div>
      </section>

      {/* Selected Folder View */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
          Scanning folder...
        </div>
      )}

      {selectedFolder && !loading && (
        <section className="card selected-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
              </svg>
              Selected Folder: <span style={{ color: '#60a5fa', marginLeft: '0.35rem' }}>{selectedFolder.name}</span>
            </h2>
          </div>

          <div className="path-bar">{selectedFolder.path}</div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{selectedFolder.total_files}</div>
              <div className="stat-label">Files Found</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{selectedFolder.total_folders}</div>
              <div className="stat-label">Subfolders</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatBytes(selectedFolder.total_size_bytes)}</div>
              <div className="stat-label">Total Size</div>
            </div>
          </div>

          {selectedFolder.sample_files.length > 0 && (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                Sample Files in Folder:
              </p>
              <div className="file-chips">
                {selectedFolder.sample_files.map((file, idx) => (
                  <span key={idx} className="file-chip">
                    📄 {file}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
