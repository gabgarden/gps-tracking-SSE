import type { CarMovementMessage } from '../dto/car-movement-message.js';

export interface CarMovementSubscription {
  close(): Promise<void>;
}

export interface CarMovementSubscriber {
  subscribe(
    onMovement: (movement: CarMovementMessage) => void,
  ): Promise<CarMovementSubscription>;
}
