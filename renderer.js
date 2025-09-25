let productos = [];
let productosRemito = [];
let editModeId = null;


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


function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
  toast.role = "alert";
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);

  // Inicializar con Bootstrap
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();

  // Remover del DOM al cerrarse
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
}






// renderer.js  (sustituir función completa)
async function agregarProducto() {
  const idRaw = document.getElementById("prodId").value;
  const id = (idRaw || "").trim().toUpperCase();
  const nombre = (document.getElementById("prodNombre").value || "").trim();
  const precioStr = (document.getElementById("prodPrecio").value || "").trim().replace(",", ".");
  const precio = Number(precioStr);

  const errorDiv = document.getElementById("errorAgregarProducto");
  errorDiv.textContent = "";

  // Validaciones
  if (!id || !nombre || !Number.isFinite(precio) || precio <= 0) {
    errorDiv.textContent = "Completa todos los campos; el precio debe ser > 0 (usa punto o coma).";
    showToast("Completa todos los campos; precio > 0", "danger");
    return;
  }

  // MODO EDICIÓN
  if (editModeId !== null) {
    if (id !== editModeId && productos.some(p => p.id === id)) {
      errorDiv.textContent = "Ya existe un producto con ese ID.";
      showToast("Ya existe un producto con ese ID", "danger");
      return;
    }
    const idx = productos.findIndex(p => p.id === editModeId);
    if (idx >= 0) productos[idx] = { id, nombre, precio };

    await window.electronAPI.saveProductos(productos);
    actualizarListaProductos();
    cancelarEdicion();
    showToast("Producto actualizado ✏️", "info");
    return;
  }

  // MODO ALTA
  if (productos.some(p => p.id === id)) {
    errorDiv.textContent = "Ya existe un producto con este ID.";
    showToast("Ya existe un producto con este ID", "danger");
    return;
  }

  productos.push({ id, nombre, precio });
  await window.electronAPI.saveProductos(productos);
  actualizarListaProductos();

  // Limpiar
  document.getElementById("prodId").value = "";
  document.getElementById("prodNombre").value = "";
  document.getElementById("prodPrecio").value = "";

  showToast("Producto agregado con éxito ✅", "success");
}






// helper para conservar el filtro actual
function getFiltroActual() {
  const i = document.getElementById("buscarProd");
  return i ? (i.value || "").toLowerCase() : "";
}

// NUEVA versión con filtro
function actualizarListaProductos(filtro = getFiltroActual()) {
  const ul = document.getElementById("listaProductos");
  if (!ul) return;
  ul.innerHTML = "";

  const f = (filtro || "").toLowerCase();

  productos
    .filter(p =>
      !f ||
      p.id.toLowerCase().includes(f) ||
      p.nombre.toLowerCase().includes(f)
    )
    .forEach(prod => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${prod.id} - ${prod.nombre} ($${prod.precio.toFixed(2)})</span>
        <div class="btn-group">
          <button class="btn btn-sm btn-warning" onclick="editarProducto('${prod.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarProducto('${prod.id}')">Eliminar</button>
        </div>
      `;
      ul.appendChild(li);
    });
}

// enganchar input (si existe) y refrescar al tipear
(function wireBuscarProductos(){
  const input = document.getElementById("buscarProd");
  if (input) {
    input.addEventListener("input", e => {
      actualizarListaProductos(e.target.value);
    });
  } else {
    // si aún no está en el DOM (orden de carga), reintentar al próximo tick
    setTimeout(wireBuscarProductos, 0);
  }
})();



// renderer.js  :contentReference[oaicite:2]{index=2}
window.eliminarProducto = async (id) => {
  const ok = await window.electronAPI.confirmDelete("¿Seguro que quieres eliminar este producto?");
  if (!ok) return;

  productos = productos.filter(p => p.id !== id);
  await window.electronAPI.saveProductos(productos);
  actualizarListaProductos();
  showToast("Producto eliminado 🗑️", "warning");
};




window.editarProducto = (id) => {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  // Precargar formulario
  document.getElementById("prodId").value = p.id;
  document.getElementById("prodNombre").value = p.nombre;
  document.getElementById("prodPrecio").value = p.precio;

  // Marcar modo edición
  editModeId = id;

  // Cambiar texto del botón principal y mostrar cancelar
  setBotonGuardarModoEdicion(true);
};

function cancelarEdicion() {
  editModeId = null;
  document.getElementById("prodId").value = "";
  document.getElementById("prodNombre").value = "";
  document.getElementById("prodPrecio").value = "";
  document.getElementById("errorAgregarProducto").textContent = "";
  setBotonGuardarModoEdicion(false);
}

function setBotonGuardarModoEdicion(modo) {
  // Cambiar texto del botón “Agregar Producto” y añadir/quitar “Cancelar”
  const container = document.querySelector('#vistaProductos .card-body'); // tarjeta de alta
  let btnAgregar = container.querySelector('button.btn.btn-success.mt-3');
  if (!btnAgregar) return;

  if (modo) {
    btnAgregar.textContent = "Guardar cambios";
    // Crear botón Cancelar si no existe
    let btnCancel = container.querySelector('#btnCancelarEdicion');
    if (!btnCancel) {
      btnCancel = document.createElement('button');
      btnCancel.id = 'btnCancelarEdicion';
      btnCancel.type = 'button';
      btnCancel.className = 'btn btn-outline-secondary mt-3 ms-2';
      btnCancel.textContent = 'Cancelar';
      btnCancel.onclick = cancelarEdicion;
      btnAgregar.after(btnCancel);
    }
  } else {
    btnAgregar.textContent = "Agregar Producto";
    const btnCancel = container.querySelector('#btnCancelarEdicion');
    if (btnCancel) btnCancel.remove();
  }
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
    showToast("Ese producto no existe ❌", "danger");
    return;
  }
  if (cantidad < 1 || isNaN(cantidad)) {
    errorDiv.textContent = "Cantidad inválida.";
    showToast("La cantidad debe ser mayor a 0", "danger");
    return;
  }
  if (descuento < 0 || descuento > 100) {
    errorDiv.textContent = "Descuento inválido (0-100%).";
    showToast("Descuento inválido (0-100%)", "danger");
    return;
  }

  const existente = productosRemito.find(p => p.id === id);
  if (existente) {
    existente.cantidad += cantidad;
    existente.descuento = descuento;
  } else {
    productosRemito.push({ ...prod, cantidad, descuento });
  }

  document.getElementById("buscarId").value = "";
  document.getElementById("cantidad").value = "1";
  document.getElementById("descuentoProducto").value = "0";
  document.getElementById("buscarId").focus();

  actualizarTablaRemito();
  showToast("Producto agregado al remito 🧾", "success");
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
    showToast("Ingresa el nombre del cliente", "danger");
    return;
  }
  if (productosRemito.length === 0) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">No hay productos en el remito.</div>`;
    showToast("No hay productos en el remito", "danger");
    return;
  }
  if (descuentoGeneral < 0 || descuentoGeneral > 100) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Descuento general inválido (0-100%).</div>`;
    showToast("Descuento general inválido (0-100%)", "danger");
    return;
  }

  mensajeDiv.innerHTML = `<div class="alert alert-info">Generando remito...</div>`;
  showToast("Generando remito…", "info");

  try {
    const datosRemito = {
      cliente: { nombre: cliente, direccion, telefono, saldo },
      descuentoGeneral,
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

    productosRemito = [];
    actualizarTablaRemito();
    document.getElementById("cliente").value = "";
    document.getElementById("direccion").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("saldo").value = "";
    document.getElementById("descuentoGeneral").value = "0";

    showToast("Remito generado correctamente 📂", "success");
  } catch (err) {
    console.error("Error al generar remito:", err);
    mensajeDiv.innerHTML = `
      <div class="alert alert-danger">
        Error al generar el remito:<br>
        ${err.message || "Verifique la consola para más detalles"}
      </div>
    `;
    showToast("Error al generar el remito", "danger");
  }
}

