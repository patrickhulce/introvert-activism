## API Happy Hacking Hints

List out messages

```sh
$ curl -v localhost:1337/api/messages/
```

Make a message

```sh
$ curl -v localhost:1337/api/messages/ -H 'Content-Type: application/json' -d '{"display_name": "POSTed", "duration": 5}'
```