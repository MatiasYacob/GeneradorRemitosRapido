const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Paths
const dataFile = path.join(__dirname, 'data.json');
const remitoCounterFile = path.join(__dirname, 'remitoCounter.json');
const remitosFolder = path.join(__dirname, 'remitos');

if (!fs.existsSync(remitosFolder)) {
  fs.mkdirSync(remitosFolder, { recursive: true });
}

try {
  fs.accessSync(remitosFolder, fs.constants.W_OK);
} catch (err) {
  console.error('No hay permisos para escribir en la carpeta remitos:', err);
  app.quit();
}

let appData = {
  clientes: [],
  productos: [],
  remitos: []
};

let remitoCounter = {
  count: 1,
  lastDate: new Date().toISOString().split('T')[0]
};

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

function saveData() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(appData, null, 2));
    fs.writeFileSync(remitoCounterFile, JSON.stringify(remitoCounter, null, 2));
  } catch (err) {
    console.error('Error al guardar datos:', err);
  }
}

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

async function generateRemitoExcel(remito) {
  // Normalización de datos del cliente
  const cliente = {
    nombre: remito.cliente?.nombre || remito.cliente || 'Cliente no especificado',
    direccion: remito.cliente?.direccion || 'No especificada',
    telefono: remito.cliente?.telefono || 'No especificado',
    saldo: parseFloat(remito.cliente?.saldo) || 0
  };

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Remito');

  // Definición de estilos completos con bordes
  const baseStyle = {
    border: {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    },
    alignment: { vertical: 'middle', wrapText: true }
  };

  const styles = {
    header: {
      ...baseStyle,
      font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } },
      alignment: { ...baseStyle.alignment, horizontal: 'center' }
    },
    title: {
      ...baseStyle,
      font: { bold: true, size: 16 },
      alignment: { ...baseStyle.alignment, horizontal: 'center' }
    },
    warning: {
      ...baseStyle,
      font: { bold: true, color: { argb: 'FFFF0000' } },
      alignment: { ...baseStyle.alignment, horizontal: 'center' }
    },
    label: {
      ...baseStyle,
      font: { bold: true },
      alignment: { ...baseStyle.alignment, horizontal: 'left' }
    },
    data: {
      ...baseStyle,
      alignment: { ...baseStyle.alignment, horizontal: 'right' }
    },
    centerData: {
      ...baseStyle,
      alignment: { ...baseStyle.alignment, horizontal: 'center' }
    },
    total: {
      ...baseStyle,
      font: { bold: true, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    },
    saldo: {
      ...baseStyle,
      font: { bold: true, size: 14, color: { argb: 'FFC00000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
    }
  };

  // Configuración de columnas
  worksheet.columns = [
    { width: 20 }, // Producto
    { width: 12 }, // Cantidad
    { width: 16 }, // Precio Unitario
    { width: 14 }, // Descuento %
    { width: 16 }  // Subtotal
  ];

  // Aplicar bordes a todas las celdas vacías
  const applyBordersToEmptyCells = (startRow, endRow) => {
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getRow(row).getCell(col);
        if (!cell.value) {
          cell.style = baseStyle;
        }
      }
    }
  };

  // Encabezados
  const remitoNumber = getNextRemitoNumber();
  const today = new Date().toISOString().split('T')[0];

  // Título y número de remito (Fila 1-3)
  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = 'DISTRIBUIDORA DEL SOL';
  worksheet.getCell('A1').style = styles.title;

  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = 'REMITO';
  worksheet.getCell('A2').style = { ...styles.title, font: { ...styles.title.font, size: 18 } };

  worksheet.mergeCells('A3:E3');
  worksheet.getCell('A3').value = 'NO VÁLIDO COMO FACTURA';
  worksheet.getCell('A3').style = styles.warning;

  // Información del cliente (Fila 4-8)
  // Fila 4: Número de remito
  worksheet.mergeCells('A4:B4');
  worksheet.getCell('A4').value = 'Número de Remito:';
  worksheet.getCell('A4').style = styles.label;
  worksheet.mergeCells('C4:E4');
  worksheet.getCell('C4').value = remitoNumber;
  worksheet.getCell('C4').style = styles.data;

  // Fila 5: Fecha
  worksheet.mergeCells('A5:B5');
  worksheet.getCell('A5').value = 'Fecha:';
  worksheet.getCell('A5').style = styles.label;
  worksheet.mergeCells('C5:E5');
  worksheet.getCell('C5').value = today;
  worksheet.getCell('C5').style = styles.data;

  // Fila 6: Cliente
  worksheet.mergeCells('A6:B6');
  worksheet.getCell('A6').value = 'Cliente:';
  worksheet.getCell('A6').style = styles.label;
  worksheet.mergeCells('C6:E6');
  worksheet.getCell('C6').value = cliente.nombre;
  worksheet.getCell('C6').style = styles.data;

  // Fila 7: Dirección
  worksheet.mergeCells('A7:B7');
  worksheet.getCell('A7').value = 'Dirección:';
  worksheet.getCell('A7').style = styles.label;
  worksheet.mergeCells('C7:E7');
  worksheet.getCell('C7').value = cliente.direccion;
  worksheet.getCell('C7').style = styles.data;

  // Fila 8: Teléfono
  worksheet.mergeCells('A8:B8');
  worksheet.getCell('A8').value = 'Teléfono:';
  worksheet.getCell('A8').style = styles.label;
  worksheet.mergeCells('C8:E8');
  worksheet.getCell('C8').value = cliente.telefono;
  worksheet.getCell('C8').style = styles.data;

  // Aplicar bordes a celdas vacías en las filas 1-8
  applyBordersToEmptyCells(1, 8);

  // Espaciador (Fila 9)
  worksheet.getRow(9).height = 10;
  applyBordersToEmptyCells(9, 9);

  // Encabezados de productos (Fila 10)
  const headers = ['Producto', 'Cantidad', 'Precio Unitario', 'Descuento %', 'Subtotal'];
  const headerRow = worksheet.getRow(10);
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.style = styles.header;
  });

  // Detalle de productos (desde Fila 11)
  let currentRow = 11;
  let total = 0;

  remito.productos.forEach((prod) => {
    const row = worksheet.getRow(currentRow);
    const cantidad = prod.cantidad || 1;
    const precio = prod.precio || 0;
    const descuento = prod.descuento || 0;
    const subtotalSinDescuento = precio * cantidad;
    const descuentoMonto = subtotalSinDescuento * (descuento / 100);
    const subtotal = subtotalSinDescuento - descuentoMonto;

    total += subtotal;

    row.values = [
      prod.nombre,
      cantidad,
      `$${precio.toFixed(2)}`,
      `${descuento.toFixed(2)}%`,
      `$${subtotal.toFixed(2)}`
    ];

    row.eachCell((cell, colNumber) => {
      cell.style = {
        ...styles.data,
        alignment: { 
          ...styles.data.alignment,
          horizontal: colNumber === 2 ? 'center' : 'right' 
        }
      };
    });

    currentRow++;
  });

  // Total (Fila siguiente)
  const totalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  totalRow.getCell('A').value = 'TOTAL:';
  totalRow.getCell('A').style = { ...styles.total, alignment: { horizontal: 'right' } };
  totalRow.getCell('E').value = `$${total.toFixed(2)}`;
  totalRow.getCell('E').style = styles.total;
  applyBordersToEmptyCells(currentRow, currentRow);
  currentRow++;

  // Saldo del cliente (si es diferente de cero)
  if (cliente.saldo !== 0) {
    const saldoRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    saldoRow.getCell('A').value = 'SALDO DEL CLIENTE:';
    saldoRow.getCell('A').style = { ...styles.saldo, alignment: { horizontal: 'right' } };
    saldoRow.getCell('E').value = `$${cliente.saldo.toFixed(2)}`;
    saldoRow.getCell('E').style = styles.saldo;
    applyBordersToEmptyCells(currentRow, currentRow);
    currentRow++;
  }

  // Asegurar bordes en todas las celdas utilizadas
  for (let row = 1; row < currentRow; row++) {
    const worksheetRow = worksheet.getRow(row);
    for (let col = 1; col <= 5; col++) {
      const cell = worksheetRow.getCell(col);
      if (!cell.style || !cell.style.border) {
        cell.style = baseStyle;
      }
    }
  }

  // Guardar archivo
  const safeCliente = cliente.nombre.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  const fileName = `${remitoNumber}_${safeCliente}.xlsx`;
  const filePath = path.join(remitosFolder, fileName);

  try {
    await workbook.xlsx.writeFile(filePath);

    // Registrar en el historial
    appData.remitos.push({
      ...remito,
      numero: remitoNumber,
      archivo: fileName,
      rutaCompleta: filePath,
      fechaGeneracion: new Date().toISOString(),
      total,
      cliente
    });
    saveData();

    return filePath;
  } catch (error) {
    console.error('Error al guardar el archivo Excel:', error);
    throw new Error(`No se pudo guardar el archivo: ${error.message}`);
  }
}











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

// IPC handlers

ipcMain.handle('get-data', () => appData);

ipcMain.handle('save-productos', (event, productos) => {
  appData.productos = productos;
  saveData();
});

ipcMain.handle('save-cliente', (event, cliente) => {
  // Agregar cliente solo si no existe (por nombre)
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
