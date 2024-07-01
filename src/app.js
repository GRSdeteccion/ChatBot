import { join } from 'path';
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';

const PORT = process.env.PORT ?? 3008;

const flow1 = addKeyword('1')
    .addAnswer('¿Qué especialidad de pizza deseas ordenar y tamaño?', { capture: true }, async (ctx, { state }) => {
        await state.update({ order: ctx.body });
    })
    .addAnswer('¿Deseas agregar un refresco? de ser así especifica el sabor', { capture: true }, async (ctx, { state }) => {
        await state.update({ soda: ctx.body });
    })
    .addAnswer('Por favor, escribe la direccion de entrega', { capture: true }, async (ctx, { state }) => {
        await state.update({ direccion: ctx.body });
    })
    .addAnswer('¿Cómo deseas pagar?', { capture: true }, async (ctx, { state }) => {
        await state.update({ pago: ctx.body });
    })
    .addAction(async (_, { flowDynamic, state, gotoFlow }) => {
        await flowDynamic(`Agradecemos tu preferencia, te confirmo tu pedido: 
            \n-Pizza: ${state.get('order')} 
            \n-Refresco: ${state.get('soda')}
            \n-Direccion: ${state.get('direccion')}
            \n-Metodo de pago: ${state.get('pago')}
            \n !ORDEN TOMADA¡ , nuestro repartidor estará en tu domicilio muy pronto`);
        //return gotoFlow(mainFlow);
    });

    const flow2 = addKeyword(['2', utils.setEvent('2')])
    .addAnswer(
        async (_, { flowDynamic, gotoFlow }) => {
            await flowDynamic('Este es nuestro menú');
            await flowDynamic({ media: join(process.cwd(), 'assets', 'sample.jpg') });
            await flowDynamic('Esperamos que tengas apetito');
            return gotoFlow(mainFlow);
        }
    );


const flow3 = addKeyword(['3', utils.setEvent('3')])
    .addAnswer('¿De cuál de nuestras pizzas te gustaría conocer los ingredientes?')
    .addAnswer(
        [
            '1️⃣ Margarita',
            '2️⃣ Pepperoni',
            '3️⃣ Vegetariana',
            '4️⃣ Cuatro Estaciones',
            '#️⃣ Volver al Menú principal',
        ].join('\n'),
        { delay: 100, capture: true },
        async (ctx, { fallBack, gotoFlow }) => {
            if (!['1', '2', '3', '4', '#'].some(option => ctx.body.toLocaleLowerCase().includes(option))) {
                return fallBack('Por favor elige una de las opciones disponibles');
            } else if (ctx.body.toLocaleLowerCase().includes('1')) {
                return gotoFlow(flowMar);
            } else if (ctx.body.toLocaleLowerCase().includes('2')) {
                return gotoFlow(flowPep);
            } else if (ctx.body.toLocaleLowerCase().includes('3')) {
                return gotoFlow(flowVeg);
            } else if (ctx.body.toLocaleLowerCase().includes('4')) {
                return gotoFlow(flowCua);
            }
        },
        []
    );

const flowMar = addKeyword(['1', utils.setEvent('1')])
    .addAnswer('Pizza napolitana elaborada con tomate, mozzarella, albahaca fresca, sal y aceite.')
    .addAnswer(`Esperamos que sea de tu gusto`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(flow3);
    });

const flowPep = addKeyword(['2', utils.setEvent('2')])
    .addAnswer('Pizza con base de salsa de tomate, mozzarella y pepperoni.')
    .addAnswer(`Esperamos que sea de tu gusto`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(flow3);
    });

const flowVeg = addKeyword(['3', utils.setEvent('3')])
    .addAnswer('Pizza elaborada con cebolla, maíz, mozzarella, champiñones y jitomate.')
    .addAnswer(`Esperamos que sea de tu gusto`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(flow3);
    });

const flowCua = addKeyword(['4', utils.setEvent('4')])
    .addAnswer('Pizza dividida en cuatro secciones, preparada con alcachofas, albahaca, tomate, setas, jamón y aceitunas.')
    .addAnswer(`Esperamos que sea de tu gusto`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(flow3);
    });

const flow4 = addKeyword(['4', utils.setEvent('4')])
    .addAnswer('Esta es nuestra dirección')
    .addAnswer('https://maps.app.goo.gl/DozfCECmQ38WFNuG7')
    .addAnswer(`Esperamos verte pronto, para nosotros será un placer atenderte`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(mainFlow);
    });

const mainFlow = addKeyword(['#'])
    .addAnswer('*Menú Principal*')
    .addAnswer('🙌 ¡Hola! ¿Qué tal si te ayudo a saciar tu apetito con una deliciosa pizza de *Mateini\'s*?')
    .addAnswer(
        [
            'Elige una de las siguientes opciones para continuar:',
            ' 1️⃣​ Hacer un pedido',
            ' 2️⃣​ Menú',
            ' 3️⃣​​ Ingredientes pizzas',
            ' 4️⃣​​ Ubicación',
        ].join('\n'),
        { delay: 10, capture: true },
        async (ctx, { fallBack, gotoFlow }) => {
            if (!['1', '2', '3', '4'].some(option => ctx.body.toLocaleLowerCase().includes(option))) {
                return fallBack('Por favor elige una de las opciones disponibles');
            } else if (ctx.body.toLocaleLowerCase().includes('1')) {
                return gotoFlow(flow1);
            } else if (ctx.body.toLocaleLowerCase().includes('2')) {
                return gotoFlow(flow2);
            } else if (ctx.body.toLocaleLowerCase().includes('3')) {
                return gotoFlow(flow3);
            } else if (ctx.body.toLocaleLowerCase().includes('4')) {
                return gotoFlow(flow4);
            }
        },
        []
    );


const main = async () => {
    const adapterFlow = createFlow([mainFlow, flow1, flow2, flow3, flowMar, flowPep, flowVeg, flowCua, flow4]);

    const adapterProvider = createProvider(Provider);
    const adapterDB = new Database();

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body;
            await bot.sendMessage(number, message, { media: urlMedia ?? null });
            return res.end('sended');
        })
    );

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body;
            await bot.dispatch('REGISTER_FLOW', { from: number, name });
            return res.end('trigger');
        })
    );

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body;
            await bot.dispatch('SAMPLES', { from: number, name });
            return res.end('trigger');
        })
    );

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body;
            if (intent === 'remove') bot.blacklist.remove(number);
            if (intent === 'add') bot.blacklist.add(number);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok', number, intent }));
        })
    );

    httpServer(+PORT);
};

main();
