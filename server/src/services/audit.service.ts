export interface AuditEntry {
  timestamp: string;
  agent: string;
  action: string;
  clientId?: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  traceId?: string;
}

class AuditService {
  private entries: AuditEntry[] = [];
  private maxEntries = 500;

  log(entry: Omit<AuditEntry, "timestamp">) {
    this.entries.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    if (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }
  }

  getEntries(limit = 50): AuditEntry[] {
    return this.entries.slice(0, limit);
  }

  getEntriesByClient(clientId: string): AuditEntry[] {
    return this.entries.filter(e => e.clientId === clientId);
  }
}

export const auditService = new AuditService();
