// --- CONEXIÓN CLOUD SUPABASE (CLASE 17) ---
const SUPABASE_URL = "https://whcvvzjapuvjlgmfsafo.supabase.co";
const SUPABASE_KEY = "sb_publishable_3bBt9i5CoVPH-WHaSSKwzw_pg4_HrmB";

let catalogoBodega = [];

async function cargarCatalogoDesdeNube() {
    const etiquetaSkus = document.getElementById("contadorSkus");
    etiquetaSkus.innerHTML = "🔄 Conectando con Bodega Cloud...";

    try {
        const respuesta = await fetch(SUPABASE_URL + "/rest/v1/productos?select=*&order=nombre.asc", {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY
            }
        });

        if (!respuesta.ok) {
            throw new Error("Error HTTP de Supabase: " + respuesta.status);
        }

        const datosNube = await respuesta.json();

        // Adaptador: traduce columnas SQL (snake_case) a formato JS (camelCase)
        catalogoBodega = datosNube.map(function(fila) {
            return {
                id: fila.id,
                nombre: fila.nombre,
                precioNeto: fila.precio_neto,
                stockDisponible: fila.stock_disponible
            };
        });

        filtrarCatalogo();
        actualizarPantallaCarrito();
        renderizarTablaAdmin();

    } catch (error) {
        console.error("Fallo de conexión Cloud:", error);
        etiquetaSkus.innerHTML = "🔴 Sin conexión con Base de Datos Cloud";
    }
}

let carritoCompras = JSON.parse(localStorage.getItem("carritoArrayGuardado")) || [];

let folioCotizacion = localStorage.getItem("folioGuardado");
if (!folioCotizacion) {
    folioCotizacion = "COT-" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("folioGuardado", folioCotizacion);
}

const empresaMemoria = localStorage.getItem("empresaGuardada");
if (empresaMemoria) {
    document.getElementById("inputEmpresa").value = empresaMemoria;
}

cargarCatalogoDesdeNube();

// --- FUNCIONES CLASE 14 Y 15: CRUD Y SEGURIDAD JEFE DE BODEGA ---
const PIN_SUPERVISOR = "2026";
let adminAutenticado = false;
let intentosFallidos = 0;

function alternarPanelAdmin() {
    const panel = document.getElementById("panelAdmin");

    if (panel.style.display === "none") {
        // Barrera 1: Verificar si el panel ya fue bloqueado por exceso de intentos
        if (intentosFallidos >= 3) {
            alert("🚨 ACCESO BLOQUEADO POR SEGURIDAD: Superaste los 3 intentos fallidos. Recarga la página para reiniciar.");
            return;
        }

        // Barrera 2: Solicitar PIN si aún no está autenticado
        if (!adminAutenticado) {
            const pinIngresado = prompt("🔐 ACCESO RESTRINGIDO — Ingresa el PIN de Jefe de Bodega (Intento " + (intentosFallidos + 1) + " de 3):");

            if (pinIngresado !== PIN_SUPERVISOR) {
                intentosFallidos++;
                const restantes = 3 - intentosFallidos;

                if (restantes > 0) {
                    alert("❌ PIN incorrecto. Te quedan " + restantes + " intento(s).");
                } else {
                    alert("🚨 PIN incorrecto. Has agotado tus 3 intentos. Panel bloqueado.");
                }
                return;
            }

            // Si acierta, reseteamos errores y damos pase libre en la sesión
            intentosFallidos = 0;
            adminAutenticado = true;
        }

        panel.style.display = "block";
        renderizarTablaAdmin();
    } else {
        panel.style.display = "none";
    }
}

function crearNuevoProducto() {
    const nombreInput = document.getElementById("adminNombre").value.trim();
    const precioInput = Number(document.getElementById("adminPrecio").value);
    const stockInput = Number(document.getElementById("adminStock").value);
    const alertaAdmin = document.getElementById("alertaAdmin");

    if (nombreInput === "" || precioInput <= 0 || stockInput <= 0) {
        alertaAdmin.style.color = "#dc2626";
        alertaAdmin.innerHTML = "❌ Error: Ingresa un nombre válido, precio mayor a $0 y stock positivo.";
        return;
    }

    const nuevoSku = {
        id: Date.now(),
        nombre: nombreInput,
        precioNeto: precioInput,
        stockDisponible: stockInput
    };

    catalogoBodega.push(nuevoSku);
    localStorage.setItem("bodegaGuardada", JSON.stringify(catalogoBodega));

    document.getElementById("adminNombre").value = "";
    document.getElementById("adminPrecio").value = "";
    document.getElementById("adminStock").value = "";

    alertaAdmin.style.color = "#15803d";
    alertaAdmin.innerHTML = "✅ SKU '" + nuevoSku.nombre + "' creado correctamente.";

    filtrarCatalogo();
    renderizarTablaAdmin();
}

function renderizarTablaAdmin() {
    const contenedorTabla = document.getElementById("tablaAdminBodega");
    let filasHTML = "";
    let capitalInmovilizado = 0;
    catalogoBodega.forEach(function(prod, indice) {
        capitalInmovilizado += prod.precioNeto * prod.stockDisponible;
        filasHTML +=
            "<tr>" +
                "<td><b>" + prod.nombre + "</b></td>" +
                "<td><input type='number' id='editPrecio_" + indice + "' class='input-tabla-admin' value='" + prod.precioNeto + "' min='1'></td>" +
                "<td><input type='number' id='editStock_" + indice + "' class='input-tabla-admin' value='" + prod.stockDisponible + "' min='0'></td>" +
                "<td>" +
                    "<button class='btn-actualizar-sku' onclick='actualizarProductoAdmin(" + indice + ")'>💾 Guardar</button>" +
                    "<button class='btn-eliminar-fila' onclick='eliminarProductoAdmin(" + indice + ")'>🗑️</button>" +
                "</td>" +
            "</tr>";
    });

    contenedorTabla.innerHTML =
        "<table class='tabla-b2b' style='margin-top: 15px;'>" +
            "<thead>" +
                "<tr>" +
                    "<th>Producto (SKU)</th>" +
                    "<th>Precio ($)</th>" +
                    "<th>Stock</th>" +
                    "<th>Acciones</th>" +
                "</tr>" +
            "</thead>" +
            "<tbody>" + filasHTML + "</tbody>" +
        "</table>" +
        "<div style='margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 6px; color: #92400e; font-weight: 700;'>" +
            "💰 Capital Inmovilizado en Bodega: $" + capitalInmovilizado + " CLP Netos" +
        "</div>";
}

function actualizarProductoAdmin(indice) {
    const nuevoPrecio = Number(document.getElementById("editPrecio_" + indice).value);
    const nuevoStock = Number(document.getElementById("editStock_" + indice).value);
    const alertaAdmin = document.getElementById("alertaAdmin");

    if (nuevoPrecio <= 0 || nuevoStock < 0) {
        alertaAdmin.style.color = "#dc2626";
        alertaAdmin.innerHTML = "❌ Error Poka-Yoke: El precio debe ser mayor a $0 y el stock no puede ser negativo.";
        return;
    }

    catalogoBodega[indice].precioNeto = nuevoPrecio;
    catalogoBodega[indice].stockDisponible = nuevoStock;
    localStorage.setItem("bodegaGuardada", JSON.stringify(catalogoBodega));

    alertaAdmin.style.color = "#15803d";
    alertaAdmin.innerHTML = "✅ SKU '" + catalogoBodega[indice].nombre + "' actualizado ($" + nuevoPrecio + " | Stock: " + nuevoStock + ").";

    filtrarCatalogo();
    renderizarTablaAdmin();
}

function eliminarProductoAdmin(indice) {
    const alertaAdmin = document.getElementById("alertaAdmin");

    if (carritoCompras.length > 0) {
        alertaAdmin.style.color = "#dc2626";
        alertaAdmin.innerHTML = "⚠️ Vacía o termina la cotización actual antes de eliminar productos del catálogo maestro.";
        return;
    }

    const nombreProd = catalogoBodega[indice].nombre;
    const confirmarBorrado = confirm("¿Seguro que deseas eliminar '" + nombreProd + "' de la bodega?");

    if (confirmarBorrado) {
        catalogoBodega.splice(indice, 1);
        localStorage.setItem("bodegaGuardada", JSON.stringify(catalogoBodega));

        alertaAdmin.style.color = "#b45309";
        alertaAdmin.innerHTML = "🗑️ SKU '" + nombreProd + "' eliminado de la bodega.";

        filtrarCatalogo();
        renderizarTablaAdmin();
    }
}

function filtrarCatalogo() {
    const textoBusqueda = document.getElementById("inputBuscador").value.toLowerCase();
    const selector = document.getElementById("selectorProducto");
    const etiquetaSkus = document.getElementById("contadorSkus");
    
    let opcionesHTML = "";
    let coincidencias = 0;

    
    catalogoBodega.forEach(function(producto, indiceOriginal) {
        const nombreEnMinusculas = producto.nombre.toLowerCase();

        if (nombreEnMinusculas.includes(textoBusqueda)) {
            let avisoStock = "";
            if (producto.stockDisponible <= 5) {
                avisoStock = " ⚠️ ¡ÚLTIMAS UNIDADES!";
            }

            opcionesHTML += 
                "<option value='" + indiceOriginal + "'>" +
                    producto.nombre + " ($" + producto.precioNeto + " CLP) — [Stock: " + producto.stockDisponible + "]" + avisoStock +
                "</option>";
            coincidencias++;
        }
    });

    if (coincidencias === 0) {
        opcionesHTML = "<option value='-1'>❌ Sin resultados para tu búsqueda...</option>";
    }

    selector.innerHTML = opcionesHTML;
    etiquetaSkus.innerHTML = "📦 Mostrando: " + coincidencias + " de " + catalogoBodega.length + " SKUs";
}

function agregarAlCarrito() {
    const indice = Number(document.getElementById("selectorProducto").value);
    const alerta = document.getElementById("cajaAlerta");

    if (indice === -1) {
        alerta.innerHTML = "❌ Selecciona un producto válido del buscador.";
        return;
    }

    const cantidad = Number(document.getElementById("inputCantidad").value);
    const empresaActual = document.getElementById("inputEmpresa").value;
    const producto = catalogoBodega[indice];

    if (cantidad > producto.stockDisponible) {
        alerta.innerHTML = "❌ Stock insuficiente de " + producto.nombre + " (Quedan: " + producto.stockDisponible + ")";
        return;
    }

    alerta.innerHTML = "";
    producto.stockDisponible = producto.stockDisponible - cantidad;

    const nuevoRenglon = {
        indiceBodega: indice,
        nombre: producto.nombre,
        cantidad: cantidad,
        precioUnitario: producto.precioNeto,
        subtotalLinea: producto.precioNeto * cantidad
    };
    carritoCompras.push(nuevoRenglon);

    guardarEstadoEnMemoria(empresaActual);
    document.getElementById("inputBuscador").value = "";
    document.getElementById("inputCantidad").value = "1";
    filtrarCatalogo();
    actualizarPantallaCarrito();
    renderizarTablaAdmin();
}

function eliminarDelCarrito(posicionEnCarrito) {
    const itemABorrar = carritoCompras[posicionEnCarrito];
    catalogoBodega[itemABorrar.indiceBodega].stockDisponible += itemABorrar.cantidad;
    carritoCompras.splice(posicionEnCarrito, 1);

    const empresaActual = document.getElementById("inputEmpresa").value;
    guardarEstadoEnMemoria(empresaActual);
    filtrarCatalogo();
    actualizarPantallaCarrito();
    renderizarTablaAdmin();
}

function guardarEstadoEnMemoria(empresa) {
    localStorage.setItem("bodegaGuardada", JSON.stringify(catalogoBodega));
    localStorage.setItem("carritoArrayGuardado", JSON.stringify(carritoCompras));
    localStorage.setItem("empresaGuardada", empresa);
}

function actualizarPantallaCarrito() {
    const contenedor = document.getElementById("cajaCarrito");

    if (carritoCompras.length === 0) {
        contenedor.innerHTML = "🛒 El pedido está vacío. Agrega productos arriba...";
        return;
    }

    const empresaActual = document.getElementById("inputEmpresa").value;
    const fechaHoy = new Date().toLocaleDateString("es-CL");

    let subtotalAcumulado = 0;
    let unidadesAcumuladas = 0;
    let filasTablaHTML = "";

    carritoCompras.forEach(function(item, posicion) {
        subtotalAcumulado += item.subtotalLinea;
        unidadesAcumuladas += item.cantidad;

        filasTablaHTML += 
            "<tr>" +
                "<td>" + item.nombre + "</td>" +
                "<td><b>" + item.cantidad + "</b></td>" +
                "<td>$" + item.precioUnitario + "</td>" +
                "<td><b>$" + item.subtotalLinea + "</b></td>" +
                "<td class='no-imprimir'>" +
                    "<button class='btn-eliminar-fila' onclick='eliminarDelCarrito(" + posicion + ")'>❌ Quitar</button>" +
                "</td>" +
            "</tr>";
    });

    let descuentoCorporativo = 0;
    let filaDescuentoHTML = "";

    if (subtotalAcumulado > 200000) {
        descuentoCorporativo = subtotalAcumulado * 0.10;
        filaDescuentoHTML = "<strong style='color: #16a34a;'>Descuento Corporativo (10%): -$" + descuentoCorporativo + " CLP</strong><br>";
    }

    const netoConDescuento = subtotalAcumulado - descuentoCorporativo;
    const iva = netoConDescuento * 0.19;

    let despacho = 3500;
    let textoDespacho = "$3.500 CLP (Tarifa Estándar)";

    if (unidadesAcumuladas > 4 || subtotalAcumulado > 50000) {
        despacho = 0;
        textoDespacho = "🎉 ¡GRATIS! (Beneficio Mayorista)";
    }

    const totalFinal = netoConDescuento + iva + despacho;

    contenedor.innerHTML = 
        "<strong>📋 ORDEN DE COMPRA [" + folioCotizacion + "] — " + empresaActual.toUpperCase() + "</strong><br>" +
        "<small style='color: #64748b;'>Fecha de Emisión: " + fechaHoy + " | Folio Oficial: <b>" + folioCotizacion + "</b></small>" +
        "<table class='tabla-b2b'>" +
            "<thead>" +
                "<tr>" +
                    "<th>Producto</th>" +
                    "<th>Cant.</th>" +
                    "<th>P. Unitario</th>" +
                    "<th>Subtotal</th>" +
                    "<th class='no-imprimir'>Acción</th>" +
                "</tr>" +
            "</thead>" +
            "<tbody>" + filasTablaHTML + "</tbody>" +
        "</table>" +
        "<strong>Unidades Totales:</strong> " + unidadesAcumuladas + "<br>" +
        "<strong>Subtotal Neto Acumulado:</strong> $" + subtotalAcumulado + " CLP<br>" +
        filaDescuentoHTML +
        "<strong>IVA (19%):</strong> $" + iva + " CLP<br>" +
        "<strong>Despacho:</strong> " + textoDespacho;
}

function enviarPorWhatsApp(totalPagar, totalUnidades) {
    const empresa = document.getElementById("inputEmpresa").value;
    const mensaje = "Hola! Soy de la empresa *" + empresa + "*. Confirmo nuestra Orden de Compra *" + folioCotizacion + "* por un total de *$" + totalPagar + " CLP* (" + totalUnidades + " unidades).";
    const urlWhatsApp = "https://wa.me/?text=" + encodeURIComponent(mensaje);
    window.open(urlWhatsApp, "_blank");
}

function enviarAPDF() {
    window.print();
}

function vaciarCarrito() {
    const seguro = confirm("⚠️ ¿Estás seguro de vaciar todo el pedido y actualizar el catálogo a su estado original?");
    if (seguro) {
        localStorage.clear();
        location.reload();
    }
}
