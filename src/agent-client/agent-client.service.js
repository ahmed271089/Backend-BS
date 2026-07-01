var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, Logger } from '@nestjs/common';
/**
 * Thin client around the separate `agent-ai` service (Google ADK).
 * Called asynchronously after a PROBLEM post + attachments are saved.
 * Replace the fetch below with the real agent-ai endpoint once it's deployed.
 */
let AgentClientService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AgentClientService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AgentClientService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new Logger(AgentClientService.name);
        baseUrl = process.env.AGENT_AI_BASE_URL;
        apiKey = process.env.AGENT_AI_API_KEY;
        async analyzeProblem(params) {
            try {
                const res = await fetch(`${this.baseUrl}/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
                    },
                    body: JSON.stringify(params),
                });
                if (!res.ok) {
                    throw new Error(`Agent AI responded with status ${res.status}`);
                }
                const data = await res.json();
                return {
                    diagnosis: data.diagnosis,
                    suggestedSolutions: data.suggestedSolutions ?? [],
                    confidenceScore: data.confidenceScore ?? 0,
                    raw: data,
                };
            }
            catch (err) {
                this.logger.error(`Agent AI analysis failed for post ${params.postId}`, err);
                // Fail soft: the post still exists, AI comment is just skipped/retried later via queue.
                return {
                    diagnosis: 'AI analysis is temporarily unavailable. The community will help shortly.',
                    suggestedSolutions: [],
                    confidenceScore: 0,
                };
            }
        }
    };
    return AgentClientService = _classThis;
})();
export { AgentClientService };
