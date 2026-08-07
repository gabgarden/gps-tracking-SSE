import type {
  CarMovementSubscriber,
  CarMovementSubscription,
} from '../ports/car-movement-subscriber.js';
import type { CarMovementMessage } from '../dto/car-movement-message.js';

export class StreamCarMovements {
  constructor(private readonly subscriber: CarMovementSubscriber) {}

  execute(onMovement: (movement: CarMovementMessage) => void): Promise<CarMovementSubscription> {
    return this.subscriber.subscribe(onMovement);
  }
}
