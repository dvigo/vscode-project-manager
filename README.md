# Project Manager

Project Manager es una extension para gestionar y abrir rapidamente tus proyectos frecuentes desde una vista dedicada en VS Code.

## Caracteristicas

- Guarda proyectos de forma persistente usando `globalState` de VS Code.
- Agrupa proyectos por categorias (por ejemplo: `Trabajo`, `Personal`, `Cliente-X`).
- Vista lateral en Activity Bar para navegar y abrir proyectos con un click.
- Comandos para agregar carpeta actual, agregar carpeta externa, abrir y eliminar proyectos.

## Uso rapido

1. Abre el Command Palette (`Cmd+Shift+P`).
2. Ejecuta `Project Manager: Add Current Workspace` para guardar el workspace activo.
3. Ejecuta `Project Manager: Add Folder` para agregar carpetas externas.
4. Abre proyectos desde:
	- `Project Manager: Open Project`.
	- La vista lateral `Projects` en el Activity Bar.

## Comandos disponibles

- `Project Manager: Add Current Workspace`
- `Project Manager: Add Folder`
- `Project Manager: Open Project`
- `Project Manager: Remove Project`
- `Project Manager: Refresh Projects`

## Configuracion

Esta extension contribuye los siguientes settings:

- `projectManager.openInNewWindow`: abre el proyecto en una ventana nueva.
- `projectManager.confirmBeforeRemove`: pide confirmacion antes de eliminar un proyecto guardado.

## Estado actual

Esta version es un MVP inspirado en extensiones como `vscode-projects`. Base ideal para evolucionar con:

- import/export de listas de proyectos,
- proyectos remotos,
- deteccion automatica de repositorios,
- soporte de workspaces multi-root guardados.
