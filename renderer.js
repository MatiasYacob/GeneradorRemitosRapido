let productos = [];
let productosRemito = [];

// Cargar datos al iniciar
window.electronAPI.getData().then(data => {
  productos = data.productos || [];
  actualizarListaProductos();
});

function mostrarVista(vistaId) {
  // Actualizar tabs activos
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('active');
  });
  const btn = document.querySelector(`.nav-link[onclick="mostrarVista('${vistaId}')"]`);
  if (btn) btn.classList.add('active');

  // Mostrar solo la vista seleccionada
  document.getElementById("vistaProductos").classList.add("d-none");
  document.getElementById("vistaRemito").classList.add("d-none");
  document.getElementById(vistaId).classList.remove("d-none");
}

// Agregar producto a la lista
async function agregarProducto() {
  const id = document.getElementById("prodId").value.trim();
  const nombre = document.getElementById("prodNombre").value.trim();
  const precio = parseFloat(document.getElementById("prodPrecio").value.trim());
  const errorDiv = document.getElementById("errorAgregarProducto");

  errorDiv.textContent = "";

  if (!id || !nombre || isNaN(precio)) {
    errorDiv.textContent = "Completa todos los campos del producto correctamente.";
    return;
  }

  if (productos.some(p => p.id === id)) {
    errorDiv.textContent = "Ya existe un producto con este ID.";
    return;
  }

  productos.push({ id, nombre, precio });
  await window.electronAPI.saveProductos(productos);
  actualizarListaProductos();

  // Limpiar campos y error
  document.getElementById("prodId").value = "";
  document.getElementById("prodNombre").value = "";
  document.getElementById("prodPrecio").value = "";
  errorDiv.textContent = "";
}

function actualizarListaProductos() {
  const ul = document.getElementById("listaProductos");
  ul.innerHTML = "";
  
  productos.forEach(prod => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${prod.id} - ${prod.nombre} ($${prod.precio.toFixed(2)})</span>
      <button class="btn btn-sm btn-primary" onclick="agregarAlRemito('${prod.id}')">Agregar</button>
    `;
    ul.appendChild(li);
  });
}

// Agregar producto al remito (pone ID en el input y pone foco en cantidad)
function agregarAlRemito(id) {
  const prod = productos.find(p => p.id === id);
  if (prod) {
    document.getElementById("buscarId").value = id;
    document.getElementById("cantidad").focus();
  }
}

function agregarProductoRemito() {
  const id = document.getElementById("buscarId").value.trim();
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const descuento = parseFloat(document.getElementById("descuentoProducto").value) || 0;
  const errorDiv = document.getElementById("errorId");

  errorDiv.textContent = "";

  const prod = productos.find(p => p.id === id);
  if (!prod) {
    errorDiv.textContent = "Producto no encontrado. Por favor ingresa un ID correcto.";
    return;
  }

  if (cantidad < 1 || isNaN(cantidad)) {
    errorDiv.textContent = "Cantidad inválida.";
    return;
  }

  if (descuento < 0 || descuento > 100) {
    errorDiv.textContent = "Descuento inválido (0-100%).";
    return;
  }

  const existente = productosRemito.find(p => p.id === id);
  if (existente) {
    existente.cantidad += cantidad;
    existente.descuento = descuento; // actualizar descuento
  } else {
    productosRemito.push({ ...prod, cantidad, descuento });
  }

  // Limpiar inputs y error
  document.getElementById("buscarId").value = "";
  document.getElementById("cantidad").value = "1";
  document.getElementById("descuentoProducto").value = "0";
  errorDiv.textContent = "";
  document.getElementById("buscarId").focus();

  actualizarTablaRemito();
}

document.getElementById("buscarId").addEventListener("input", () => {
  document.getElementById("errorId").textContent = "";
});

function actualizarTablaRemito() {
  const tbody = document.getElementById("tablaRemito");
  tbody.innerHTML = "";

  let total = 0;

  productosRemito.forEach((prod, index) => {
    const descuento = prod.descuento || 0;
    const subtotalSinDescuento = prod.precio * prod.cantidad;
    const descuentoMonto = subtotalSinDescuento * (descuento / 100);
    const subtotal = subtotalSinDescuento - descuentoMonto;

    total += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod.nombre}</td>
      <td>${prod.cantidad}</td>
      <td>$${prod.precio.toFixed(2)}</td>
      <td>${descuento.toFixed(2)}%</td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminarProductoRemito(${index})">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Aplicar descuento general
  const descuentoGeneral = parseFloat(document.getElementById("descuentoGeneral").value) || 0;
  let totalFinal = total;
  if (descuentoGeneral > 0 && descuentoGeneral <= 100) {
    totalFinal = total * (1 - descuentoGeneral / 100);
  }

  document.getElementById("totalRemito").textContent = `$${totalFinal.toFixed(2)}`;
}

function eliminarProductoRemito(index) {
  productosRemito.splice(index, 1);
  actualizarTablaRemito();
}

// Generar remito
async function generarRemito() {
  const cliente = document.getElementById("cliente").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const saldo = parseFloat(document.getElementById("saldo").value) || 0;
  const descuentoGeneral = parseFloat(document.getElementById("descuentoGeneral").value) || 0;
  const errorCliente = document.getElementById("errorCliente");
  const mensajeDiv = document.getElementById("mensaje");

  errorCliente.textContent = "";
  mensajeDiv.innerHTML = "";

  if (!cliente) {
    errorCliente.textContent = "Por favor ingrese el nombre del cliente.";
    return;
  }
  if (productosRemito.length === 0) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">No hay productos en el remito.</div>`;
    return;
  }
  if (descuentoGeneral < 0 || descuentoGeneral > 100) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Descuento general inválido (0-100%).</div>`;
    return;
  }

  mensajeDiv.innerHTML = `<div class="alert alert-info">Generando remito...</div>`;

  try {
    // Estructura de datos completa y bien organizada
    const datosRemito = {
      cliente: {
        nombre: cliente,
        direccion: direccion,
        telefono: telefono,
        saldo: saldo
      },
      descuentoGeneral: descuentoGeneral,
      productos: productosRemito,
      fecha: new Date().toISOString().split('T')[0]
    };

    await window.electronAPI.exportarRemito(datosRemito);

    mensajeDiv.innerHTML = `
      <div class="alert alert-success">
        Remito generado exitosamente.<br>
        Cliente: ${cliente}<br>
        Total: $${document.getElementById("totalRemito").textContent}
      </div>
    `;

    // Limpiar formulario
    productosRemito = [];
    actualizarTablaRemito();
    document.getElementById("cliente").value = "";
    document.getElementById("direccion").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("saldo").value = "";
    document.getElementById("descuentoGeneral").value = "0";
  } catch (err) {
    console.error("Error al generar remito:", err);
    mensajeDiv.innerHTML = `
      <div class="alert alert-danger">
        Error al generar el remito:<br>
        ${err.message || "Verifique la consola para más detalles"}
      </div>
    `;
  }
}
