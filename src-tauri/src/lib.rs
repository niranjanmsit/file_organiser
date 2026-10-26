use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubfolderItem {
    pub name: String,
    pub path: String,
    pub item_count: usize,
    pub preview_files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderInfo {
    pub name: String,
    pub path: String,
    pub total_files: usize,
    pub total_folders: usize,
    pub total_size_bytes: u64,
    pub sample_files: Vec<String>,
    pub subfolders: Vec<SubfolderItem>,
}

#[tauri::command]
fn get_system_drives() -> Vec<DriveInfo> {
    let mut drives = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for letter in b'A'..=b'Z' {
            let path_str = format!("{}:\\", letter as char);
            let path = Path::new(&path_str);
            if path.exists() {
                drives.push(DriveInfo {
                    name: format!("Drive ({}:)", letter as char),
                    path: path_str,
                });
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        drives.push(DriveInfo {
            name: "Root (/)".to_string(),
            path: "/".to_string(),
        });
        if let Ok(entries) = fs::read_dir("/Volumes") {
            for entry in entries.flatten() {
                if let Ok(path) = entry.path().into_os_string().into_string() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    drives.push(DriveInfo {
                        name: file_name,
                        path,
                    });
                }
            }
        }
    }

    drives
}

#[tauri::command]
fn inspect_folder(path: String) -> Result<FolderInfo, String> {
    let folder_path = Path::new(&path);
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err("Provided path is not a valid directory".to_string());
    }

    let folder_name = folder_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let mut total_files = 0;
    let mut total_folders = 0;
    let mut total_size_bytes = 0u64;
    let mut sample_files = Vec::new();
    let mut subfolders = Vec::new();

    if let Ok(entries) = fs::read_dir(folder_path) {
        for entry in entries.flatten() {
            let file_type = entry.file_type();
            if let Ok(ft) = file_type {
                if ft.is_file() {
                    total_files += 1;
                    if let Ok(meta) = entry.metadata() {
                        total_size_bytes += meta.len();
                    }
                    if sample_files.len() < 8 {
                        sample_files.push(entry.file_name().to_string_lossy().to_string());
                    }
                } else if ft.is_dir() {
                    total_folders += 1;
                    let sub_path = entry.path();
                    let sub_name = entry.file_name().to_string_lossy().to_string();
                    let mut item_count = 0;
                    let mut previews = Vec::new();
                    if let Ok(sub_entries) = fs::read_dir(&sub_path) {
                        for sub_e in sub_entries.flatten() {
                            item_count += 1;
                            if previews.len() < 3 {
                                previews.push(sub_e.file_name().to_string_lossy().to_string());
                            }
                        }
                    }
                    subfolders.push(SubfolderItem {
                        name: sub_name,
                        path: sub_path.to_string_lossy().to_string(),
                        item_count,
                        preview_files: previews,
                    });
                }
            }
        }
    }

    subfolders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(FolderInfo {
        name: folder_name,
        path,
        total_files,
        total_folders,
        total_size_bytes,
        sample_files,
        subfolders,
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_system_drives, inspect_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
