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
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
let RewardsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RewardsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            RewardsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        usersService;
        constructor(prisma, usersService) {
            this.prisma = prisma;
            this.usersService = usersService;
        }
        /**
         * Called after a post is marked SOLVED. The original poster rewards the
         * comment author whose solution helped, which both grants points and
         * bumps that user's reputation in the post's category.
         */
        async give(fromUserId, postId, commentId, points) {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                throw new NotFoundException('Post not found');
            if (post.authorId !== fromUserId) {
                throw new ForbiddenException('Only the post author can reward a contributor');
            }
            const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
            if (!comment || comment.postId !== postId) {
                throw new BadRequestException('Comment does not belong to this post');
            }
            if (comment.authorId === fromUserId) {
                throw new BadRequestException('You cannot reward your own comment');
            }
            const reward = await this.prisma.reward.create({
                data: { fromUserId, toUserId: comment.authorId, postId, points },
            });
            await this.usersService.addReputation(comment.authorId, post.categoryId, points);
            // TODO: emit REWARD notification to comment.authorId
            return reward;
        }
        async findForUser(userId) {
            return this.prisma.reward.findMany({
                where: { toUserId: userId },
                include: { post: true, fromUser: { select: { id: true, name: true, avatarUrl: true } } },
                orderBy: { createdAt: 'desc' },
            });
        }
    };
    return RewardsService = _classThis;
})();
export { RewardsService };
