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
let ReportsService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ReportsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ReportsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        constructor(prisma) {
            this.prisma = prisma;
        }
        create(reporterId, targetType, targetId, reason) {
            return this.prisma.report.create({
                data: { reporterId, targetType, targetId, reason },
            });
        }
        async listPending() {
            const reports = await this.prisma.report.findMany({
                where: { status: 'PENDING' },
                include: { reporter: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            });
            return Promise.all(reports.map((r) => this.enrichReport(r)));
        }
        async updateStatus(id, status) {
            const report = await this.prisma.report.findUnique({ where: { id } });
            if (!report)
                throw new NotFoundException('Report not found');
            const updated = await this.prisma.report.update({
                where: { id },
                data: { status },
                include: { reporter: { select: { id: true, name: true, email: true } } },
            });
            return this.enrichReport(updated);
        }
        async enrichReport(report) {
            let title = 'Unknown content';
            let submittedBy = 'Unknown';
            if (report.targetType === 'POST') {
                const post = await this.prisma.post.findUnique({
                    where: { id: report.targetId },
                    include: { author: { select: { name: true } } },
                });
                if (post) {
                    title = post.title;
                    submittedBy = post.author.name;
                }
            }
            else if (report.targetType === 'COMMENT') {
                const comment = await this.prisma.comment.findUnique({
                    where: { id: report.targetId },
                    include: { author: { select: { name: true } }, post: { select: { title: true } } },
                });
                if (comment) {
                    title = comment.post.title;
                    submittedBy = comment.author.name;
                }
            }
            else if (report.targetType === 'USER') {
                const user = await this.prisma.user.findUnique({ where: { id: report.targetId } });
                if (user) {
                    title = user.name;
                    submittedBy = user.name;
                }
            }
            return {
                id: report.id,
                type: report.targetType,
                title,
                reason: report.reason,
                status: report.status,
                reportedBy: report.reporter.name,
                submittedBy,
                createdAt: report.createdAt,
            };
        }
    };
    return ReportsService = _classThis;
})();
export { ReportsService };
