export abstract class ITokenService {
  abstract getToken(): string | null;
  abstract setToken(token: string): void;
  abstract getRefreshToken(): string | null;
  abstract setRefreshToken(token: string): void;
  abstract clearTokens(): void;
}
