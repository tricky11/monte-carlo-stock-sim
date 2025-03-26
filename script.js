var lognormal = require( '@stdlib/random/base/lognormal' );
var normal = require( '@stdlib/random/base/normal' );
var uniform = require( '@stdlib/random/base/uniform' );

const stockPrices = {
    AAPL: [170, 172, 175, 178, 180, 182, 185, 188, 190, 192, 195],
    AMZN: [3200, 3220, 3250, 3280, 3300, 3320, 3350, 3380, 3400, 3420, 3450],
    META: [250, 252, 255, 258, 260, 262, 265, 268, 270, 272, 275],
    GOOGL: [2800, 2820, 2850, 2880, 2900, 2920, 2950, 2980, 3000, 3020, 3050],
    NFLX: [500, 505, 510, 515, 520, 525, 530, 535, 540, 545, 550]
};

function simulateFuturePrices(stock, distribution) {
    const historical = stockPrices[stock];
    const lastPrice = historical[historical.length - 1];
    let simulatedPrices = [];

    for (let i = 0; i < 30; i++) {
        let change;
        if (distribution === 'normal') {
            change = normal(0, 5); // Mean 0, Std 5
        } else if (distribution === 'lognormal') {
            change = lognormal(0, 0.05); // Mean 0, Std 0.05
        } else if (distribution === 'uniform') {
            change = uniform(-5, 5); // Random variation
        }
        lastPrice += change;
        simulatedPrices.push(lastPrice);
    }

    return simulatedPrices;
}

function plotStockData(historical, future) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: historical.length + future.length }, (_, i) => i + 1),
            datasets: [
                { label: 'Historical', data: historical, borderColor: 'black', borderWidth: 2 },
                { label: 'Future Mean', data: future, borderColor: 'blue', borderDash: [5, 5] }
            ]
        }
    });
}

window.runSimulation = function() {
    const stock = document.getElementById("stock").value;
    const distribution = document.getElementById("distribution").value;
    const historical = stockPrices[stock];
    const future = simulateFuturePrices(stock, distribution);
    plotStockData(historical, future);
};