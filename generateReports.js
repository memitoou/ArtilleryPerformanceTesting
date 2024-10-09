const fs = require('fs');

// Leer el archivo JSON de resultados
const results = JSON.parse(fs.readFileSync('resultados.json', 'utf8'));

// Variables para almacenar métricas
let meanResponseTime, p95ResponseTime, cpuUsage, memoryUsage, networkUsage;

// Función para generar el informe en HTML
function generateHTMLReport() {
    const httpResponseTimeSummary = results.aggregate.summaries['http.response_time'] || {};
    meanResponseTime = httpResponseTimeSummary.mean ? httpResponseTimeSummary.mean.toFixed(2) : 'N/A';
    const minResponseTime = httpResponseTimeSummary.min || 'N/A';
    const maxResponseTime = httpResponseTimeSummary.max || 'N/A';
    p95ResponseTime = httpResponseTimeSummary.p95 ? httpResponseTimeSummary.p95.toFixed(2) : 'N/A';

    // Interpretación de algunos resultados
    const totalRequests = results.aggregate.counters['http.requests'] || 0;
    const successfulResponses = results.aggregate.counters['http.codes.200'] || 0;
    const failedRequests = results.aggregate.counters['vusers.failed'] || 0;
    const errorPercentage = totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : 0;

    // Manejo de métricas adicionales de CPU, memoria y red
    cpuUsage = results.aggregate.metrics && results.aggregate.metrics['cpu.usage'] ? results.aggregate.metrics['cpu.usage'] : 'N/A';
    memoryUsage = results.aggregate.metrics && results.aggregate.metrics['memory.usage'] ? results.aggregate.metrics['memory.usage'] : 'N/A';
    networkUsage = results.aggregate.metrics && results.aggregate.metrics['network.usage'] ? results.aggregate.metrics['network.usage'] : 'N/A';

    let interpretation = `
        <h2>Interpretation of Results</h2>
        <p>This report reflects the system's performance under different load levels. Below is an interpretation of the results:</p>
        <ul>
            <li><strong>Completed Requests:</strong> A total of ${totalRequests} requests were made during the test. Of these, ${successfulResponses} were successful, representing ${(successfulResponses / totalRequests * 100).toFixed(2)}% of the total.</li>
            <li><strong>Errors:</strong> There were ${failedRequests} errors during the test, representing ${errorPercentage}% of all requests. This may indicate that the server was unable to handle the full load.</li>
            <li><strong>Average Response Time:</strong> The average server response time was ${meanResponseTime} ms. A lower time is ideal, but it is also important to observe the maximum times.</li>
            <li><strong>Maximum Response Time:</strong> The maximum recorded time was ${maxResponseTime} ms, indicating that at some moments the system took quite a while to respond.</li>
            <li><strong>95th Percentile:</strong> 95% of the requests had a response time of less than ${p95ResponseTime} ms, suggesting that performance was acceptable in most cases.</li>
            <li><strong>CPU Usage:</strong> The average CPU usage during the test was ${cpuUsage}.</li>
            <li><strong>Memory Usage:</strong> The average memory usage during the test was ${memoryUsage}.</li>
            <li><strong>Network Usage:</strong> The average network usage during the test was ${networkUsage}.</li>
        </ul>
        <p>Overall, the results indicate that the system was able to handle a large number of requests, but some users may have experienced elevated response times or errors due to overload.</p>
    `;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Performance Test Report with Artillery</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
            }
            h1, h2 {
                color: #fff;
                background-color: #333;
                padding: 10px;
            }
            h2 {
                background-color: #008CBA; /* Light blue color */
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            #chartContainer {
                width: 80%;
                margin: 0 auto;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <h1>Performance Test Report with Artillery</h1>
        
        <h2>General Statistics</h2>
        <table>
            <tr><th>Scenarios Launched</th><td>${results.aggregate.scenariosCreated || 'N/A'}</td></tr>
            <tr><th>Scenarios Completed</th><td>${results.aggregate.scenariosCompleted || 'N/A'}</td></tr>
            <tr><th>Requests Completed</th><td>${results.aggregate.counters['http.requests'] || 'N/A'}</td></tr>
            <tr><th>Successful Responses</th><td>${results.aggregate.counters['http.codes.200'] || 0}</td></tr>
            <tr><th>Errors</th><td>${results.aggregate.counters['vusers.failed'] || 0}</td></tr>
            <tr><th>Average Response Time</th><td>${meanResponseTime} ms</td></tr>
        </table>
        
        <h2>Response Time Distribution</h2>
        <p>Min: ${minResponseTime} ms, Max: ${maxResponseTime} ms</p>
        <p>95th Percentile: ${p95ResponseTime} ms</p>

        <h2>Response Codes Chart</h2>
        <div id="chartContainer">
            <canvas id="responseChart"></canvas>
        </div>

        <script>
            const results = ${JSON.stringify(results)};

            const ctx = document.getElementById('responseChart').getContext('2d');

            const responseCodes = results.aggregate.counters;
            const httpCodes = Object.keys(responseCodes).filter(key => key.includes('http.codes.'));
            const responseData = httpCodes.reduce((acc, code) => {
                const codeNumber = code.split('.').pop();
                acc[codeNumber] = responseCodes[code];
                return acc;
            }, {});

            const labels = Object.keys(responseData);
            const data = Object.values(responseData);

            if (labels.length === 0 || data.every(value => value === 0)) {
                document.getElementById('chartContainer').innerHTML = "<p>No data available for response codes.</p>";
            } else {
                const chartData = {
                    labels: labels,
                    datasets: [{
                        label: 'Response Codes',
                        data: data,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                };

                const config = {
                    type: 'bar',
                    data: chartData,
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                };

                new Chart(ctx, config);
            }
        </script>

        <h2>Detailed Results</h2>
        <h3>Counters</h3>
        <table>
            <thead>
                <tr><th>Name</th><th>Value</th></tr>
            </thead>
            <tbody>
                ${Object.entries(results.aggregate.counters).map(([key, value]) => `
                    <tr>
                        <td>${key}</td>
                        <td>${value}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>Rates</h3>
        <table>
            <thead>
                <tr><th>Name</th><th>Value</th></tr>
            </thead>
            <tbody>
                ${Object.entries(results.aggregate.rates).map(([key, value]) => `
                    <tr>
                        <td>${key}</td>
                        <td>${value}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>Metadata</h3>
        <table>
            <thead>
                <tr><th>Name</th><th>Value</th></tr>
            </thead>
            <tbody>
                <tr><td>First Counter</td><td>${results.aggregate.firstCounterAt || 'N/A'}</td></tr>
                <tr><td>Last Counter</td><td>${results.aggregate.lastCounterAt || 'N/A'}</td></tr>
                <tr><td>Duration</td><td>${results.aggregate.duration || 'N/A'}</td></tr>
            </tbody>
        </table>

        <h2>General Information</h2>
        <table>
            <tr><td>Total Requests</td><td>${results.aggregate.counters['http.requests'] || 0}</td></tr>
            <tr><td>Successful Responses</td><td>${results.aggregate.counters['http.codes.200'] || 0}</td></tr>
            <tr><td>Failed Requests</td><td>${results.aggregate.counters['vusers.failed'] || 0}</td></tr>
            <tr><td>Average Response Time (ms)</td><td>${meanResponseTime}</td></tr>
            <tr><td>95th Percentile Response Time (ms)</td><td>${p95ResponseTime}</td></tr>
            <tr><td>CPU Usage</td><td>${cpuUsage}</td></tr>
            <tr><td>Memory Usage</td><td>${memoryUsage}</td></tr>
            <tr><td>Network Usage</td><td>${networkUsage}</td></tr>
        </table>

        ${interpretation}
    </body>
    </html>
    `;
}

// Escribir el informe en un archivo HTML
fs.writeFileSync('performance_report.html', generateHTMLReport());
console.log('Report generated successfully.');
