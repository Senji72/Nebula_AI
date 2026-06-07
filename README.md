# Nebula AI

Nebula AI es un prototipo web para interpretar y analizar circuitos exportados desde CircuitJS1.

## Modos

- Modo Basico: detecta errores comunes, cortos, nodos sueltos y polaridad dudosa.
- Modo Avanzado: sugiere mejoras de diseno, valores estandar y protecciones utiles.
- Modo Completo: combina errores criticos y optimizaciones en un diagnostico integral.

## Uso

1. Abre `index.html` en el navegador.
2. Selecciona Modo Earth, Spaceship o Ether.
3. En CircuitJS1 usa **Archivo > Exportar en formato texto...**, o copia XML con raiz `<cir>`.
4. Pega el contenido en Nebula, o pulsa **Cargar demo**.
5. Presiona **Analizar**.

Nebula acepta texto de CircuitJS1, XML `<cir>` y JSON.

## Motor De Interpretacion

Al analizar, Nebula crea un modelo interno del circuito:

- normaliza componentes y terminales;
- conserva coordenadas cuando existen;
- une nodos conectados por cables;
- clasifica el circuito como analogico, digital, mixto o desconocido;
- genera una vista previa SVG dentro de la aplicacion;
- agrega un resumen tecnico al panel de resultados y al prompt de LM Studio.

## LM Studio

El prototipo incluye analisis local de respaldo y conexion opcional a LM Studio.

1. Abre el panel **Conexion opcional con LM Studio**.
2. Confirma el endpoint, por defecto `http://localhost:1234/v1/chat/completions`.
3. Activa **Enviar analisis a LM Studio**.
4. Ejecuta el analisis.

Si LM Studio no responde, Nebula muestra el analisis local sin perder el flujo.

## Archivos

- `index.html`: estructura de la interfaz.
- `styles.css`: tema visual cosmico, paneles, preview SVG y microinteracciones.
- `app.js`: parsers, motor de interpretacion, prompts, LM Studio y analisis local.
- `assets/`: imagenes de referencia usadas por la interfaz.
