use std::collections::HashMap;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::utils::{Ep, EpInfo};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DeviceType {
    Cpu,
    Gpu,
    Npu,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub device_type: DeviceType,
    pub name: String,
    pub ep: Vec<EpInfo>,
}

pub fn get_devices() -> Result<HashMap<String, Device>> {
    #[cfg(target_os = "windows")]
    {
        use serde::Deserialize;
        use wmi::{COMLibrary, WMIConnection};

        #[derive(Deserialize, Debug)]
        #[serde(rename = "Win32_VideoController")]
        #[serde(rename_all = "PascalCase")]
        struct VideoController {
            name: String,
            pnp_device_id: String,
        }
        let com_con = COMLibrary::new()?;
        let wmi_con = WMIConnection::new(com_con.into())?;

        let mut results: Vec<VideoController> = wmi_con.query()?;

        results.retain(|gpu| gpu.pnp_device_id.starts_with("PCI"));

        let mut devices = HashMap::new();

        devices.insert(
            "CPU".to_string(),
            Device {
                device_type: DeviceType::Cpu,
                name: "CPU".to_string(),
                ep: vec![EpInfo {
                    ep: Ep::Cpu,
                    id: "cpu".to_string(),
                }],
            },
        );

        for (i, gpu) in results.iter().enumerate() {
            if gpu.name.starts_with("Intel") {
                let mut name = gpu.name.clone();
                let mut count = 0;
                while devices.contains_key(&name) {
                    count += 1;
                    name = format!("{}:{}", gpu.name, count);
                }
                let device = Device {
                    device_type: DeviceType::Gpu,
                    name: gpu.name.clone(),
                    ep: vec![
                        EpInfo {
                            ep: Ep::OpenVINO,
                            id: "gpu".to_string(),
                        },
                        EpInfo {
                            ep: Ep::DirectML,
                            id: i.to_string(),
                        },
                    ],
                };
                devices.insert(name, device);
            } else if gpu.name.starts_with("NVIDIA") {
                continue;
            } else {
                let mut name = gpu.name.clone();
                let mut count = 0;
                while devices.contains_key(&name) {
                    count += 1;
                    name = format!("{}:{}", gpu.name, count);
                }
                let device = Device {
                    device_type: DeviceType::Gpu,
                    name: gpu.name.clone(),
                    ep: vec![EpInfo {
                        ep: Ep::DirectML,
                        id: i.to_string(),
                    }],
                };
                devices.insert(name, device);
            }
        }

        use nvml_wrapper::Nvml;
        if let Ok(nvml) = Nvml::init() {
            let devices_count = nvml.device_count()?;
            for i in 0..devices_count {
                let device = nvml.device_by_index(i)?;
                let gpu_name = device.name()?;
                let compute_cap = device.cuda_compute_capability()?;
                let mut name = gpu_name.clone();
                let mut count = 0;
                while devices.contains_key(&name) {
                    count += 1;
                    name = format!("{}:{}", gpu_name, count);
                }
                if compute_cap.major >= 7 && compute_cap.minor >= 5 {
                    let d = Device {
                        device_type: DeviceType::Gpu,
                        name: gpu_name.clone(),
                        ep: vec![
                            EpInfo {
                                ep: Ep::TensorRT,
                                id: i.to_string(),
                            },
                            EpInfo {
                                ep: Ep::CUDA,
                                id: i.to_string(),
                            },
                        ],
                    };
                    devices.insert(name, d);
                } else {
                    let d = Device {
                        device_type: DeviceType::Gpu,
                        name: gpu_name.clone(),
                        ep: vec![EpInfo {
                            ep: Ep::CUDA,
                            id: i.to_string(),
                        }],
                    };
                    devices.insert(name, d);
                }
            }
        }

        Ok(devices)
    }

    #[cfg(target_os = "linux")]
    {
        let mut devices = HashMap::new();
        devices.insert(
            "CPU".to_string(),
            Device {
                device_type: DeviceType::Cpu,
                name: "CPU".to_string(),
                ep: vec![EpInfo {
                    ep: Ep::Cpu,
                    id: "cpu".to_string(),
                }],
            },
        );
        use nvml_wrapper::Nvml;
        if let Ok(nvml) = Nvml::init() {
            let devices_count = nvml.device_count()?;
            for i in 0..devices_count {
                let device = nvml.device_by_index(i)?;
                let gpu_name = device.name()?;
                let compute_cap = device.cuda_compute_capability()?;
                let mut name = gpu_name.clone();
                let mut count = 0;
                while devices.contains_key(&name) {
                    count += 1;
                    name = format!("{}:{}", gpu_name, count);
                }
                if compute_cap.major >= 7 && compute_cap.minor >= 5 {
                    let d = Device {
                        device_type: DeviceType::Gpu,
                        name: gpu_name.clone(),
                        ep: vec![
                            EpInfo {
                                ep: Ep::TensorRT,
                                id: i.to_string(),
                            },
                            EpInfo {
                                ep: Ep::CUDA,
                                id: i.to_string(),
                            },
                        ],
                    };
                    devices.insert(name, d);
                } else {
                    let d = Device {
                        device_type: DeviceType::Gpu,
                        name: gpu_name.clone(),
                        ep: vec![EpInfo {
                            ep: Ep::CUDA,
                            id: i.to_string(),
                        }],
                    };
                    devices.insert(name, d);
                }
            }
        }

        Ok(devices)
    }

    #[cfg(target_os = "macos")]
    {
        use mac_sys_info::get_mac_sys_info;
        let mut devices = HashMap::new();

        let sys_info = get_mac_sys_info()?;
        let cpu_info = sys_info.cpu_info()?;
        let d = Device {
            name: cpu_info.brand_string.to_string(),
            device_type: match cpu_info.architecture {
                x86_64 => DeviceType::Cpu,
                AppleSi => DeviceType::Npu,
            },
            ep: [EpInfo {
                ep: Ep::CoreML,
                id: "0".to_string(),
            }],
        };
        devices.insert("CPU".to_string(), d);

        Ok(devices)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_gpu() {
        let devices = get_devices().unwrap();
        for device in devices.clone() {
            println!("device: {:?}", device);
        }
        assert!(!devices.is_empty());
    }
}
