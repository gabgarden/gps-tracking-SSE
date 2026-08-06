import type {
  CarMovementSubscriber,
  CarMovementSubscription,
} from '../ports/car-movement-subscriber.js';
import type { CarMovement } from '../../domain/entities/car-movement.js';

export class StreamCarMovements {
  constructor(private readonly subscriber: CarMovementSubscriber) {}

  execute(onMovement: (movement: CarMovement) => void): Promise<CarMovementSubscription> {
    return this.subscriber.subscribe(onMovement);
  }
}
