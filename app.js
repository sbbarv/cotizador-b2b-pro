// ============================================================================
// ARCHIVO: app.js (CLASE 13 - MOTOR LÓGICO CON ALERTA DE STOCK CRÍTICO)
// ============================================================================

const catalogoInicial = [
    { id: 1, nombre: "Caja de Tornillos Estructurales", precioNeto: 5000, stockDisponible: 50 },
    { id: 2, nombre: "Taladro Percutor Industrial",     precioNeto: 85000, stockDisponible: 8 },
    { id: 3, nombre: "Esmeril Angular Profesional",     precioNeto: 42000, stockDisponible: 3 },
    { id: 4, nombre: "Sierra Circular de Banco",        precioNeto: 120000, stockDisponible: 5 },
    { id: 5, nombre: "Kit Guantes y Casco EPP Pro",     precioNeto: 18000, stockDisponible: 25 },
    { id: 6, nombre: "Generador Eléctrico 3000W",       precioNeto: 250000, stockDisponible: 4 }
];

let catalogoBodega = JSON.parse(localStorage.getItem("bodegaGuardada")) || catalogoInicial;

// Detector inteligente de sincronización de catálogo
if (catalogoBodega.length !== catalogoInicial.length) {
    catalogoBodega = catalogoInicial;
    localStorage.setItem("bodegaGuardada", JSON.stringify(catalogoBodega));
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

filtrarCatalogo();
actualizarPantallaCarrito();

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
}

function eliminarDelCarrito(posicionEnCarrito) {
    const itemABorrar = carritoCompras[posicionEnCarrito];
    catalogoBodega[itemABorrar.indiceBodega].stockDisponible += itemABorrar.cantidad;
    carritoCompras.splice(posicionEnCarrito, 1);

    const empresaActual = document.getElementById("inputEmpresa").value;
    guardarEstadoEnMemoria(empresaActual);
    filtrarCatalogo();
    actualizarPantallaCarrito();
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
        "<strong>Despacho:</strong> " + textoDespacho +
        "<div class='fila-total'>GRAN TOTAL A PAGAR: $" + totalFinal + " CLP</div>" +
        "<div class='acciones-cierre no-imprimir'>" +
            "<button class='btn-whatsapp' onclick='enviarPorWhatsApp(" + totalFinal + ", " + unidadesAcumuladas + ")'>📲 Enviar WhatsApp</button>" +
            "<button class='btn-pdf' onclick='enviarAPDF()'>📄 Guardar como PDF</button>" +
        "</div>";
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