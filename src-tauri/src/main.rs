// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{CustomMenuItem, Menu, Submenu};

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

fn main() {
    let submenu = Submenu::new("Fichier", Menu::new()
        .add_item(CustomMenuItem::new("new".to_string(), "Nouveau"))
        .add_item(CustomMenuItem::new("open".to_string(), "Ouvrir"))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(CustomMenuItem::new("vider".to_string(), "Vider"))
        .add_item(CustomMenuItem::new("import".to_string(), "Importer"))
        .add_item(CustomMenuItem::new("export".to_string(), "Exporter"))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Quitter")));  

    tauri::Builder::default()
        .menu(Menu::new().add_submenu(submenu))
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "new" => {
                    event.window().emit("backend", Payload { message: "new".to_string() }).unwrap();
                }
                "open" => {
                    event.window().emit("backend", Payload { message: "open".to_string() }).unwrap();
                }
                "vider" => {
                    event.window().emit("backend", Payload { message: "clean".to_string() }).unwrap();
                }
                "export" => {
                    event.window().emit("backend", Payload { message: "export".to_string() }).unwrap();
                }
                "import" => {
                    event.window().emit("backend", Payload { message: "import".to_string() }).unwrap();
                }
                "quit" => {
                    event.window().close().unwrap();
                }
                _ => {}
            }
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
