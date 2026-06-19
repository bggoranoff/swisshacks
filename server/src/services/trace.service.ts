import crypto from "crypto";

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, string | number | boolean>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: "OK" | "ERROR" | "UNSET";
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  children: Span[];
}

export interface Trace {
  traceId: string;
  rootSpan: Span;
  spans: Span[];
  duration: number;
  startTime: number;
  serviceName: string;
  status: "OK" | "ERROR" | "UNSET";
  spanCount: number;
}

export interface TraceContext {
  traceId: string;
  spans: Span[];
  rootSpan: Span;
}

class TraceService {
  private traces: Trace[] = [];
  private maxTraces = 100;

  startTrace(operationName: string, serviceName: string = "orchestrator"): TraceContext {
    const traceId = crypto.randomUUID();
    const rootSpan = this.createSpan(traceId, operationName, serviceName);
    return { traceId, spans: [rootSpan], rootSpan };
  }

  startSpan(ctx: TraceContext, operationName: string, serviceName: string, parentSpanId?: string): Span {
    const span = this.createSpan(ctx.traceId, operationName, serviceName, parentSpanId || ctx.rootSpan.spanId);
    ctx.spans.push(span);
    const parent = ctx.spans.find(s => s.spanId === span.parentSpanId);
    if (parent) parent.children.push(span);
    return span;
  }

  endSpan(span: Span, status: "OK" | "ERROR", attributes?: Record<string, string | number | boolean>) {
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    if (attributes) Object.assign(span.attributes, attributes);
  }

  addEvent(span: Span, name: string, attributes: Record<string, string | number | boolean> = {}) {
    span.events.push({ name, timestamp: Date.now(), attributes });
  }

  endTrace(ctx: TraceContext): Trace {
    this.endSpan(ctx.rootSpan, ctx.rootSpan.status === "UNSET" ? "OK" : ctx.rootSpan.status);
    const trace: Trace = {
      traceId: ctx.traceId,
      rootSpan: ctx.rootSpan,
      spans: ctx.spans,
      duration: ctx.rootSpan.duration,
      startTime: ctx.rootSpan.startTime,
      serviceName: ctx.rootSpan.serviceName,
      status: ctx.rootSpan.status,
      spanCount: ctx.spans.length,
    };
    this.traces.unshift(trace);
    if (this.traces.length > this.maxTraces) this.traces.pop();
    return trace;
  }

  getTraces(): Omit<Trace, "rootSpan" | "spans">[] {
    return this.traces.map(t => ({
      traceId: t.traceId,
      duration: t.duration,
      startTime: t.startTime,
      serviceName: t.serviceName,
      status: t.status,
      spanCount: t.spanCount,
    }));
  }

  getTrace(traceId: string): Trace | undefined {
    return this.traces.find(t => t.traceId === traceId);
  }

  private createSpan(traceId: string, operationName: string, serviceName: string, parentSpanId?: string): Span {
    return {
      traceId,
      spanId: crypto.randomUUID().slice(0, 8),
      parentSpanId,
      operationName,
      serviceName,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      status: "UNSET",
      attributes: {},
      events: [],
      children: [],
    };
  }
}

export const traceService = new TraceService();

export async function withSpan<T>(
  ctx: TraceContext | undefined,
  op: string,
  svc: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  if (!ctx) return fn({} as Span);
  const span = traceService.startSpan(ctx, op, svc);
  try {
    const result = await fn(span);
    traceService.endSpan(span, "OK");
    return result;
  } catch (err) {
    traceService.endSpan(span, "ERROR", { error: (err as Error).message });
    throw err;
  }
}
