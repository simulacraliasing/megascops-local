use std::collections::{BTreeSet, HashMap, HashSet};
use std::path::{Path, PathBuf};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use walkdir::{DirEntry, WalkDir};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Bbox {
    pub x1: f32,
    pub y1: f32,
    pub x2: f32,
    pub y2: f32,
    pub score: f32,
    pub class: usize,
}

impl Bbox {
    fn area(&self) -> f32 {
        (self.x2 - self.x1) * (self.y2 - self.y1)
    }
}

fn iou(box1: &Bbox, box2: &Bbox) -> f32 {
    let x1 = box1.x1.max(box2.x1);
    let y1 = box1.y1.max(box2.y1);
    let x2 = box1.x2.min(box2.x2);
    let y2 = box1.y2.min(box2.y2);

    let intersection_area = ((x2 - x1).max(0.0)) * ((y2 - y1).max(0.0));
    let union_area = box1.area() + box2.area() - intersection_area;

    if union_area == 0.0 {
        0.0
    } else {
        intersection_area / union_area
    }
}

pub fn nms(boxes: &mut Vec<Bbox>, agnostic: bool, topk: usize, iou_threshold: f32) -> Vec<Bbox> {
    // Sort boxes by score in descending order
    boxes.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    let mut result = Vec::new();

    if agnostic {
        // Perform agnostic NMS
        while !boxes.is_empty() {
            let best_box = boxes.remove(0);
            result.push(best_box.clone());

            if result.len() >= topk {
                break;
            }

            boxes.retain(|b| iou(&best_box, b) < iou_threshold);
        }
    } else {
        // Perform class-specific NMS
        let mut class_map: std::collections::HashMap<usize, Vec<Bbox>> =
            std::collections::HashMap::new();

        for b in boxes.clone() {
            class_map.entry(b.class).or_insert_with(Vec::new).push(b);
        }

        for (_, mut class_boxes) in class_map {
            while !class_boxes.is_empty() {
                let best_box = class_boxes.remove(0);
                result.push(best_box.clone());

                if result.iter().filter(|b| b.class == best_box.class).count() >= topk {
                    break;
                }

                class_boxes.retain(|b| iou(&best_box, b) < iou_threshold);
            }
        }
    }

    result
}

pub fn sample_evenly<T: Clone>(list: &[T], sample_size: usize) -> Vec<T> {
    let len = list.len();
    if sample_size == 0 || len == 0 {
        return Vec::new();
    }

    let step = len as f64 / sample_size as f64;
    let mut sampled_elements = Vec::with_capacity(sample_size);
    for i in 0..sample_size {
        let index = (i as f64 * step).floor() as usize;
        sampled_elements.push(list[index].clone());
    }
    sampled_elements
}

#[derive(Debug, Clone, Serialize, PartialEq, Hash)]
pub struct FileItem {
    pub folder_id: usize,
    pub file_id: usize,
    pub file_path: PathBuf,
    #[serde(skip_serializing)]
    pub tmp_path: PathBuf,
}

impl<'de> Deserialize<'de> for FileItem {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        // 创建一个临时结构体来反序列化基本字段
        #[derive(Deserialize)]
        struct FileItemTemp {
            folder_id: usize,
            file_id: usize,
            file_path: PathBuf,
            #[serde(default)]
            tmp_path: Option<PathBuf>,
        }

        // 反序列化到临时结构
        let temp = FileItemTemp::deserialize(deserializer)?;

        // 构建完整的 FileItem，设置 tmp_path 等于 file_path
        Ok(FileItem {
            folder_id: temp.folder_id,
            file_id: temp.file_id,
            file_path: temp.file_path.clone(),
            tmp_path: temp.tmp_path.unwrap_or_else(|| temp.file_path.clone()),
        })
    }
}

impl Eq for FileItem {}

impl FileItem {
    pub fn new(
        folder_id: usize,
        file_id: usize,
        file_path: PathBuf,
        tmp_path: Option<PathBuf>,
    ) -> Self {
        match tmp_path {
            Some(tmp_path) => Self {
                folder_id,
                file_id,
                file_path,
                tmp_path: tmp_path,
            },
            None => Self {
                folder_id,
                file_id,
                file_path: file_path.clone(),
                tmp_path: file_path,
            },
        }
    }
}

fn is_skip(entry: &DirEntry) -> bool {
    let skip_dirs = ["Animal", "Person", "Vehicle", "Blank"];
    entry
        .file_name()
        .to_str()
        .map(|s| {
            skip_dirs.contains(&s) || s.starts_with('.') || s == "result.csv" || s == "result.json"
        })
        .unwrap_or(false)
}

pub fn index_files_and_folders(folder_path: &PathBuf) -> Result<HashSet<FileItem>> {
    let mut folder_id: usize = 0;
    let mut file_id: usize = 0;
    let mut file_paths = HashSet::new();

    for entry in WalkDir::new(folder_path)
        .sort_by_file_name()
        .into_iter()
        .filter_entry(|e| !is_skip(e))
    {
        let entry = entry?;
        if entry.file_type().is_dir() {
            folder_id += 1;
        } else if entry.file_type().is_file() {
            if is_video_photo(entry.path()) {
                file_paths.insert(FileItem::new(
                    folder_id,
                    file_id,
                    entry.path().to_path_buf(),
                    None,
                ));
                file_id += 1;
            }
        }
    }

    Ok(file_paths)
}

fn is_video_photo(path: &Path) -> bool {
    if let Some(extension) = path.extension() {
        match extension.to_str().unwrap().to_lowercase().as_str() {
            "mp4" | "avi" | "mkv" | "mov" => true,
            "jpg" | "jpeg" | "png" => true,
            _ => false,
        }
    } else {
        false
    }
}

// EP availability check

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum Ep {
    CoreML,
    TensorRT,
    CUDA,
    OpenVINO,
    DirectML,
    Cpu,
}

impl PartialEq for Ep {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Ep::CoreML, Ep::CoreML) => true,
            (Ep::TensorRT, Ep::TensorRT) => true,
            (Ep::CUDA, Ep::CUDA) => true,
            (Ep::OpenVINO, Ep::OpenVINO) => true,
            (Ep::DirectML, Ep::DirectML) => true,
            (Ep::Cpu, Ep::Cpu) => true,
            _ => false,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EpInfo {
    pub ep: Ep,
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ModelConfig {
    pub name: String,
    pub path: PathBuf,
    pub imgsz: usize,
    pub classes: BTreeSet<String>,
}

impl PartialEq for ModelConfig {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
            && self.path == other.path
            && self.imgsz == other.imgsz
            && self.classes == other.classes
    }
}

impl Eq for ModelConfig {}

#[allow(dead_code)]
impl ModelConfig {
    pub fn class_map(&self) -> HashMap<usize, String> {
        let mut class_map = HashMap::new();
        for (i, class) in self.classes.iter().enumerate() {
            class_map.insert(i, class.clone());
        }
        class_map
    }
}

pub fn load_model_config<P: AsRef<Path>>(config: P) -> Result<ModelConfig> {
    let toml_path = PathBuf::from(config.as_ref());
    let base_dir = toml_path.parent().unwrap().parent().unwrap();
    let toml_str = std::fs::read_to_string(toml_path.clone())?;
    let mut model_config: ModelConfig = toml::from_str(&toml_str)?;
    model_config.path = base_dir.join(&model_config.path);
    Ok(model_config)
}
