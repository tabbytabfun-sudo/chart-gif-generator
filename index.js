const express = require('express');
const puppeteer = require('puppeteer');
const GifEncoder = require('gif-encoder-2');
const { createCanvas, Image } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON (for when we connect n8n later)
app.use(express.json());

// --- HTML TEMPLATE ---
// We inject this directly to avoid file path issues on Render
const getHtml = (chartData) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/luxon"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-financial"></script>
    <style>
        body { background-color: #1e1e1e; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .chart-container { width: 800px; height: 600px; }
    </style>
</head>
<body>
    <div class="chart-container">
        <canvas id="myChart"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('myChart').getContext('2d');
        
        // Data injected from Node.js
        const rawData = ${JSON.stringify(chartData)};

        const chart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [
                    {
                        label: 'Price',
                        data: rawData.candles,
                        color: { up: '#00ff00', down: '#ff0000', unchanged: '#999' },
                        borderColor: { up: '#00ff00', down: '#ff0000', unchanged: '#999' },
                        borderWidth: 1
                    },
                    {
                        type: 'line',
                        label: 'Elliott Wave (1-5)',
                        data: rawData.wave12345,
                        borderColor: 'rgba(54, 162, 235, 1)', // Blue
                        borderWidth: 2,
                        tension: 0,
                        pointRadius: 0
                    },
                    {
                        type: 'line',
                        label: 'ABC Correction',
                        data: rawData.waveABC, // Initially empty or full, we will control visibility
                        borderColor: 'rgba(255, 255, 255, 1)', // White
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { type: 'time', time: { unit: 'day' }, grid: { color: '#333' } },
                    y: { grid: { color: '#333' } }
                },
                animation: false // Disable Chart.js native animation so Puppeteer controls frames
            }
        });

        // Helper function for Puppeteer to update the chart
        window.updateChart = (abcData) => {
            // Update the ABC dataset
            chart.data.datasets[2].data = abcData;
            chart.update();
        };
    </script>
</body>
</html>
`;

// --- MOCK DATA GENERATOR ---
function getMockData() {
    // Simple fake dates
    const baseTime = new Date('2023-01-01').getTime();
    const day = 86400000;
    
    // Fake Candles (Just a visual placeholder)
    const candles = [];
    for(let i=0; i<20; i++) {
        candles.push({ x: baseTime + (i*day), o: 100+i, h: 105+i, l: 95+i, c: 102+i });
    }

    // Fake Elliott Wave 1-5 (Blue Line)
    const wave12345 = [
        { x: baseTime, y: 100 },
        { x: baseTime + (3*day), y: 120 }, // 1
        { x: baseTime + (5*day), y: 110 }, // 2
        { x: baseTime + (10*day), y: 150 }, // 3
        { x: baseTime + (12*day), y: 135 }, // 4
        { x: baseTime + (15*day), y: 160 }  // 5
    ];

    // Fake ABC Correction (White Line) - The part we animate
    const waveABC = [
        { x: baseTime + (15*day), y: 160 }, // Start at 5
        { x: baseTime + (17*day), y: 140 }, // A
        { x: baseTime + (18*day), y: 150 }, // B
        { x: baseTime + (20*day), y: 130 }  // C
    ];

    return { candles, wave12345, waveABC };
}

// --- MAIN ROUTE ---
app.get('/', async (req, res) => {
    console.log("Received request for Chart GIF...");
    
    let browser = null;
    try {
        // 1. Launch Puppeteer (Optimized for Render Free Tier)
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Crucial for low memory
                '--single-process', // Crucial for Render
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();
        
        // Set Viewport (GIF Resolution)
        await page.setViewport({ width: 800, height: 600 });

        // 2. Load Data & HTML
        const mockData = getMockData();
        // Start with ABC hidden (empty array)
        const initialData = { ...mockData, waveABC: [] }; 
        
        await page.setContent(getHtml(initialData));
        
        // Wait for chart to render
        await page.waitForSelector('canvas');

        // 3. Setup GIF Encoder
        const encoder = new GifEncoder(800, 600);
        encoder.start();
        encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat
        encoder.setDelay(500);  // 500ms per frame
        encoder.setQuality(20); // Lower is better quality, but slower. 20 is balanced.

        // Helper to take a snapshot and add to GIF
        const addFrame = async () => {
            const buffer = await page.screenshot({ type: 'png' });
            const img = new Image();
            img.src = buffer;
            const canvas = createCanvas(800, 600);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            encoder.addFrame(ctx);
        };

        // --- ANIMATION SEQUENCE ---
        
        // Frame 1: Base Chart (1-5 Wave only)
        await addFrame();

        // Frame 2: Draw A
        const pointA = [mockData.waveABC[0], mockData.waveABC[1]];
        await page.evaluate((data) => window.updateChart(data), pointA);
        await addFrame();

        // Frame 3: Draw B
        const pointB = [mockData.waveABC[0], mockData.waveABC[1], mockData.waveABC[2]];
        await page.evaluate((data) => window.updateChart(data), pointB);
        await addFrame();

        // Frame 4: Draw C (Complete)
        await page.evaluate((data) => window.updateChart(data), mockData.waveABC);
        await addFrame();
        
        // Frame 5: Hold final frame longer
        encoder.setDelay(2000);
        await addFrame();

        // 4. Finish and Send
        encoder.finish();
        const buffer = encoder.out.getData();

        res.set('Content-Type', 'image/gif');
        res.send(buffer);
        console.log("GIF generated and sent!");

    } catch (error) {
        console.error("Error generating GIF:", error);
        res.status(500).send("Error generating GIF: " + error.message);
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});