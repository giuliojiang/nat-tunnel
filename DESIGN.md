# Websocket connection

Client -> Server

```
{
    auth: "password"
}
```

```
{
    data: "connection id",
    raw: data in base64
}
```

```
    close: "connection id"
```

Server -> Client 

```
{
    open: "connection id"
}
```

```
{
    close: "connection id"
}
```

```
{
    data: "connection id",
    raw: data in base64
}
```