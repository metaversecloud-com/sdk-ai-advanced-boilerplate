export interface GameTemplate {
  name: string;
  description: string;
  tickRate: number;
  entityFields: string[];
  inputPattern: string;
}

export const TEMPLATES: Record<string, GameTemplate> = {
  continuous: {
    name: 'continuous',
    description: 'Real-time continuous movement (e.g., snake, racing)',
    tickRate: 20,
    entityFields: ['x: float32', 'y: float32', 'angle: float32', 'speed: float32'],
    inputPattern: 'angle',
  },
  grid: {
    name: 'grid',
    description: 'Turn-based grid movement (e.g., puzzle, board game)',
    tickRate: 0,
    entityFields: ['gridX: int16', 'gridY: int16'],
    inputPattern: 'direction',
  },
  physics: {
    name: 'physics',
    description: 'Physics-based with velocity and collisions (e.g., bumper balls)',
    tickRate: 20,
    entityFields: ['x: float32', 'y: float32', 'vx: float32', 'vy: float32', 'radius: float32'],
    inputPattern: 'thrust',
  },
};
