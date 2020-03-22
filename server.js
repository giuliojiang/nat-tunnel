let net = require('net');
let path = require('path');
let base64 = require(path.resolve(__dirname, 'base64.js'));
let util = require(path.resolve(__dirname, 'util.js'));
let WebSocket = require('ws');

let websocketPort = parseInt(process.env.TUNNEL_WS_PORT);
let tcpPort = parseInt(process.env.TUNNEL_TCP_PORT);
let secret = process.env.TUNNEL_SECRET;

(async () => {

    let server = new WebSocket.Server({
        port: websocketPort
    });

    let wsConnectionCount = 0;
    
    server.on('connection', ws => {

        let tcpServer;

        ws.on('close', (code, reason) => {
            console.info('WebsocketServer: connection closed');
            wsConnectionCount -= 1;
            tcpServer.close();
        });

        wsConnectionCount += 1;
        
        console.info('WebsocketServer: got new connection');
        if (wsConnectionCount > 1) {
            console.info('Detected too many connections')
            ws.terminate();
            return;
        }

        let connectionAuthenticated = false;
        setTimeout(() => {
            if (!connectionAuthenticated) {
                console.info('5s timeout passed and no authentication, terminating connection');
                ws.terminate();
            }
        }, 5000);

        let tcpSockets = {};

        tcpServer = net.createServer(tcpSocket => {

            let connectionId = util.randString();
            tcpSockets[connectionId] = tcpSocket;

            ws.send(JSON.stringify({
                open: connectionId
            }));

            tcpSocket.on('data', buffer => {
                ws.send(JSON.stringify({
                    data: connectionId,
                    raw: base64.toBase64(buffer)
                }));
            });

            tcpSocket.on('close', hadError => {
                ws.send(JSON.stringify({
                    close: connectionId
                }));
                delete tcpSockets[connectionId];
            });

        });

        tcpServer.listen(tcpPort, '0.0.0.0');

        ws.on('message', message => {
            
            let m = JSON.parse(message);

            if (m.auth != null) {

                console.info('WebsocketServer: got auth message');
                if (m.auth != secret) {
                    console.info('Invalid password');
                    ws.terminate();
                    return;
                } else {
                    connectionAuthenticated = true;
                }

            } else if (m.data != null) {

                console.info('WebsocketServer: got data message');
                let id = m.data;
                let raw = m.raw;
                let buffer = base64.fromBase64(raw);
                tcpSockets[id].write(buffer);

            } else if (m.close != null) {

                console.info('ws received close message');
                let id = m.close;
                tcpSockets[id].end();

            } else {

                console.info('WebsocketServer: unrecognized message type');

            }

        });

    });

})();