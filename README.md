# Nebula AI

Nebula AI es un prototipo web para analizar circuitos exportados desde CircuitJS1 con tres modos de revisión:

- ⚡ Modo Básico: detecta errores comunes, cortos, nodos sueltos y polaridad dudosa.
- 🚀 Modo Avanzado: sugiere mejoras de diseño, valores estándar y protecciones útiles.
- 🌌 Modo Completo: combina errores críticos y optimizaciones en un diagnóstico integral.

## Uso

1. Abre `index.html` en el navegador.
2. Selecciona Modo Earth, Spaceship o Ether.
3. En CircuitJS1 usa **Archivo > Exportar en formato texto...**.
4. Copia ese texto y pégalo en Nebula, o pulsa **Cargar demo**.
5. Presiona **Analizar** para ver resultados en el panel Nebula.

Nebula también acepta JSON si más adelante conectas otra fuente de circuitos.

## LM Studio

El prototipo incluye análisis local de respaldo y conexión opcional a LM Studio.

1. Abre el panel **Conexión opcional con LM Studio**.
2. Confirma el endpoint, por defecto `http://localhost:1234/v1/chat/completions`.
3. Activa **Enviar análisis a LM Studio**.
4. Ejecuta el análisis.

Si LM Studio no responde, Nebula muestra el análisis local sin perder el flujo.

## Archivos

- `index.html`: estructura de la interfaz.
- `styles.css`: tema visual cósmico, paneles y microinteracciones.
- `app.js`: selección de modos, prompts, integración LM Studio y análisis local.
- `assets/`: imágenes de referencia usadas por la interfaz.
