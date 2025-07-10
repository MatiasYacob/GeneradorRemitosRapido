let productos = [];
let productosRemito = [];

// Cargar datos al iniciar
window.electronAPI.getData().then(data => {
  productos = data.productos || [];
  actualizarListaProductos();
});

function mostrarVista(vistaId) {
  document.getElementById("vistaProductos").classList.add("d-none");
  document.getElementById("vistaRemito").classList.add("d-none");
  document.getElementById(vistaId).classList.remove("d-none");
}

// Agregar producto a la lista
async function agregarProducto() {
  const id = document.getElementById("prodId").value.trim();
  const nombre = document.getElementById("prodNombre").value.trim();
  const precio = parseFloat(document.getElementById("prodPrecio").value.trim());

  if (!id || !nombre || isNaN(precio)) {
    alert("Completa todos los campos del producto.");
    return;
  }

  if (productos.some(p => p.id === id)) {
    alert("Ya existe un producto con este ID.");
    return;
  }

  productos.push({ id, nombre, precio });
  await window.electronAPI.saveProductos(productos);
  actualizarListaProductos();

  // Limpiar campos
  document.getElementById("prodId").value = "";
  document.getElementById("prodNombre").value = "";
  document.getElementById("prodPrecio").value = "";
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

// Agregar producto al remito
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

  const prod = productos.find(p => p.id === id);
  if (!prod) {
    errorDiv.textContent = "Producto no encontrado. Por favor ingresa un ID correcto.";
    return;
  } else {
    errorDiv.textContent = "";
  }

  if (cantidad < 1 || isNaN(cantidad)) {
    errorDiv.textContent = "Cantidad inválida.";
    return;
  } else {
    errorDiv.textContent = "";
  }

  const existente = productosRemito.find(p => p.id === id);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    productosRemito.push({ ...prod, cantidad });
  }

  document.getElementById("buscarId").value = "";
  document.getElementById("cantidad").value = "1";
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
  const mensajeDiv = document.getElementById("mensaje");

  if (!cliente) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Por favor ingrese el nombre del cliente.</div>`;
    return;
  }
  if (productosRemito.length === 0) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">No hay productos en el remito.</div>`;
    return;
  }

  mensajeDiv.innerHTML = `<div class="alert alert-info">Generando remito...</div>`;

  try {
    // Guardar cliente si no existe
    await window.electronAPI.saveCliente({ nombre: cliente });

    const fecha = new Date().toISOString().split("T")[0];
    const remito = {
      cliente,
      fecha,
      productos: productosRemito.map(p => ({
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio
      }))
    };

    const filePath = await window.electronAPI.exportarRemito(remito);
    const nombreArchivo = filePath.split(/[\\/]/).pop();
    
    mensajeDiv.innerHTML = `
      <div class="alert alert-success">
        Remito guardado como <strong>${nombreArchivo}</strong>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="window.open('file://${filePath.replace(/\\/g, '/')}')">
            Abrir archivo
          </button>
        </div>
      </div>
    `;

    // Limpiar después de guardar
    productosRemito = [];
    actualizarTablaRemito();
    document.getElementById("cliente").value = "";

  } catch (error) {
    mensajeDiv.innerHTML = `<div class="alert alert-danger">Error al generar el archivo: ${error.message}</div>`;
    console.error(error);
  }
}