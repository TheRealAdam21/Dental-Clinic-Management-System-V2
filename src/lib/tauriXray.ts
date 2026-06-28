export const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type ScanResult = {
  imported_count: number;
  imported_data_urls: string[];
  imported_file_names: string[];
};

export const getWatchDirectory = async (): Promise<string | null> => {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  const directory = await invoke<string | null>("get_xray_watch_directory");
  return directory;
};

export const setWatchDirectory = async (directory: string): Promise<void> => {
  if (!isTauriRuntime()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_xray_watch_directory", { directory });
};

export const scanInboxForPatient = async (patientId: string): Promise<ScanResult | null> => {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<ScanResult>("scan_xray_inbox_for_patient", { patientId });
};
