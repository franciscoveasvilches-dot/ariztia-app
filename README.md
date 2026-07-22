# Ariztía · Gestión de Proyectos

Aplicación web para gestionar historias, épicas, tareas y subtareas, con
fechas de vencimiento, alertas por correo, múltiples responsables por ítem,
filtro por responsable y reordenamiento manual.

## Puesta en marcha

```bash
npm install
npm start
```

`npm start` compila la interfaz (`src/app.jsx` → `public/app.js`) y arranca el
servidor en el puerto 3000 (o el que indique la variable `PORT`).

## Configuración

Copia `.env.example` como `.env` y complétalo. El correo es opcional: sin
configurar SMTP la app funciona, solo que no envía recordatorios.

## Datos

La base de datos es un archivo `data.json` que el servidor crea automáticamente
la primera vez. En despliegues en la nube usa un **volumen persistente** y
apunta la variable `DATA_DIR` a él para no perder los datos entre despliegues.

Usuario administrador inicial: `fveas@ariztia.com` — **cambia su contraseña
después del primer ingreso**.
