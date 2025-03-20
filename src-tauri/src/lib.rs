use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use anyhow::Result;
use crossbeam_channel::{bounded, unbounded};
use log::error;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_store::StoreExt;

pub mod detect;
pub mod ep;
pub mod export;
pub mod io;
pub mod media;
pub mod utils;

pub use detect::{detect_worker, DetectConfig};
pub use ep::get_devices;
pub use export::{export, export_worker, parse_export_csv, ExportFrame};
pub use media::media_worker;
use utils::Ep;
pub use utils::{index_files_and_folders, load_model_config, FileItem};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EpConfig {
    pub ep: Ep,
    pub workers: usize,
    pub device: String,
    pub id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectOptions {
    pub selected_folder: String,
    pub model: String,
    pub resume_path: Option<String>,
    pub guess: bool,
    pub ep: Vec<EpConfig>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigOptions {
    pub confidence_threshold: f32,
    pub iou_threshold: f32,
    pub export_format: ExportFormat,
    pub max_frames: Option<usize>,
    pub iframe_only: bool,
    pub check_point: usize,
    pub buffer_path: Option<String>,
    pub buffer_size: usize,
    pub batch_size: usize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub detect_options: DetectOptions,
    pub config_options: ConfigOptions,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
pub enum ExportFormat {
    Json,
    Csv,
}

async fn process(config: Config, progress_sender: crossbeam_channel::Sender<usize>) -> Result<()> {
    cleanup_buffer(&config.config_options.buffer_path)?;

    if config.config_options.check_point == 0 {
        log::error!("Checkpoint should be greater than 0");
        return Ok(());
    }

    let folder_path = std::path::PathBuf::from(&config.detect_options.selected_folder);
    let folder_path = std::fs::canonicalize(folder_path)?;

    let model_config =
        load_model_config(config.detect_options.model).expect("Failed to load model config");

    let imgsz = model_config.imgsz;
    let max_frames = config.config_options.max_frames;
    let start = Instant::now();

    let mut file_paths = utils::index_files_and_folders(&folder_path)?;

    let export_data = Arc::new(Mutex::new(Vec::new()));

    let file_paths = match config.detect_options.resume_path {
        Some(checkpoint_path) => {
            let all_files =
                resume_from_checkpoint(&checkpoint_path, &mut file_paths, &export_data)?;
            all_files.to_owned()
        }
        None => file_paths,
    };

    let mut detect_handles = vec![];

    let mut export_handles = vec![];

    let mut worker_sum = 0;
    for ep in &config.detect_options.ep {
        worker_sum += ep.workers;
    }

    let (array_q_s, array_q_r) = bounded(config.config_options.batch_size * worker_sum * 2);

    let (export_q_s, export_q_r) = unbounded();

    let checkpoint_counter = Arc::new(Mutex::new(0 as usize));

    for d in config.detect_options.ep.iter() {
        let detect_config = Arc::new(DetectConfig {
            device: d.id.clone(),
            ep: d.ep.clone(),
            model_path: model_config.path.clone(),
            target_size: model_config.imgsz,
            class_map: model_config.class_map(),
            iou_thres: config.config_options.iou_threshold,
            conf_thres: config.config_options.confidence_threshold,
            batch_size: config.config_options.batch_size,
            timeout: 50,
        });
        for _ in 0..d.workers {
            let detect_config = Arc::clone(&detect_config);
            let array_q_r = array_q_r.clone();
            let export_q_s = export_q_s.clone();
            let detect_handle = detect_worker(detect_config, array_q_r, export_q_s);
            detect_handles.push(detect_handle);
        }
    }

    for _ in 0..4 {
        let export_q_r = export_q_r.clone();
        let export_data = Arc::clone(&export_data);
        let folder_path = folder_path.clone();
        let checkpoint_counter = Arc::clone(&checkpoint_counter);
        let export_handle = std::thread::spawn(move || {
            export_worker(
                config.config_options.check_point,
                &checkpoint_counter,
                &config.config_options.export_format,
                &folder_path,
                export_q_r,
                &export_data,
            );
        });
        export_handles.push(export_handle);
    }

    let (io_q_s, io_q_r) = bounded(config.config_options.buffer_size);

    let progress_sender_clone = progress_sender.clone();

    match &config.config_options.buffer_path {
        Some(buffer_path) => {
            let buffer_path = std::path::PathBuf::from(buffer_path);
            std::fs::create_dir_all(&buffer_path)?;
            let buffer_path = std::fs::canonicalize(buffer_path)?;

            let io_handle = std::thread::spawn(move || {
                for file in file_paths.iter() {
                    io::io_worker(&buffer_path, file, io_q_s.clone()).unwrap();
                }
                drop(io_q_s);
            });

            io_q_r.iter().par_bridge().for_each(|file| {
                let array_q_s = array_q_s.clone();
                media_worker(
                    file,
                    imgsz,
                    config.config_options.iframe_only,
                    max_frames,
                    array_q_s,
                    progress_sender_clone.clone(),
                );
            });
            io_handle.join().unwrap();
        }
        None => {
            file_paths.par_iter().for_each(|file| {
                let array_q_s = array_q_s.clone();
                media_worker(
                    file.clone(),
                    imgsz,
                    config.config_options.iframe_only,
                    max_frames,
                    array_q_s,
                    progress_sender_clone.clone(),
                );
            });
        }
    }

    drop(array_q_s);

    for d_handle in detect_handles {
        match d_handle.join() {
            Ok(_) => {}
            Err(e) => {
                error!("Error joining detect worker: {:?}", e);
                std::process::exit(1);
            }
        }
    }

    drop(export_q_s);

    for e_handle in export_handles {
        match e_handle.join() {
            Ok(_) => {}
            Err(e) => {
                error!("Error joining export worker: {:?}", e);
                std::process::exit(1);
            }
        }
    }

    export(
        &folder_path,
        export_data,
        &config.config_options.export_format,
    )?;

    cleanup_buffer(&config.config_options.buffer_path)?;

    log::info!("Elapsed time: {:?}", start.elapsed());
    Ok(())
}

fn cleanup_buffer(buffer_path: &Option<String>) -> Result<()> {
    if let Some(path) = buffer_path {
        let path = std::path::PathBuf::from(path);
        if path.exists() {
            std::fs::remove_dir_all(path)?;
        }
    }
    Ok(())
}

fn resume_from_checkpoint<'a>(
    checkpoint_path: &str,
    all_files: &'a mut HashSet<FileItem>,
    export_data: &Arc<Mutex<Vec<ExportFrame>>>,
) -> Result<&'a mut HashSet<FileItem>> {
    let checkpoint = Path::new(checkpoint_path);
    if !checkpoint.exists() {
        log::error!("Checkpoint file does not exist");
        return Err(anyhow::anyhow!("Checkpoint file does not exist"));
    }
    if !checkpoint.is_file() {
        log::error!("Checkpoint path is not a file");
        return Err(anyhow::anyhow!("Checkpoint path is not a file"));
    }
    match checkpoint.extension() {
        Some(ext) => {
            let ext = ext.to_str().unwrap();
            if ext != "json" && ext != "csv" {
                log::error!("Invalid checkpoint file extension: {}", ext);
                return Err(anyhow::anyhow!(
                    "Invalid checkpoint file extension: {}",
                    ext
                ));
            } else {
                let frames;
                if ext == "json" {
                    let json = std::fs::read_to_string(checkpoint)?;
                    frames = serde_json::from_str(&json)?;
                } else {
                    frames = parse_export_csv(checkpoint)?;
                }
                let mut file_frame_count = HashMap::new();
                let mut file_total_frames = HashMap::new();
                for f in &frames {
                    let file = &f.file;
                    let count = file_frame_count.entry(file.clone()).or_insert(0);
                    *count += 1;
                    file_total_frames
                        .entry(file.clone())
                        .or_insert(f.total_frames);

                    if let Some(total_frames) = file_total_frames.get(&file) {
                        if let Some(frame_count) = file_frame_count.get(&file) {
                            if total_frames == frame_count {
                                all_files.remove(&file);
                            }
                        }
                    }
                }
                export_data.lock().unwrap().extend_from_slice(&frames);
                Ok(all_files)
            }
        }
        None => {
            log::error!("Invalid checkpoint file extension");
            return Err(anyhow::anyhow!("Invalid checkpoint file extension"));
        }
    }
}

#[tauri::command]
async fn list_devices(app: AppHandle) {
    if let Ok(devices) = get_devices() {
        app.emit("devices", devices).unwrap();
    }
}

#[tauri::command]
async fn process_media(app: AppHandle, config: Config) {
    let (progress_sender, progress_receiver) = crossbeam_channel::bounded(5);

    let total_files;

    match crate::utils::index_files_and_folders(&PathBuf::from(
        &config.detect_options.selected_folder,
    )) {
        Ok(files) => {
            total_files = files.len();
        }
        Err(e) => {
            log::error!("{}", e);
            app.emit("detect-error", e.to_string()).unwrap();
            return;
        }
    }

    let app_clone = app.clone();

    let progress_thread = std::thread::spawn(move || {
        let mut progress = 0.0;
        for _ in progress_receiver.iter() {
            progress += 1.0 / total_files as f32 * 100.0;
            app_clone
                .emit("detect-progress", progress as usize)
                .unwrap();
        }
    });

    match process(config, progress_sender).await {
        Ok(_) => {
            app.emit("detect-complete", 1).unwrap();
        }
        Err(e) => {
            app.emit("detect-error", e.to_string()).unwrap();
            log::error!("Error processing: {}", e);
        }
    }
    progress_thread.join().unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .filter(|metadata| metadata.target() != "hyper")
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![process_media, list_devices])
        .setup(|app| {
            let _ = app.store("store.json")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
