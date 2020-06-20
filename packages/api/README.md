## API Happy Hacking Hints

List out messages.

```sh
$ curl -v localhost:8675/api/messages/
```

Make a message.

```sh
$ curl -v localhost:8675/api/messages/ -H 'Content-Type: application/json' -d '{"display_name": "POSTed", "script": "Hi, I am..."}'
```

Delete a message.

```sh
$ curl -v -X DELETE localhost:8675/api/messages/{messageId}
```

Edit a message.

```sh
$ curl -v localhost:8675/api/messages/{messageId} -X PUT -H 'Content-Type: application/json' -d '{"display_name": "PUTed", "script": "Hi, I am..."}'
```

Add audio file.

```sh
$ curl -v localhost:8675/api/messages/{messageId}/audio -X PUT -H 'Content-Type: application/json' -d '{"data": "011010101"}'
```

Get audio file.

```sh
$ curl -v localhost:8675/api/messages/{messageId}/audio
```
