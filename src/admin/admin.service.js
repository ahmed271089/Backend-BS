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
import { Injectable } from '@nestjs/common';
const CATEGORY_COLORS = ['#6C5CE7', '#3B82F6', '#F59E0B', '#22C55E', '#EAB308', '#06B6D4'];
let AdminService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AdminService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AdminService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        async getStats() {
            const [totalSolved, expertsVerified, activeProblems, totalProblems, categories, recentReports, leaderboard, postsLast7Days] = await Promise.all([
                this.prisma.post.count({ where: { status: 'SOLVED' } }),
                this.prisma.user.count({ where: { isVerified: true } }),
                this.prisma.post.count({ where: { status: 'OPEN', type: 'PROBLEM' } }),
                this.prisma.post.count({ where: { type: 'PROBLEM' } }),
                this.prisma.category.findMany({
                    include: {
                        posts: { select: { status: true } },
                        _count: { select: { posts: true } },
                    },
                }),
                this.prisma.report.findMany({
                    where: { status: 'PENDING' },
                    include: { reporter: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                }),
                this.prisma.user.findMany({
                    orderBy: { reputationPoints: 'desc' },
                    take: 5,
                    include: { expertise: { include: { category: true }, orderBy: { points: 'desc' }, take: 1 } },
                }),
                this.getPostsPerDay(7),
            ]);
            const successRate = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
            const categoryHealth = categories.map((c, i) => {
                const openCount = c.posts.filter((p) => p.status === 'OPEN').length;
                const solvedCount = c.posts.filter((p) => p.status === 'SOLVED').length;
                const total = c.posts.length;
                const solvedRate = total > 0 ? Math.round((solvedCount / total) * 100) : 0;
                return {
                    id: c.id,
                    name: c.name,
                    openCount,
                    solvedRate,
                    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                };
            });
            const moderationQueue = await Promise.all(recentReports.map(async (r) => {
                let title = 'Reported content';
                if (r.targetType === 'POST') {
                    const post = await this.prisma.post.findUnique({ where: { id: r.targetId } });
                    if (post)
                        title = post.title;
                }
                return {
                    id: r.id,
                    type: r.targetType,
                    title,
                    reason: r.reason,
                    reportedBy: r.reporter.name,
                    createdAt: r.createdAt,
                };
            }));
            const leaderboardPreview = leaderboard.map((u, i) => ({
                id: u.id,
                rank: i + 1,
                name: u.name,
                category: u.expertise[0]?.category.name ?? 'General',
                points: u.reputationPoints,
            }));
            return {
                platformStats: {
                    totalSolved,
                    expertsVerified,
                    successRate: `${successRate}%`,
                    activeProblems,
                },
                categoryHealth,
                platformLoadSeries: postsLast7Days,
                moderationQueue,
                leaderboard: leaderboardPreview,
            };
        }
        async getPostsPerDay(days) {
            const result = [];
            const now = new Date();
            for (let i = days - 1; i >= 0; i--) {
                const dayStart = new Date(now);
                dayStart.setDate(now.getDate() - i);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setHours(23, 59, 59, 999);
                const count = await this.prisma.post.count({
                    where: { createdAt: { gte: dayStart, lte: dayEnd } },
                });
                result.push({
                    day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
                    posts: count,
                });
            }
            return result;
        }
    };
    return AdminService = _classThis;
})();
export { AdminService };
