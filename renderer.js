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

  const existente = productosRemito.find(p => p.id === id);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    productosRemito.push({ ...prod, cantidad });
  }

  // Limpiar inputs y error
  document.getElementById("buscarId").value = "";
  document.getElementById("cantidad").value = "1";
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
    const subtotal = prod.precio * prod.cantidad;
    total += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${prod.nombre}</td>
      <td>${prod.cantidad}</td>
      <td>$${prod.precio.toFixed(2)}</td>
      <td>$${subtotal.toFixed(2)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="eliminarProductoRemito(${index})">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("totalRemito").textContent = `$${total.toFixed(2)}`;
}

function eliminarProductoRemito(index) {
  productosRemito.splice(index, 1);
  actualizarTablaRemito();
}

// Generar remito
async function generarRemito() {
  const cliente = document.getElementById("cliente").value.trim();
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

  mensajeDiv.innerHTML = `<div class="alert alert-info">Generando remito...</div>`;

  try {
    await window.electronAPI.saveCliente(cliente);
    await window.electronAPI.guardarRemito(cliente, productosRemito);

    mensajeDiv.innerHTML = `<div class="alert alert-success">Remito generado exitosamente.</div>`;

    // Limpiar formulario
    productosRemito = [];
    actualizarTablaRemito();
    document.getElementById("cliente").value = "";
  } catch (err) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al generar el remito.</div>`;
  }
}
