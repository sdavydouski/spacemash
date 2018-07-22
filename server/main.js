const path = require('path');
const Koa = require('koa');
const serve = require('koa-static');
const send = require('koa-send');

const app = new Koa();

const clientDirectory = path.join(__dirname, '../client');
const resourcesDirectory = path.join(__dirname, '../resources');

app.use(serve(clientDirectory));
app.use(serve(resourcesDirectory));
app.use(async (ctx) => {
    await send(ctx, 'index.html', {root: clientDirectory});
});

const server = require('http').createServer(app.callback());

server.listen(3000, () => {
    console.log('Listening on port 3000...');
});