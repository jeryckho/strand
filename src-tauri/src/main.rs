// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{CustomMenuItem, Menu, Submenu};
use tauri_plugin_log::LogTarget;

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

fn main() {
    let submenu = Submenu::new("Fichier", Menu::new()
        .add_item(CustomMenuItem::new("new".to_string(), "Nouveau"))
        .add_item(CustomMenuItem::new("open".to_string(), "Ouvrir"))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(CustomMenuItem::new("clean".to_string(), "Vider"))
        .add_item(CustomMenuItem::new("import".to_string(), "Importer"))
        .add_item(CustomMenuItem::new("export".to_string(), "Exporter"))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Quitter")));  

    tauri::Builder::default()
        .menu(Menu::new().add_submenu(submenu).add_item(CustomMenuItem::new("todo".to_string(), "?")))
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "quit" => { event.window().close().unwrap(); }
                id => { event.window().emit("backend", Payload { message: id.to_string() }).unwrap(); }
            }
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
		  .plugin(tauri_plugin_log::Builder::default().targets([
			LogTarget::LogDir,
			LogTarget::Stdout,
			LogTarget::Webview,
	  ]).build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
