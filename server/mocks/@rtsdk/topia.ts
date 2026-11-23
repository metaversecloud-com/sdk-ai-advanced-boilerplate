export const fireToast = jest.fn().mockResolvedValue({ success: true });

export class Topia {
  constructor(_opts: any) {}
}

export class AssetFactory {
  constructor(_topia: any) {}
}

export class DroppedAssetFactory {
  constructor(_topia: any) {}
}

export class UserFactory {
  constructor(_topia: any) {}
}

export class VisitorFactory {
  constructor(_topia: any) {}
}

export class WorldFactory {
  constructor(_topia: any) {}
  create(slug: string, opts: any) {
    (__mock as any).lastWorldCreateArgs = { slug, opts };
    return { fireToast };
  }
}

export const __mock = {
  fireToast,
  lastWorldCreateArgs: null as any,
  reset() {
    fireToast.mockClear();
    this.lastWorldCreateArgs = null;
  },
};
