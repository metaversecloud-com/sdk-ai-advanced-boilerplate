import { EntityCollection } from '../../src/core/TopiaRoom.js';
import { Entity, schema } from '../../src/game/Entity.js';

class SnakeEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

class FoodEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
}

describe('EntityCollection', () => {
  it('adds and retrieves entities', () => {
    const collection = new EntityCollection();
    const snake = new SnakeEntity('s1');
    const food = new FoodEntity('f1');

    collection.add(snake);
    collection.add(food);

    expect(collection.count).toBe(2);
    expect(collection.all()).toContain(snake);
    expect(collection.all()).toContain(food);
  });

  it('filters by entity type', () => {
    const collection = new EntityCollection();
    collection.add(new SnakeEntity('s1'));
    collection.add(new SnakeEntity('s2'));
    collection.add(new FoodEntity('f1'));

    const snakes = collection.ofType(SnakeEntity);
    expect(snakes).toHaveLength(2);
    expect(snakes.every(s => s instanceof SnakeEntity)).toBe(true);
  });

  it('finds nearest entity of type', () => {
    const collection = new EntityCollection();

    const origin = new SnakeEntity('s1');
    origin.x = 0;
    origin.y = 0;
    collection.add(origin);

    const near = new FoodEntity('f1');
    near.x = 10;
    near.y = 0;
    collection.add(near);

    const far = new FoodEntity('f2');
    far.x = 100;
    far.y = 0;
    collection.add(far);

    const nearest = collection.nearest(origin, FoodEntity);
    expect(nearest?.id).toBe('f1');
  });

  it('respects exclude filter in nearest', () => {
    const collection = new EntityCollection();

    const origin = new SnakeEntity('s1');
    origin.x = 0;
    origin.y = 0;
    collection.add(origin);

    const close = new SnakeEntity('s2');
    close.x = 5;
    close.y = 0;
    close.isBot = true;
    collection.add(close);

    const human = new SnakeEntity('s3');
    human.x = 50;
    human.y = 0;
    collection.add(human);

    const nearest = collection.nearest(origin, SnakeEntity, {
      exclude: (e) => e.isBot || e.id === origin.id,
    });
    expect(nearest?.id).toBe('s3');
  });

  it('removes entities', () => {
    const collection = new EntityCollection();
    const snake = new SnakeEntity('s1');
    collection.add(snake);

    expect(collection.count).toBe(1);
    collection.remove('s1');
    expect(collection.count).toBe(0);
  });
});
