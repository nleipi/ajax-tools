# ajax-tools

A set of tools allowing to use ajax in server-side rendered web-sites in simple declarative manner.

## Testing

`npm test` will run playwright tests
If you're the lucky one and can't run tests locally, create .env file with `PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3000/` and use `npm run start-pw-remote` to start docker container for remote tests execution
