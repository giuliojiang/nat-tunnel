# nat-tunnel
Relay TCP connections through a server instead of opening ports on your home router

## Usage

Server runs on a server that has open ports and a public IP address.

```
TUNNEL_WS_PORT=25001 TUNNEL_TCP_PORT=25002 TUNNEL_SECRET=somesecret node server.js
```

Client runs on the firewalled machine.
`TUNNEL_TCP_PORT` is the service that is running on the client machine and that you want to make available to the outer world.

```
TUNNEL_WS_SERVER=localhost:25001 TUNNEL_TCP_PORT=3000 TUNNEL_SECRET=somesecret node client.js
```

Now clients in the outer world can use server:25002 to communicate to client:3000.