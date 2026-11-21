let exchangeRates = { EUR: 1.18, USD: 1.28 }; // Fallback rates

async function fetchRates() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/GBP');
        const data = await res.json();
        if (data && data.rates) {
            exchangeRates.EUR = data.rates.EUR || exchangeRates.EUR;
            exchangeRates.USD = data.rates.USD || exchangeRates.USD;
        }
    } catch (e) {
        console.warn("Could not fetch live rates, using defaults.", e);
    }
}

async function loadStorefront() {
    const container = document.getElementById('listings');

    // Fetch exchange rates and JSON data in parallel
    await fetchRates();

    try {
        const response = await fetch('items.json');
        if (!response.ok) throw new Error("Could not load items.json");

        const data = await response.json();
        const items = data.items || [];

        // Update Sidebar Info
        document.getElementById('total-count').textContent = `Listings loaded: ${items.length}`;
        document.getElementById('last-updated').textContent = `Catalog updated: ${data.updated_at || 'Unknown'}`;
        document.getElementById('rate-eur').textContent = `EUR: 1 GBP = €${exchangeRates.EUR.toFixed(2)}`;
        document.getElementById('rate-usd').textContent = `USD: 1 GBP = $${exchangeRates.USD.toFixed(2)}`;

        if (items.length === 0) {
            container.innerHTML = '<p>No listings found.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        items.forEach(item => {
            const card = document.createElement('a');
            card.href = item.link;
            card.target = "_blank";
            card.rel = "noopener noreferrer";
            card.className = 'item-card';

            const thumbHtml = item.image
                ? `<img src="${item.image}" alt="" class="item-thumb" loading="lazy">`
                : `<div class="no-image">No Image</div>`;

            let numericPrice = 0;
            if (item.price) {
                // Extract numerical value for currency conversion
                const match = item.price.match(/\d+(?:\.\d+)?/);
                if (match) numericPrice = parseFloat(match[0]);

                // Replace any accidental 'GBP' text with '£' if your scraper pulls it as text
                displayPrice = item.price.replace(/GBP/gi, '£').trim();
                // If it doesn't already start with £ or $, prepend £
                if (!displayPrice.startsWith('£') && !displayPrice.startsWith('$')) {
                    displayPrice = `£${displayPrice}`;
                }
            }

            let conversionHtml = '';
            if (numericPrice > 0) {
                const eurVal = Math.ceil(numericPrice * exchangeRates.EUR) - 0.01;
                const usdVal = Math.ceil(numericPrice * exchangeRates.USD) - 0.01;
                conversionHtml = `<span class="currency-conversion">approx €${eurVal} / $${usdVal} + shipping costs*</span>`;
            }

            card.innerHTML = `
                <div class="thumb-wrapper">
                    ${thumbHtml}
                </div>
                <div class="item-body">
                    <div class="item-title">${escapeHtml(item.title)}</div>
                    <div class="price-row">
                        <span class="item-price">${escapeHtml(displayPrice)}</span>
                        ${conversionHtml}
                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);

    } catch (err) {
        console.error(err);
   }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

loadStorefront();