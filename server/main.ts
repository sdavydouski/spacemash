import Koa from 'koa';
import serve from 'koa-static';
import send from 'koa-send';

const app = new Koa();

const clientDirectory = '../client';
const resourcesDirectory = '../resources';

app.use(serve(clientDirectory));
app.use(serve(resourcesDirectory));
app.use(async (ctx) => {
    await send(ctx, 'index.html', {root: clientDirectory});
});

app.listen(3000, () => {
    console.log('Listening on port 3000...');
});
