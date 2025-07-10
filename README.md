# Generador de Remitos Rápido ⚡

![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Excel](https://img.shields.io/badge/Microsoft_Excel-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

## 📝 Descripción
Aplicación de escritorio para generación automática de remitos en formato Excel, desarrollada con:

- **Electron** para el entorno de escritorio multiplataforma
- **ExcelJS** para la generación de archivos Excel
- **JavaScript** ES6+ para toda la lógica

## 🚀 Características Principales
| Función | Tecnología |
|---------|------------|
| Interfaz gráfica | Electron + HTML/CSS |
| Proceso principal | Electron Main Process |
| Manipulación de Excel | ExcelJS |
| Persistencia de datos | JSON + FS module |

## 🛠️ Configuración de Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Generar iconos (requiere archivo icon.png de 1024x1024px)
npm run build-icons

# Compilar para producción
npm run dist
✨ Características
🖨️ Generación de remitos numerados automáticamente

📝 Gestión de clientes y productos

💰 Cálculo automático de totales

📁 Exportación a Excel con formato profesional

🗃️ Historial de remitos generados

🛠️ Requisitos Técnicos
Node.js v16+

npm v8+

Electron v28+

🚀 Instalación
bash
# Clonar repositorio
git clone https://github.com/MatiasYacob/GeneradorRemitosRapido.git

# Instalar dependencias
cd GeneradorRemitosRapido
npm install

# Iniciar aplicación
npm start
🖥️ Uso
Agregar clientes y productos desde las secciones correspondientes

Seleccionar cliente y productos para el remito

Hacer clic en "Generar Remito"

El archivo se guardará en la carpeta /remitos

🏗️ Compilación
bash
# Generar ejecutable
npm run dist

# Los archivos compilados se generan en /dist
🔄 Historial de Versiones
v1.0.0: Versión inicial con funcionalidad básica de generación de remitos

🐛 Reportar Problemas
Si encuentras algún error, por favor abre un issue en el repositorio.

🤝 Contribuciones
Las contribuciones son bienvenidas. Haz fork del proyecto y envía un pull request.