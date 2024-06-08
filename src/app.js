import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { WPPConnectProvider as Provider } from '@builderbot/provider-wppconnect'

const PORT = process.env.PORT ?? 3008

const flow1 = addKeyword('1')
    .addAnswer(`¿Qué especialidad de pizza deseas ordenar y tamaño?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ order: ctx.body })
    })
    .addAnswer('¿Deseas agregar un refresco? de ser así especifica el sabor', { capture: true }, async (ctx, { state }) => {
        await state.update({ soda: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`Agradecemos tu preferencia, te confirmo tu pedido: \n-Pizza: ${state.get('order')} \n-Refresco: ${state.get('soda')}`)
    })
    .addAnswer(`¿Tu pedido está correcto? *Si* / *No*`)
    .addAnswer(`_'#' para volver al menú principal_`)

const flow2 = addKeyword(['2', utils.setEvent('2')])
    .addAnswer(`Este es nuestro menú`)
    .addAnswer(`2`, { media: join(process.cwd(), 'assets', 'sample.jpg') })
    .addAnswer(`_'#' para volver al menú principal_`, null, async (ctx, { gotoFlow }) => {
        return gotoFlow(mainFlow);
    });
    
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
        { delay: 10, capture: true },
        async (ctx, { fallBack , gotoFlow }) => {
            if (!['1', '2', '3', '4'].some(option => ctx.body.toLocaleLowerCase().includes(option))) {
                return fallBack('Por favor elige una de las opciones disponibles');
            }
            else if (ctx.body.toLocaleLowerCase().includes('1')) {
                return gotoFlow(flowMar);
            }
            else if (ctx.body.toLocaleLowerCase().includes('2')) {
                return gotoFlow(flowPep);
            }
            else if (ctx.body.toLocaleLowerCase().includes('3')) {
                return gotoFlow(flowVeg);
            }
            else if (ctx.body.toLocaleLowerCase().includes('4')) {
                return gotoFlow(flowCua);
            }
            return;
        },
        []
    )

const flowMar = addKeyword(['1', utils.setEvent('1')])
    .addAnswer(`Pizza napolitana elaborada con tomate, mozzarella, albahaca fresca, sal y aceite.`)
    .addAnswer(`_'#' para volver al menú principal_`)

const flowPep = addKeyword(['2', utils.setEvent('2')])
    .addAnswer(`Pizza con base de salsa de tomate, mozzarella y pepperoni.`)
    .addAnswer(`_'#' para volver al menú principal_`)

const flowVeg = addKeyword(['3', utils.setEvent('3')])
    .addAnswer(`Pizza elaborada con cebolla, maíz, mozzarella, champiñones y jitomate.`)
    .addAnswer(`_'#' para volver al menú principal_`)

const flowCua = addKeyword(['4', utils.setEvent('4')])
    .addAnswer(`Pizza dividida en cuatro secciones, preparada con alcachofas, albahaca, tomate, setas, jamón y aceitunas.`)
    .addAnswer(`_'#' para volver al menú principal_`)

const flow4 = addKeyword(['4', utils.setEvent('4')])
    .addAnswer(`Esta es nuestra dirección`)
    .addAnswer(`https://maps.app.goo.gl/DozfCECmQ38WFNuG7`)
    .addAnswer(`_'#' para volver al menú principal_`)

const mainFlow = addKeyword(['#'])
    .addAnswer(`*Menú Principal*`)
    .addAnswer(`🙌 ¡Hola! ¿Qué tal si te ayudo a saciar tu apetito con una deliciosa pizza de *Mateini's*?`)
    .addAnswer(
        [
            'Elige una de las siguientes opciones para continuar:',
            ' 1️⃣​ Hacer un pedido',
            ' 2️⃣​ Menú',
            ' 3️⃣​​ Ingredientes pizzas',
            ' 4️⃣​​ Ubicación',
            // ' 5 ¿Hay domicilio a mi ubicación?',
        ].join('\n'),
        { delay: 10, capture: true },
        async (ctx, { fallBack , gotoFlow }) => {
            if (!['1', '2', '3', '4'].some(option => ctx.body.toLocaleLowerCase().includes(option))) {
                return fallBack('Por favor elige una de las opciones disponibles');
            }
            else if (ctx.body.toLocaleLowerCase().includes('1')) {
                return gotoFlow(flow1);
            }
            else if (ctx.body.toLocaleLowerCase().includes('2')) {
                return gotoFlow(flow2);
            }
            else if (ctx.body.toLocaleLowerCase().includes('3')) {
                return gotoFlow(flow3);
            }
            else if (ctx.body.toLocaleLowerCase().includes('4')) {
                return gotoFlow(flow4);
            }
            return;
        },
        []
    )
    

const main = async () => {
    const adapterFlow = createFlow([mainFlow, flow1, flow2, flow3, flowMar, flowPep, flowVeg, flowCua, flow4])
    
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()