(() => {
    const storageKey = "zalora-shopping-cart";
    const cart = [];
    const status = document.createElement("p");
    status.className = "cart-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    try {
        const savedCart = localStorage.getItem(storageKey);
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (!Array.isArray(parsedCart)) {
                throw new Error("Saved cart data is not a list.");
            }
            parsedCart.forEach((item) => {
                if (
                    typeof item.id !== "string" ||
                    typeof item.name !== "string" ||
                    typeof item.image !== "string" ||
                    typeof item.currency !== "string" ||
                    !Number.isFinite(item.price) ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1
                ) {
                    throw new Error("Saved cart contains an invalid item.");
                }
            });
            cart.push(...parsedCart);
        }
    } catch (error) {
        console.error("Could not load the saved cart.", error);
        status.textContent = "Your saved cart could not be loaded. You can still add items during this visit.";
    }

    const root = document.createElement("div");
    root.className = "floating-cart";

    const toggle = document.createElement("button");
    toggle.className = "floating-cart-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "shopping-cart-panel");
    const toggleLabel = document.createElement("span");
    toggleLabel.textContent = "Cart";
    const count = document.createElement("span");
    count.className = "floating-cart-count";
    toggle.append(toggleLabel, count);

    const panel = document.createElement("section");
    panel.className = "floating-cart-panel";
    panel.id = "shopping-cart-panel";
    panel.setAttribute("aria-label", "Shopping cart");
    panel.hidden = true;

    const heading = document.createElement("div");
    heading.className = "floating-cart-heading";
    const title = document.createElement("h2");
    title.textContent = "Your cart";
    const close = document.createElement("button");
    close.className = "floating-cart-close";
    close.type = "button";
    close.setAttribute("aria-label", "Close cart");
    close.textContent = "×";
    heading.append(title, close);

    const items = document.createElement("ul");
    items.className = "floating-cart-items";
    const totals = document.createElement("div");
    totals.className = "floating-cart-totals";
    const checkout = document.createElement("button");
    checkout.className = "floating-cart-checkout";
    checkout.type = "button";
    checkout.textContent = "Checkout";
    panel.append(heading, items, totals, checkout, status);
    root.append(toggle, panel);
    document.body.append(root);

    function saveCart() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(cart));
        } catch (error) {
            console.error("Could not save the cart.", error);
            status.textContent = "Cart changes could not be saved in this browser.";
        }
    }

    function formatPrice(amount, currency) {
        return `${currency}${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function render() {
        count.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
        items.replaceChildren();
        totals.replaceChildren();
        checkout.disabled = cart.length === 0;

        if (cart.length === 0) {
            const empty = document.createElement("li");
            empty.className = "floating-cart-empty";
            empty.textContent = "Your cart is empty.";
            items.append(empty);
        } else {
            cart.forEach((item) => {
                const row = document.createElement("li");
                row.className = "floating-cart-item";

                const image = document.createElement("img");
                image.src = item.image;
                image.alt = "";

                const details = document.createElement("div");
                details.className = "floating-cart-item-details";
                const name = document.createElement("strong");
                name.textContent = item.name;
                const price = document.createElement("span");
                price.textContent = formatPrice(item.price, item.currency);
                details.append(name, price);

                const controls = document.createElement("div");
                controls.className = "floating-cart-controls";
                const decrease = document.createElement("button");
                decrease.type = "button";
                decrease.dataset.action = "decrease";
                decrease.dataset.id = item.id;
                decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
                decrease.textContent = "−";
                const quantity = document.createElement("span");
                quantity.textContent = String(item.quantity);
                const increase = document.createElement("button");
                increase.type = "button";
                increase.dataset.action = "increase";
                increase.dataset.id = item.id;
                increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
                increase.textContent = "+";
                const remove = document.createElement("button");
                remove.type = "button";
                remove.dataset.action = "remove";
                remove.dataset.id = item.id;
                remove.textContent = "Remove";
                controls.append(decrease, quantity, increase, remove);

                row.append(image, details, controls);
                items.append(row);
            });
        }

        const currencyTotals = new Map();
        cart.forEach((item) => {
            currencyTotals.set(
                item.currency,
                (currencyTotals.get(item.currency) || 0) + item.price * item.quantity
            );
        });
        currencyTotals.forEach((amount, currency) => {
            const line = document.createElement("p");
            line.textContent = `Total (${currency}): ${formatPrice(amount, currency)}`;
            totals.append(line);
        });
    }

    function setPanelOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", () => {
        setPanelOpen(panel.hidden);
    });
    close.addEventListener("click", () => setPanelOpen(false));

    document.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("button") : null;
        if (!button || button.textContent.trim().toLowerCase() !== "add to cart") {
            return;
        }

        const product = button.closest(".product, aside");
        const name = product && product.querySelector("h1, h3, h4");
        const image = product && product.querySelector("img");
        const priceNode = product && (
            product.querySelector(".price") ||
            Array.from(product.querySelectorAll("p")).find((paragraph) => /\bPrice\s*:/i.test(paragraph.textContent))
        );
        const match = priceNode && priceNode.textContent.match(/(₦|\$)\s*([\d,]+(?:\.\d{1,2})?)/);

        if (!product || !name || !image || !match) {
            status.textContent = "This product could not be added because its name, image, or price is missing.";
            console.error("Product is missing cart details.", product);
            return;
        }

        const currency = match[1];
        const price = Number(match[2].replace(/,/g, ""));
        if (!Number.isFinite(price)) {
            status.textContent = "This product could not be added because its price is invalid.";
            console.error("Product has an invalid price.", priceNode.textContent);
            return;
        }

        const id = `${name.textContent.trim()}|${currency}|${price}|${image.src}`;
        const existing = cart.find((item) => item.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id,
                name: name.textContent.trim().replace(/:$/, ""),
                image: image.src,
                currency,
                price,
                quantity: 1
            });
        }

        status.textContent = `${name.textContent.trim().replace(/:$/, "")} added to your cart.`;
        saveCart();
        render();
        setPanelOpen(true);
    });

    panel.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
        if (!button) {
            return;
        }

        const itemIndex = cart.findIndex((item) => item.id === button.dataset.id);
        if (itemIndex === -1) {
            status.textContent = "That cart item could not be found.";
            return;
        }

        const action = button.dataset.action;
        if (action === "increase") {
            cart[itemIndex].quantity += 1;
        } else if (action === "decrease") {
            cart[itemIndex].quantity -= 1;
            if (cart[itemIndex].quantity === 0) {
                cart.splice(itemIndex, 1);
            }
        } else if (action === "remove") {
            cart.splice(itemIndex, 1);
        }
        saveCart();
        render();
    });

    checkout.addEventListener("click", () => {
        const orderSummary = cart
            .map((item) => `${item.quantity} × ${item.name} — ${formatPrice(item.price * item.quantity, item.currency)}`)
            .join("\n");
        const totalSummary = Array.from(totals.querySelectorAll("p"), (line) => line.textContent).join("\n");
        if (cart.length === 0) {
            return;
        }

        if (window.confirm(`${orderSummary}\n\n${totalSummary}\n\nComplete demo checkout? No payment will be processed.`)) {
            cart.splice(0, cart.length);
            saveCart();
            render();
            status.textContent = "Demo checkout complete. No payment was processed.";
        }
    });

    render();
})();
