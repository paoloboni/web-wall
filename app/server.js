const http = require('http');
const url = require('url');
const captureWebsite = require('capture-website');
const tmp = require('tmp-promise');
const fs = require('fs');
const compression = require('compression');
const express = require('express');
const mustacheExpress = require('mustache-express');
const path = require('path');
const config = require('config');
const app = express();
const port = process.env.SERVER_PORT || 8080;
const serverHost = process.env.SERVER_HOST || 'localhost';
const serverScheme = process.env.SERVER_SCHEME || 'http';

app.use(compression());
app.engine('html', mustacheExpress());
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'html');

app.get('/health', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send('Healthy');
});

app.get('/', (req, res) => {
    const refreshInterval = config.get('refreshInterval');
    const columns = config.get('columns');
    const websites = config.get('websites');
    const nRows = Math.ceil(websites.length / columns);
    const grid = Array.from(Array(nRows).keys()).map(row => {
        return Array.from(Array(columns).keys()).map(col => {
            const id = nRows * row + col;
            return {
                id: id,
                url: websites[id] === undefined ? undefined : websites[id].url
            };
        });
    });
    res.render('index', {
        serverUrl: `${serverScheme}://${serverHost}:${port}`,
        refreshInterval: refreshInterval * 1000,
        grid: grid,
        gridEncoded: JSON.stringify(grid)
    });
});

app.get('/screenshots', (req, res) => {
    const websites = config.get('websites');
    Promise.all(websites.map(website => {
        return tmp.file({
                postfix: '.png'
            })
            .then(file => {
                return captureWebsite.file(website.url, file.path, {
                        launchOptions: {
                            args: [
                                '--no-sandbox',
                                '--disable-setuid-sandbox'
                            ]
                        },
                        overwrite: true,
                        headers: website.headers,
                        cookies: website.cookies,
                        authentication: website.authentication
                    })
                    .then(result => {
                        const encoded = base64_encode(file.path);
                        return {
                            [website.url]: encoded
                        };
                    });
            });
    })).then(screenshots => {
        const reducer = (target, source) => Object.assign(target, source);
        const response = screenshots.reduce(reducer);
        res.json(response);
    });
});

app.listen(port, () => {
    console.log(`app listening at http://${serverHost}:${port}`)
});

const base64_encode = function(file) {
    var bitmap = fs.readFileSync(file);
    return Buffer.from(bitmap).toString('base64');
};

const display_static_page = function(res, page) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile(page, null, function(error, data) {
        if (error) {
            res.writeHead(404);
        } else {
            res.write(data);
        }
        res.end();
    });
};

module.exports = app;