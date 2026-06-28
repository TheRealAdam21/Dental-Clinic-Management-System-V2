use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, State};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};

#[derive(Default)]
struct XrayWatcherState {
  watch_directory: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize)]
struct WatchConfig {
  watch_directory: Option<String>,
}

#[derive(Serialize)]
struct ScanResult {
  imported_data_urls: Vec<String>,
  imported_file_names: Vec<String>,
  imported_count: usize,
}

fn is_image_file(path: &Path) -> bool {
  path
    .extension()
    .and_then(|e| e.to_str())
    .map(|ext| matches!(ext.to_lowercase().as_str(), "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp"))
    .unwrap_or(false)
}

fn mime_from_extension(path: &Path) -> &'static str {
  match path
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.to_lowercase())
    .as_deref()
  {
    Some("jpg") | Some("jpeg") => "image/jpeg",
    Some("png") => "image/png",
    Some("webp") => "image/webp",
    Some("gif") => "image/gif",
    Some("bmp") => "image/bmp",
    _ => "application/octet-stream",
  }
}

fn config_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_config_dir()
    .map_err(|e| format!("Could not resolve app config dir: {e}"))?;
  if !dir.exists() {
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create app config dir: {e}"))?;
  }
  Ok(dir.join("xray-watcher.json"))
}

fn load_watch_directory(app: &tauri::AppHandle) -> Option<String> {
  let config_path = config_file_path(app).ok()?;
  let content = fs::read_to_string(config_path).ok()?;
  let parsed: WatchConfig = serde_json::from_str(&content).ok()?;
  parsed.watch_directory
}

fn save_watch_directory(app: &tauri::AppHandle, watch_directory: Option<String>) -> Result<(), String> {
  let config_path = config_file_path(app)?;
  let payload = serde_json::to_string_pretty(&WatchConfig { watch_directory })
    .map_err(|e| format!("Could not serialize watch config: {e}"))?;
  fs::write(config_path, payload).map_err(|e| format!("Could not save watch config: {e}"))?;
  Ok(())
}

#[tauri::command]
fn set_xray_watch_directory(
  app: tauri::AppHandle,
  state: State<XrayWatcherState>,
  directory: String,
) -> Result<(), String> {
  let path = Path::new(&directory);
  if !path.exists() || !path.is_dir() {
    return Err("Selected path is not a valid directory".to_string());
  }

  {
    let mut guard = state
      .watch_directory
      .lock()
      .map_err(|_| "Could not lock watcher state".to_string())?;
    *guard = Some(directory.clone());
  }

  save_watch_directory(&app, Some(directory))?;
  Ok(())
}

#[tauri::command]
fn get_xray_watch_directory(state: State<XrayWatcherState>) -> Result<Option<String>, String> {
  let guard = state
    .watch_directory
    .lock()
    .map_err(|_| "Could not lock watcher state".to_string())?;
  Ok(guard.clone())
}

#[tauri::command]
fn scan_xray_inbox_for_patient(
  state: State<XrayWatcherState>,
  patient_id: String,
) -> Result<ScanResult, String> {
  let watch_directory = {
    let guard = state
      .watch_directory
      .lock()
      .map_err(|_| "Could not lock watcher state".to_string())?;
    guard.clone()
  };

  let directory = watch_directory.ok_or_else(|| "No watch directory configured".to_string())?;
  let inbox_path = PathBuf::from(directory);
  if !inbox_path.exists() || !inbox_path.is_dir() {
    return Err("Watch directory no longer exists".to_string());
  }

  let processed_dir = inbox_path.join("_processed").join(patient_id);
  fs::create_dir_all(&processed_dir).map_err(|e| format!("Could not create processed folder: {e}"))?;

  let mut data_urls = Vec::new();
  let mut file_names = Vec::new();

  for entry in fs::read_dir(&inbox_path).map_err(|e| format!("Could not read watch directory: {e}"))? {
    let entry = entry.map_err(|e| format!("Could not read file entry: {e}"))?;
    let path = entry.path();

    if !path.is_file() || !is_image_file(&path) {
      continue;
    }

    let bytes = fs::read(&path).map_err(|e| format!("Could not read image file: {e}"))?;
    let mime = mime_from_extension(&path);
    let encoded = BASE64.encode(bytes);
    let data_url = format!("data:{mime};base64,{encoded}");
    data_urls.push(data_url);

    let file_name = path
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or("xray-image")
      .to_string();
    file_names.push(file_name.clone());

    let mut destination = processed_dir.join(&file_name);
    if destination.exists() {
      let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("xray");
      let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png");
      let unique_name = format!("{stem}-{}.{}", chrono_like_timestamp(), ext);
      destination = processed_dir.join(unique_name);
    }

    fs::rename(&path, destination).map_err(|e| format!("Could not move processed file: {e}"))?;
  }

  Ok(ScanResult {
    imported_count: data_urls.len(),
    imported_data_urls: data_urls,
    imported_file_names: file_names,
  })
}

fn chrono_like_timestamp() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let millis = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis())
    .unwrap_or(0);
  millis.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let initial_watch_directory = load_watch_directory(app.handle());
      app.manage(XrayWatcherState {
        watch_directory: Mutex::new(initial_watch_directory),
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      set_xray_watch_directory,
      get_xray_watch_directory,
      scan_xray_inbox_for_patient
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
