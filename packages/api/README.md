## API Happy Hacking Hints

List out messages.

```sh
$ curl -v localhost:8675/api/messages/
```

Make a message.

```sh
$ curl -v localhost:8675/api/messages/ -H 'Content-Type: application/json' -d '{"display_name": "POSTed", "duration": 5}'
```

Delete a message.

```sh
$ curl -v -X DELETE localhost:8675/api/messages/{messageId}
```

Edit a message.

```sh
$ curl -v localhost:8675/api/messages/{messageId} -X PUT -H 'Content-Type: application/json' -d '{"display_name": "PUTed", "duration": 0}'
```

Add audio file.

```sh
$ curl -v localhost:8675/api/messages/{messageId}/audio -X PUT -H 'Content-Type: application/json' -d '{"data": "011010101"}'
```

Get audio file.

```sh
$ curl -v localhost:8675/api/messages/{messageId}/audio
```
