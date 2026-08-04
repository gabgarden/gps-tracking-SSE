"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamCarMovements = void 0;
class StreamCarMovements {
    subscriber;
    constructor(subscriber) {
        this.subscriber = subscriber;
    }
    execute(onMovement) {
        return this.subscriber.subscribe(onMovement);
    }
}
exports.StreamCarMovements = StreamCarMovements;
