const express = require('express');
const fs = require('fs');
const moment = require('moment-timezone');

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'));

function truncateLongNames(ranks) {
    ranks.forEach((player, i) => {
	const maxNameLength = 20;
	if (player.name.length > maxNameLength) {
	    ranks[i].name = player.name.substring(0, maxNameLength);
	}
    });
    return ranks;
}

app.get('/', (req, res) => {
    const json = fs.readFileSync('ranks.json');
    const ranks = JSON.parse(json);
    const t = moment.unix(ranks.timestamp);
    res.render('index', {
	pageName: 'index',
	ranks: truncateLongNames(ranks.ranks).slice(0, 10),
	updateDuration: t.from(moment()),
	updateTime: t.tz('America/Los_Angeles').format('MMM Do h:mm A'),
    });
});

app.get('/rankings', (req, res) => {
    const json = fs.readFileSync('ranks.json');
    const ranks = JSON.parse(json);
    const t = moment.unix(ranks.timestamp);
    res.render('rankings', {
	pageName: 'rankings',
	ranks: truncateLongNames(ranks.ranks),
	updateDuration: t.from(moment()),
	updateTime: t.tz('America/Los_Angeles').format('MMM Do h:mm A'),
    });
});

app.get('/map', (req, res) => {
    const json = fs.readFileSync('ranks.json');
    const data = JSON.parse(json);
    const t = moment.unix(data.timestamp);
    res.render('map', {
	pageName: 'map',
	updateDuration: t.from(moment()),
	updateTime: t.tz('America/Los_Angeles').format('MMM Do h:mm A'),
    });
});

app.get('/join', (req, res) => {
    const json = fs.readFileSync('ranks.json');
    const data = JSON.parse(json);
    const t = moment.unix(data.timestamp);
    res.render('join', {
	pageName: 'join',
	updateDuration: t.from(moment()),
	updateTime: t.tz('America/Los_Angeles').format('MMM Do h:mm A'),
    });
});

app.get('/about', (req, res) => {
    const json = fs.readFileSync('ranks.json');
    const data = JSON.parse(json);
    const t = moment.unix(data.timestamp);
    res.render('about', {
	pageName: 'about',
	updateDuration: t.from(moment()),
	updateTime: t.tz('America/Los_Angeles').format('MMM Do h:mm A'),
    });
});

port = 80
app.listen(port);
console.log(`Serving on port ${port}`);
