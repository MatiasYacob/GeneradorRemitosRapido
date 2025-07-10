const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Configuración de paths
const dataFile = path.join(__dirname, 'data.json');
const remitoCounterFile = path.join(__dirname, 'remitoCounter.json');
const remitosFolder = path.join(__dirname, 'remitos'); // Carpeta en la raíz

// Verificar y crear carpeta remitos si no existe
if (!fs.existsSync(remitosFolder)) {
  fs.mkdirSync(remitosFolder, { recursive: true });
}

// Verificar permisos de escritura
try {
  fs.accessSync(remitosFolder, fs.constants.W_OK);
} catch (err) {
  console.error('Error: No hay permisos para escribir en la carpeta remitos:', err);
  app.quit();
}

// Datos iniciales
let appData = {
  clientes: [],
  productos: [],
  remitos: []
};

// Contador de remitos
let remitoCounter = {
  count: 1,
  lastDate: new Date().toISOString().split('T')[0]
};

// Cargar datos existentes
if (fs.existsSync(dataFile)) {
  try {
    appData = JSON.parse(fs.readFileSync(dataFile));
  } catch (err) {
    console.error('Error al cargar data.json:', err);
  }
}

if (fs.existsSync(remitoCounterFile)) {
  try {
    remitoCounter = JSON.parse(fs.readFileSync(remitoCounterFile));
  } catch (err) {
    console.error('Error al cargar remitoCounter.json:', err);
  }
}

// Función para guardar datos
function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(appData, null, 2));
    fs.writeFileSync(remitoCounterFile, JSON.stringify(remitoCounter, null, 2));
  } catch (err) {
    console.error('Error al guardar datos:', err);
  }
}

// Generador de números de remito
function getNextRemitoNumber() {
  const today = new Date().toISOString().split('T')[0];
  
  if (remitoCounter.lastDate !== today) {
    remitoCounter.count = 1;
    remitoCounter.lastDate = today;
  }
  
  const paddedNumber = remitoCounter.count.toString().padStart(4, '0');
  remitoCounter.count++;
  
  return `REM-${today.replace(/-/g, '')}-${paddedNumber}`;
}

// Función para generar el Excel del remito
async function generateRemitoExcel(remito) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Remito');
  const remitoNumber = getNextRemitoNumber();
  const today = new Date().toISOString().split('T')[0];

  // =================== ESTILOS ===================
  const borderStyle = {
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    },
    alignment: { vertical: 'middle' }
  };

  const headerStyle = {
    font: { bold: true, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } },
    ...borderStyle
  };

  const titleStyle = {
    font: { bold: true, size: 16 },
    alignment: { horizontal: 'center' },
    ...borderStyle
  };

  // =================== CABECERA ===================
  // Nombre de la empresa
  sheet.mergeCells('A1:D1');
  const companyRow = sheet.getRow(1);
  companyRow.height = 30;
  companyRow.getCell(1).value = 'DISTRIBUIDORA DEL SOL';
  companyRow.getCell(1).style = titleStyle;

  // Tipo de documento
  sheet.mergeCells('A2:D2');
  const docTypeRow = sheet.getRow(2);
  docTypeRow.height = 25;
  docTypeRow.getCell(1).value = 'REMITO';
  docTypeRow.getCell(1).style = titleStyle;

  // Datos del remito
  sheet.mergeCells('A3:B3');
  const remitoNumRow = sheet.getRow(3);
  remitoNumRow.getCell(1).value = 'Nro de Remito:';
  remitoNumRow.getCell(1).style = { ...borderStyle, font: { bold: true } };
  remitoNumRow.getCell(3).value = remitoNumber;
  remitoNumRow.getCell(3).style = borderStyle;
  sheet.mergeCells('C3:D3');

  sheet.mergeCells('A4:B4');
  const dateRow = sheet.getRow(4);
  dateRow.getCell(1).value = 'Fecha:';
  dateRow.getCell(1).style = { ...borderStyle, font: { bold: true } };
  dateRow.getCell(3).value = today;
  dateRow.getCell(3).style = borderStyle;
  sheet.mergeCells('C4:D4');

  sheet.mergeCells('A5:D5');
  const clientRow = sheet.getRow(5);
  clientRow.height = 25;
  clientRow.getCell(1).value = 'Cliente: ' + remito.cliente;
  clientRow.getCell(1).style = { ...borderStyle, font: { bold: true } };

  // Espacio antes de la tabla
  sheet.getRow(6).height = 10;

  // =================== TABLA DE PRODUCTOS ===================
  // Encabezados de la tabla
  const headers = ['Producto', 'Cantidad', 'Precio Unitario', 'Total'];
  const headerRow = sheet.getRow(7);
  headerRow.height = 25;
  
  headers.forEach((header, index) => {
    headerRow.getCell(index + 1).value = header;
    headerRow.getCell(index + 1).style = headerStyle;
    sheet.getColumn(index + 1).width = [25, 15, 18, 18][index];
  });

  // Productos
  let currentRow = 8;
  remito.productos.forEach((producto) => {
    const row = sheet.getRow(currentRow);
    const total = producto.precio * producto.cantidad;
    
    row.getCell(1).value = producto.nombre;
    row.getCell(2).value = producto.cantidad;
    row.getCell(3).value = producto.precio;
    row.getCell(4).value = total;
    
    // Aplicar estilos
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.style = borderStyle;
    });
    
    // Formato numérico
    row.getCell(3).style = { ...borderStyle, numFmt: '"$"#,##0.00' };
    row.getCell(4).style = { ...borderStyle, numFmt: '"$"#,##0.00', font: { bold: true } };
    
    currentRow++;
  });

  // =================== TOTAL ===================
  const total = remito.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  const totalRow = sheet.getRow(currentRow);
  totalRow.height = 25;
  
  sheet.mergeCells(`A${currentRow}:C${currentRow}`);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).style = { ...borderStyle, font: { bold: true }, alignment: { horizontal: 'right' } };
  
  totalRow.getCell(4).value = total;
  totalRow.getCell(4).style = { ...borderStyle, numFmt: '"$"#,##0.00', font: { bold: true } };

  // =================== GUARDAR ARCHIVO ===================
  const fileName = `${remitoNumber}_${remito.cliente.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
  const filePath = path.join(remitosFolder, fileName);
  
  try {
    await workbook.xlsx.writeFile(filePath);
    
    // Guardar remito en historial
    appData.remitos.push({
      ...remito,
      numero: remitoNumber,
      archivo: fileName,
      rutaCompleta: filePath,
      fechaGeneracion: new Date().toISOString(),
      total: total
    });
    saveData();

    return filePath;
  } catch (error) {
    console.error('Error al guardar el archivo Excel:', error);
    throw error;
  }
}

// =================== ELECTRON APP ===================
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// =================== MANEJO DE DATOS ===================
ipcMain.handle('get-data', () => {
  return appData;
});

ipcMain.handle('save-productos', (event, productos) => {
  appData.productos = productos;
  saveData();
});

ipcMain.handle('save-cliente', (event, cliente) => {
  if (!appData.clientes.some(c => c.nombre === cliente.nombre)) {
    appData.clientes.push(cliente);
    saveData();
  }
});

ipcMain.handle('exportar-remito', async (event, remito) => {
  try {
    return await generateRemitoExcel(remito);
  } catch (error) {
    console.error('Error al generar el remito:', error);
    throw error;
  }
});

// Nueva función para listar remitos existentes
ipcMain.handle('listar-remitos', () => {
  try {
    const files = fs.readdirSync(remitosFolder)
                  .filter(file => file.endsWith('.xlsx'))
                  .map(file => ({
                    nombre: file,
                    ruta: path.join(remitosFolder, file),
                    fecha: fs.statSync(path.join(remitosFolder, file)).mtime
                  }));
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});