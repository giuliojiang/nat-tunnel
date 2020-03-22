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

    let splitMessages = 0;

    setInterval(() => {
        console.info(`${splitMessages} messages/s`);
        splitMessages = 0;
    }, 1000);
    
    server.on('connection', ws => {

        let tcpServer;

        ws.on('close', (code, reason) => {
            console.info('WebsocketServer: connection closed');
            wsConnectionCount -= 1;
            try {
                tcpServer.close();
            } catch (err) {
                console.warn('WARN: error when closing TCP socket');
            }
        });

        ws.on('error', err => {
            console.error(err);
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

        let tcpConnections = {};
        let removeTcpConnection = (id) => {
            try {
                delete tcpConnections[id];
            } catch (err) {
                console.warn(`Could not delete tcp connection ${id}`);
            }
        }
        let doWithTcpConnection = (id, action) => {
            try {
                action(tcpConnections[id]);
            } catch (err) {
                console.warn(`Could not do with TCP connection ${id}`);
                console.warn(err);
            }
        };

        tcpServer = net.createServer(tcpSocket => {

            let connectionId = util.randString();
            tcpConnections[connectionId] = tcpSocket;

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
                removeTcpConnection(connectionId);
            });

            tcpSocket.on('error', err => {
                console.error(err);
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

                splitMessages += 1;
                let id = m.data;
                let raw = m.raw;
                let buffer = base64.fromBase64(raw);
                doWithTcpConnection(id, tcpConn => {
                    tcpConn.write(buffer);
                });

            } else if (m.close != null) {

                console.info('ws received close message');
                let id = m.close;
                removeTcpConnection(id);

            } else if (m.heartbeat != null) {

            } else {

                console.info('WebsocketServer: unrecognized message type');

            }

        });

    });

})();