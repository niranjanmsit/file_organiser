import { useState, useEffect } from 'react';
import './App.css';

interface DriveInfo {
  name: string;
  path: string;
}

interface SubfolderItem {
  name: string;
  path: string;
  item_count: number;
  preview_files: string[];
}

interface FolderInfo {
  name: string;
  path: string;
  total_files: number;
  total_folders: number;
  total_size_bytes: number;
  sample_files: string[];
  subfolders: SubfolderItem[];
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
  const [showSubfolders, setShowSubfolders] = useState<boolean>(false);
  const [subfolderFilter, setSubfolderFilter] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);

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

  async function inspectPath(path: string, pushHistory: boolean = true) {
    setLoading(true);
    setError(null);
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke<FolderInfo>('inspect_folder', { path });
        setSelectedFolder(info);
      } else {
        // Mock data when tested directly in browser
        const normalized = path.replace(/\\/g, '/');
        const folderName = normalized.split('/').filter(Boolean).pop() || path;
        setSelectedFolder({
          name: folderName,
          path: path,
          total_files: 42,
          total_folders: 5,
          total_size_bytes: 145000000,
          sample_files: ['document.pdf', 'photo_01.jpg', 'archive.zip', 'notes.txt'],
          subfolders: [
            { name: 'Documents', path: `${path}\\Documents`, item_count: 14, preview_files: ['report.pdf', 'invoice.docx'] },
            { name: 'Pictures', path: `${path}\\Pictures`, item_count: 28, preview_files: ['img_2024.jpg', 'sunset.png'] },
            { name: 'Projects', path: `${path}\\Projects`, item_count: 19, preview_files: ['package.json', 'README.md'] },
            { name: 'Downloads', path: `${path}\\Downloads`, item_count: 7, preview_files: ['setup.exe', 'archive.zip'] },
            { name: 'Backups', path: `${path}\\Backups`, item_count: 3, preview_files: ['backup_2026.bak'] },
          ],
        });
      }

      if (pushHistory && (!history.length || history[history.length - 1] !== path)) {
        setHistory((prev) => [...prev, path]);
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

  function handleGoBack() {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const previousPath = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      inspectPath(previousPath, false);
    }
  }

  const filteredSubfolders = selectedFolder?.subfolders?.filter((sub) =>
    sub.name.toLowerCase().includes(subfolderFilter.toLowerCase())
  ) || [];

  // Generate breadcrumb tokens from path
  const pathParts = selectedFolder?.path
    ? selectedFolder.path.split(/[\\/]/).filter(Boolean)
    : [];

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

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '0.75rem' }}>Scanning folder and subdirectories...</p>
        </div>
      )}

      {/* Selected Folder View */}
      {selectedFolder && !loading && (
        <section className="card selected-panel">
          {/* Header with Navigation */}
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {history.length > 1 && (
                <button className="nav-back-btn" onClick={handleGoBack} title="Go back to parent folder">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Back
                </button>
              )}
              <h2 className="section-title" style={{ margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                </svg>
                Current Folder: <span style={{ color: '#60a5fa', marginLeft: '0.35rem' }}>{selectedFolder.name}</span>
              </h2>
            </div>

            {selectedFolder.total_folders > 0 && (
              <button
                className={`toggle-subfolders-btn ${showSubfolders ? 'active' : ''}`}
                onClick={() => setShowSubfolders(!showSubfolders)}
              >
                <span>📁 {showSubfolders ? 'Hide Subfolders' : 'View Subfolders'}</span>
                <span className="count-pill">{selectedFolder.total_folders}</span>
              </button>
            )}
          </div>

          {/* Breadcrumb Path Bar */}
          <div className="path-breadcrumbs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <div className="breadcrumbs-list">
              {pathParts.map((part, index) => {
                const isWindowsDrive = index === 0 && part.includes(':');
                const subPath = pathParts.slice(0, index + 1).join('\\') + (isWindowsDrive && index === 0 ? '\\' : '');
                const isLast = index === pathParts.length - 1;
                return (
                  <span key={subPath} className="crumb-item">
                    <button
                      className={`crumb-btn ${isLast ? 'active' : ''}`}
                      onClick={() => !isLast && inspectPath(subPath)}
                      title={`Navigate to ${subPath}`}
                    >
                      {part}
                    </button>
                    {!isLast && <span className="crumb-sep">›</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{selectedFolder.total_files}</div>
              <div className="stat-label">Files Found</div>
            </div>

            {/* Subfolders Stat Card - Clickable */}
            <div
              className={`stat-item stat-item-clickable ${showSubfolders ? 'stat-item-active' : ''}`}
              onClick={() => setShowSubfolders(true)}
              title="Click to show Windows-like folder thumbnails"
            >
              <div className="stat-value" style={{ color: '#fbbf24' }}>
                {selectedFolder.total_folders}
              </div>
              <div className="stat-label">
                Subfolders <span>(Click to view ↗)</span>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-value">{formatBytes(selectedFolder.total_size_bytes)}</div>
              <div className="stat-label">Total Size</div>
            </div>
          </div>

          {/* Sample Files in current folder */}
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

          {/* Windows-like Subfolders Thumbnail Explorer */}
          {showSubfolders && (
            <div className="subfolders-section">
              <div className="subfolders-header">
                <div className="subfolders-title-wrap">
                  <h3 className="subfolders-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
                    </svg>
                    Subfolders ({filteredSubfolders.length})
                  </h3>
                  <span className="subfolders-hint">Click any folder thumbnail to navigate into it</span>
                </div>

                {selectedFolder.subfolders.length > 4 && (
                  <input
                    type="text"
                    className="subfolder-search-input"
                    placeholder="Search subfolders..."
                    value={subfolderFilter}
                    onChange={(e) => setSubfolderFilter(e.target.value)}
                  />
                )}
              </div>

              {filteredSubfolders.length === 0 ? (
                <div className="empty-subfolders">
                  No subfolders found matching "{subfolderFilter}".
                </div>
              ) : (
                <div className="windows-folders-grid">
                  {filteredSubfolders.map((subfolder) => (
                    <button
                      key={subfolder.path}
                      className="windows-folder-card"
                      onClick={() => inspectPath(subfolder.path)}
                      title={`Click to open ${subfolder.name} (${subfolder.item_count} items)`}
                    >
                      {/* Windows-like Folder Graphic with Peeking Previews */}
                      <div className="windows-folder-graphic">
                        <svg className="windows-folder-svg" viewBox="0 0 88 72" width="78" height="64" fill="none">
                          {/* Folder Back Tab */}
                          <path
                            d="M6 14C6 10.6863 8.68629 8 12 8H32L38 14H76C79.3137 14 82 16.6863 82 20V58C82 61.3137 79.3137 64 76 64H12C8.68629 64 6 61.3137 6 58V14Z"
                            fill="url(#folderBackGrad)"
                          />

                          {/* Document Sheet 1 Peeking Out */}
                          {subfolder.item_count > 0 && (
                            <g transform="translate(18, 9) rotate(-5)">
                              <rect width="32" height="36" rx="2.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
                              <line x1="5" y1="7" x2="27" y2="7" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
                              <line x1="5" y1="13" x2="23" y2="13" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
                              <line x1="5" y1="19" x2="17" y2="19" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
                            </g>
                          )}

                          {/* Document Sheet 2 / Picture Sheet Peeking Out */}
                          {subfolder.item_count > 1 && (
                            <g transform="translate(36, 11) rotate(6)">
                              <rect width="32" height="34" rx="2.5" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="0.8" />
                              <rect x="4" y="5" width="24" height="16" rx="2" fill="#38bdf8" fillOpacity="0.45" />
                              <circle cx="9" cy="10" r="2.2" fill="#0284c7" />
                              <path d="M5 19L11 13L17 18L21 15L27 19H5Z" fill="#0284c7" />
                            </g>
                          )}

                          {/* Folder Front Flap */}
                          <path
                            d="M4 25C4 22.7909 5.79086 21 8 21H80C82.2091 21 84 22.7909 84 25V58C84 62.4183 80.4183 66 76 66H12C7.58172 66 4 62.4183 4 58V25Z"
                            fill="url(#folderFrontGrad)"
                          />

                          {/* Top Rim Gloss Highlight */}
                          <path d="M6 22H82" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round" />

                          {/* Gradients */}
                          <defs>
                            <linearGradient id="folderBackGrad" x1="6" y1="8" x2="82" y2="64" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#d97706" />
                              <stop offset="1" stopColor="#b45309" />
                            </linearGradient>
                            <linearGradient id="folderFrontGrad" x1="4" y1="21" x2="84" y2="66" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#fbbf24" />
                              <stop offset="0.65" stopColor="#f59e0b" />
                              <stop offset="1" stopColor="#d97706" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Item Count Badge */}
                        <span className="folder-item-pill">
                          {subfolder.item_count}
                        </span>
                      </div>

                      {/* Folder Name & Info */}
                      <div className="windows-folder-meta">
                        <span className="windows-folder-name" title={subfolder.name}>
                          {subfolder.name}
                        </span>
                        <span className="windows-folder-count">
                          {subfolder.item_count === 0
                            ? 'Empty folder'
                            : `${subfolder.item_count} ${subfolder.item_count === 1 ? 'item' : 'items'}`}
                        </span>
                      </div>

                      {/* Preview chips on hover */}
                      {subfolder.preview_files && subfolder.preview_files.length > 0 && (
                        <div className="windows-folder-peek-list">
                          {subfolder.preview_files.slice(0, 2).map((item, i) => (
                            <span key={i} className="peek-item">
                              📄 {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
