import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../modules/mail/mail.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
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

  async login(dto: LoginDto) {
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

  async forgotPassword(email: string) {
    const message = 'If an account exists with that email, a reset link has been sent.';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return { message };
    }

    const token = this.jwt.sign(
      { sub: user.id, purpose: 'password-reset' },
      {
        secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_REFRESH_SECRET,
        expiresIn: '1h',
      },
    );

    const resetLink = `bestsolving://reset-password?token=${encodeURIComponent(token)}`;
    await this.mailService.send({
      to: email,
      subject: 'Reset your Best Solving password',
      html: `<p>Tap the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
    });

    return { message };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwt.verify<{ sub: string; purpose?: string }>(token, {
        secret: process.env.JWT_RESET_SECRET ?? process.env.JWT_REFRESH_SECRET,
      });
      if (payload.purpose !== 'password-reset') {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash },
      });

      return { message: 'Password updated successfully.' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      return this.issueTokens(payload.sub, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async issueTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    return { accessToken, refreshToken };
  }

  // Hook for Google/Apple/Facebook: verify providerToken with the provider's SDK,
  // then findOrCreate a User by provider+providerId before issuing tokens.
  async socialLogin(provider: string, providerId: string, email: string, name: string) {
    let user = await this.prisma.user.findFirst({ where: { provider: provider as any, providerId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { provider: provider as any, providerId, email, name },
      });
    }
    return this.issueTokens(user.id, user.role);
  }
}
