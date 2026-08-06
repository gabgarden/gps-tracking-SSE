import type { CarMovement } from '../../domain/entities/car-movement.js';

export interface CarMovementSubscription {
  close(): Promise<void>;
}

export interface CarMovementSubscriber {
  subscribe(
    onMovement: (movement: CarMovement) => void,
  ): Promise<CarMovementSubscription>;
}
