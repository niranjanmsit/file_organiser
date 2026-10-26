# File Organiser (Tauri v2 + React)

A cross-platform desktop application built with **Tauri v2** and **React (TypeScript)** to organize, sort, and move files across drives and folders on Windows and macOS.

## Project Structure

```text
file_organiser/
├── package.json          # Frontend dependencies & Tauri CLI
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite dev server configuration
├── index.html            # Web entry point
├── src/
│   ├── main.tsx          # React application root
│   ├── App.tsx           # Drive selection, folder picker, & metadata dashboard
│   ├── App.css           # Modern dark-mode styling & layout
│   └── index.css         # Global tokens & typography
└── src-tauri/
    ├── Cargo.toml        # Rust dependencies (tauri, walkdir, serde, dialog plugin)
    ├── tauri.conf.json   # Tauri v2 desktop window & permissions config
    ├── build.rs          # Tauri build script
    └── src/
        ├── main.rs       # Native desktop bootstrap
        └── lib.rs        # Rust commands: `get_system_drives`, `inspect_folder`
```

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **Rust** (`rustup`, `cargo`)
3. **C++ Build Tools**:
   - Windows: Visual Studio C++ Build Tools
   - macOS: Xcode Command Line Tools (`xcode-select --install`)

## Getting Started

1. **Install Frontend Dependencies**:
   ```bash
   cd file_organiser
   npm install
   ```

2. **Run in Desktop Mode (Tauri + React)**:
   ```bash
   npm run tauri dev
   ```

3. **Run Web UI Only (Browser Preview with mock data)**:
   ```bash
   npm run dev
   ```
