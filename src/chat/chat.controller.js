var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
let ChatController = (() => {
    let _classDecorators = [Controller(), UseGuards(JwtAuthGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _listConversations_decorators;
    let _startConversation_decorators;
    let _getMessages_decorators;
    let _markRead_decorators;
    let _sendFriendRequest_decorators;
    let _listPending_decorators;
    let _acceptFriendRequest_decorators;
    let _rejectFriendRequest_decorators;
    let _listFriends_decorators;
    var ChatController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _listConversations_decorators = [Get('conversations')];
            _startConversation_decorators = [Post('conversations')];
            _getMessages_decorators = [Get('conversations/:id/messages')];
            _markRead_decorators = [Patch('conversations/:id/read')];
            _sendFriendRequest_decorators = [Post('friend-requests')];
            _listPending_decorators = [Get('friend-requests/pending')];
            _acceptFriendRequest_decorators = [Patch('friend-requests/:id/accept')];
            _rejectFriendRequest_decorators = [Patch('friend-requests/:id/reject')];
            _listFriends_decorators = [Get('friends')];
            __esDecorate(this, null, _listConversations_decorators, { kind: "method", name: "listConversations", static: false, private: false, access: { has: obj => "listConversations" in obj, get: obj => obj.listConversations }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _startConversation_decorators, { kind: "method", name: "startConversation", static: false, private: false, access: { has: obj => "startConversation" in obj, get: obj => obj.startConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getMessages_decorators, { kind: "method", name: "getMessages", static: false, private: false, access: { has: obj => "getMessages" in obj, get: obj => obj.getMessages }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markRead_decorators, { kind: "method", name: "markRead", static: false, private: false, access: { has: obj => "markRead" in obj, get: obj => obj.markRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _sendFriendRequest_decorators, { kind: "method", name: "sendFriendRequest", static: false, private: false, access: { has: obj => "sendFriendRequest" in obj, get: obj => obj.sendFriendRequest }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listPending_decorators, { kind: "method", name: "listPending", static: false, private: false, access: { has: obj => "listPending" in obj, get: obj => obj.listPending }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _acceptFriendRequest_decorators, { kind: "method", name: "acceptFriendRequest", static: false, private: false, access: { has: obj => "acceptFriendRequest" in obj, get: obj => obj.acceptFriendRequest }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rejectFriendRequest_decorators, { kind: "method", name: "rejectFriendRequest", static: false, private: false, access: { has: obj => "rejectFriendRequest" in obj, get: obj => obj.rejectFriendRequest }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _listFriends_decorators, { kind: "method", name: "listFriends", static: false, private: false, access: { has: obj => "listFriends" in obj, get: obj => obj.listFriends }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ChatController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        chatService = __runInitializers(this, _instanceExtraInitializers);
        constructor(chatService) {
            this.chatService = chatService;
        }
        listConversations(user) {
            return this.chatService.listConversations(user.userId);
        }
        startConversation(user, dto) {
            return this.chatService.findOrCreateDirectConversation(user.userId, dto.otherUserId);
        }
        getMessages(user, id, before) {
            return this.chatService.getMessages(id, user.userId, 50, before);
        }
        markRead(user, id) {
            return this.chatService.markRead(id, user.userId);
        }
        sendFriendRequest(user, dto) {
            return this.chatService.sendFriendRequest(user.userId, dto.receiverId);
        }
        listPending(user) {
            return this.chatService.listPendingFriendRequests(user.userId);
        }
        acceptFriendRequest(user, id) {
            return this.chatService.respondFriendRequest(id, user.userId, true);
        }
        rejectFriendRequest(user, id) {
            return this.chatService.respondFriendRequest(id, user.userId, false);
        }
        listFriends(user) {
            return this.chatService.listFriends(user.userId);
        }
    };
    return ChatController = _classThis;
})();
export { ChatController };
