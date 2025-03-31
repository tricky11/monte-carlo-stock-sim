var lognormal = require( '@stdlib/random/base/lognormal' );
var normal = require( '@stdlib/random/base/normal' );
var uniform = require( '@stdlib/random/base/uniform' );
var mean = require ( '@stdlib/stats/base/mean' );
var stdev = require ( '@stdlib/stats/base/stdev' );
var parseJSON = require( '@stdlib/utils/parse-json' );
var readFile = require( '@stdlib/fs/read-file' );

const stockPriceCache = {};
const distributionParamsCache = {};
let stockChartInstance = null; // Store chart instance globally

import aaplData from './data/AAPL.json';
import amznData from './data/AMZN.json';
import nflxData from './data/NFLX.json';
import googData from './data/GOOG.json';
import msftData from './data/META.json';

const stockData = {
    AAPL: aaplData,
    AMZN: amznData,
    NFLX: nflxData,
    GOOG: googData,
    MSFT: msftData,

};

async function fetchStockPrices(stock) {
    if (!stockData[stock]) return [];

    // Convert JSON data to the expected format
    return stockData[stock].map(entry => ({
        date: new Date(entry.Date),               // Extract Date
        price: parseFloat(entry.Close)  // Extract and convert Close price
    }));
}

function calculateLogReturnParams(prices) {
    const logReturns = [];
    for (let i = 1; i < prices.length; i++) {
        const r = Math.log(prices[i].price / prices[i - 1].price);
        logReturns.push(r);
    }

    const n = logReturns.length;
    const mu = mean(n, logReturns, 1);
    const sigma = stdev(n, 1, logReturns, 1);
    return { mean: mu, stdev: sigma };
}

async function simulateFuturePrices(stock, distribution) {
    const historical = await fetchStockPrices(stock);
    if (historical.length === 0) return;

    if (!distributionParamsCache[stock]) {
        distributionParamsCache[stock] = calculateLogReturnParams(historical);
    }
    
    const params = distributionParamsCache[stock];

    let lastPrice = historical[historical.length - 1].price;
    const lastDate = new Date(historical[historical.length - 1].date);
    let simulatedPrices = [];
    for (let i = 1; i <= 30; i++) {
        let simulatedReturn ;
        if (distribution === 'normal') {
            simulatedReturn  = normal(params.mean, params.stdev);
        } else if (distribution === 'lognormal') {
            simulatedReturn  = lognormal(params.logMean, params.logStdev);
        } else if (distribution === 'uniform') {
            simulatedReturn  = uniform(params.mean - params.stdev, params.mean + params.stdev);
        }
        lastPrice *= Math.exp(simulatedReturn);
        
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
    const dates = [...historical.map(p => p.date), ...future.map(p => p.date)];
    const datasets = [
        { label: 'Historical', data: [...historical.map(p => p.price), ...future.map(p => undefined)] },
        { label: 'Simulated Future', data: [...historical.map(p => undefined), ...future.map(p => p.price)] }
    ];
    // 🔥 Destroy the existing chart if it exists
    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    // Create a new chart
    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            scales: {
                x: { type: 'time', time: { unit: 'day' } },
                y: { title: { display: true, text: 'Price (USD)' } }
            }
        }
    });
}
