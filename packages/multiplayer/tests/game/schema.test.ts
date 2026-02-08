import { Entity, schema } from '../../src/game/Entity.js';

class TestEntity extends Entity {
  @schema('float32') x = 0;
  @schema('float32') y = 0;
  @schema('int16') score = 0;
  @schema('string') name = '';
}

describe('@schema decorator', () => {
  it('registers schema fields on the entity class', () => {
    const fields = TestEntity.getSchemaFields();
    expect(fields).toEqual({
      x: 'float32',
      y: 'float32',
      score: 'int16',
      name: 'string',
    });
  });

  it('does not include non-decorated fields', () => {
    class ExtendedEntity extends Entity {
      @schema('float32') x = 0;
      private internal = 'hidden';
    }
    const fields = ExtendedEntity.getSchemaFields();
    expect(fields).toEqual({ x: 'float32' });
    expect(fields).not.toHaveProperty('internal');
  });

  it('creates instance with default values', () => {
    const entity = new TestEntity('test-id');
    expect(entity.x).toBe(0);
    expect(entity.y).toBe(0);
    expect(entity.score).toBe(0);
    expect(entity.name).toBe('');
    expect(entity.id).toBe('test-id');
  });
});
