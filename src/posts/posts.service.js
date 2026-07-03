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
const TRENDING_INTERACTIONS_THRESHOLD = 50;
let PostsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PostsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PostsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        usersService;
        agentClient;
        constructor(prisma, usersService, agentClient) {
            this.prisma = prisma;
            this.usersService = usersService;
            this.agentClient = agentClient;
        }
        async create(authorId, dto) {
            const post = await this.prisma.post.create({
                data: {
                    authorId,
                    type: dto.type,
                    categoryId: dto.categoryId,
                    title: dto.title,
                    description: dto.description,
                    attachments: { create: dto.attachments },
                },
                include: { attachments: true, category: true },
            });
            // Only PROBLEM posts get an AI diagnosis. Fire-and-forget so the API
            // response isn't blocked on the agent-ai service round trip.
            // In production, push this onto a queue (BullMQ / Pub-Sub) instead of awaiting here.
            if (dto.type === 'PROBLEM') {
                this.runAiAnalysis(post.id, post.title, post.description, post.category.slug, dto.attachments.map((a) => a.url));
            }
            return post;
        }
        async runAiAnalysis(postId, title, description, categorySlug, attachmentUrls) {
            const result = await this.agentClient.analyzeProblem({
                postId,
                title,
                description,
                categorySlug,
                attachmentUrls,
            });
            await this.prisma.aIAnalysis.create({
                data: {
                    postId,
                    diagnosis: result.diagnosis,
                    suggestedSolutions: result.suggestedSolutions,
                    confidenceScore: result.confidenceScore,
                    rawResponse: result.raw,
                },
            });
            // Also surface the AI's diagnosis as the first comment so it shows in-thread.
            const systemAuthor = await this.prisma.user.findFirst({ where: { email: 'ai-agent@system.local' } });
            if (systemAuthor) {
                await this.prisma.comment.create({
                    data: {
                        postId,
                        authorId: systemAuthor.id,
                        content: result.diagnosis,
                        isAIComment: true,
                    },
                });
                await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
            }
        }
        async findFeed(params) {
            const { categoryId, type, trending, take = 20, cursor } = params;
            return this.prisma.post.findMany({
                where: {
                    ...(categoryId ? { categoryId } : {}),
                    ...(type ? { type } : {}),
                },
                orderBy: trending
                    ? [
                        { isTrending: 'desc' },
                        { createdAt: 'desc' },
                      ]
                    : { createdAt: 'desc' },
                take,
                ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
                include: {
                    author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
                    category: true,
                    attachments: true,
                    aiAnalysis: true,
                    _count: { select: { comments: true, likes: true } },
                },
            });
        }
        async findOne(id) {
            const post = await this.prisma.post.findUnique({
                where: { id },
                include: {
                    author: { select: { id: true, name: true, avatarUrl: true, reputationPoints: true } },
                    category: true,
                    attachments: true,
                    aiAnalysis: true,
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
                    },
                },
            });
            if (!post)
                throw new NotFoundException('Post not found');
            await this.prisma.post.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
            await this.checkTrending(id);
            return post;
        }
        async markSolved(postId, requesterId, solvedCommentId) {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post)
                throw new NotFoundException('Post not found');
            if (post.authorId !== requesterId) {
                throw new ForbiddenException('Only the post author can mark it as solved');
            }
            const comment = await this.prisma.comment.findUnique({ where: { id: solvedCommentId } });
            if (!comment || comment.postId !== postId) {
                throw new BadRequestException('Comment does not belong to this post');
            }
            return this.prisma.post.update({
                where: { id: postId },
                data: { status: 'SOLVED', solvedCommentId },
            });
        }
        // Called right after markSolved, from the rewards module/controller, to keep
        // "mark solved" and "give reward" as separate explicit user actions.
        async toggleLike(userId, postId) {
            const existing = await this.prisma.like.findUnique({
                where: { userId_postId: { userId, postId } },
            });
            if (existing) {
                await this.prisma.like.delete({ where: { id: existing.id } });
                await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
                return { liked: false };
            }
            await this.prisma.like.create({ data: { userId, postId } });
            await this.prisma.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
            await this.checkTrending(postId);
            return { liked: true };
        }
        async toggleFavorite(userId, postId) {
            const existing = await this.prisma.favorite.findUnique({
                where: { userId_postId: { userId, postId } },
            });
            if (existing) {
                await this.prisma.favorite.delete({ where: { id: existing.id } });
                return { favorited: false };
            }
            await this.prisma.favorite.create({ data: { userId, postId } });
            return { favorited: true };
        }
        async search(query, categoryId) {
            return this.prisma.post.findMany({
                where: {
                    ...(categoryId ? { categoryId } : {}),
                    status: 'SOLVED',
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                    ],
                },
                include: { category: true, attachments: true },
                take: 30,
            });
        }
        async checkTrending(postId) {
            const post = await this.prisma.post.findUnique({ where: { id: postId } });
            if (!post || post.isTrending)
                return;
            const interactions = post.likesCount + post.commentsCount;
            if (interactions >= TRENDING_INTERACTIONS_THRESHOLD) {
                await this.prisma.post.update({ where: { id: postId }, data: { isTrending: true } });
            }
        }
    };
    return PostsService = _classThis;
})();
export { PostsService };
