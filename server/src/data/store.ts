import { ClientProfile, Portfolio } from "../types/data";

const CLIENT_PROFILES = new Map<string, ClientProfile>();
const PORTFOLIOS = new Map<string, Portfolio>();
let loaded = false;

export function setClients(clients: ClientProfile[]) {
  for (const c of clients) {
    CLIENT_PROFILES.set(c.id, c);
  }
}

export function setPortfolios(portfolios: Portfolio[]) {
  for (const p of portfolios) {
    PORTFOLIOS.set(p.strategy, p);
  }
}

export function getClient(id: string): ClientProfile | undefined {
  return CLIENT_PROFILES.get(id);
}

export function getAllClients(): ClientProfile[] {
  return Array.from(CLIENT_PROFILES.values());
}

export function getPortfolio(strategy: string): Portfolio | undefined {
  return PORTFOLIOS.get(strategy);
}

export function isLoaded(): boolean {
  return loaded;
}

export function markLoaded() {
  loaded = true;
}
