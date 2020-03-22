let net = require('net');
let path = require('path');
let base64 = require(path.resolve(__dirname, 'base64.js'));
let WebSocket = require('ws');

let websocketUrl = process.env.TUNNEL_WS_SERVER;
let tcpPort = parseInt(process.env.TUNNEL_TCP_PORT);
let secret = process.env.TUNNEL_SECRET;

// Returns a Promise
let runClient = () => {

    return new Promise((resolve, reject) => {

        console.info('Connecting to server...');
        let ws = new WebSocket(`ws://${websocketUrl}`);

        ws.on('open', () => {
            console.info('Connected');
            ws.send(JSON.stringify({
                auth: secret
            }));
        });

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

        ws.on('message', rawmsg => {
            let msg = JSON.parse(rawmsg);

            if (msg.open != null) {

                let id = msg.open;
                let tcpClient = new net.Socket();
                tcpConnections[id] = tcpClient;
                tcpClient.connect(tcpPort, '127.0.0.1', () => {
                });
                tcpClient.on('data', buffer => {
                    ws.send(JSON.stringify({
                        data: id,
                        raw: base64.toBase64(buffer)
                    }));
                });
                tcpClient.on('close', () => {
                    ws.send(JSON.stringify({
                        close: id
                    }));
                    removeTcpConnection(id);
                });
                tcpClient.on('error', err => {
                    console.info(err);
                });

            } else if (msg.close != null) {

                let id = msg.close;
                doWithTcpConnection(id, tcpConn => {
                    tcpConn.end();
                });

            } else if (msg.data != null) {

                let id = msg.data;
                doWithTcpConnection(id, tcpConn => {
                    tcpConn.write(base64.fromBase64(msg.raw));
                });

            } else {

                console.info('Unrecognized message');

            }
        });

        ws.on('error', err => {
            console.error(err);
        });

        let heartbeatHandle = setInterval(() => {
            ws.send(JSON.stringify({
                heartbeat: true
            }));
        }, 1000);

        ws.on('close', () => {
            clearTimeout(heartbeatHandle);
            resolve();
        });

    });
};

(async () => {
    while (true) {
        await runClient();
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    }
})();