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
import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
let NotificationsController = (() => {
    let _classDecorators = [Controller('notifications'), UseGuards(JwtAuthGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _unreadCount_decorators;
    let _markAllRead_decorators;
    let _markRead_decorators;
    var NotificationsController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _list_decorators = [Get()];
            _unreadCount_decorators = [Get('unread-count')];
            _markAllRead_decorators = [Patch('read-all')];
            _markRead_decorators = [Patch(':id/read')];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _unreadCount_decorators, { kind: "method", name: "unreadCount", static: false, private: false, access: { has: obj => "unreadCount" in obj, get: obj => obj.unreadCount }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markAllRead_decorators, { kind: "method", name: "markAllRead", static: false, private: false, access: { has: obj => "markAllRead" in obj, get: obj => obj.markAllRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markRead_decorators, { kind: "method", name: "markRead", static: false, private: false, access: { has: obj => "markRead" in obj, get: obj => obj.markRead }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            NotificationsController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        notificationsService = __runInitializers(this, _instanceExtraInitializers);
        constructor(notificationsService) {
            this.notificationsService = notificationsService;
        }
        list(user) {
            return this.notificationsService.listForUser(user.userId);
        }
        unreadCount(user) {
            return this.notificationsService.getUnreadCount(user.userId);
        }
        markAllRead(user) {
            return this.notificationsService.markAllRead(user.userId);
        }
        markRead(user, id) {
            return this.notificationsService.markRead(id, user.userId);
        }
    };
    return NotificationsController = _classThis;
})();
export { NotificationsController };
