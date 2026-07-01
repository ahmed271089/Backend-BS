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
let PostsController = (() => {
    let _classDecorators = [Controller('posts')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findFeed_decorators;
    let _search_decorators;
    let _findOne_decorators;
    let _markSolved_decorators;
    let _toggleLike_decorators;
    let _toggleFavorite_decorators;
    var PostsController = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _create_decorators = [Post(), UseGuards(JwtAuthGuard)];
            _findFeed_decorators = [Get()];
            _search_decorators = [Get('search')];
            _findOne_decorators = [Get(':id')];
            _markSolved_decorators = [Patch(':id/solve'), UseGuards(JwtAuthGuard)];
            _toggleLike_decorators = [Post(':id/like'), UseGuards(JwtAuthGuard)];
            _toggleFavorite_decorators = [Post(':id/favorite'), UseGuards(JwtAuthGuard)];
            __esDecorate(this, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _findFeed_decorators, { kind: "method", name: "findFeed", static: false, private: false, access: { has: obj => "findFeed" in obj, get: obj => obj.findFeed }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _search_decorators, { kind: "method", name: "search", static: false, private: false, access: { has: obj => "search" in obj, get: obj => obj.search }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _markSolved_decorators, { kind: "method", name: "markSolved", static: false, private: false, access: { has: obj => "markSolved" in obj, get: obj => obj.markSolved }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleLike_decorators, { kind: "method", name: "toggleLike", static: false, private: false, access: { has: obj => "toggleLike" in obj, get: obj => obj.toggleLike }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toggleFavorite_decorators, { kind: "method", name: "toggleFavorite", static: false, private: false, access: { has: obj => "toggleFavorite" in obj, get: obj => obj.toggleFavorite }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PostsController = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        postsService = __runInitializers(this, _instanceExtraInitializers);
        constructor(postsService) {
            this.postsService = postsService;
        }
        create(user, dto) {
            return this.postsService.create(user.userId, dto);
        }
        findFeed(categoryId, type, trending, cursor) {
            return this.postsService.findFeed({ categoryId, type, trending: trending === 'true', cursor });
        }
        search(q, categoryId) {
            return this.postsService.search(q, categoryId);
        }
        findOne(id) {
            return this.postsService.findOne(id);
        }
        markSolved(user, id, body) {
            return this.postsService.markSolved(id, user.userId, body.solvedCommentId);
        }
        toggleLike(user, id) {
            return this.postsService.toggleLike(user.userId, id);
        }
        toggleFavorite(user, id) {
            return this.postsService.toggleFavorite(user.userId, id);
        }
    };
    return PostsController = _classThis;
})();
export { PostsController };
