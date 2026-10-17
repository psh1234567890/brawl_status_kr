export interface RotationEvent {
  slotId: number;
  mapId: number;
  mode: string;
  map: string;
  startTime: string;
  endTime: string;
}

export interface EventRotationResponse {
  active: RotationEvent[];
  upcoming: RotationEvent[];
  fetchedAt: string;
}
