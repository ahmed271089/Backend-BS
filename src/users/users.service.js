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
import { Injectable, NotFoundException } from '@nestjs/common';
let UsersService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var UsersService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            UsersService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        async findById(id) {
            const user = await this.prisma.user.findUnique({
                where: { id },
                include: { expertise: { include: { category: true } } },
            });
            if (!user)
                throw new NotFoundException('User not found');
            return user;
        }
        async updateProfile(id, data) {
            return this.prisma.user.update({ where: { id }, data });
        }
        // Called when a post is marked solved + reward given to the contributor.
        async addReputation(userId, categoryId, points) {
            await this.prisma.user.update({
                where: { id: userId },
                data: { reputationPoints: { increment: points } },
            });
            await this.prisma.categoryExpertise.upsert({
                where: { userId_categoryId: { userId, categoryId } },
                update: { points: { increment: points } },
                create: { userId, categoryId, points },
            });
        }
        async getLeaderboard(categoryId, take = 20) {
            if (categoryId) {
                return this.prisma.categoryExpertise.findMany({
                    where: { categoryId },
                    orderBy: { points: 'desc' },
                    take,
                    include: { user: true, category: true },
                });
            }
            return this.prisma.user.findMany({
                orderBy: { reputationPoints: 'desc' },
                take,
            });
        }
        async suspend(id) {
            return this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } });
        }
        async ban(id) {
            return this.prisma.user.update({ where: { id }, data: { status: 'BANNED' } });
        }
        async verify(id) {
            return this.prisma.user.update({ where: { id }, data: { isVerified: true } });
        }
    };
    return UsersService = _classThis;
})();
export { UsersService };
