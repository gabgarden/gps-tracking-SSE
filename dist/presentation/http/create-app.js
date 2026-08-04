"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
function createApp(streamCarMovements) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.get('/stream', async (request, response) => {
        response.setHeader('Content-Type', 'text/event-stream');
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Connection', 'keep-alive');
        response.flushHeaders();
        const subscription = await streamCarMovements.execute(({ payload }) => {
            response.write('event: carMoved\n');
            response.write(`data: ${payload}\n\n`);
        });
        const keepAlive = setInterval(() => response.write(': keep-alive\n\n'), 30_000);
        request.on('close', () => {
            clearInterval(keepAlive);
            void subscription.close();
        });
    });
    return app;
}
