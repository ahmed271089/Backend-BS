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
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
let AuthService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuthService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        prisma;
        jwt;
        constructor(prisma, jwt) {
            this.prisma = prisma;
            this.jwt = jwt;
        }
        async register(dto) {
            const existing = await this.prisma.user.findFirst({
                where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
            });
            if (existing) {
                throw new ConflictException('An account with this email or phone already exists');
            }
            const passwordHash = await bcrypt.hash(dto.password, 10);
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    phone: dto.phone,
                    passwordHash,
                    name: dto.name,
                    provider: dto.email ? 'EMAIL' : 'PHONE',
                },
            });
            return this.issueTokens(user.id, user.role);
        }
        async login(dto) {
            const user = await this.prisma.user.findFirst({
                where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
            });
            if (!user || !user.passwordHash) {
                throw new UnauthorizedException('Invalid credentials');
            }
            const valid = await bcrypt.compare(dto.password, user.passwordHash);
            if (!valid) {
                throw new UnauthorizedException('Invalid credentials');
            }
            if (user.status !== 'ACTIVE') {
                throw new UnauthorizedException('Account is suspended or banned');
            }
            return this.issueTokens(user.id, user.role);
        }
        async refresh(refreshToken) {
            try {
                const payload = this.jwt.verify(refreshToken, {
                    secret: process.env.JWT_REFRESH_SECRET,
                });
                return this.issueTokens(payload.sub, payload.role);
            }
            catch {
                throw new UnauthorizedException('Invalid or expired refresh token');
            }
        }
        async issueTokens(userId, role) {
            const payload = { sub: userId, role };
            const accessToken = this.jwt.sign(payload, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
            });
            const refreshToken = this.jwt.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
            });
            return { accessToken, refreshToken };
        }
        // Hook for Google/Apple/Facebook: verify providerToken with the provider's SDK,
        // then findOrCreate a User by provider+providerId before issuing tokens.
        async socialLogin(provider, providerId, email, name) {
            let user = await this.prisma.user.findFirst({ where: { provider: provider, providerId } });
            if (!user) {
                user = await this.prisma.user.create({
                    data: { provider: provider, providerId, email, name },
                });
            }
            return this.issueTokens(user.id, user.role);
        }
    };
    return AuthService = _classThis;
})();
export { AuthService };
