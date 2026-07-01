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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
let UsersController = (() => {
    let _classDecorators = [Controller('users')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getMe_decorators;
    let _getLeaderboard_decorators;
    let _getById_decorators;
    let _updateMe_decorators;
    let _suspend_decorators;
    let _ban_decorators;
    let _verify_decorators;
    var UsersController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _getMe_decorators = [Get('me'), UseGuards(JwtAuthGuard)];
            _getLeaderboard_decorators = [Get('leaderboard')];
            _getById_decorators = [Get(':id')];
            _updateMe_decorators = [Patch('me'), UseGuards(JwtAuthGuard)];
            _suspend_decorators = [Patch(':id/suspend'), UseGuards(JwtAuthGuard, RolesGuard), Roles('ADMIN')];
            _ban_decorators = [Patch(':id/ban'), UseGuards(JwtAuthGuard, RolesGuard), Roles('ADMIN')];
            _verify_decorators = [Patch(':id/verify'), UseGuards(JwtAuthGuard, RolesGuard), Roles('ADMIN')];
            __esDecorate(this, null, _getMe_decorators, { kind: "method", name: "getMe", static: false, private: false, access: { has: obj => "getMe" in obj, get: obj => obj.getMe }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getLeaderboard_decorators, { kind: "method", name: "getLeaderboard", static: false, private: false, access: { has: obj => "getLeaderboard" in obj, get: obj => obj.getLeaderboard }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getById_decorators, { kind: "method", name: "getById", static: false, private: false, access: { has: obj => "getById" in obj, get: obj => obj.getById }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateMe_decorators, { kind: "method", name: "updateMe", static: false, private: false, access: { has: obj => "updateMe" in obj, get: obj => obj.updateMe }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _suspend_decorators, { kind: "method", name: "suspend", static: false, private: false, access: { has: obj => "suspend" in obj, get: obj => obj.suspend }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _ban_decorators, { kind: "method", name: "ban", static: false, private: false, access: { has: obj => "ban" in obj, get: obj => obj.ban }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _verify_decorators, { kind: "method", name: "verify", static: false, private: false, access: { has: obj => "verify" in obj, get: obj => obj.verify }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            UsersController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        usersService = __runInitializers(this, _instanceExtraInitializers);
        constructor(usersService) {
            this.usersService = usersService;
        }
        getMe(user) {
            return this.usersService.findById(user.userId);
        }
        getLeaderboard(categoryId) {
            return this.usersService.getLeaderboard(categoryId);
        }
        getById(id) {
            return this.usersService.findById(id);
        }
        updateMe(user, body) {
            return this.usersService.updateProfile(user.userId, body);
        }
        suspend(id) {
            return this.usersService.suspend(id);
        }
        ban(id) {
            return this.usersService.ban(id);
        }
        verify(id) {
            return this.usersService.verify(id);
        }
    };
    return UsersController = _classThis;
})();
export { UsersController };
