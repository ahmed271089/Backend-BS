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
import { IsOptional, IsString, MinLength } from 'class-validator';
let StartConversationDto = (() => {
    let _otherUserId_decorators;
    let _otherUserId_initializers = [];
    let _otherUserId_extraInitializers = [];
    return class StartConversationDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _otherUserId_decorators = [IsString()];
            __esDecorate(null, null, _otherUserId_decorators, { kind: "field", name: "otherUserId", static: false, private: false, access: { has: obj => "otherUserId" in obj, get: obj => obj.otherUserId, set: (obj, value) => { obj.otherUserId = value; } }, metadata: _metadata }, _otherUserId_initializers, _otherUserId_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        otherUserId = __runInitializers(this, _otherUserId_initializers, void 0);
        constructor() {
            __runInitializers(this, _otherUserId_extraInitializers);
        }
    };
})();
export { StartConversationDto };
let SendMessageDto = (() => {
    let _conversationId_decorators;
    let _conversationId_initializers = [];
    let _conversationId_extraInitializers = [];
    let _content_decorators;
    let _content_initializers = [];
    let _content_extraInitializers = [];
    let _attachmentUrl_decorators;
    let _attachmentUrl_initializers = [];
    let _attachmentUrl_extraInitializers = [];
    return class SendMessageDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _conversationId_decorators = [IsString()];
            _content_decorators = [IsOptional(), IsString()];
            _attachmentUrl_decorators = [IsOptional(), IsString()];
            __esDecorate(null, null, _conversationId_decorators, { kind: "field", name: "conversationId", static: false, private: false, access: { has: obj => "conversationId" in obj, get: obj => obj.conversationId, set: (obj, value) => { obj.conversationId = value; } }, metadata: _metadata }, _conversationId_initializers, _conversationId_extraInitializers);
            __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: obj => "content" in obj, get: obj => obj.content, set: (obj, value) => { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
            __esDecorate(null, null, _attachmentUrl_decorators, { kind: "field", name: "attachmentUrl", static: false, private: false, access: { has: obj => "attachmentUrl" in obj, get: obj => obj.attachmentUrl, set: (obj, value) => { obj.attachmentUrl = value; } }, metadata: _metadata }, _attachmentUrl_initializers, _attachmentUrl_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        conversationId = __runInitializers(this, _conversationId_initializers, void 0);
        content = (__runInitializers(this, _conversationId_extraInitializers), __runInitializers(this, _content_initializers, void 0));
        attachmentUrl = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _attachmentUrl_initializers, void 0));
        constructor() {
            __runInitializers(this, _attachmentUrl_extraInitializers);
        }
    };
})();
export { SendMessageDto };
let TypingDto = (() => {
    let _conversationId_decorators;
    let _conversationId_initializers = [];
    let _conversationId_extraInitializers = [];
    return class TypingDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _conversationId_decorators = [IsString()];
            __esDecorate(null, null, _conversationId_decorators, { kind: "field", name: "conversationId", static: false, private: false, access: { has: obj => "conversationId" in obj, get: obj => obj.conversationId, set: (obj, value) => { obj.conversationId = value; } }, metadata: _metadata }, _conversationId_initializers, _conversationId_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        conversationId = __runInitializers(this, _conversationId_initializers, void 0);
        constructor() {
            __runInitializers(this, _conversationId_extraInitializers);
        }
    };
})();
export { TypingDto };
let JoinConversationDto = (() => {
    let _conversationId_decorators;
    let _conversationId_initializers = [];
    let _conversationId_extraInitializers = [];
    return class JoinConversationDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _conversationId_decorators = [IsString()];
            __esDecorate(null, null, _conversationId_decorators, { kind: "field", name: "conversationId", static: false, private: false, access: { has: obj => "conversationId" in obj, get: obj => obj.conversationId, set: (obj, value) => { obj.conversationId = value; } }, metadata: _metadata }, _conversationId_initializers, _conversationId_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        conversationId = __runInitializers(this, _conversationId_initializers, void 0);
        constructor() {
            __runInitializers(this, _conversationId_extraInitializers);
        }
    };
})();
export { JoinConversationDto };
let SendFriendRequestDto = (() => {
    let _receiverId_decorators;
    let _receiverId_initializers = [];
    let _receiverId_extraInitializers = [];
    return class SendFriendRequestDto {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _receiverId_decorators = [IsString(), MinLength(1)];
            __esDecorate(null, null, _receiverId_decorators, { kind: "field", name: "receiverId", static: false, private: false, access: { has: obj => "receiverId" in obj, get: obj => obj.receiverId, set: (obj, value) => { obj.receiverId = value; } }, metadata: _metadata }, _receiverId_initializers, _receiverId_extraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        receiverId = __runInitializers(this, _receiverId_initializers, void 0);
        constructor() {
            __runInitializers(this, _receiverId_extraInitializers);
        }
    };
})();
export { SendFriendRequestDto };
