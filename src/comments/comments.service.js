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
let CommentsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CommentsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CommentsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        async create(postId, authorId, content, parentId) {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                throw new NotFoundException('Post not found');
            const comment = await this.prisma.comment.create({
                data: { postId, authorId, content, parentId },
                include: { author: { select: { id: true, name: true, avatarUrl: true } } },
            });
            await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
            // TODO: emit notification to post.authorId (and parent comment author if a reply)
            return comment;
        }
        async findByPost(postId) {
            return this.prisma.comment.findMany({
                where: { postId },
                orderBy: { createdAt: 'asc' },
                include: { author: { select: { id: true, name: true, avatarUrl: true } } },
            });
        }
        async toggleLike(userId, commentId) {
            const existing = await this.prisma.like.findUnique({
                where: { userId_commentId: { userId, commentId } },
            });
            if (existing) {
                await this.prisma.like.delete({ where: { id: existing.id } });
                await this.prisma.comment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } });
                return { liked: false };
            }
            await this.prisma.like.create({ data: { userId, commentId } });
            await this.prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } });
            return { liked: true };
        }
        async delete(commentId, requesterId, requesterRole) {
            const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
            if (!comment)
                throw new NotFoundException('Comment not found');
            if (comment.authorId !== requesterId && requesterRole !== 'ADMIN') {
                throw new NotFoundException('Comment not found');
            }
            await this.prisma.comment.delete({ where: { id: commentId } });
            await this.prisma.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } });
        }
    };
    return CommentsService = _classThis;
})();
export { CommentsService };
