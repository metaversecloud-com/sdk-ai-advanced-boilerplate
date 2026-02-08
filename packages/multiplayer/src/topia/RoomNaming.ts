type RoomIdFn = (topia: { urlSlug: string; sceneDropId: string }) => string;

export class RoomNaming {
  static defaultRoomId(gameName: string, topia: { urlSlug: string; sceneDropId: string }): string {
    return `${gameName}:${topia.sceneDropId}`;
  }

  static resolve(
    gameName: string,
    customFn: RoomIdFn | undefined,
    topia: { urlSlug: string; sceneDropId: string }
  ): string {
    if (customFn) {
      return customFn(topia);
    }
    return RoomNaming.defaultRoomId(gameName, topia);
  }
}
