const products = [
    { name: "Hamburguesa Pulled pork", price: 3, stock: 10 },
    { name: "Hamburguesa Pepiada", price: 3, stock: 8 },
    { name: "Hamburguesa normal", price: 3, stock: 7 },
    { name: "Bocadillo de Picadillo", price: 3, stock: 13 },
    { name: "Bocadillo de Tortilla", price: 3, stock: 9 },
    { name: "Cocacola normal", price: 1.5, stock: 15 },
    { name: "Fanta Limón", price: 1.5, stock: 10 },
    { name: "Fanta Naranja", price: 1.5, stock: 5 },
    { name: "Kinder bueno", price: 1, stock: 8 },
    { name: "Kitkat", price: 1, stock: 8 }
];

const productsContainer = document.getElementById('productsContainer');
const totalEl = document.getElementById('total');
const submitOrderBtn = document.getElementById('submitOrder');
const receiptContainer = document.getElementById('receiptContainer');
const receiptEl = document.getElementById('receipt');
const downloadBtn = document.getElementById('downloadReceipt');
const messageEl = document.getElementById('message');
const customerNameInput = document.getElementById('customerName');

// Crear productos en cards
products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <h3>${product.name}</h3>
        <p>Precio: ${product.price}€</p>
        <p>Stock: <span id="stock-${index}">${product.stock}</span></p>
        <div class="quantity-controls">
            <button type="button" class="minus" data-index="${index}">-</button>
            <input type="number" id="qty-${index}" data-index="${index}" value="0" min="0" max="${product.stock}">
            <button type="button" class="plus" data-index="${index}">+</button>
        </div>
    `;
    productsContainer.appendChild(card);
});

// Control de botones + y -
document.querySelectorAll('.plus').forEach(btn => {
    btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        let input = document.getElementById(`qty-${index}`);
        if (parseInt(input.value) < products[index].stock) input.value = parseInt(input.value) + 1;
        updateTotal();
    });
});

document.querySelectorAll('.minus').forEach(btn => {
    btn.addEventListener('click', () => {
        const index = btn.dataset.index;
        let input = document.getElementById(`qty-${index}`);
        if (parseInt(input.value) > 0) input.value = parseInt(input.value) - 1;
        updateTotal();
    });
});

document.querySelectorAll('.quantity-controls input').forEach(input => {
    input.addEventListener('input', () => {
        const index = input.dataset.index;
        if (parseInt(input.value) > products[index].stock) input.value = products[index].stock;
        if (parseInt(input.value) < 0 || isNaN(input.value)) input.value = 0;
        updateTotal();
    });
});

function updateTotal() {
    let total = 0;
    products.forEach((product, index) => {
        let qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
        total += qty * product.price;
    });
    totalEl.textContent = total.toFixed(2) + '€';
}

function showMessage(msg, type) {
    messageEl.textContent = msg;
    messageEl.className = type;
    messageEl.classList.remove('hidden');
    setTimeout(() => messageEl.classList.add('hidden'), 4000);
}

// Enviar pedido
submitOrderBtn.addEventListener('click', async () => {
    const name = customerNameInput.value.trim();
    if (!name) { showMessage('Ingrese su nombre', 'error'); return; }

    let order = [];
    let valid = true;

    products.forEach((product, index) => {
        let qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
        if (qty > product.stock) valid = false;
        if (qty > 0) order.push({ name: product.name, qty, price: product.price });
    });

    if (!valid) { showMessage('No puedes pedir más de lo que hay en stock', 'error'); return; }
    if (order.length === 0) { showMessage('Selecciona al menos un producto', 'error'); return; }

    const total = order.reduce((sum, item) => sum + item.qty * item.price, 0);

    // Recibo
    let receiptText = `Pedido de ${name}\nFecha: ${new Date().toLocaleString()}\n\n`;
    order.forEach(item => {
        receiptText += `${item.name} x${item.qty} = ${(item.qty*item.price).toFixed(2)}€\n`;
    });
    receiptText += `\nTotal: ${total.toFixed(2)}€`;
    receiptEl.textContent = receiptText;
    receiptContainer.classList.remove('hidden');

    // Descargar recibo
    downloadBtn.onclick = () => {
        const blob = new Blob([receiptText], {type: 'text/plain'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `recibo_${name}.txt`;
        link.click();
    }

    // Enviar a Google Sheets
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzSoXvv2_kmKkmVsBwyD4CyMShVqvN8Da9XGbIcHEWILmHs1R-g8_LrlrgYghuhvqH5tQ/exec', {
            method: 'POST',
            body: JSON.stringify({ name, order, total }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.status === 'success') {
            showMessage('Pedido enviado con éxito', 'success');
            // Actualizar stock visual
            order.forEach(item => {
                const idx = products.findIndex(p => p.name === item.name);
                products[idx].stock -= item.qty;
                document.getElementById(`stock-${idx}`).textContent = products[idx].stock;
                document.getElementById(`qty-${idx}`).value = 0;
            });
            updateTotal();
        } else {
            showMessage('Error al enviar el pedido', 'error');
        }
    } catch(err) {
        showMessage('Error de conexión', 'error');
        console.error(err);
    }
});
