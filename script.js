var lognormal = require( '@stdlib/random/base/lognormal' );
var normal = require( '@stdlib/random/base/normal' );
var uniform = require( '@stdlib/random/base/uniform' );
var mean = require ( '@stdlib/stats/base/mean' );
var stdev = require ( '@stdlib/stats/base/stdev' );

const stockPriceCache = {};
const distributionParamsCache = {};

async function fetchStockPrices(stock) {
    if (stockPriceCache[stock]) {
        return stockPriceCache[stock];
    }
    try {
        const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock}&apikey=H0PVEKRCFBBCP8B2`);
        const data = await response.json();
        if (!data["Time Series (Daily)"]) throw new Error("Invalid data format");
        
        const prices = Object.entries(data["Time Series (Daily)"])
            .slice(0, 30)
            .map(([date, value]) => ({ date, price: parseFloat(value["4. close"]) }))
            .reverse();
        
        stockPriceCache[stock] = prices;
        distributionParamsCache[stock] = calculateDistributionParams(prices.map(p => p.price));
        return prices;
    } catch (error) {
        console.error("Error fetching stock prices:", error);
        return [];
    }
}

function calculateDistributionParams(prices) {
    const mu = mean(prices);
    const sigma = stdev(prices);
    return { mean: mu, stdev: sigma, logMean: Math.log(mu), logStdev: Math.log(sigma + 1) };
}

async function simulateFuturePrices(stock, distribution) {
    const historical = await fetchStockPrices(stock);
    if (historical.length === 0) return;
    
    let lastPrice = historical[historical.length - 1].price;
    let simulatedPrices = [];
    const params = distributionParamsCache[stock];
    const lastDate = new Date(historical[historical.length - 1].date);
    
    for (let i = 1; i <= 30; i++) {
        let change;
        if (distribution === 'normal') {
            change = normal(params.mean, params.stdev);
        } else if (distribution === 'lognormal') {
            change = lognormal(params.logMean, params.logStdev);
        } else if (distribution === 'uniform') {
            change = uniform(params.mean - params.stdev, params.mean + params.stdev);
        }
        lastPrice += change;
        
        let futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        simulatedPrices.push({ date: futureDate.toISOString().split('T')[0], price: lastPrice });
    }
    
    plotStockData(historical, simulatedPrices);
}

window.runSimulation = async function() {
    const stock = document.getElementById("stock").value;
    const distribution = document.getElementById("distribution").value;
    await simulateFuturePrices(stock, distribution);
};

function plotStockData(historical, future) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...historical.map(p => p.date), ...future.map(p => p.date)],
            datasets: [
                { label: 'Historical', data: historical.map(p => p.price), borderColor: 'black', borderWidth: 2, fill: false },
                { label: 'Simulated Future', data: future.map(p => p.price), borderColor: 'blue', borderDash: [5, 5], borderWidth: 2, fill: false }
            ]
        },
        options: {
            scales: {
                x: { type: 'time', time: { unit: 'day' } },
                y: { title: { display: true, text: 'Price (USD)' } }
            }
        }
    });
}
