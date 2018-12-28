const browser = require('browser');
const htmlparser = require('htmlparser2');
const moment = require('moment');

function getCsrfToken(html) {
    const csrfBegin = '<input type="hidden" name="_csrfToken" autocomplete="off" value="';
    let csrfIndex = html.indexOf(csrfBegin);
    if (csrfIndex < 0) {
	throw 'Oh noes! No CSRF token found in the login form!';
    }
    csrfIndex += csrfBegin.length;
    const endIndex = html.indexOf('"', csrfIndex);
    if (endIndex < 0) {
	throw 'Oh noes! No end quote after CSRF token in login form!';
    }
    const csrfToken = html.substring(csrfIndex, endIndex);
    if (csrfToken.length < 100 || csrfToken.length > 200) {
	throw 'CSRF token has the wrong length!';
    }
    return csrfToken;
}

// line: one line of a kill.log file.
// callback: this function is called if the line is successfully parsed.
function parseOneLogLine(line, callback) {
    const data = {};
    const dateMatch = line.match(/(\d\d\d\d.\d\d.\d\d-\d\d.\d\d.\d\d): /);
    if (!dateMatch) {
	return;
    }
    const t = moment(dateMatch[1], 'YYYY.MM.DD-HH.mm.ss');
    data.unixTime = t.unix();
    data.formattedTime = t.format('YYYY-MM-DD HH:mm:ss');
    const killMatch = line.match(
	    /Died: (.*) \((\d*)\), Killer: (.*) \((\d*)\)/);
    if (!killMatch) {
	return;
    }
    data.victimName = killMatch[1];
    data.victimId = killMatch[2];
    data.killerName = killMatch[3];
    data.killerId = killMatch[4];
    const coordinateMatch = line.match(/S\[KillerLoc: (.*), (.*), (.*), VictimLoc: (.*), (.*), (.*)\] C\[KillerLoc: (.*), (.*), (.*), VictimLoc: (.*), (.*), (.*)\]/);
    if (coordinateMatch) {
	data.killerX = coordinateMatch[1];
	data.killerY = coordinateMatch[2];
	data.killerZ = coordinateMatch[3];
	data.victimX = coordinateMatch[4];
	data.victimY = coordinateMatch[5];
	data.victimZ = coordinateMatch[6];
    }
    callback(data);
}

// killCallback: gets called once per kill in the kill log.
// doneCallback: gets called at the end.
function downloadLatestKillLog(verbose, killCallback, doneCallback) {
    var b = new browser();
    var loginUrl = ('https://id.g-portal.com/login?redirect=' +
		    'https%3A%2F%2Fwww.g-portal.us%2Fen%2F');
    if (verbose) console.log('Downloading latest kill log.');
    if (verbose) console.log('    Trying login.');
    b.browse('login', loginUrl);
    b.browse((err, out) => {
	if (verbose) {
	    console.log('    Attempted login. Checking for CSRF token.');
	}
	const csrfToken = getCsrfToken(out.result);
	if (verbose) console.log('    CSRF token found:');
	if (verbose) console.log('    ' + csrfToken);
	if (verbose) console.log('    Downloading list of log files...');
	return [loginUrl, {
	    data  : {
		_method: 'POST',
		_csrfToken: csrfToken,
		email  : '***REMOVED***',
		password : '***REMOVED***',
	    },
	    method: 'POST',
	}];
    })
    .after('login');  // browse after browsing with label="login"
    const logsUrl = 'https://www.g-portal.us/en/scum/logs/71302';
    b.browse(logsUrl).after();
    b.browse((err, out) => {
	let openOptionTags = 0;
	let optionValue;
	let maxTimestamp;
	let latestKillLogOptionValue;
	if (verbose) {
	    console.log('    Log list obtained. Finding kill logs...');
	}
	const parser = new htmlparser.Parser({
	    onopentag: (name, attribs) => {
		if (name === 'option') {
		    ++openOptionTags;
		    optionValue = attribs.value;
		}
	    },
	    ontext: (text) => {
		if (openOptionTags === 0) {
		    return;
		}
		const prefix = 'kill.log (';
		if (!text || text.length < prefix.length ||
		    !text.startsWith(prefix)) {
		    return;
		}
		const timestampString = text.substring(prefix.length);
		const t = moment(timestampString, 'DD.MM.YYYY HH:mm:ss)');
		if (!maxTimestamp || t.isAfter(maxTimestamp)) {
		    maxTimestamp = t;
		    latestKillLogOptionValue = optionValue;
		    if (verbose) {
			console.log('        Found ', text, optionValue);
		    }
		}
	    },
	    onclosetag: (tagname) => {
		if(tagname === 'option') {
		    --openOptionTags;
		}
	    }
	}, {decodeEntities: true});
	parser.write(out.result);
	parser.end();
	if (verbose) {
	    console.log('    Downloading option ', latestKillLogOptionValue);
	}
	return [logsUrl, {
	    data  : {
		_method: 'POST',
		'data[ExtConfig][config]': latestKillLogOptionValue,
		load: '',
		'data[ExtConfig][currentConfig]': '',
		'data[ExtConfig][fileContent]': '',
	    },
	    method: 'POST',
	}];
    })
    .after();
    b.on('end', (err, out) => {
	let openTags = 0;
	if (verbose) console.log('    Finding log contents.');
	const parser = new htmlparser.Parser({
	    onopentag: (name, attribs) => {
		if (name === 'textarea') {
		    ++openTags;
		}
	    },
	    ontext: (text) => {
		if (openTags > 0) {
		    if (verbose) console.log('    Found log file contents.');
		    if (verbose) console.log(text);
		    const lines = text.split(/\r?\n/);
		    console.log('lines:', lines.length);
		    lines.forEach((line) => {
			parseOneLogLine(line, killCallback);
		    });
		    console.log('Done parsing kill log.');
		}
	    },
	    onclosetag: (tagname) => {
		if(tagname === 'textarea') {
		    --openTags;
		}
	    }
	}, {decodeEntities: true});
	parser.write(out.result);
	parser.end();
	doneCallback();
    });
    // Run the whole browser session.
    b.run();
}

exports.downloadLatestKillLog = downloadLatestKillLog;
