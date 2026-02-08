export interface TopiaPlayerCredentials {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: number;
}

const REQUIRED_FIELDS = [
  'assetId', 'visitorId', 'urlSlug', 'interactiveNonce',
  'interactivePublicKey', 'sceneDropId', 'identityId',
  'profileId', 'uniqueName', 'username', 'displayName',
] as const;

export class TopiaCredentials {
  static fromURLParams(params: URLSearchParams): TopiaPlayerCredentials {
    const raw: Record<string, string> = {};
    for (const field of REQUIRED_FIELDS) {
      const value = params.get(field);
      if (!value) {
        throw new Error(`Missing required Topia credential: ${field}`);
      }
      raw[field] = value;
    }

    return {
      ...raw,
      visitorId: parseInt(raw.visitorId, 10),
    } as TopiaPlayerCredentials;
  }

  static fromURL(url: string): TopiaPlayerCredentials {
    const parsed = new URL(url);
    return TopiaCredentials.fromURLParams(parsed.searchParams);
  }

  static fromSocketAuth(auth: Record<string, string>): TopiaPlayerCredentials {
    for (const field of REQUIRED_FIELDS) {
      if (!auth[field]) {
        throw new Error(`Missing required Topia credential: ${field}`);
      }
    }

    return {
      ...auth,
      visitorId: parseInt(auth.visitorId, 10),
    } as TopiaPlayerCredentials;
  }
}
