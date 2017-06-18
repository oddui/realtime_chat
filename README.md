# realtime_chat

Realtime chat server

## Docker usage for legacy durarara

put durarara client build in `client/durarara/dist`

change token secret in `config/production.json`

build: `$ docker build -t ziyu/legacy-durarara .`

run: `$ docker run -p 80:3000 ziyu/legacy-durarara`

[push](https://docs.docker.com/docker-hub/repos/#pushing-a-repository-image-to-docker-hub): `$ docker push ziyu/legacy-durarara`
